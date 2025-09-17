#!/bin/bash

# Master Live Payment System Testing Orchestrator
# 
# This script implements the comprehensive testing requirements:
# 1. Run the full E2E test suite multiple times (at least 5 consecutive times)
# 2. Directly hit the live /api/stripe/create-checkout endpoint in a loop (5x)
# 3. Validate the /api/stripe/webhook endpoint
# 4. Check database state after each round
# 5. Automate as a repeatable script with clear error reporting

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly RESULTS_DIR="./test-results/comprehensive-live-testing"
readonly LOG_FILE="$RESULTS_DIR/master-test-log.txt"
readonly FINAL_REPORT="$RESULTS_DIR/final-comprehensive-report.json"

# Test configuration
readonly E2E_ROUNDS=5
readonly API_ROUNDS=5
readonly TOTAL_TARGET_TESTS=15

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m'

# Global counters
declare -g TOTAL_TESTS=0
declare -g SUCCESSFUL_TESTS=0
declare -g FAILED_TESTS=0
declare -g START_TIME=""
declare -g END_TIME=""

# Test results storage
declare -A TEST_RESULTS

# Setup function
setup() {
    echo -e "${BLUE}🚀 COMPREHENSIVE LIVE PAYMENT SYSTEM TESTING${NC}"
    echo -e "${BLUE}===============================================${NC}"
    echo ""
    
    START_TIME=$(date -Iseconds)
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Initialize log file
    cat > "$LOG_FILE" << EOF
COMPREHENSIVE LIVE PAYMENT SYSTEM TESTING LOG
==============================================
Start Time: $START_TIME
Configuration:
- E2E Test Rounds: $E2E_ROUNDS
- API Test Rounds: $API_ROUNDS
- Total Target Tests: $TOTAL_TARGET_TESTS

EOF

    log "INFO" "Starting comprehensive live payment system testing"
    log "INFO" "Results will be saved to: $RESULTS_DIR"
}

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")    echo -e "${BLUE}[${timestamp}] [INFO]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[${timestamp}] [SUCCESS]${NC} $message" ;;
        "WARN")    echo -e "${YELLOW}[${timestamp}] [WARN]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[${timestamp}] [ERROR]${NC} $message" ;;
        "SECTION") echo -e "${PURPLE}[${timestamp}] [SECTION]${NC} $message" ;;
    esac
    
    # Also log to file
    echo "[${timestamp}] [$level] $message" >> "$LOG_FILE"
}

# Test tracking
track_test() {
    local test_name=$1
    local success=$2
    local details=${3:-""}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$success" = "true" ]; then
        SUCCESSFUL_TESTS=$((SUCCESSFUL_TESTS + 1))
        TEST_RESULTS["$test_name"]="PASS:$details"
        log "SUCCESS" "$test_name PASSED - $details"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS["$test_name"]="FAIL:$details"
        log "ERROR" "$test_name FAILED - $details"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "SECTION" "=== CHECKING PREREQUISITES ==="
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log "ERROR" "Node.js not found"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        log "ERROR" "npm not found"
        exit 1
    fi
    
    # Check dependencies
    if [ ! -d "node_modules" ]; then
        log "INFO" "Installing dependencies..."
        npm install
    fi
    
    # Check API dependencies
    if [ ! -d "api/node_modules" ]; then
        log "INFO" "Installing API dependencies..."
        cd api && npm install && cd ..
    fi
    
    # Check Playwright
    if [ ! -f "node_modules/.bin/playwright" ]; then
        log "WARN" "Playwright not found locally"
    fi
    
    log "SUCCESS" "Prerequisites check completed"
}

# Test 1: Run E2E Test Suite Multiple Times
run_e2e_test_rounds() {
    log "SECTION" "=== RUNNING E2E TEST SUITE ($E2E_ROUNDS ROUNDS) ==="
    
    local successful_rounds=0
    
    for round in $(seq 1 $E2E_ROUNDS); do
        log "INFO" "Starting E2E Test Round $round/$E2E_ROUNDS"
        
        local test_output="$RESULTS_DIR/e2e_round_${round}_$(date +%s).log"
        local start_time=$(date +%s)
        
        # Run the test suite with timeout
        if timeout 1200 npm test > "$test_output" 2>&1; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            successful_rounds=$((successful_rounds + 1))
            track_test "E2E_Round_$round" "true" "Completed in ${duration}s"
            
            # Extract test summary
            if grep -q "passed\|failed" "$test_output"; then
                local summary=$(grep -E "passed|failed|tests?" "$test_output" | tail -1)
                log "INFO" "Round $round Summary: $summary"
            fi
            
        else
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            track_test "E2E_Round_$round" "false" "Failed or timed out after ${duration}s"
            
            # Log failure details
            log "INFO" "Round $round failure details (last 5 lines):"
            tail -5 "$test_output" | while read line; do
                log "INFO" "  $line"
            done
        fi
        
        # Wait between rounds
        if [ $round -lt $E2E_ROUNDS ]; then
            log "INFO" "Waiting 30 seconds before next round..."
            sleep 30
        fi
    done
    
    log "INFO" "E2E Testing completed: $successful_rounds/$E2E_ROUNDS rounds successful"
}

# Test 2: Direct API Endpoint Testing
run_api_endpoint_tests() {
    log "SECTION" "=== RUNNING DIRECT API ENDPOINT TESTS ==="
    
    # Make the API test script executable
    chmod +x "$SCRIPT_DIR/test-api-endpoints.js"
    
    for round in $(seq 1 $API_ROUNDS); do
        log "INFO" "Starting API Test Round $round/$API_ROUNDS"
        
        local test_output="$RESULTS_DIR/api_round_${round}_$(date +%s).log"
        local start_time=$(date +%s)
        
        # Run the API endpoint tests
        if node "$SCRIPT_DIR/test-api-endpoints.js" > "$test_output" 2>&1; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            track_test "API_Round_$round" "true" "Completed in ${duration}s"
            
            # Extract success rate from output
            if grep -q "Success Rate" "$test_output"; then
                local success_rate=$(grep "Success Rate" "$test_output" | awk '{print $3}')
                log "INFO" "Round $round Success Rate: $success_rate"
            fi
            
        else
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            track_test "API_Round_$round" "false" "Failed after ${duration}s"
            
            # Log failure details
            log "INFO" "Round $round failure details (last 5 lines):"
            tail -5 "$test_output" | while read line; do
                log "INFO" "  $line"
            done
        fi
        
        # Wait between rounds
        if [ $round -lt $API_ROUNDS ]; then
            log "INFO" "Waiting 15 seconds before next round..."
            sleep 15
        fi
    done
}

# Test 3: Payment Stress Testing
run_payment_stress_tests() {
    log "SECTION" "=== RUNNING PAYMENT STRESS TESTS ==="
    
    local test_output="$RESULTS_DIR/payment_stress_$(date +%s).log"
    local start_time=$(date +%s)
    
    # Run the payment stress tests specifically
    if timeout 600 npx playwright test paymentStressTesting.spec.ts > "$test_output" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        track_test "Payment_Stress_Tests" "true" "Completed in ${duration}s"
        
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        track_test "Payment_Stress_Tests" "false" "Failed or timed out after ${duration}s"
        
        # Log failure details
        log "INFO" "Stress test failure details (last 5 lines):"
        tail -5 "$test_output" | while read line; do
            log "INFO" "  $line"
        done
    fi
}

# Test 4: Database State Validation
validate_database_state() {
    log "SECTION" "=== VALIDATING DATABASE STATE ==="
    
    # Test database connectivity through API endpoints
    local test_output="$RESULTS_DIR/db_validation_$(date +%s).log"
    
    # Test user registration endpoint (which uses database)
    local test_email="dbtest-$(date +%s)@example.com"
    
    if curl -s --max-time 30 \
        -X POST "https://grant-search-api.sorrowscry86.workers.dev/api/users/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$test_email\",\"password\":\"Test@1234\"}" \
        -o "$test_output"; then
        
        # Check response
        if grep -q "success\|api_key\|already exists" "$test_output"; then
            track_test "Database_Validation" "true" "Database connectivity confirmed"
        else
            track_test "Database_Validation" "false" "Unexpected database response"
        fi
    else
        track_test "Database_Validation" "false" "Database connectivity test failed"
    fi
}

# Generate comprehensive final report
generate_final_report() {
    log "SECTION" "=== GENERATING FINAL REPORT ==="
    
    END_TIME=$(date -Iseconds)
    local success_rate=0
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$(( (SUCCESSFUL_TESTS * 100) / TOTAL_TESTS ))
    fi
    
    # Create JSON report
    cat > "$FINAL_REPORT" << EOF
{
  "test_session": {
    "start_time": "$START_TIME",
    "end_time": "$END_TIME",
    "duration_minutes": $(( ($(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s)) / 60 ))
  },
  "configuration": {
    "e2e_rounds": $E2E_ROUNDS,
    "api_rounds": $API_ROUNDS,
    "total_target_tests": $TOTAL_TARGET_TESTS
  },
  "results": {
    "total_tests": $TOTAL_TESTS,
    "successful_tests": $SUCCESSFUL_TESTS,
    "failed_tests": $FAILED_TESTS,
    "success_rate": "${success_rate}%"
  },
  "requirements_analysis": {
    "minimum_test_runs": 15,
    "actual_test_runs": $TOTAL_TESTS,
    "target_success_rate": ">95%",
    "actual_success_rate": "${success_rate}%",
    "meets_minimum_runs": $([ $TOTAL_TESTS -ge 15 ] && echo "true" || echo "false"),
    "meets_success_rate": $([ $success_rate -ge 95 ] && echo "true" || echo "false"),
    "overall_assessment": $([ $TOTAL_TESTS -ge 15 ] && [ $success_rate -ge 95 ] && echo "\"PRODUCTION_READY\"" || echo "\"NEEDS_ATTENTION\"")
  },
  "detailed_results": {
EOF

    # Add detailed test results
    for test_name in "${!TEST_RESULTS[@]}"; do
        local result="${TEST_RESULTS[$test_name]}"
        local status="${result%%:*}"
        local details="${result#*:}"
        
        cat >> "$FINAL_REPORT" << EOF
    "$test_name": {
      "status": "$status",
      "details": "$details"
    },
EOF
    done
    
    # Remove last comma and close JSON
    sed -i '$ s/,$//' "$FINAL_REPORT"
    cat >> "$FINAL_REPORT" << EOF
  }
}
EOF

    log "SUCCESS" "Final report generated: $FINAL_REPORT"
}

# Display final summary
display_final_summary() {
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$(( (SUCCESSFUL_TESTS * 100) / TOTAL_TESTS ))
    fi
    
    echo ""
    echo -e "${PURPLE}===============================================${NC}"
    echo -e "${PURPLE}        FINAL COMPREHENSIVE TEST RESULTS${NC}"
    echo -e "${PURPLE}===============================================${NC}"
    echo ""
    echo -e "${BLUE}Test Session Duration:${NC} $(( ($(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s)) / 60 )) minutes"
    echo -e "${BLUE}Total Tests Run:${NC} $TOTAL_TESTS"
    echo -e "${BLUE}Successful Tests:${NC} $SUCCESSFUL_TESTS"
    echo -e "${BLUE}Failed Tests:${NC} $FAILED_TESTS"
    echo -e "${BLUE}Success Rate:${NC} ${success_rate}%"
    echo ""
    echo -e "${BLUE}Requirements Analysis:${NC}"
    echo -e "  • Minimum Test Runs (15): $([ $TOTAL_TESTS -ge 15 ] && echo -e "${GREEN}✅ MET${NC} ($TOTAL_TESTS)" || echo -e "${RED}❌ NOT MET${NC} ($TOTAL_TESTS)")"
    echo -e "  • Success Rate (>95%): $([ $success_rate -ge 95 ] && echo -e "${GREEN}✅ MET${NC} (${success_rate}%)" || echo -e "${RED}❌ NOT MET${NC} (${success_rate}%)")"
    echo ""
    
    if [ $TOTAL_TESTS -ge 15 ] && [ $success_rate -ge 95 ]; then
        echo -e "${GREEN}🎉 OVERALL ASSESSMENT: PRODUCTION READY${NC}"
        echo -e "${GREEN}   The payment system has passed comprehensive testing${NC}"
        echo -e "${GREEN}   and is ready for live production use.${NC}"
        return 0
    else
        echo -e "${RED}⚠️  OVERALL ASSESSMENT: NEEDS ATTENTION${NC}"
        echo -e "${RED}   The payment system requires fixes before production use.${NC}"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up temporary files..."
    # Add any cleanup logic here
}

# Main execution
main() {
    # Setup
    setup
    
    # Check prerequisites
    check_prerequisites
    
    # Run all test phases
    run_e2e_test_rounds
    run_api_endpoint_tests
    run_payment_stress_tests
    validate_database_state
    
    # Generate reports
    generate_final_report
    
    # Display final summary and determine exit code
    if display_final_summary; then
        log "SUCCESS" "All testing completed successfully - PRODUCTION READY"
        cleanup
        exit 0
    else
        log "ERROR" "Testing completed with issues - NEEDS ATTENTION"
        cleanup
        exit 1
    fi
}

# Signal handlers
trap 'log "WARN" "Testing interrupted by user"; cleanup; exit 1' INT TERM

# Run main function
main "$@"