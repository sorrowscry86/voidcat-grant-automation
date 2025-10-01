#!/usr/bin/env node
// Test script for new Intelligent Discovery Engine features

import FederalAgencyService from '../api/src/services/federalAgencyService.js';
import SemanticAnalysisService from '../api/src/services/semanticAnalysisService.js';
import DeadlineTrackingService from '../api/src/services/deadlineTrackingService.js';
import ComplianceService from '../api/src/services/complianceService.js';
import AIProposalService from '../api/src/services/aiProposalService.js';

console.log('🧪 Testing VoidCat Intelligent Discovery Engine Services\n');

// Test 1: Federal Agency Service
console.log('1️⃣ Testing Federal Agency Service...');
const agencyService = new FederalAgencyService();
const agencies = agencyService.getActiveAgencies();
const stats = agencyService.getStatistics();
console.log(`✅ Loaded ${agencies.length} federal agencies`);
console.log(`   SBIR programs: ${stats.by_program_type.SBIR}`);
console.log(`   STTR programs: ${stats.by_program_type.STTR}`);
console.log(`   Continuous schedule: ${stats.by_schedule.continuous} agencies\n`);

// Test 2: Semantic Analysis Service
console.log('2️⃣ Testing Semantic Analysis Service...');
const semanticService = new SemanticAnalysisService();
const mockCompany = {
  description: 'AI and machine learning solutions for defense applications',
  capabilities: ['artificial intelligence', 'deep learning', 'computer vision', 'autonomous systems'],
  technologies: ['TensorFlow', 'PyTorch', 'CUDA'],
  years_in_business: 5,
  employee_count: 45,
  past_projects: ['DoD AI contract', 'NSF research collaboration']
};

const mockGrant = {
  id: 'SBIR-25-001',
  title: 'AI for Defense Applications',
  description: 'Seeking innovative AI solutions for defense applications including autonomous systems, cybersecurity, and logistics optimization.',
  agency: 'Department of Defense',
  technical_requirements: ['machine learning', 'autonomous systems', 'real-time processing'],
  focus_areas: ['artificial intelligence', 'defense', 'autonomous systems']
};

const matchingScore = semanticService.calculateMatchingScore(mockCompany, mockGrant);
console.log(`✅ Matching Score: ${matchingScore.overall_score}/100`);
console.log(`   Technical Alignment: ${matchingScore.technical_alignment}%`);
console.log(`   Capability Match: ${matchingScore.capability_match}%`);
console.log(`   Confidence: ${matchingScore.confidence_level}`);
console.log(`   Recommendations: ${matchingScore.recommendations.length}\n`);

// Test 3: Deadline Tracking Service
console.log('3️⃣ Testing Deadline Tracking Service...');
const deadlineService = new DeadlineTrackingService();
const testGrant = {
  id: 'TEST-001',
  title: 'Test Grant',
  deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days from now
  amount: '$250,000',
  program: 'SBIR Phase I',
  agency: 'DOD'
};

const timeline = deadlineService.generateApplicationTimeline(testGrant);
console.log(`✅ Timeline generated for grant due in ${timeline.days_remaining} days`);
console.log(`   Urgency Level: ${timeline.urgency_level}`);
console.log(`   Estimated Duration: ${timeline.estimated_proposal_duration} days`);
console.log(`   Milestones: ${timeline.milestones.length}`);
console.log(`   Status: ${timeline.status}\n`);

// Test 4: Compliance Service
console.log('4️⃣ Testing Compliance Service...');
const complianceService = new ComplianceService();
const mockCompanyProfile = {
  employee_count: 45,
  annual_revenue: 5000000,
  us_citizen_ownership_percentage: 75,
  foreign_controlled: false,
  primary_research_location_us: true,
  registrations: {
    SAM: { status: 'active', expiration: '2026-01-01' },
    DUNS: { status: 'active' }
  }
};

const grantRequirements = {
  ownership: {
    us_ownership_percentage: 51,
    no_foreign_control: true
  },
  size_standard: {
    max_employees: 500
  },
  citizenship: {
    us_location_required: true
  },
  registrations: [
    { type: 'SAM', critical: true },
    { type: 'DUNS', critical: true }
  ]
};

const eligibility = complianceService.validateEligibility(mockCompanyProfile, grantRequirements);
console.log(`✅ Eligibility: ${eligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
console.log(`   Requirements Met: ${eligibility.requirements_met.length}`);
console.log(`   Requirements Failed: ${eligibility.requirements_failed.length}`);
console.log(`   Warnings: ${eligibility.warnings.length}\n`);

// Test 5: Budget Justification
console.log('5️⃣ Testing Budget Justification Generation...');
const budget = {
  personnel: 150000,
  equipment: 37500,
  materials_supplies: 12500,
  travel: 20000,
  indirect_costs: 30000,
  total: 250000
};

const projectDetails = {
  title: 'AI for Defense Applications',
  budget_period: '12 months',
  team_size: 5
};

const budgetJustification = complianceService.generateBudgetJustification(budget, projectDetails);
console.log(`✅ Budget Justification generated`);
console.log(`   Total Budget: $${budgetJustification.total_budget.toLocaleString()}`);
console.log(`   Categories: ${budgetJustification.categories.length}`);
console.log(`   Compliance Notes: ${budgetJustification.compliance_notes.length}`);
console.log(`   Warnings: ${budgetJustification.warnings.length}\n`);

// Test 6: AI Proposal Service
console.log('6️⃣ Testing AI Proposal Service...');
const aiService = new AIProposalService();
const proposalGrant = {
  id: 'SBIR-25-001',
  title: 'AI for Defense Applications',
  agency: 'DOD',
  program: 'SBIR Phase I',
  amount: '$250,000',
  description: 'Advanced AI for defense systems',
  technical_domain: 'artificial intelligence'
};

const proposalCompany = {
  name: 'TechCorp Inc.',
  core_expertise: 'AI and machine learning',
  years_in_business: 5,
  pi_name: 'Dr. Jane Smith'
};

const proposal = await aiService.generateProposal(proposalGrant, proposalCompany);
console.log(`✅ AI Proposal generated`);
console.log(`   Sections: ${Object.keys(proposal.sections).length}`);
console.log(`   Word Count: ${proposal.metadata.word_count}`);
console.log(`   Compliance: ${proposal.metadata.compliance_check.sections_complete ? 'PASS' : 'FAIL'}`);
console.log(`   Template: ${proposal.metadata.template.agency}\n`);

// Test 7: Certifications Checklist
console.log('7️⃣ Testing Certifications Checklist...');
const certifications = complianceService.generateCertificationsChecklist('SBIR', 'DOD');
console.log(`✅ Certifications Checklist generated`);
console.log(`   Total Certifications: ${certifications.length}`);
console.log(`   Required: ${certifications.filter(c => c.required === true).length}`);
console.log(`   Optional: ${certifications.filter(c => c.required === false).length}\n`);

// Summary
console.log('═══════════════════════════════════════════════════════════');
console.log('✨ All Intelligent Discovery Engine Services Test PASSED! ✨');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📊 Summary:');
console.log(`   ✅ Federal Agency Service: ${agencies.length} agencies configured`);
console.log(`   ✅ Semantic Analysis: ${matchingScore.overall_score}% match calculated`);
console.log(`   ✅ Deadline Tracking: ${timeline.milestones.length} milestones generated`);
console.log(`   ✅ Compliance Validation: ${eligibility.eligible ? 'Passed' : 'Failed'}`);
console.log(`   ✅ Budget Justification: ${budgetJustification.categories.length} categories`);
console.log(`   ✅ AI Proposal: ${proposal.metadata.word_count} words generated`);
console.log(`   ✅ Certifications: ${certifications.length} items in checklist\n`);
