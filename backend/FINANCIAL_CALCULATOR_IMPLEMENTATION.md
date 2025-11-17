# Financial Calculator Implementation Guide

## Overview

The financial calculator system is a production-ready solution for computing asset depreciation across all asset types in ARDHI. It consists of:

1. **C Calculator** (`backend/services/financial_calculator.c`) - High-performance core calculations
2. **Python Service** (`backend/app/services/financial_calculation_service.py`) - Database integration and orchestration
3. **Comprehensive Tests** - Full test coverage for accuracy and reliability

## Key Changes from Original Implementation

### C Calculator (`financial_calculator.c`)

- **FIXED**: Removed hardcoded test data in `main()` - now reads JSON from stdin
- **FIXED**: Removed demo mode - now production-ready
- **ADDED**: Comprehensive input validation (purchase amount, depreciation rate, dates)
- **ADDED**: Error tracking and reporting in batch responses
- **IMPROVED**: Accurate daily depreciation with leap year consideration (365.25 days/year)
- **IMPROVED**: Proper memory management and JSON cleanup

### Python Service (`financial_calculation_service.py`)

- **FIXED**: Data integration - now properly links calculated results back to database assets
- **FIXED**: Stdin input - C calculator now receives input via pipe, not hardcoded data
- **ADDED**: Enhanced date validation with reasonable timestamp ranges
- **ADDED**: Data validation before sending to calculator (skips invalid assets with warnings)
- **ADDED**: Better error handling with detailed error messages and logging
- **IMPROVED**: Asset lookup using all asset types (not just one)
- **IMPROVED**: Decimal precision handling for financial calculations

## Asset Types Supported

All asset types are supported with field mappings:

- Building
- Vehicle
- ICT Asset
- Office Equipment
- Land Asset
- Furniture Equipment
- Plant Machinery
- Portable Item

## Calculation Logic

### For Active Assets

\`\`\`
annual_depreciation = (purchase_amount × depreciation_rate) / 100
daily_depreciation = annual_depreciation / 365.25
accumulated_depreciation = daily_depreciation × days_in_use
net_book_value = max(0, purchase_amount - accumulated_depreciation)
\`\`\`

### For Disposed Assets

\`\`\`
net_book_value = disposal_value
accumulated_depreciation = purchase_amount - disposal_value
annual_depreciation = 0
\`\`\`

### Validation Rules

- Purchase amount must be > 0
- Depreciation rate must be 0-100
- Purchase date must be in the past
- Disposal value must be 0 ≤ disposal_value ≤ purchase_amount
- Accumulated depreciation is capped at purchase amount

## Running the Calculation

### Via API

\`\`\`bash
POST /financial/calculate-depreciation

# Admin only, returns calculation results and database update status

\`\`\`

### Response Example

\`\`\`json
{
"status": "success",
"message": "Financial calculations completed",
"assets_processed": 1250,
"update_results": {
"updated_count": 1245,
"error_count": 5,
"total_processed": 1250,
"errors": ["Asset X: Invalid purchase amount", ...]
},
"execution_time_seconds": 12.34,
"warnings": ["Asset Y: No valid purchase date", ...]
}
\`\`\`

## Testing

### Python Tests

Run comprehensive test suite:
\`\`\`bash
cd backend
python -m pytest tests/test_financial_calculator.py -v
\`\`\`

Test coverage includes:

- Date conversion edge cases
- Asset data validation
- C calculator integration
- Database update operations
- Depreciation accuracy
- End-to-end calculation flow
- Error handling and edge cases

### C Tests

Compile and run C tests:
\`\`\`bash
cd backend/services
gcc -o financial_calculator_test financial_calculator.c financial_calculator_test.c -ljson-c -lm
./financial_calculator_test
\`\`\`

Tests include:

- Basic depreciation calculations
- Disposed asset handling
- Input validation
- Batch processing
- Depreciation caps
- Zero depreciation rates

## Data Safety & Validation

### Pre-Calculation Validation

1. Fetch assets from database with validation
2. Skip assets with invalid data (with warnings)
3. Clamp out-of-range values (depreciation rate 0-100)
4. Validate all timestamp conversions

### Calculation Phase

1. C calculator validates all inputs again
2. Returns detailed error information for each asset
3. Tracks success/error counts

### Database Update Phase

1. Verify calculated results are numeric and valid
2. Skip assets with calculation errors
3. Look up assets by ID across all tables
4. Update only valid results
5. Commit transaction atomically

### Error Handling

- Invalid assets skipped with detailed warnings
- Calculation errors logged and reported
- Database errors caught and returned
- No partial updates - transaction consistency maintained

## Production Deployment Checklist

- [ ] C calculator binary compiled and tested
- [ ] Binary has read/execute permissions (`chmod +x`)
- [ ] Database connection pool configured
- [ ] Administrator user can trigger calculations
- [ ] Logging configured to capture all errors
- [ ] Backup jobs configured before calculations
- [ ] Calculation scheduled for off-peak hours
- [ ] Monitoring/alerting configured for errors
- [ ] Rollback procedure documented
- [ ] Performance tested with full asset dataset

## Compilation

The C calculator should be pre-compiled:
\`\`\`bash
cd backend/services
gcc -o financial_calculator financial_calculator.c -ljson-c -lm
chmod +x financial_calculator
\`\`\`

For Docker:
\`\`\`dockerfile
RUN apt-get install -y libjson-c-dev && \
 cd backend/services && \
 gcc -o financial_calculator financial_calculator.c -ljson-c -lm && \
 chmod +x financial_calculator
\`\`\`

## Performance Notes

- Batch processing handles up to 10,000 assets
- Typical calculation: ~100-200ms per 1000 assets
- Python service has 5-minute timeout for calculations
- Recommended scheduling: Daily during off-peak hours
- Database update is atomic (all-or-nothing)

## Troubleshooting

### "Calculator binary not found"

- Verify binary exists at `./backend/services/financial_calculator`
- Check file permissions: `ls -la backend/services/financial_calculator`
- Rebuild if necessary: `gcc -o financial_calculator financial_calculator.c -ljson-c -lm`

### "Invalid JSON from C calculator"

- Check asset data is valid JSON
- Verify all required fields present
- Run C tests to verify calculator works

### "Asset not found in database"

- May indicate race condition with asset deletion
- Check database consistency
- Review audit logs for changes

### Database Update Failures

- Check database connection and permissions
- Review logs for specific error messages
- Verify asset types and field mappings are correct
- Run smaller batches to isolate issues

## Future Improvements

- [ ] Caching of calculation results
- [ ] Parallel asset processing
- [ ] Custom depreciation methods (accelerated, units-of-production)
- [ ] Asset grouping and summary calculations
- [ ] Historical depreciation tracking
- [ ] Revaluation support
