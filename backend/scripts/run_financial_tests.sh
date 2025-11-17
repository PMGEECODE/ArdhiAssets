#!/bin/bash
# Financial Calculator Test Suite Runner
# Runs all tests for financial calculation system

set -e

echo "======================================"
echo "Financial Calculator Test Suite"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if test dependencies are installed
echo "Checking test dependencies..."
pip list | grep -q pytest || { echo "Installing pytest..."; pip install pytest pytest-asyncio; }

echo ""
echo "Running Python tests..."
cd "$(dirname "$0")/../.."

# Run pytest with coverage
python -m pytest backend/tests/test_financial_calculator.py -v --tb=short --disable-warnings

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All Python tests passed${NC}"
else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo "Test Suite Completed"
echo "======================================"
