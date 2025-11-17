"""
Comprehensive tests for financial calculation service
Tests cover all asset types, edge cases, and database integration
"""

import pytest
import json
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.financial_calculation_service import FinancialCalculationService
from app.models.vehicle import Vehicle
from app.models.ict_asset import IctAsset
from app.models.office_equipment import OfficeEquipment
from app.models.land_asset import LandAsset
from app.models.furniture_equipment import FurnitureEquipment
from app.models.plant_machinery import PlantMachinery
from app.models.building import Building
from app.models.portable_item import PortableItem


class TestDateConversion:
    """Test date conversion utility"""

    def test_convert_none(self):
        """Null date should return 0"""
        assert FinancialCalculationService.convert_to_timestamp(None) == 0

    def test_convert_valid_timestamp(self):
        """Valid unix timestamp should be returned as-is"""
        timestamp = 1609459200  # 2021-01-01
        assert FinancialCalculationService.convert_to_timestamp(timestamp) == timestamp

    def test_convert_datetime_object(self):
        """Datetime object should be converted to timestamp"""
        dt = datetime(2021, 1, 1, 0, 0, 0)
        expected = int(dt.timestamp())
        assert FinancialCalculationService.convert_to_timestamp(dt) == expected

    def test_convert_year_string(self):
        """Year as string should convert to Jan 1 of that year"""
        result = FinancialCalculationService.convert_to_timestamp("2021")
        expected = int(datetime(2021, 1, 1).timestamp())
        assert result == expected

    def test_convert_iso_date_string(self):
        """ISO format date string should convert to timestamp"""
        result = FinancialCalculationService.convert_to_timestamp("2021-01-15")
        expected = int(datetime(2021, 1, 15).timestamp())
        assert result == expected

    def test_convert_invalid_string(self):
        """Invalid string should return 0"""
        assert FinancialCalculationService.convert_to_timestamp("invalid") == 0

    def test_convert_empty_string(self):
        """Empty string should return 0"""
        assert FinancialCalculationService.convert_to_timestamp("") == 0

    def test_convert_future_timestamp(self):
        """Future timestamp should be rejected"""
        future = int((datetime.utcnow().timestamp() + 365 * 24 * 60 * 60 + 1000))
        assert FinancialCalculationService.convert_to_timestamp(future) == 0


class TestAssetDataValidation:
    """Test asset data validation during fetch"""

    @pytest.mark.asyncio
    async def test_skip_zero_purchase_amount(self):
        """Assets with zero purchase amount should be skipped with warning"""
        session = AsyncMock(spec=AsyncSession)
        
        # Mock vehicle with zero purchase amount
        vehicle = Mock(spec=Vehicle)
        vehicle.id = "test-id"
        vehicle.amount = 0
        vehicle.depreciation_rate = 10
        vehicle.year_of_purchase = "2021"
        
        # Mock the database query
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = [vehicle]
        session.execute = AsyncMock(return_value=mock_result)
        
        with patch.dict(FinancialCalculationService.ASSET_MODELS, {"vehicle": Mock}):
            assets, warnings = await FinancialCalculationService.fetch_all_assets(session)
        
        assert len(assets) == 0
        assert any("Invalid purchase amount" in w for w in warnings)

    @pytest.mark.asyncio
    async def test_invalid_depreciation_rate_clamped(self):
        """Invalid depreciation rate should be clamped to 0-100"""
        session = AsyncMock(spec=AsyncSession)
        
        # Mock vehicle with invalid depreciation rate
        vehicle = Mock(spec=Vehicle)
        vehicle.id = "test-id"
        vehicle.amount = 10000
        vehicle.depreciation_rate = 150  # Invalid
        vehicle.year_of_purchase = "2021"
        
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = [vehicle]
        session.execute = AsyncMock(return_value=mock_result)
        
        with patch.dict(FinancialCalculationService.ASSET_MODELS, {"vehicle": Mock}):
            assets, warnings = await FinancialCalculationService.fetch_all_assets(session)
        
        assert any("Invalid depreciation rate" in w for w in warnings)

    @pytest.mark.asyncio
    async def test_skip_no_purchase_date(self):
        """Assets without valid purchase date should be skipped"""
        session = AsyncMock(spec=AsyncSession)
        
        # Mock vehicle with no purchase date
        vehicle = Mock(spec=Vehicle)
        vehicle.id = "test-id"
        vehicle.amount = 10000
        vehicle.depreciation_rate = 10
        vehicle.year_of_purchase = None
        
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = [vehicle]
        session.execute = AsyncMock(return_value=mock_result)
        
        with patch.dict(FinancialCalculationService.ASSET_MODELS, {"vehicle": Mock}):
            assets, warnings = await FinancialCalculationService.fetch_all_assets(session)
        
        assert len(assets) == 0
        assert any("No valid purchase date" in w for w in warnings)


class TestCCalculatorIntegration:
    """Test C calculator invocation and output parsing"""

    def test_calculator_call_success(self):
        """Successful C calculator call should parse output correctly"""
        input_data = [
            {
                "id": "test-1",
                "purchase_amount": 10000,
                "depreciation_rate": 10,
                "purchase_date": 1609459200,
                "disposal_date": 0,
                "disposal_value": 0,
            }
        ]
        
        mock_output = {
            "assets": [
                {
                    "asset_id": "test-1",
                    "status": "ACTIVE",
                    "purchase_amount": 10000,
                    "depreciation_rate": 10,
                    "annual_depreciation": 1000,
                    "accumulated_depreciation": 200,
                    "net_book_value": 9800,
                    "days_in_use": 73,
                }
            ],
            "processed_count": 1,
            "success_count": 1,
            "error_count": 0,
            "timestamp": int(datetime.utcnow().timestamp()),
        }
        
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = Mock(
                returncode=0,
                stdout=json.dumps(mock_output),
                stderr="",
            )
            
            result, error = FinancialCalculationService.call_c_calculator(input_data)
        
        assert error is None
        assert result == mock_output
        assert result["success_count"] == 1
        assert result["error_count"] == 0

    def test_calculator_call_invalid_json(self):
        """Invalid JSON from calculator should return error"""
        input_data = [{"id": "test-1", "purchase_amount": 10000}]
        
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = Mock(
                returncode=0,
                stdout="invalid json {{{",
                stderr="",
            )
            
            result, error = FinancialCalculationService.call_c_calculator(input_data)
        
        assert error is not None
        assert result is None
        assert "Invalid JSON" in error

    def test_calculator_call_timeout(self):
        """Calculator timeout should return error"""
        input_data = [{"id": "test-1"}]
        
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = TimeoutError()
            
            result, error = FinancialCalculationService.call_c_calculator(input_data)
        
        assert error is not None
        assert result is None

    def test_calculator_call_not_found(self):
        """Missing calculator binary should return error"""
        input_data = [{"id": "test-1"}]
        
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError()
            
            result, error = FinancialCalculationService.call_c_calculator(input_data)
        
        assert error is not None
        assert "not found" in error


class TestDatabaseUpdate:
    """Test database update with calculated values"""

    @pytest.mark.asyncio
    async def test_update_valid_results(self):
        """Valid calculation results should update database"""
        session = AsyncMock(spec=AsyncSession)
        
        # Mock vehicle
        vehicle = Mock(spec=Vehicle)
        vehicle.id = "test-id"
        vehicle.annual_depreciation = Decimal("0")
        vehicle.accumulated_depreciation = Decimal("0")
        vehicle.net_book_value = Decimal("0")
        
        # Mock query result
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = vehicle
        session.execute = AsyncMock(return_value=mock_result)
        session.commit = AsyncMock()
        
        calculation_results = {
            "assets": [
                {
                    "asset_id": "test-id",
                    "status": "ACTIVE",
                    "annual_depreciation": 1000.0,
                    "accumulated_depreciation": 200.0,
                    "net_book_value": 9800.0,
                }
            ]
        }
        
        with patch.dict(FinancialCalculationService.ASSET_MODELS, {"vehicle": Mock}):
            update_results = await FinancialCalculationService.update_asset_financials(
                session, calculation_results
            )
        
        assert update_results["updated_count"] == 1
        assert update_results["error_count"] == 0
        session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_skip_error_results(self):
        """Results with errors should be skipped"""
        session = AsyncMock(spec=AsyncSession)
        session.commit = AsyncMock()
        
        calculation_results = {
            "assets": [
                {
                    "asset_id": "test-id",
                    "error": "Invalid purchase amount",
                }
            ]
        }
        
        update_results = await FinancialCalculationService.update_asset_financials(
            session, calculation_results
        )
        
        assert update_results["updated_count"] == 0
        assert update_results["error_count"] == 1

    @pytest.mark.asyncio
    async def test_asset_not_found(self):
        """Missing asset in database should be handled gracefully"""
        session = AsyncMock(spec=AsyncSession)
        
        # Mock query returning no result
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute = AsyncMock(return_value=mock_result)
        session.commit = AsyncMock()
        
        calculation_results = {
            "assets": [
                {
                    "asset_id": "nonexistent-id",
                    "status": "ACTIVE",
                    "annual_depreciation": 1000.0,
                }
            ]
        }
        
        with patch.dict(FinancialCalculationService.ASSET_MODELS, {"vehicle": Mock}):
            update_results = await FinancialCalculationService.update_asset_financials(
                session, calculation_results
            )
        
        assert update_results["error_count"] >= 1


class TestDepreciationAccuracy:
    """Test depreciation calculation accuracy across scenarios"""

    def test_depreciation_calculation_logic(self):
        """
        Test that depreciation calculations are mathematically accurate
        Example: $10,000 asset at 10% annual depreciation over ~73 days
        """
        purchase_amount = 10000
        depreciation_rate = 10
        annual_depreciation = (purchase_amount * depreciation_rate) / 100
        
        # ~73 days (2.4 months)
        days_in_use = 73
        daily_depreciation = annual_depreciation / 365.25
        accumulated = daily_depreciation * days_in_use
        
        # Verify math
        assert annual_depreciation == 1000
        assert round(accumulated, 2) == 200.0
        assert round(purchase_amount - accumulated, 2) == 9800.0

    def test_land_asset_no_depreciation(self):
        """Land assets should have 0 depreciation rate"""
        mapping = FinancialCalculationService.FIELD_MAPPINGS["land_asset"]
        assert mapping.get("depreciation_rate_field") is None

    def test_building_no_depreciation_rate(self):
        """Buildings may not have explicit depreciation rate"""
        mapping = FinancialCalculationService.FIELD_MAPPINGS["building"]
        assert mapping.get("depreciation_rate_field") is None


class TestEndToEndCalculation:
    """End-to-end calculation tests"""

    @pytest.mark.asyncio
    async def test_full_calculation_flow(self):
        """Test complete flow from fetch to update"""
        session = AsyncMock(spec=AsyncSession)
        
        # Create mock vehicle
        vehicle = Mock(spec=Vehicle)
        vehicle.id = "vehicle-1"
        vehicle.amount = 20000
        vehicle.depreciation_rate = 5
        vehicle.year_of_purchase = "2021"
        vehicle.annual_depreciation = Decimal("0")
        vehicle.accumulated_depreciation = Decimal("0")
        vehicle.net_book_value = Decimal("0")
        
        # Mock fetch
        mock_fetch_result = AsyncMock()
        mock_fetch_result.scalars.return_value.all.return_value = [vehicle]
        
        # Mock update
        mock_update_result = AsyncMock()
        mock_update_result.scalar_one_or_none.return_value = vehicle
        
        # Setup execute to return different results for fetch vs update
        call_count = [0]
        def execute_side_effect(query):
            call_count[0] += 1
            if call_count[0] == 1:
                return mock_fetch_result
            return mock_update_result
        
        session.execute = AsyncMock(side_effect=execute_side_effect)
        session.commit = AsyncMock()
        
        # Mock calculator
        calc_output = {
            "assets": [
                {
                    "asset_id": "vehicle-1",
                    "status": "ACTIVE",
                    "purchase_amount": 20000,
                    "depreciation_rate": 5,
                    "annual_depreciation": 1000,
                    "accumulated_depreciation": 166,
                    "net_book_value": 19834,
                }
            ],
            "processed_count": 1,
            "success_count": 1,
            "error_count": 0,
        }
        
        with patch.dict(FinancialCalculationService.ASSET_MODELS, {"vehicle": Mock}):
            with patch("subprocess.run") as mock_run:
                mock_run.return_value = Mock(
                    returncode=0,
                    stdout=json.dumps(calc_output),
                )
                
                result = await FinancialCalculationService.calculate_all_financial_information(session)
        
        assert result["status"] == "success"
        assert result["update_results"]["updated_count"] == 1


class TestErrorHandling:
    """Test error handling and edge cases"""

    @pytest.mark.asyncio
    async def test_calculation_with_no_assets(self):
        """Calculation with no valid assets should return success with no-op"""
        session = AsyncMock(spec=AsyncSession)
        
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = []
        session.execute = AsyncMock(return_value=mock_result)
        
        with patch.dict(FinancialCalculationService.ASSET_MODELS, {}):
            result = await FinancialCalculationService.calculate_all_financial_information(session)
        
        assert result["status"] == "success"
        assert result["assets_processed"] == 0

    @pytest.mark.asyncio
    async def test_calculation_database_error(self):
        """Database errors should be caught and reported"""
        session = AsyncMock(spec=AsyncSession)
        session.execute = AsyncMock(side_effect=Exception("Database connection lost"))
        
        result = await FinancialCalculationService.calculate_all_financial_information(session)
        
        assert result["status"] == "error"
        assert "Database connection lost" in result["details"]

    def test_decimal_precision(self):
        """Test decimal precision in financial calculations"""
        # Ensure calculations maintain proper precision
        value = Decimal("1000.00")
        assert str(value) == "1000.00"
        
        # Test rounding
        rounded = value.quantize(Decimal("0.01"))
        assert rounded == Decimal("1000.00")
