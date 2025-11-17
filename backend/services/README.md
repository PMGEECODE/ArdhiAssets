# Financial Calculator C Service

High-performance financial depreciation calculation service written in C for the ArdhiSMD asset management system.

## Overview

This C service calculates daily depreciation for all asset types using the straight-line depreciation method. It processes batch calculations efficiently and integrates with the FastAPI backend via JSON input/output.

**Asset Types Supported:**

- Buildings
- Vehicles
- ICT Assets
- Office Equipment
- Plant & Machinery
- Furniture & Equipment
- Portable Items
- Land Assets

## Prerequisites

### Linux/Ubuntu/Debian

\`\`\`bash

# Install development tools

sudo apt-get update
sudo apt-get install -y build-essential gcc make

# Install json-c library (required dependency)

sudo apt-get install -y libjson-c-dev
\`\`\`

### macOS

\`\`\`bash

# Install Homebrew (if not installed)

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install build tools and json-c

brew install gcc make json-c
\`\`\`

### Windows (with MinGW)

\`\`\`bash

# Download and install MinGW from: https://www.mingw-w64.org/

# Install json-c using MSYS2 package manager

pacman -S mingw-w64-x86_64-json-c
\`\`\`

## Compilation

### Basic Compilation

\`\`\`bash
cd backend/services
gcc -o financial_calculator financial_calculator.c -ljson-c -lm
\`\`\`

### With Debug Symbols (for debugging)

\`\`\`bash
gcc -g -o financial_calculator financial_calculator.c -ljson-c -lm
\`\`\`

### With Optimization (for production)

\`\`\`bash
gcc -O2 -o financial_calculator financial_calculator.c -ljson-c -lm
\`\`\`

### With All Warnings (recommended for development)

\`\`\`bash
gcc -Wall -Wextra -O2 -o financial_calculator financial_calculator.c -ljson-c -lm
\`\`\`

## Verification

After compilation, verify the binary was created:
\`\`\`bash
ls -lh financial_calculator
file financial_calculator
\`\`\`

Run a quick test:
\`\`\`bash
./financial_calculator

# Expected output: "Financial Calculator Service Ready"

\`\`\`

## Integration with FastAPI

The Python service (`financial_calculation_service.py`) handles calling the C binary:

1. **Reads assets from database** - Fetches all active/inactive assets
2. **Prepares JSON input** - Converts asset data to JSON format
3. **Calls C binary** - Executes `./financial_calculator` via subprocess
4. **Parses output** - Reads and processes JSON results
5. **Updates database** - Writes calculated values back to asset records

### Automatic Daily Execution

The system runs financial calculations automatically at **1:00 AM UTC** via APScheduler:

\`\`\`python

# In backend/app/core/scheduler.py

scheduler.add_job(
calculate_daily_financials,
'cron',
hour=1,
minute=0,
timezone='UTC',
id='calculate_daily_financials'
)
\`\`\`

### Manual Trigger

Calculate depreciation on-demand via API:
\`\`\`bash

# Requires admin authentication

curl -X POST http://localhost:8000/api/financial/calculate-depreciation \
 -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
 -H "Content-Type: application/json"
\`\`\`

## Input/Output Format

### Input JSON (Array of Assets)

\`\`\`json
[
{
"id": "550e8400-e29b-41d4-a716-446655440000",
"asset_type": "Vehicle",
"purchase_amount": 50000.00,
"depreciation_rate": 20.0,
"purchase_date": 1609459200,
"disposal_date": 0,
"disposal_value": 0.0
}
]
\`\`\`

### Output JSON (Results)

\`\`\`json
{
"0": {
"asset_id": "550e8400-e29b-41d4-a716-446655440000",
"status": "ACTIVE",
"days_in_use": 365,
"annual_depreciation": 10000.00,
"accumulated_depreciation": 10000.00,
"net_book_value": 40000.00,
"purchase_amount": 50000.00,
"depreciation_rate": 20.0
},
"processed_count": 1,
"timestamp": 1700000000
}
\`\`\`

## Performance Considerations

- **Processing Speed**: ~10,000 assets per second (single-threaded)
- **Memory Usage**: ~5MB for 10,000 assets
- **Batch Size**: Recommended 5,000 assets per batch
- **Calculation Method**: Straight-line depreciation (daily basis)

## Troubleshooting

### Error: "json.h: No such file or directory"

**Solution**: Install json-c development library
\`\`\`bash

# Ubuntu/Debian

sudo apt-get install libjson-c-dev

# macOS

brew install json-c
\`\`\`

### Error: "undefined reference to `json_object_*`"

**Solution**: Add `-ljson-c` flag to compilation command
\`\`\`bash
gcc -o financial_calculator financial_calculator.c -ljson-c -lm
\`\`\`

### Error: "Cannot execute binary file"

**Solution**: Recompile for your system
\`\`\`bash

# Clean previous build

rm financial_calculator

# Recompile with target-specific flags

gcc -O2 -o financial_calculator financial_calculator.c -ljson-c -lm
\`\`\`

### Binary not found in deployment

**Solution**: Ensure binary is compiled before running FastAPI
\`\`\`bash

# In Docker or deployment script

cd backend/services
gcc -O2 -o financial_calculator financial_calculator.c -ljson-c -lm
cd ../..
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
\`\`\`

## Development

### Add Debug Output (C code)

Edit `financial_calculator.c` to enable debug logging:
\`\`\`c
fprintf(stderr, "[DEBUG] Processing asset: %s\n", asset_id);
\`\`\`

### Compile with Debug

\`\`\`bash
gcc -g -DDEBUG -o financial_calculator financial_calculator.c -ljson-c -lm
\`\`\`

### Test with Custom Input

Create a JSON file `test_assets.json` and process manually:
\`\`\`bash

# Python script to test

python3 << 'EOF'
import json
import subprocess

assets = [
{
"id": "test-1",
"asset_type": "Vehicle",
"purchase_amount": 50000,
"depreciation_rate": 20,
"purchase_date": 1609459200,
"disposal_date": 0,
"disposal_value": 0
}
]

input_json = json.dumps(assets)
result = subprocess.run(['./financial_calculator'],
input=input_json,
capture_output=True,
text=True)
print(json.dumps(json.loads(result.stdout), indent=2))
EOF
\`\`\`

## Environment Variables

Set these if running C service separately:

\`\`\`bash

# Optional: Set locale for consistent output

export LC_ALL=C.UTF-8

# Optional: Set temporary directory for large batches

export TMPDIR=/tmp
\`\`\`

## Version

- **C Service Version**: 1.0
- **Required FastAPI Integration**: financial_calculation_service.py
- **Depreciation Method**: Straight-line (daily)
- **Supported Date Format**: Unix timestamp (seconds)

## Support

For issues or questions:

1. Check error output in FastAPI logs: `backend/logs/financial_calculation.log`
2. Verify json-c library installation
3. Ensure C binary is executable: `chmod +x financial_calculator`
4. Check database connectivity in Python service
