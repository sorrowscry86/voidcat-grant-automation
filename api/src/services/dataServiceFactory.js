// DataService Factory for VoidCat Grant Automation Platform
// Ensures consistent service instantiation and prevents memory leaks

import DataService from './dataService.js';

/**
 * Service Factory for DataService
 * Implements singleton pattern with configuration management
 * Prevents multiple instantiations and ensures consistent state
 */
class DataServiceFactory {
  constructor() {
    // Store service instances per configuration hash
    this.instances = new Map();
    this.initializationPromises = new Map();
  }

  /**
   * Generate a cache key from configuration
   * @param {Object} config - Service configuration
   * @returns {string} Configuration hash
   */
  getConfigHash(config = {}) {
    // Create a stable hash from config properties
    const configStr = JSON.stringify({
      live_data: config.live_data || null,
      use_cache: config.use_cache !== false,
      // Add other relevant config properties here
    });
    return configStr;
  }

  /**
   * Get or create a DataService instance
   * @param {Object} config - Service configuration
   * @returns {Promise<DataService>} Initialized DataService instance
   */
  async getInstance(config = {}) {
    const configHash = this.getConfigHash(config);

    // Return existing instance if available
    if (this.instances.has(configHash)) {
      const instance = this.instances.get(configHash);
      
      // Wait for initialization if in progress
      if (this.initializationPromises.has(configHash)) {
        await this.initializationPromises.get(configHash);
      }
      
      return instance;
    }

    // Create new instance
    const instance = new DataService(config);
    this.instances.set(configHash, instance);

    // Handle async initialization if the service has an init method
    if (typeof instance.initialize === 'function') {
      const initPromise = instance.initialize();
      this.initializationPromises.set(configHash, initPromise);
      
      try {
        await initPromise;
      } finally {
        this.initializationPromises.delete(configHash);
      }
    }

    return instance;
  }

  /**
   * Get a DataService instance synchronously (for backward compatibility)
   * WARNING: This may return an uninitialized instance
   * @param {Object} config - Service configuration
   * @returns {DataService} DataService instance
   */
  getInstanceSync(config = {}) {
    const configHash = this.getConfigHash(config);

    if (this.instances.has(configHash)) {
      return this.instances.get(configHash);
    }

    const instance = new DataService(config);
    this.instances.set(configHash, instance);

    return instance;
  }

  /**
   * Update configuration for an existing instance
   * @param {Object} config - New configuration to merge
   * @returns {Promise<DataService>} Updated DataService instance
   */
  async updateConfig(config = {}) {
    const configHash = this.getConfigHash(config);
    
    if (this.instances.has(configHash)) {
      return this.instances.get(configHash);
    }

    // If no exact match, create new instance with merged config
    return await this.getInstance(config);
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  clearAll() {
    this.instances.clear();
    this.initializationPromises.clear();
  }

  /**
   * Clear a specific instance by config
   * @param {Object} config - Configuration of instance to clear
   */
  clearInstance(config = {}) {
    const configHash = this.getConfigHash(config);
    this.instances.delete(configHash);
    this.initializationPromises.delete(configHash);
  }

  /**
   * Get statistics about cached instances
   * @returns {Object} Factory statistics
   */
  getStats() {
    return {
      totalInstances: this.instances.size,
      initializingInstances: this.initializationPromises.size,
      configHashes: Array.from(this.instances.keys())
    };
  }
}

// Export singleton factory instance
const dataServiceFactory = new DataServiceFactory();

export default dataServiceFactory;
export { DataServiceFactory };