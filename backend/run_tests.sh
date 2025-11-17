#!/bin/bash
# Test runner script for VietJusticIA backend

set -e  # Exit on error

echo "=========================================="
echo "VietJusticIA Backend Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}Error: pytest is not installed${NC}"
    echo "Install dependencies: pip install -r requirements.txt"
    exit 1
fi

# Parse command line arguments
RUN_UNIT=true
RUN_INTEGRATION=true
COVERAGE=true
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_INTEGRATION=false
            shift
            ;;
        --integration-only)
            RUN_UNIT=false
            shift
            ;;
        --no-coverage)
            COVERAGE=false
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./run_tests.sh [--unit-only] [--integration-only] [--no-coverage] [-v]"
            exit 1
            ;;
    esac
done

# Build pytest command
PYTEST_CMD="pytest"

if [ "$VERBOSE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -v"
fi

if [ "$COVERAGE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD --cov=app --cov-report=term-missing --cov-report=html"
fi

# Add markers based on what to run
if [ "$RUN_UNIT" = true ] && [ "$RUN_INTEGRATION" = false ]; then
    PYTEST_CMD="$PYTEST_CMD -m unit"
elif [ "$RUN_UNIT" = false ] && [ "$RUN_INTEGRATION" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -m integration"
fi

echo "Running: $PYTEST_CMD"
echo ""

# Run tests
if $PYTEST_CMD; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "All tests passed! ✓"
    echo "==========================================${NC}"
    
    if [ "$COVERAGE" = true ]; then
        echo ""
        echo -e "${YELLOW}Coverage report generated in htmlcov/index.html${NC}"
        echo "Open it in your browser to view detailed coverage"
    fi
    
    exit 0
else
    echo ""
    echo -e "${RED}=========================================="
    echo "Tests failed! ✗"
    echo "==========================================${NC}"
    exit 1
fi

