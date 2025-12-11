#!/usr/bin/env node

/**
 * Symbiosis Agent - Architectural Coherence Engine
 * 
 * Purpose: Detect drift between documentation (Map) and source code (Territory)
 * 
 * The Agent consists of three core modules:
 * 1. The Cartographer - Parses OpenAPI spec into normalized format
 * 2. The Surveyor - Analyzes source code using AST to extract actual implementation
 * 3. The Judge - Compares Map vs Territory and reports violations
 * 
 * Philosophy:
 * - Documentation is Code: if it's not in the spec, it shouldn't be in code
 * - Silence is Failure: unused variables are bugs
 * - Trust but Verify: always check implementation matches documentation
 * 
 * Usage: node symbiosis-agent.js [--config <path>] [--report <json|markdown>]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ============================================================================
// PART 1: THE CARTOGRAPHER (Spec Parser)
// ============================================================================

class Cartographer {
  constructor(specPath) {
    this.specPath = specPath;
    this.spec = null;
    this.map = {};
  }

  /**
   * Load and parse OpenAPI specification
   */
  load() {
    try {
      const content = fs.readFileSync(this.specPath, 'utf-8');
      
      // Try YAML first (for .yaml files)
      if (this.specPath.endsWith('.yaml') || this.specPath.endsWith('.yml')) {
        this.spec = yaml.load(content);
      } else {
        // Fall back to JSON
        this.spec = JSON.parse(content);
      }
      
      console.log(`✓ Cartographer loaded spec: ${path.basename(this.specPath)}`);
      return this;
    } catch (error) {
      console.error(`✗ Failed to load spec: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Normalize OpenAPI spec into standard "Symbiosis Map"
   * 
   * Output format:
   * {
   *   "GET /grants/search": {
   *     "inputs": ["query", "agency", "limit"],
   *     "outputs": { "200": {...}, "400": {...} },
   *     "status_codes": ["200", "400", "500"],
   *     "documented": true
   *   }
   * }
   */
  normalize() {
    const paths = this.spec.paths || {};
    
    for (const [pathname, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (method.startsWith('x-')) continue; // Skip x-extensions
        
        const key = `${method.toUpperCase()} ${pathname}`;
        
        // Extract parameters
        const parameters = (operation.parameters || [])
          .map(p => p.name)
          .sort();
        
        // Extract response status codes
        const responses = operation.responses || {};
        const statusCodes = Object.keys(responses).sort();
        
        this.map[key] = {
          method: method.toUpperCase(),
          path: pathname,
          inputs: parameters,
          outputs: responses,
          status_codes: statusCodes,
          documented: true,
          description: operation.summary || operation.description || '',
          operationId: operation.operationId || ''
        };
      }
    }
    
    console.log(`✓ Cartographer mapped ${Object.keys(this.map).length} endpoints`);
    return this;
  }

  /**
   * Get the normalized map
   */
  getMap() {
    return this.map;
  }
}

// ============================================================================
// PART 2: THE SURVEYOR (Code Analyzer - LLM-Based)
// ============================================================================

class Surveyor {
  constructor(codeDir, framework = 'hono') {
    this.codeDir = codeDir;
    this.framework = framework;
    this.findings = {};
    this.variables = {};
    this.routes = {};
  }

  /**
   * Analyze source code files using simple pattern matching
   * (In production, this could use Anthropic API for deeper analysis)
   */
  analyze() {
    console.log(`✓ Surveyor scanning for ${this.framework} routes...`);
    
    // Find all route files - resolve from current working directory
    const routeDir = path.join(process.cwd(), 'api', 'src', 'routes');
    if (!fs.existsSync(routeDir)) {
      console.warn(`  ⚠ Route directory not found: ${routeDir}`);
      return this;
    }

    const files = fs.readdirSync(routeDir).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      const filePath = path.join(routeDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      this.analyzeFile(file, content);
    }
    
    console.log(`✓ Surveyor found ${Object.keys(this.routes).length} routes in code`);
    return this;
  }

  /**
   * Analyze individual file for routes and parameters
   */
  analyzeFile(filename, content) {
    // Hono route pattern: app.get('/path', handler) or grants.post('/path', handler)
    const routePattern = /(app|grants|admin|users|dashboard)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
    let match;

    while ((match = routePattern.exec(content)) !== null) {
      const [, router, method, path] = match;
      const key = `${method.toUpperCase()} ${path}`;
      
      // Extract variables used from request
      const requestVars = new Set();
      
      // Look for c.req.query() usage
      const queryPattern = /c\.req\.query\(\)\['([^']+)'\]|c\.req\.query\(\)\.([a-zA-Z_]\w*)/g;
      let qMatch;
      while ((qMatch = queryPattern.exec(content)) !== null) {
        requestVars.add(qMatch[1] || qMatch[2]);
      }

      // Look for c.req.json() or JSON.parse
      const jsonPattern = /(?:c\.req\.json\(\)|JSON\.parse)\(\)\.([a-zA-Z_]\w*)/g;
      let jMatch;
      while ((jMatch = jsonPattern.exec(content)) !== null) {
        requestVars.add(jMatch[1]);
      }

      // Look for destructuring from query/body
      const destructPattern = /(?:const|let|var)\s+\{([^}]+)\}\s*=\s*c\.req\.(query|json)\(\)/g;
      let dMatch;
      while ((dMatch = destructPattern.exec(content)) !== null) {
        const vars = dMatch[1].split(',').map(v => v.trim());
        vars.forEach(v => requestVars.add(v));
      }

      // Check if variables are actually used (simple heuristic)
      const usedVars = new Set();
      for (const variable of requestVars) {
        // Count variable references (crude but effective)
        const varUsageCount = (content.match(new RegExp(`\\b${variable}\\b`, 'g')) || []).length;
        if (varUsageCount > 1) { // More than just the declaration
          usedVars.add(variable);
        }
      }

      // Track ghost data (extracted but unused)
      const ghostData = Array.from(requestVars).filter(v => !usedVars.has(v));

      this.routes[key] = {
        method: method.toUpperCase(),
        path,
        file: filename,
        extracted_params: Array.from(requestVars).sort(),
        used_params: Array.from(usedVars).sort(),
        ghost_data: ghostData,
        has_response: content.includes(`c.json(`) || content.includes(`return c`)
      };
    }
  }

  /**
   * Get findings from analysis
   */
  getFindings() {
    return this.routes;
  }
}

// ============================================================================
// PART 3: THE JUDGE (Drift Detector)
// ============================================================================

class Judge {
  constructor(map, findings) {
    this.map = map;
    this.findings = findings;
    this.violations = [];
  }

  /**
   * Compare Map (documentation) vs Territory (code) and find violations
   */
  judge() {
    console.log(`\n🔍 Judge analyzing drift between Map and Territory...\n`);

    // Violation 1: Phantom Route (in spec but not in code)
    for (const [route, docData] of Object.entries(this.map)) {
      if (!this.findings[route]) {
        this.violations.push({
          type: 'PHANTOM_ROUTE',
          severity: 'ERROR',
          route,
          message: `Endpoint documented in spec but NOT implemented in code`,
          spec: docData.description || '(no description)',
          code: 'NOT FOUND',
          fix: `Implement ${route} or remove from spec`
        });
      }
    }

    // Violation 2: Undocumented Route (in code but not in spec)
    for (const [route, codeData] of Object.entries(this.findings)) {
      if (!this.map[route]) {
        this.violations.push({
          type: 'UNDOCUMENTED_ROUTE',
          severity: 'WARNING',
          route,
          message: `Endpoint exists in code but is NOT documented in spec`,
          spec: 'NOT FOUND',
          code: `${codeData.file}`,
          fix: `Add ${route} to OpenAPI spec or remove from code`
        });
      }
    }

    // Violation 3: Input Drift (code uses params not in spec)
    for (const [route, codeData] of Object.entries(this.findings)) {
      const specData = this.map[route];
      if (!specData) continue;

      const specParams = new Set(specData.inputs || []);
      const codeParams = new Set(codeData.extracted_params || []);

      // Parameters in code but not in spec
      for (const param of codeParams) {
        if (!specParams.has(param)) {
          this.violations.push({
            type: 'INPUT_DRIFT',
            severity: 'WARNING',
            route,
            parameter: param,
            message: `Parameter "${param}" used in code but NOT documented in spec`,
            spec: `${specData.inputs.join(', ')}`,
            code: `${codeData.extracted_params.join(', ')}`,
            fix: `Add "${param}" parameter to spec or remove from code`
          });
        }
      }

      // Parameters in spec but not used in code
      for (const param of specParams) {
        if (!codeParams.has(param)) {
          this.violations.push({
            type: 'SPEC_EXCESS',
            severity: 'INFO',
            route,
            parameter: param,
            message: `Parameter "${param}" documented in spec but NOT used in code`,
            spec: `${specData.inputs.join(', ')}`,
            code: `${codeData.extracted_params.join(', ')}`,
            fix: `Remove "${param}" from spec or implement in code`
          });
        }
      }
    }

    // Violation 4: Ghost Data (parameters extracted but never used)
    for (const [route, codeData] of Object.entries(this.findings)) {
      if (codeData.ghost_data && codeData.ghost_data.length > 0) {
        this.violations.push({
          type: 'GHOST_DATA',
          severity: 'WARNING',
          route,
          ghost_vars: codeData.ghost_data,
          message: `Variables extracted from request but NEVER used: ${codeData.ghost_data.join(', ')}`,
          fix: `Remove unused variable extraction or implement logic that uses them`
        });
      }
    }

    return this;
  }

  /**
   * Get all violations
   */
  getViolations() {
    return this.violations;
  }

  /**
   * Generate violation report
   */
  generateReport(format = 'markdown') {
    if (format === 'json') {
      return this.generateJsonReport();
    }
    return this.generateMarkdownReport();
  }

  generateJsonReport() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      total_violations: this.violations.length,
      by_severity: {
        error: this.violations.filter(v => v.severity === 'ERROR').length,
        warning: this.violations.filter(v => v.severity === 'WARNING').length,
        info: this.violations.filter(v => v.severity === 'INFO').length
      },
      violations: this.violations
    }, null, 2);
  }

  generateMarkdownReport() {
    let report = `# Symbiosis Agent - Architectural Coherence Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n\n`;
    
    report += `## Summary\n\n`;
    report += `- **Total Violations**: ${this.violations.length}\n`;
    report += `- **Errors**: ${this.violations.filter(v => v.severity === 'ERROR').length}\n`;
    report += `- **Warnings**: ${this.violations.filter(v => v.severity === 'WARNING').length}\n`;
    report += `- **Info**: ${this.violations.filter(v => v.severity === 'INFO').length}\n\n`;

    if (this.violations.length === 0) {
      report += `✅ No architectural drift detected!\n`;
      return report;
    }

    // Group by type
    const byType = {};
    for (const violation of this.violations) {
      if (!byType[violation.type]) {
        byType[violation.type] = [];
      }
      byType[violation.type].push(violation);
    }

    for (const [type, violations] of Object.entries(byType)) {
      report += `## ${type} (${violations.length})\n\n`;
      
      for (const v of violations) {
        report += `### ${v.route || 'Global'}\n\n`;
        report += `**Severity**: ${v.severity}\n\n`;
        report += `**Issue**: ${v.message}\n\n`;
        
        if (v.parameter) {
          report += `**Parameter**: \`${v.parameter}\`\n\n`;
        }
        
        if (v.ghost_vars) {
          report += `**Ghost Variables**: \`${v.ghost_vars.join('`, `')}\`\n\n`;
        }
        
        report += `**Fix**: ${v.fix}\n\n`;
        report += `---\n\n`;
      }
    }

    return report;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  const configPath = process.argv[2] || './symbiosis.config.json';
  const reportFormat = process.argv[3]?.replace('--format=', '') || 'markdown';

  // Load configuration
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log(`📋 Symbiosis Agent initialized\n`);
    console.log(`Project: ${config.project_name}`);
    console.log(`Spec: ${config.map.path}`);
    console.log(`Code: ${config.territory.routes_glob}\n`);
  } catch (error) {
    console.error(`✗ Failed to load config: ${error.message}`);
    console.error(`\nUsage: node symbiosis-agent.js [config.json]`);
    process.exit(1);
  }

  // Execute the three-module workflow
  console.log(`\n${'='.repeat(70)}`);
  console.log(`STAGE 1: THE CARTOGRAPHER (Parsing Specification)`);
  console.log(`${'='.repeat(70)}\n`);

  const cartographer = new Cartographer(config.map.path);
  cartographer.load().normalize();
  const map = cartographer.getMap();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`STAGE 2: THE SURVEYOR (Analyzing Source Code)`);
  console.log(`${'='.repeat(70)}\n`);

  const surveyor = new Surveyor(config.territory.routes_glob, config.territory.framework);
  surveyor.analyze();
  const findings = surveyor.getFindings();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`STAGE 3: THE JUDGE (Detecting Drift)`);
  console.log(`${'='.repeat(70)}\n`);

  const judge = new Judge(map, findings);
  judge.judge();
  const violations = judge.getViolations();

  // Generate and output report
  const report = judge.generateReport(reportFormat);
  
  if (reportFormat === 'json') {
    console.log(report);
  } else {
    console.log(report);
  }

  // Exit with appropriate code
  const hasErrors = violations.some(v => v.severity === 'ERROR');
  process.exit(hasErrors ? 1 : 0);
}

// Run the agent
main();
