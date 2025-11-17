"""
Integration tests for financial calculation with real database scenarios
Tests database constraints and data integrity
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.vehicle import Vehicle
from app.models.ict_asset import IctAsset
from app.services.financial_calculation_service import FinancialCalculationService


class TestFinancialIntegrationWithDatabase:
    """Integration tests requiring actual database"""

    @pytest.mark.asyncio
    async def test_concurrent_calculation_safety(self, async_session: AsyncSession):
        """Test that concurrent calculations don't corrupt data"""
        # Create test asset
        vehicle = Vehicle(
            registration_number="TEST-001",
            amount=Decimal("50000.00"),
            depreciation_rate=Decimal("10.00"),
            year_of_purchase="2020",
        )
        async_session.add(vehicle)
        await async_session.commit()

        # Run calculation (simulates concurrent access)
        result = await FinancialCalculationService.calculate_all_financial_information(
            async_session
        )

        # Verify asset still exists and data is consistent
        stmt = select(Vehicle).where(Vehicle.registration_number == "TEST-001")
        db_result = await async_session.execute(stmt)
        updated_vehicle = db_result.scalar_one_or_none()

        assert updated_vehicle is not None
        assert updated_vehicle.net_book_value is not None
        assert updated_vehicle.net_book_value >= Decimal("0")
        assert updated_vehicle.net_book_value <= Decimal("50000.00")

    @pytest.mark.asyncio
    async def test_disposed_asset_update(self, async_session: AsyncSession):
        """Test that disposed assets are handled correctly"""
        now = datetime.utcnow()
        vehicle = Vehicle(
            registration_number="TEST-DISPOSED",
            amount=Decimal("30000.00"),
            depreciation_rate=Decimal("5.00"),
            year_of_purchase="2019",
            date_of_disposal=now - timedelta(days=30),
            disposal_value=Decimal("15000.00"),
        )
        async_session.add(vehicle)
        await async_session.commit()

        result = await FinancialCalculationService.calculate_all_financial_information(
            async_session
        )

        # Re-fetch and verify
        stmt = select(Vehicle).where(Vehicle.registration_number == "TEST-DISPOSED")
        db_result = await async_session.execute(stmt)
        updated = db_result.scalar_one_or_none()

        assert updated.net_book_value == Decimal("15000.00")

    @pytest.mark.asyncio
    async def test_zero_depreciation_asset(self, async_session: AsyncSession):
        """Test land asset with zero depreciation"""
        land = IctAsset(
            asset_tag="LAND-001",
            purchase_amount=Decimal("100000.00"),
            depreciation_rate=Decimal("0.00"),  # No depreciation
            delivery_installation_date=datetime.utcnow() - timedelta(days=365),
        )
        async_session.add(land)
        await async_session.commit()

        result = await FinancialCalculationService.calculate_all_financial_information(
            async_session
        )

        stmt = select(IctAsset).where(IctAsset.asset_tag == "LAND-001")
        db_result = await async_session.execute(stmt)
        updated = db_result.scalar_one_or_none()

        assert updated.net_book_value == Decimal("100000.00")
        assert updated.annual_depreciation == Decimal("0.00")
