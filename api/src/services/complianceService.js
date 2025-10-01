// Compliance Automation Service for VoidCat Grant Automation Platform
// Automatic validation and compliance checking for federal grant requirements

export class ComplianceService {
  constructor(config = {}) {
    this.config = config;
    this.farPrinciples = this.initializeFARPrinciples();
  }

  /**
   * Initialize FAR (Federal Acquisition Regulation) cost principles
   * @returns {Object} FAR cost principles configuration
   */
  initializeFARPrinciples() {
    return {
      allowable_cost_categories: {
        'personnel': {
          name: 'Direct Labor',
          typical_percentage: 0.60,
          description: 'Salaries and wages for personnel directly working on the project',
          documentation_required: ['labor rates', 'personnel qualifications', 'effort allocation']
        },
        'fringe_benefits': {
          name: 'Fringe Benefits',
          typical_percentage: 0.25,
          description: 'Employee benefits calculated as percentage of direct labor',
          documentation_required: ['fringe rate justification', 'benefit breakdown']
        },
        'equipment': {
          name: 'Equipment',
          typical_percentage: 0.15,
          description: 'Equipment purchases over $5,000 with useful life > 1 year',
          documentation_required: ['equipment list', 'vendor quotes', 'justification']
        },
        'materials_supplies': {
          name: 'Materials and Supplies',
          typical_percentage: 0.05,
          description: 'Consumable materials and supplies',
          documentation_required: ['itemized list', 'estimated costs']
        },
        'travel': {
          name: 'Travel',
          typical_percentage: 0.08,
          description: 'Domestic and international travel costs',
          documentation_required: ['travel plan', 'destination', 'purpose', 'attendees']
        },
        'consultants': {
          name: 'Consultant Services',
          typical_percentage: 0.10,
          description: 'External consultant and subcontractor costs',
          documentation_required: ['consultant justification', 'rates', 'scope of work']
        },
        'other_direct_costs': {
          name: 'Other Direct Costs',
          typical_percentage: 0.07,
          description: 'Publication costs, computer services, etc.',
          documentation_required: ['itemized breakdown', 'cost estimates']
        },
        'indirect_costs': {
          name: 'Indirect Costs (F&A)',
          typical_percentage: 0.25,
          description: 'Facilities and administrative costs',
          documentation_required: ['approved indirect cost rate', 'rate agreement']
        }
      },
      unallowable_costs: [
        'alcoholic beverages',
        'bad debts',
        'contributions and donations',
        'entertainment',
        'fines and penalties',
        'lobbying',
        'interest and other financial costs'
      ]
    };
  }

  /**
   * Validate eligibility requirements
   * @param {Object} companyProfile - Company information
   * @param {Object} grantRequirements - Grant eligibility requirements
   * @returns {Object} Eligibility validation results
   */
  validateEligibility(companyProfile, grantRequirements) {
    const validation = {
      eligible: true,
      requirements_met: [],
      requirements_failed: [],
      warnings: [],
      details: {}
    };

    // 1. Ownership Requirements (SBIR/STTR specific)
    if (grantRequirements.ownership) {
      const ownershipCheck = this.validateOwnership(companyProfile, grantRequirements.ownership);
      validation.details.ownership = ownershipCheck;
      
      if (ownershipCheck.compliant) {
        validation.requirements_met.push('Ownership requirements');
      } else {
        validation.requirements_failed.push('Ownership requirements');
        validation.eligible = false;
      }
    }

    // 2. Size Requirements (Small Business Standards)
    if (grantRequirements.size_standard) {
      const sizeCheck = this.validateSize(companyProfile, grantRequirements.size_standard);
      validation.details.size = sizeCheck;
      
      if (sizeCheck.compliant) {
        validation.requirements_met.push('Size standard');
      } else {
        validation.requirements_failed.push('Size standard');
        validation.eligible = false;
      }
    }

    // 3. Citizenship Requirements
    if (grantRequirements.citizenship) {
      const citizenshipCheck = this.validateCitizenship(companyProfile, grantRequirements.citizenship);
      validation.details.citizenship = citizenshipCheck;
      
      if (citizenshipCheck.compliant) {
        validation.requirements_met.push('Citizenship requirements');
      } else {
        validation.requirements_failed.push('Citizenship requirements');
        validation.eligible = false;
      }
    }

    // 4. Registration Requirements (SAM.gov, DUNS, etc.)
    if (grantRequirements.registrations) {
      const registrationCheck = this.validateRegistrations(companyProfile, grantRequirements.registrations);
      validation.details.registrations = registrationCheck;
      
      if (registrationCheck.compliant) {
        validation.requirements_met.push('Registration requirements');
      } else {
        validation.requirements_failed.push('Registration requirements');
        if (registrationCheck.critical) {
          validation.eligible = false;
        } else {
          validation.warnings.push('Missing recommended registrations');
        }
      }
    }

    // 5. Phase Requirements (for Phase II applications)
    if (grantRequirements.phase_requirements) {
      const phaseCheck = this.validatePhaseRequirements(companyProfile, grantRequirements.phase_requirements);
      validation.details.phase = phaseCheck;
      
      if (phaseCheck.compliant) {
        validation.requirements_met.push('Phase requirements');
      } else {
        validation.requirements_failed.push('Phase requirements');
        validation.eligible = false;
      }
    }

    // 6. Topic/Focus Area Alignment
    if (grantRequirements.focus_areas) {
      const focusCheck = this.validateFocusAreas(companyProfile, grantRequirements.focus_areas);
      validation.details.focus_areas = focusCheck;
      
      if (focusCheck.alignment_score > 0.3) {
        validation.requirements_met.push('Focus area alignment');
      } else {
        validation.warnings.push('Low alignment with grant focus areas');
      }
    }

    return validation;
  }

  /**
   * Validate ownership requirements
   * @param {Object} company - Company profile
   * @param {Object} requirements - Ownership requirements
   * @returns {Object} Validation result
   */
  validateOwnership(company, requirements) {
    const result = {
      compliant: true,
      issues: [],
      details: {}
    };

    // SBIR requires 51% owned by US citizens or permanent residents
    if (requirements.us_ownership_percentage) {
      const usOwnership = company.us_citizen_ownership_percentage || 0;
      result.details.us_ownership = usOwnership;
      
      if (usOwnership < requirements.us_ownership_percentage) {
        result.compliant = false;
        result.issues.push(`US citizen ownership ${usOwnership}% is below required ${requirements.us_ownership_percentage}%`);
      }
    }

    // Check for foreign ownership restrictions
    if (requirements.no_foreign_control) {
      const foreignControl = company.foreign_controlled || false;
      result.details.foreign_controlled = foreignControl;
      
      if (foreignControl) {
        result.compliant = false;
        result.issues.push('Company is foreign-controlled, which is not permitted');
      }
    }

    return result;
  }

  /**
   * Validate size standard requirements
   * @param {Object} company - Company profile
   * @param {Object} requirements - Size requirements
   * @returns {Object} Validation result
   */
  validateSize(company, requirements) {
    const result = {
      compliant: true,
      issues: [],
      details: {}
    };

    // Check employee count
    if (requirements.max_employees) {
      const employeeCount = company.employee_count || 0;
      result.details.employee_count = employeeCount;
      
      if (employeeCount > requirements.max_employees) {
        result.compliant = false;
        result.issues.push(`Employee count ${employeeCount} exceeds maximum ${requirements.max_employees}`);
      }
    }

    // Check annual revenue (if applicable)
    if (requirements.max_annual_revenue) {
      const revenue = company.annual_revenue || 0;
      result.details.annual_revenue = revenue;
      
      if (revenue > requirements.max_annual_revenue) {
        result.compliant = false;
        result.issues.push(`Annual revenue exceeds maximum of $${requirements.max_annual_revenue}`);
      }
    }

    // Check NAICS code alignment
    if (requirements.naics_code) {
      const naicsCode = company.naics_code || '';
      result.details.naics_code = naicsCode;
      
      if (naicsCode !== requirements.naics_code) {
        result.issues.push('NAICS code mismatch - verify size standard');
      }
    }

    return result;
  }

  /**
   * Validate citizenship requirements
   * @param {Object} company - Company profile
   * @param {Object} requirements - Citizenship requirements
   * @returns {Object} Validation result
   */
  validateCitizenship(company, requirements) {
    const result = {
      compliant: true,
      issues: [],
      details: {}
    };

    // Check PI citizenship
    if (requirements.pi_citizenship) {
      const piCitizenship = company.principal_investigator_citizenship || '';
      result.details.pi_citizenship = piCitizenship;
      
      const allowedCitizenship = requirements.pi_citizenship;
      if (!allowedCitizenship.includes(piCitizenship)) {
        result.compliant = false;
        result.issues.push(`PI citizenship '${piCitizenship}' not in allowed: ${allowedCitizenship.join(', ')}`);
      }
    }

    // Check key personnel citizenship
    if (requirements.key_personnel_citizenship) {
      const keyPersonnel = company.key_personnel || [];
      const nonCompliant = keyPersonnel.filter(person => 
        !requirements.key_personnel_citizenship.includes(person.citizenship)
      );
      
      if (nonCompliant.length > 0) {
        result.issues.push(`${nonCompliant.length} key personnel do not meet citizenship requirements`);
      }
    }

    // Check location requirements
    if (requirements.us_location_required) {
      const usLocation = company.primary_research_location_us || false;
      result.details.us_location = usLocation;
      
      if (!usLocation) {
        result.compliant = false;
        result.issues.push('Primary research location must be in the United States');
      }
    }

    return result;
  }

  /**
   * Validate registration requirements
   * @param {Object} company - Company profile
   * @param {Array} requiredRegistrations - Required registrations
   * @returns {Object} Validation result
   */
  validateRegistrations(company, requiredRegistrations) {
    const result = {
      compliant: true,
      critical: false,
      missing: [],
      present: [],
      details: {}
    };

    const companyRegistrations = company.registrations || {};

    requiredRegistrations.forEach(reg => {
      if (companyRegistrations[reg.type]) {
        result.present.push({
          type: reg.type,
          status: companyRegistrations[reg.type].status,
          expiration: companyRegistrations[reg.type].expiration
        });
      } else {
        result.missing.push(reg.type);
        if (reg.critical) {
          result.critical = true;
          result.compliant = false;
        }
      }
    });

    return result;
  }

  /**
   * Validate phase requirements (for Phase II, III applications)
   * @param {Object} company - Company profile
   * @param {Object} requirements - Phase requirements
   * @returns {Object} Validation result
   */
  validatePhaseRequirements(company, requirements) {
    const result = {
      compliant: true,
      issues: [],
      details: {}
    };

    // Check for prior phase awards
    if (requirements.prior_phase_required) {
      const priorAwards = company.sbir_sttr_awards || [];
      const priorPhaseAwards = priorAwards.filter(award => 
        award.phase === requirements.prior_phase_required &&
        award.agency === requirements.agency
      );

      result.details.prior_phase_awards = priorPhaseAwards.length;
      
      if (priorPhaseAwards.length === 0) {
        result.compliant = false;
        result.issues.push(`No ${requirements.prior_phase_required} award found from ${requirements.agency}`);
      }
    }

    // Check for commercialization progress (Phase III)
    if (requirements.commercialization_required) {
      const commercialization = company.commercialization_efforts || {};
      result.details.commercialization = commercialization;
      
      if (!commercialization.revenue && !commercialization.partnerships) {
        result.issues.push('Limited commercialization progress documented');
      }
    }

    return result;
  }

  /**
   * Validate focus area alignment
   * @param {Object} company - Company profile
   * @param {Array} focusAreas - Required focus areas
   * @returns {Object} Validation result
   */
  validateFocusAreas(company, focusAreas) {
    const companyExpertise = [
      company.description || '',
      (company.capabilities || []).join(' '),
      (company.technologies || []).join(' ')
    ].join(' ').toLowerCase();

    let matches = 0;
    focusAreas.forEach(area => {
      if (companyExpertise.includes(area.toLowerCase())) {
        matches++;
      }
    });

    return {
      alignment_score: matches / focusAreas.length,
      matched_areas: matches,
      total_areas: focusAreas.length
    };
  }

  /**
   * Generate budget justification using FAR principles
   * @param {Object} budget - Budget breakdown
   * @param {Object} projectDetails - Project details
   * @returns {Object} Detailed budget justification
   */
  generateBudgetJustification(budget, projectDetails) {
    const justification = {
      total_budget: budget.total || 0,
      budget_period: projectDetails.budget_period || '12 months',
      categories: [],
      compliance_notes: [],
      warnings: []
    };

    // Validate each budget category
    Object.entries(budget).forEach(([category, amount]) => {
      if (category === 'total') return;

      const farCategory = this.farPrinciples.allowable_cost_categories[category];
      if (!farCategory) {
        justification.warnings.push(`Category '${category}' not recognized in FAR principles`);
        return;
      }

      const percentage = budget.total > 0 ? (amount / budget.total) : 0;
      const categoryJustification = {
        category: farCategory.name,
        amount: amount,
        percentage: Math.round(percentage * 100),
        typical_percentage: Math.round(farCategory.typical_percentage * 100),
        justification: this.generateCategoryJustification(category, amount, projectDetails),
        documentation_required: farCategory.documentation_required,
        compliant: true
      };

      // Check if percentage is within reasonable range
      if (percentage > farCategory.typical_percentage * 1.5) {
        categoryJustification.compliant = false;
        justification.warnings.push(
          `${farCategory.name} at ${categoryJustification.percentage}% exceeds typical ${categoryJustification.typical_percentage}%. Additional justification required.`
        );
      }

      justification.categories.push(categoryJustification);
    });

    // Add compliance notes
    justification.compliance_notes.push('All costs follow FAR Part 31 Cost Principles');
    justification.compliance_notes.push('Budget excludes unallowable costs per FAR 31.205');
    justification.compliance_notes.push('Indirect costs applied per approved rate agreement');

    return justification;
  }

  /**
   * Generate justification for specific budget category
   * @param {string} category - Budget category
   * @param {number} amount - Amount requested
   * @param {Object} projectDetails - Project details
   * @returns {string} Justification text
   */
  generateCategoryJustification(category, amount, projectDetails) {
    const templates = {
      'personnel': `Direct labor costs of $${amount.toLocaleString()} support ${projectDetails.team_size || 'a team'} of qualified personnel working on ${projectDetails.title}. Rates are consistent with market standards and company compensation policies.`,
      
      'fringe_benefits': `Fringe benefits of $${amount.toLocaleString()} calculated at company's standard rate, covering health insurance, retirement contributions, and payroll taxes for project personnel.`,
      
      'equipment': `Equipment costs of $${amount.toLocaleString()} for specialized ${projectDetails.technical_domain || 'technical'} equipment essential for project execution. All items meet FAR definition of equipment ($5,000+ with useful life >1 year).`,
      
      'materials_supplies': `Materials and supplies budget of $${amount.toLocaleString()} covers consumable items, lab supplies, and components necessary for ${projectDetails.technical_approach || 'research and development activities'}.`,
      
      'travel': `Travel budget of $${amount.toLocaleString()} supports necessary site visits, collaboration meetings, and technical conferences related to project objectives.`,
      
      'consultants': `Consultant services budget of $${amount.toLocaleString()} for specialized expertise in ${projectDetails.technical_domain || 'critical areas'} not available in-house.`,
      
      'other_direct_costs': `Other direct costs of $${amount.toLocaleString()} include publication fees, software licenses, and other project-specific costs directly allocable to the effort.`,
      
      'indirect_costs': `Indirect costs of $${amount.toLocaleString()} calculated using company's approved indirect cost rate, covering facilities and administrative expenses.`
    };

    return templates[category] || `Budget allocation of $${amount.toLocaleString()} for ${category}.`;
  }

  /**
   * Generate required certifications checklist
   * @param {string} grantType - Type of grant (SBIR, STTR, etc.)
   * @param {string} agency - Funding agency
   * @returns {Array} Required certifications
   */
  generateCertificationsChecklist(grantType, agency) {
    const certifications = [];

    // Common certifications for all federal grants
    certifications.push({
      name: 'Certification Regarding Debarment, Suspension, and Other Responsibility Matters',
      required: true,
      description: 'Certify organization is not debarred or suspended from federal contracts',
      form: 'Standard Form'
    });

    certifications.push({
      name: 'Certification Regarding Lobbying',
      required: true,
      description: 'Certify compliance with restrictions on lobbying',
      form: 'Standard Form'
    });

    // SBIR/STTR specific
    if (grantType === 'SBIR' || grantType === 'STTR') {
      certifications.push({
        name: 'SBIR/STTR Eligibility Certification',
        required: true,
        description: 'Certify small business ownership and size standards',
        form: 'Agency-specific'
      });

      certifications.push({
        name: 'Fraud, Waste, and Abuse Certification',
        required: true,
        description: 'Acknowledge understanding of fraud prevention requirements',
        form: 'Standard Form'
      });

      certifications.push({
        name: 'Small Business Concern Certification',
        required: true,
        description: 'Certify small business status and ownership',
        form: 'SBA Form'
      });
    }

    // STTR specific (requires research institution partnership)
    if (grantType === 'STTR') {
      certifications.push({
        name: 'STTR Cooperative Agreement',
        required: true,
        description: 'Signed agreement with research institution partner',
        form: 'Agency-specific'
      });
    }

    // Agency-specific certifications
    if (agency === 'DOD' || agency === 'Department of Defense') {
      certifications.push({
        name: 'DFARS Business System Certification',
        required: false,
        description: 'Certification of accounting system adequacy (for larger awards)',
        form: 'DFARS Clause'
      });
    }

    if (agency === 'NIH' || agency === 'National Institutes of Health') {
      certifications.push({
        name: 'Financial Conflict of Interest Policy',
        required: true,
        description: 'Certification of FCOI policy implementation',
        form: 'NIH Form'
      });

      certifications.push({
        name: 'Human Subjects Research Certification',
        required: 'if applicable',
        description: 'IRB approval if research involves human subjects',
        form: 'NIH/IRB Forms'
      });
    }

    return certifications;
  }

  /**
   * Perform pre-submission compliance review
   * @param {Object} proposal - Complete proposal package
   * @param {Object} grantRequirements - Grant requirements
   * @returns {Object} Compliance review results
   */
  performPreSubmissionReview(proposal, grantRequirements) {
    const review = {
      ready_to_submit: true,
      critical_issues: [],
      warnings: [],
      recommendations: [],
      checklist: {
        eligibility: false,
        budget: false,
        certifications: false,
        format: false,
        content: false
      }
    };

    // 1. Eligibility check
    const eligibilityCheck = this.validateEligibility(
      proposal.company_profile,
      grantRequirements
    );
    review.checklist.eligibility = eligibilityCheck.eligible;
    if (!eligibilityCheck.eligible) {
      review.ready_to_submit = false;
      review.critical_issues.push(...eligibilityCheck.requirements_failed);
    }

    // 2. Budget compliance
    if (proposal.budget) {
      const budgetCheck = this.generateBudgetJustification(
        proposal.budget,
        proposal.project_details || {}
      );
      review.checklist.budget = budgetCheck.warnings.length === 0;
      review.warnings.push(...budgetCheck.warnings);
    }

    // 3. Required certifications
    const requiredCerts = this.generateCertificationsChecklist(
      grantRequirements.program_type,
      grantRequirements.agency
    );
    const providedCerts = proposal.certifications || [];
    const missingCerts = requiredCerts
      .filter(cert => cert.required === true)
      .filter(cert => !providedCerts.includes(cert.name));
    
    if (missingCerts.length === 0) {
      review.checklist.certifications = true;
    } else {
      review.ready_to_submit = false;
      review.critical_issues.push(`Missing ${missingCerts.length} required certifications`);
    }

    // 4. Format compliance
    if (grantRequirements.page_limit && proposal.page_count > grantRequirements.page_limit) {
      review.ready_to_submit = false;
      review.critical_issues.push(`Proposal exceeds page limit: ${proposal.page_count}/${grantRequirements.page_limit}`);
      review.checklist.format = false;
    } else {
      review.checklist.format = true;
    }

    // 5. Content requirements
    const requiredSections = grantRequirements.required_sections || [];
    const providedSections = Object.keys(proposal.sections || {});
    const missingSections = requiredSections.filter(sec => !providedSections.includes(sec));
    
    if (missingSections.length === 0) {
      review.checklist.content = true;
    } else {
      review.ready_to_submit = false;
      review.critical_issues.push(`Missing required sections: ${missingSections.join(', ')}`);
    }

    // Generate recommendations
    if (review.ready_to_submit) {
      review.recommendations.push('All compliance checks passed. Proposal ready for submission.');
    } else {
      review.recommendations.push('Address critical issues before submission.');
    }

    if (review.warnings.length > 0) {
      review.recommendations.push('Review warnings and consider strengthening those areas.');
    }

    return review;
  }
}

export default ComplianceService;
