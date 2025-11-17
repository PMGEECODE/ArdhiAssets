"""
Daily Financial Calculation Job
Calculates depreciation and financial metrics for all assets
Enhanced with comprehensive error handling and logging
"""

import logging
from app.core.database import AsyncSessionLocal
from app.services.financial_calculation_service import FinancialCalculationService

logger = logging.getLogger(__name__)


async def calculate_daily_financials():
    """Execute daily financial calculations for all assets"""
    logger.info("[SCHEDULER] Starting daily financial calculations...")
    try:
        async with AsyncSessionLocal() as session:
            result = await FinancialCalculationService.calculate_all_financial_information(
                session
            )
            
            if result["status"] == "success":
                logger.info(
                    f"[SCHEDULER] Financial calculation completed: "
                    f"{result.get('assets_processed', 0)} assets processed, "
                    f"{result.get('update_results', {}).get('updated_count', 0)} updated, "
                    f"{result.get('update_results', {}).get('error_count', 0)} errors"
                )
                
                # Log warnings
                if result.get("warnings"):
                    logger.warning(f"[SCHEDULER] Calculation warnings: {len(result['warnings'])} items")
                    for warning in result["warnings"][:10]:  # Log first 10
                        logger.warning(f"  - {warning}")
            else:
                logger.error(f"[SCHEDULER] Financial calculation failed: {result.get('details')}")
                
    except Exception as e:
        logger.error(f"[SCHEDULER] Financial calculation failed with exception: {e}", exc_info=True)
