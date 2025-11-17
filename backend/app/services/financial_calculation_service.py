"""
Financial Calculation Service
Wrapper for C financial calculator to compute depreciation for all assets
Production-ready with comprehensive validation and error handling
"""

import json
import logging
import subprocess
import time
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.building import Building
from app.models.vehicle import Vehicle
from app.models.ict_asset import IctAsset
from app.models.office_equipment import OfficeEquipment
from app.models.land_asset import LandAsset
from app.models.furniture_equipment import FurnitureEquipment
from app.models.plant_machinery import PlantMachinery
from app.models.portable_item import PortableItem

logger = logging.getLogger(__name__)


class FinancialCalculationService:
    """Handles batch financial calculations using C service"""

    # Asset model mappings
    ASSET_MODELS = {
        "building": Building,
        "vehicle": Vehicle,
        "ict_asset": IctAsset,
        "office_equipment": OfficeEquipment,
        "land_asset": LandAsset,
        "furniture_equipment": FurnitureEquipment,
        "plant_machinery": PlantMachinery,
        "portable_item": PortableItem,
    }

    # Field mappings for each asset type
    FIELD_MAPPINGS = {
        "building": {
            "purchase_field": "cost_of_construction_or_valuation",
            "purchase_date_field": "date_of_purchase_or_commissioning",
            "depreciation_rate_field": None,  # Buildings don't have explicit rate
            "annual_depreciation_field": "annual_depreciation",
            "accumulated_field": "accumulated_depreciation_to_date",
            "nbv_field": "net_book_value",
        },
        "vehicle": {
            "purchase_field": "amount",
            "purchase_date_field": "year_of_purchase",  # String field, handle separately
            "depreciation_rate_field": "depreciation_rate",
            "annual_depreciation_field": "annual_depreciation",
            "accumulated_field": "accumulated_depreciation",
            "nbv_field": "net_book_value",
            "disposal_date_field": "date_of_disposal",
            "disposal_value_field": "disposal_value",
        },
        "ict_asset": {
            "purchase_field": "purchase_amount",
            "purchase_date_field": "delivery_installation_date",
            "depreciation_rate_field": "depreciation_rate",
            "annual_depreciation_field": "annual_depreciation",
            "accumulated_field": "accumulated_depreciation",
            "nbv_field": "net_book_value",
            "disposal_date_field": "disposal_date",
            "disposal_value_field": "disposal_value",
        },
        "office_equipment": {
            "purchase_field": "amount",
            "purchase_date_field": "date_of_purchase",
            "depreciation_rate_field": "depreciation_rate",
            "annual_depreciation_field": "annual_depreciation",
            "accumulated_field": "accumulated_depreciation",
            "nbv_field": "net_book_value",
        },
        "land_asset": {
            "purchase_field": "amount",
            "purchase_date_field": "date_of_purchase",
            "depreciation_rate_field": None,  # Land doesn't depreciate
            "annual_depreciation_field": "annual_depreciation",
            "accumulated_field": "accumulated_depreciation",
            "nbv_field": "net_book_value",
        },
        "furniture_equipment": {
            "purchase_field": "amount",
            "purchase_date_field": "date_of_purchase",
            "depreciation_rate_field": "depreciation_rate",
            "annual_depreciation_field": "annual_depreciation",
            "accumulated_field": "accumulated_depreciation",
            "nbv_field": "net_book_value",
        },
        "plant_machinery": {
            "purchase_field": "amount",
            "purchase_date_field": "date_of_purchase",
            "depreciation_rate_field": "depreciation_rate",
            "annual_depreciation_field": "annual_depreciation",
            "accumulated_field": "accumulated_depreciation",
            "nbv_field": "net_book_value",
        },
        "portable_item": {
            "purchase_field": "amount",
            "purchase_date_field": "date_of_purchase",
            "depreciation_rate_field": "depreciation_rate",
            "annual_depreciation_field": "annual_depreciation",
            "accumulated_field": "accumulated_depreciation",
            "nbv_field": "net_book_value",
        },
    }

    @staticmethod
    def convert_to_timestamp(date_value: Any) -> int:
        """
        Enhanced date conversion with better error handling
        Convert various date formats to Unix timestamp
        """
        if date_value is None:
            return 0
        if isinstance(date_value, int):
            # Validate it's a reasonable timestamp
            if date_value > 0 and date_value < int(datetime.utcnow().timestamp()) + (365 * 24 * 60 * 60):
                return date_value
            return 0
        if isinstance(date_value, datetime):
            return int(date_value.timestamp())
        if isinstance(date_value, str):
            if not date_value or date_value.strip() == "":
                return 0
            try:
                # Try to parse year (for vehicles year_of_purchase field)
                year = int(date_value)
                if 1900 <= year <= datetime.utcnow().year:
                    dt = datetime(year, 1, 1)
                    return int(dt.timestamp())
            except ValueError:
                try:
                    # Try ISO format
                    dt = datetime.fromisoformat(date_value)
                    return int(dt.timestamp())
                except ValueError:
                    pass
        return 0

    @classmethod
    async def fetch_all_assets(cls, session: AsyncSession) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Returns tuple with asset list and validation warnings
        Fetch all assets from database with validation
        """
        all_assets = []
        warnings = []

        for asset_type, model_class in cls.ASSET_MODELS.items():
            try:
                result = await session.execute(select(model_class))
                assets = result.scalars().all()

                for asset in assets:
                    mapping = cls.FIELD_MAPPINGS[asset_type]

                    # Get purchase amount
                    purchase_field = mapping.get("purchase_field")
                    purchase_amount = float(getattr(asset, purchase_field, None) or 0)

                    if purchase_amount <= 0:
                        warnings.append(f"Asset {asset.id} ({asset_type}): Invalid purchase amount {purchase_amount}")
                        continue

                    # Get depreciation rate
                    depreciation_rate_field = mapping.get("depreciation_rate_field")
                    if depreciation_rate_field:
                        depreciation_rate = float(getattr(asset, depreciation_rate_field, None) or 0)
                    else:
                        depreciation_rate = 0  # Land and Buildings may not depreciate

                    if depreciation_rate < 0 or depreciation_rate > 100:
                        warnings.append(f"Asset {asset.id} ({asset_type}): Invalid depreciation rate {depreciation_rate}")
                        depreciation_rate = min(max(depreciation_rate, 0), 100)

                    # Get purchase date
                    purchase_date_field = mapping.get("purchase_date_field")
                    purchase_date = getattr(asset, purchase_date_field, None)
                    purchase_timestamp = cls.convert_to_timestamp(purchase_date)

                    if purchase_timestamp <= 0:
                        warnings.append(f"Asset {asset.id} ({asset_type}): No valid purchase date")
                        continue

                    # Get disposal info
                    disposal_date_field = mapping.get("disposal_date_field")
                    disposal_date = 0
                    disposal_value = 0
                    if disposal_date_field:
                        disposal_date_val = getattr(asset, disposal_date_field, None)
                        disposal_date = cls.convert_to_timestamp(disposal_date_val)
                        if disposal_date > 0:
                            disposal_value_field = mapping.get("disposal_value_field")
                            disposal_value = float(getattr(asset, disposal_value_field, None) or 0)

                    asset_data = {
                        "id": str(asset.id),
                        "asset_type": asset_type,
                        "purchase_amount": purchase_amount,
                        "depreciation_rate": depreciation_rate,
                        "purchase_date": purchase_timestamp,
                        "disposal_date": disposal_date,
                        "disposal_value": disposal_value,
                    }
                    all_assets.append(asset_data)

            except Exception as e:
                error_msg = f"Error fetching {asset_type} assets: {e}"
                logger.error(error_msg)
                warnings.append(error_msg)
                continue

        return all_assets, warnings

    @staticmethod
    def call_c_calculator(assets_data: List[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Returns tuple (results, error) for better error handling
        Call C financial calculator service with stdin input
        """
        try:
            # Prepare JSON input
            input_json = json.dumps(assets_data)

            # Call C executable with stdin input
            result = subprocess.run(
                ["./backend/services/financial_calculator"],
                input=input_json,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
            )

            if result.returncode != 0:
                error_msg = f"C calculator returned error code {result.returncode}: {result.stderr}"
                logger.error(error_msg)
                return None, error_msg

            # Parse output
            try:
                output = json.loads(result.stdout)
                return output, None
            except json.JSONDecodeError as e:
                error_msg = f"Invalid JSON from C calculator: {e}, stdout: {result.stdout[:200]}"
                logger.error(error_msg)
                return None, error_msg

        except subprocess.TimeoutExpired:
            error_msg = "C calculator timeout exceeded (5 minutes)"
            logger.error(error_msg)
            return None, error_msg
        except FileNotFoundError:
            error_msg = "C calculator binary not found at ./backend/services/financial_calculator"
            logger.error(error_msg)
            return None, error_msg
        except Exception as e:
            error_msg = f"C calculator error: {e}"
            logger.error(error_msg)
            return None, error_msg

    @classmethod
    async def update_asset_financials(
        cls, session: AsyncSession, calculation_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Complete rewrite to properly match calculated results to database assets
        Update database with calculated financial values
        """
        updated_count = 0
        error_count = 0
        errors = []

        assets = calculation_results.get("assets", [])

        for result in assets:
            try:
                if result.get("error"):
                    error_count += 1
                    errors.append(f"Asset {result.get('id')}: {result.get('error')}")
                    continue

                asset_id = result.get("asset_id")  # Note: C calculator returns 'asset_id'
                status = result.get("status", "ACTIVE")

                if not asset_id:
                    error_count += 1
                    errors.append("Result missing asset_id")
                    continue

                # Find asset in database by iterating through asset types
                asset_db = None
                asset_type = None

                for atype, model_class in cls.ASSET_MODELS.items():
                    stmt = select(model_class).where(model_class.id == asset_id)
                    db_result = await session.execute(stmt)
                    asset_db = db_result.scalar_one_or_none()
                    if asset_db:
                        asset_type = atype
                        break

                if not asset_db:
                    error_count += 1
                    errors.append(f"Asset {asset_id} not found in database")
                    continue

                mapping = cls.FIELD_MAPPINGS[asset_type]
                annual_dep_field = mapping.get("annual_depreciation_field")
                accumulated_field = mapping.get("accumulated_field")
                nbv_field = mapping.get("nbv_field")

                if annual_dep_field and "annual_depreciation" in result:
                    setattr(asset_db, annual_dep_field, Decimal(str(result["annual_depreciation"])))
                if accumulated_field and "accumulated_depreciation" in result:
                    setattr(asset_db, accumulated_field, Decimal(str(result["accumulated_depreciation"])))
                if nbv_field and "net_book_value" in result:
                    setattr(asset_db, nbv_field, Decimal(str(result["net_book_value"])))

                session.add(asset_db)
                updated_count += 1
                logger.debug(f"Updated asset {asset_id}: annual={result.get('annual_depreciation')}, "
                           f"accumulated={result.get('accumulated_depreciation')}, "
                           f"nbv={result.get('net_book_value')}")

            except Exception as e:
                error_msg = f"Error updating asset {result.get('id', 'unknown')}: {e}"
                logger.error(error_msg)
                errors.append(error_msg)
                error_count += 1
                continue

        await session.commit()
        logger.info(f"Financial update complete: {updated_count} updated, {error_count} errors")

        return {
            "updated_count": updated_count,
            "error_count": error_count,
            "total_processed": updated_count + error_count,
            "errors": errors if errors else None,
        }

    @classmethod
    async def calculate_all_financial_information(cls, session: AsyncSession) -> Dict[str, Any]:
        """
        Complete refactor with proper error handling, validation, and stdin input
        Main method: Calculate and update all asset financials
        """
        try:
            logger.info("Starting financial calculation batch...")
            start_time = time.time()

            # Fetch all assets with validation
            assets, fetch_warnings = await cls.fetch_all_assets(session)
            logger.info(f"Fetched {len(assets)} assets for processing")
            
            if fetch_warnings:
                for warning in fetch_warnings:
                    logger.warning(f"Data validation: {warning}")

            if not assets:
                return {
                    "status": "success",
                    "message": "No valid assets to process",
                    "assets_processed": 0,
                    "warnings": fetch_warnings,
                }

            # Call C calculator with stdin
            calculation_results, calc_error = cls.call_c_calculator(assets)

            if calc_error:
                return {
                    "status": "error",
                    "message": "Financial calculation failed",
                    "details": calc_error,
                    "assets_attempted": len(assets),
                }

            if not calculation_results:
                return {
                    "status": "error",
                    "message": "No results from calculator",
                    "assets_attempted": len(assets),
                }

            logger.info(f"Calculator processed {calculation_results.get('processed_count', 0)} assets "
                       f"({calculation_results.get('success_count', 0)} successful, "
                       f"{calculation_results.get('error_count', 0)} with errors)")

            # Update database
            update_results = await cls.update_asset_financials(session, calculation_results)

            elapsed = time.time() - start_time
            logger.info(f"Financial calculation completed in {elapsed:.2f}s")

            return {
                "status": "success",
                "message": "Financial calculations completed",
                "assets_processed": len(assets),
                "update_results": update_results,
                "execution_time_seconds": round(elapsed, 2),
                "warnings": fetch_warnings,
            }

        except Exception as e:
            logger.error(f"Financial calculation error: {e}", exc_info=True)
            return {
                "status": "error",
                "message": "Unexpected error during financial calculation",
                "details": str(e),
            }
