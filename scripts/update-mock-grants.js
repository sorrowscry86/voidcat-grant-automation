#!/usr/bin/env node

// Mock Grant Data Update Script for VoidCat Grant Automation Platform
// This script can be used to update the mock grant dataset

import fs from 'fs';
import path from 'path';

const MOCK_DATA_PATH = path.join(process.cwd(), 'api/src/data/mock-grants.json');

/**
 * Show statistics about the mock dataset
 */
function showStatistics() {
  try {
    const data = fs.readFileSync(MOCK_DATA_PATH, 'utf8');
    const mockData = JSON.parse(data);
    
    console.log('📊 Mock Grant Dataset Statistics');
    console.log('================================');
    console.log(`Total Grants: ${mockData.grants.length}`);
    console.log(`Last Updated: ${mockData.meta.last_updated}`);
    console.log(`Version: ${mockData.meta.version}`);
    
    // Agency distribution
    const agencies = {};
    mockData.grants.forEach(grant => {
      agencies[grant.agency] = (agencies[grant.agency] || 0) + 1;
    });
    
    console.log('\n🏛️  Agency Distribution:');
    Object.entries(agencies).forEach(([agency, count]) => {
      console.log(`  ${agency}: ${count} grants`);
    });
    
    return true;
  } catch (error) {
    console.error('Failed to show statistics:', error.message);
    return false;
  }
}

/**
 * Validate all grants in the dataset
 */
function validateMockData() {
  try {
    const data = fs.readFileSync(MOCK_DATA_PATH, 'utf8');
    const mockData = JSON.parse(data);
    
    console.log('🔍 Validating mock grant data...');
    
    let isValid = true;
    const requiredFields = ['id', 'title', 'agency', 'program', 'deadline', 'amount', 'description'];
    
    mockData.grants.forEach((grant, index) => {
      console.log(`\n📋 Validating grant ${index + 1}: ${grant.id}`);
      
      // Check required fields
      let grantValid = true;
      requiredFields.forEach(field => {
        if (!grant[field]) {
          console.error(`  ❌ Missing field: ${field}`);
          isValid = false;
          grantValid = false;
        }
      });
      
      // Validate date format
      if (grant.deadline) {
        const date = new Date(grant.deadline);
        if (isNaN(date.getTime())) {
          console.error(`  ❌ Invalid deadline format: ${grant.deadline}`);
          isValid = false;
          grantValid = false;
        }
      }
      
      if (grantValid) {
        console.log(`  ✅ Valid grant: ${grant.title}`);
      }
    });
    
    console.log(`\n📊 Validation complete: ${mockData.grants.length} grants checked`);
    console.log(isValid ? '✅ All grants are valid' : '❌ Some validations failed');
    
    return isValid;
  } catch (error) {
    console.error('Failed to validate mock data:', error.message);
    return false;
  }
}

/**
 * Main script logic
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🎯 VoidCat Mock Grant Data Update Script');
  console.log('========================================\n');
  
  switch (command) {
    case 'validate':
      validateMockData();
      break;
      
    case 'stats':
      showStatistics();
      break;
      
    default:
      console.log('Available commands:');
      console.log('  validate - Validate all grants in the dataset');
      console.log('  stats    - Show dataset statistics');
      console.log('');
      console.log('Examples:');
      console.log('  node update-mock-grants.js validate');
      console.log('  node update-mock-grants.js stats');
      break;
  }
}

// Run the script
main();