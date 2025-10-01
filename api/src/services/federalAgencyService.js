// Federal Agency Service for VoidCat Grant Automation Platform
// Manages continuous scanning of 11 federal agency SBIR/STTR portals

export class FederalAgencyService {
  constructor(config = {}) {
    this.config = config;
    this.agencies = this.initializeAgencies();
  }

  /**
   * Initialize configuration for 11 federal agency SBIR/STTR portals
   * @returns {Array} Array of agency configurations
   */
  initializeAgencies() {
    return [
      {
        id: 'dod',
        name: 'Department of Defense',
        acronym: 'DOD',
        portal_url: 'https://www.dodsbirsttr.mil/submissions/login',
        api_endpoint: 'https://www.dodsbirsttr.mil/api/opportunities',
        program_types: ['SBIR', 'STTR'],
        solicitation_schedule: 'quarterly',
        phases: ['Phase I', 'Phase II', 'Phase III'],
        typical_awards: {
          'Phase I': { min: 50000, max: 250000 },
          'Phase II': { min: 500000, max: 1500000 }
        },
        active: true
      },
      {
        id: 'nsf',
        name: 'National Science Foundation',
        acronym: 'NSF',
        portal_url: 'https://www.nsf.gov/funding/',
        api_endpoint: 'https://www.nsf.gov/awardsearch/download.jsp',
        program_types: ['SBIR', 'STTR'],
        solicitation_schedule: 'continuous',
        phases: ['Phase I', 'Phase II', 'Phase IIB'],
        typical_awards: {
          'Phase I': { min: 256000, max: 256000 },
          'Phase II': { min: 1000000, max: 1000000 }
        },
        active: true
      },
      {
        id: 'doe',
        name: 'Department of Energy',
        acronym: 'DOE',
        portal_url: 'https://science.osti.gov/sbir',
        api_endpoint: 'https://science.osti.gov/sbir/api/opportunities',
        program_types: ['SBIR', 'STTR'],
        solicitation_schedule: 'annual',
        phases: ['Phase I', 'Phase II'],
        typical_awards: {
          'Phase I': { min: 200000, max: 200000 },
          'Phase II': { min: 1100000, max: 1100000 }
        },
        active: true
      },
      {
        id: 'nasa',
        name: 'National Aeronautics and Space Administration',
        acronym: 'NASA',
        portal_url: 'https://sbir.nasa.gov/',
        api_endpoint: 'https://sbir.nasa.gov/api/opportunities',
        program_types: ['SBIR', 'STTR'],
        solicitation_schedule: 'annual',
        phases: ['Phase I', 'Phase II', 'Phase III'],
        typical_awards: {
          'Phase I': { min: 125000, max: 125000 },
          'Phase II': { min: 750000, max: 750000 }
        },
        active: true
      },
      {
        id: 'nih',
        name: 'National Institutes of Health',
        acronym: 'NIH',
        portal_url: 'https://sbir.nih.gov/',
        api_endpoint: 'https://sbir.nih.gov/api/opportunities',
        program_types: ['SBIR', 'STTR'],
        solicitation_schedule: 'continuous',
        phases: ['Phase I', 'Phase II', 'Fast-Track'],
        typical_awards: {
          'Phase I': { min: 300000, max: 300000 },
          'Phase II': { min: 2000000, max: 2000000 }
        },
        active: true
      },
      {
        id: 'darpa',
        name: 'Defense Advanced Research Projects Agency',
        acronym: 'DARPA',
        portal_url: 'https://www.darpa.mil/work-with-us/opportunities',
        api_endpoint: 'https://www.darpa.mil/api/opportunities',
        program_types: ['SBIR', 'Research'],
        solicitation_schedule: 'rolling',
        phases: ['Phase I', 'Phase II', 'Phase III'],
        typical_awards: {
          'Phase I': { min: 250000, max: 1500000 },
          'Phase II': { min: 1000000, max: 5000000 }
        },
        active: true
      },
      {
        id: 'usda',
        name: 'United States Department of Agriculture',
        acronym: 'USDA',
        portal_url: 'https://www.nifa.usda.gov/grants/programs/sbir',
        api_endpoint: 'https://www.nifa.usda.gov/api/sbir/opportunities',
        program_types: ['SBIR', 'STTR'],
        solicitation_schedule: 'annual',
        phases: ['Phase I', 'Phase II'],
        typical_awards: {
          'Phase I': { min: 100000, max: 100000 },
          'Phase II': { min: 600000, max: 600000 }
        },
        active: true
      },
      {
        id: 'dhs',
        name: 'Department of Homeland Security',
        acronym: 'DHS',
        portal_url: 'https://www.dhs.gov/science-and-technology/sbir',
        api_endpoint: 'https://www.dhs.gov/api/sbir/opportunities',
        program_types: ['SBIR'],
        solicitation_schedule: 'annual',
        phases: ['Phase I', 'Phase II'],
        typical_awards: {
          'Phase I': { min: 150000, max: 150000 },
          'Phase II': { min: 1000000, max: 1000000 }
        },
        active: true
      },
      {
        id: 'noaa',
        name: 'National Oceanic and Atmospheric Administration',
        acronym: 'NOAA',
        portal_url: 'https://www.noaa.gov/organization/acquisition-grants',
        api_endpoint: 'https://www.noaa.gov/api/sbir/opportunities',
        program_types: ['SBIR'],
        solicitation_schedule: 'annual',
        phases: ['Phase I', 'Phase II'],
        typical_awards: {
          'Phase I': { min: 100000, max: 100000 },
          'Phase II': { min: 400000, max: 400000 }
        },
        active: true
      },
      {
        id: 'epa',
        name: 'Environmental Protection Agency',
        acronym: 'EPA',
        portal_url: 'https://www.epa.gov/sbir',
        api_endpoint: 'https://www.epa.gov/api/sbir/opportunities',
        program_types: ['SBIR'],
        solicitation_schedule: 'annual',
        phases: ['Phase I', 'Phase II'],
        typical_awards: {
          'Phase I': { min: 100000, max: 100000 },
          'Phase II': { min: 300000, max: 300000 }
        },
        active: true
      },
      {
        id: 'ed',
        name: 'Department of Education',
        acronym: 'ED',
        portal_url: 'https://ies.ed.gov/funding/sbir.asp',
        api_endpoint: 'https://ies.ed.gov/api/sbir/opportunities',
        program_types: ['SBIR'],
        solicitation_schedule: 'annual',
        phases: ['Phase I', 'Phase II'],
        typical_awards: {
          'Phase I': { min: 200000, max: 200000 },
          'Phase II': { min: 1000000, max: 1000000 }
        },
        active: true
      }
    ];
  }

  /**
   * Get all active federal agencies
   * @returns {Array} Array of active agencies
   */
  getActiveAgencies() {
    return this.agencies.filter(agency => agency.active);
  }

  /**
   * Get agency by ID
   * @param {string} agencyId - Agency ID
   * @returns {Object|null} Agency object or null
   */
  getAgencyById(agencyId) {
    return this.agencies.find(agency => agency.id === agencyId) || null;
  }

  /**
   * Get agency by acronym
   * @param {string} acronym - Agency acronym
   * @returns {Object|null} Agency object or null
   */
  getAgencyByAcronym(acronym) {
    return this.agencies.find(agency => 
      agency.acronym.toLowerCase() === acronym.toLowerCase()
    ) || null;
  }

  /**
   * Get agencies supporting a specific program type
   * @param {string} programType - Program type (SBIR, STTR, etc.)
   * @returns {Array} Array of agencies
   */
  getAgenciesByProgramType(programType) {
    return this.agencies.filter(agency => 
      agency.program_types.includes(programType.toUpperCase())
    );
  }

  /**
   * Get scanning schedule for all agencies
   * @returns {Object} Scanning schedule organized by frequency
   */
  getScanningSchedule() {
    const schedule = {
      continuous: [],
      daily: [],
      weekly: [],
      quarterly: [],
      annual: [],
      rolling: []
    };

    this.agencies.forEach(agency => {
      const freq = agency.solicitation_schedule;
      if (schedule[freq]) {
        schedule[freq].push({
          id: agency.id,
          name: agency.name,
          acronym: agency.acronym,
          portal_url: agency.portal_url
        });
      }
    });

    return schedule;
  }

  /**
   * Get expected award ranges for a phase
   * @param {string} agencyId - Agency ID
   * @param {string} phase - Phase name
   * @returns {Object|null} Award range or null
   */
  getAwardRange(agencyId, phase) {
    const agency = this.getAgencyById(agencyId);
    if (!agency || !agency.typical_awards[phase]) {
      return null;
    }
    return agency.typical_awards[phase];
  }

  /**
   * Get summary statistics for all agencies
   * @returns {Object} Summary statistics
   */
  getStatistics() {
    return {
      total_agencies: this.agencies.length,
      active_agencies: this.getActiveAgencies().length,
      by_program_type: {
        SBIR: this.getAgenciesByProgramType('SBIR').length,
        STTR: this.getAgenciesByProgramType('STTR').length
      },
      by_schedule: {
        continuous: this.agencies.filter(a => a.solicitation_schedule === 'continuous').length,
        quarterly: this.agencies.filter(a => a.solicitation_schedule === 'quarterly').length,
        annual: this.agencies.filter(a => a.solicitation_schedule === 'annual').length,
        rolling: this.agencies.filter(a => a.solicitation_schedule === 'rolling').length
      }
    };
  }
}

export default FederalAgencyService;
