"""
Financial Calculation Router
Endpoints for managing daily financial calculations
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.services.financial_calculation_service import FinancialCalculationService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/calculate-depreciation", tags=["Financial"])
async def calculate_depreciation(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_admin),
) -> dict:
    """
    Calculate depreciation for all assets
    Admin only
    Enhanced response with detailed status and warnings
    """
    logger.info(f"Depreciation calculation triggered by {current_user.id}")

    result = await FinancialCalculationService.calculate_all_financial_information(db)

    if result["status"] == "error":
        logger.error(f"Calculation error: {result.get('details', 'Unknown error')}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("details", "Calculation failed"),
        )

    if result.get("warnings"):
        for warning in result["warnings"]:
            logger.warning(f"Calculation warning: {warning}")

    return {
        "status": "success",
        "message": "Financial calculations completed",
        "data": result,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/calculation-status", tags=["Financial"])
async def get_calculation_status(
    current_user = Depends(require_admin),
) -> dict:
    """Get status of last financial calculation"""
    # TODO: Implement calculation status tracking
    return {
        "status": "pending",
        "last_calculation": None,
        "next_scheduled": None,
    }
