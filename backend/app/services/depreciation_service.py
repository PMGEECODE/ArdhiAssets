"""
Depreciation Service
Handles all financial calculations for ICT assets including:
- Daily depreciation
- Accumulated depreciation
- Net book value
"""

from decimal import Decimal
from datetime import datetime
from typing import Optional, Dict, Any


class DepreciationService:
    """Service for calculating asset depreciation and financial metrics"""

    @staticmethod
    def calculate_financial_values(
        purchase_amount: Optional[Decimal],
        depreciation_rate: Optional[Decimal],
        delivery_installation_date: Optional[datetime],
        replacement_date: Optional[datetime] = None,
        disposal_date: Optional[datetime] = None,
    ) -> Dict[str, Decimal]:
        """
        Calculate accumulated depreciation and net book value for an ICT asset.
        
        Args:
            purchase_amount: Original purchase cost
            depreciation_rate: Annual depreciation rate (%)
            delivery_installation_date: Date asset was delivered/installed
            replacement_date: Date asset was replaced (if applicable)
            disposal_date: Date asset was disposed (if applicable)
            
        Returns:
            Dictionary containing:
            - annual_depreciation: Yearly depreciation amount
            - accumulated_depreciation: Total depreciation to date
            - net_book_value: Current asset value
        """
        
        if not purchase_amount or not depreciation_rate or not delivery_installation_date:
            return {
                "annual_depreciation": Decimal("0.00"),
                "accumulated_depreciation": Decimal("0.00"),
                "net_book_value": Decimal("0.00"),
            }

        try:
            purchase_amount = Decimal(str(purchase_amount))
            depreciation_rate = Decimal(str(depreciation_rate))

            # Determine end date based on lifecycle dates
            today = datetime.utcnow()
            end_date = today

            if disposal_date:
                disposal_date_dt = disposal_date if isinstance(disposal_date, datetime) else datetime.fromisoformat(str(disposal_date))
                if disposal_date_dt < end_date:
                    end_date = disposal_date_dt

            if replacement_date:
                replacement_date_dt = replacement_date if isinstance(replacement_date, datetime) else datetime.fromisoformat(str(replacement_date))
                if replacement_date_dt < end_date:
                    end_date = replacement_date_dt

            # Ensure delivery date is datetime
            delivery_dt = delivery_installation_date if isinstance(delivery_installation_date, datetime) else datetime.fromisoformat(str(delivery_installation_date))

            # Calculate days in use
            days_in_use = max(0, (end_date.date() - delivery_dt.date()).days)

            # Calculate depreciation values
            annual_depreciation = (purchase_amount * depreciation_rate) / Decimal("100")
            daily_depreciation = annual_depreciation / Decimal("365")
            accumulated_depreciation = daily_depreciation * Decimal(str(days_in_use))

            # Cap accumulated depreciation at purchase amount
            accumulated_depreciation = min(accumulated_depreciation, purchase_amount)

            # Calculate net book value
            net_book_value = max(Decimal("0"), purchase_amount - accumulated_depreciation)

            return {
                "annual_depreciation": annual_depreciation.quantize(Decimal("0.01")),
                "accumulated_depreciation": accumulated_depreciation.quantize(Decimal("0.01")),
                "net_book_value": net_book_value.quantize(Decimal("0.01")),
            }

        except (ValueError, TypeError) as e:
            # Return zeros on calculation error
            return {
                "annual_depreciation": Decimal("0.00"),
                "accumulated_depreciation": Decimal("0.00"),
                "net_book_value": Decimal("0.00"),
            }

    @staticmethod
    def apply_financial_calculations(asset_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply depreciation calculations to asset data dict.
        Modifies the dict in place and returns it.
        
        Args:
            asset_data: Dictionary containing asset information
            
        Returns:
            Same dictionary with calculated financial values added
        """
        financial_values = DepreciationService.calculate_financial_values(
            purchase_amount=asset_data.get("purchase_amount"),
            depreciation_rate=asset_data.get("depreciation_rate"),
            delivery_installation_date=asset_data.get("delivery_installation_date"),
            replacement_date=asset_data.get("replacement_date"),
            disposal_date=asset_data.get("disposal_date"),
        )

        asset_data.update(financial_values)
        return asset_data


# Global instance
depreciation_service = DepreciationService()
