"""
Dashboard statistics routes
Aggregates data from all asset categories for government asset management
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.auth_models.user import User
from app.models.building import Building
from app.models.vehicle import Vehicle
from app.models.office_equipment import OfficeEquipment
from app.models.furniture_equipment import FurnitureEquipment
from app.models.land_asset import LandAsset
from app.models.plant_machinery import PlantMachinery
from app.models.portable_item import PortableItem
from app.models.ict_asset import IctAsset

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive government asset management dashboard statistics"""
    try:
        # Asset counts by category
        buildings_count = await db.scalar(select(func.count()).select_from(Building)) or 0
        vehicles_count = await db.scalar(select(func.count()).select_from(Vehicle)) or 0
        office_equipment_count = await db.scalar(select(func.count()).select_from(OfficeEquipment)) or 0
        furniture_count = await db.scalar(select(func.count()).select_from(FurnitureEquipment)) or 0
        land_assets_count = await db.scalar(select(func.count()).select_from(LandAsset)) or 0
        plant_machinery_count = await db.scalar(select(func.count()).select_from(PlantMachinery)) or 0
        portable_items_count = await db.scalar(select(func.count()).select_from(PortableItem)) or 0
        ict_assets_count = await db.scalar(select(func.count()).select_from(IctAsset)) or 0

        total_assets = (
            buildings_count + vehicles_count + 
            office_equipment_count + furniture_count + land_assets_count + 
            plant_machinery_count + portable_items_count + ict_assets_count
        )

        # Financial values (total asset value)
        buildings_value = await db.scalar(select(func.sum(Building.net_book_value))) or 0
        vehicles_value = await db.scalar(select(func.sum(Vehicle.net_book_value))) or 0
        office_equipment_value = await db.scalar(select(func.sum(OfficeEquipment.net_book_value))) or 0
        furniture_value = await db.scalar(select(func.sum(FurnitureEquipment.net_book_value))) or 0
        land_assets_value = await db.scalar(select(func.sum(LandAsset.fair_value))) or 0
        plant_machinery_value = await db.scalar(select(func.sum(PlantMachinery.net_book_value))) or 0
        portable_items_value = await db.scalar(select(func.sum(PortableItem.net_book_value))) or 0
        ict_assets_value = await db.scalar(select(func.sum(IctAsset.net_book_value))) or 0

        total_value = (
            buildings_value + vehicles_value + office_equipment_value + 
            furniture_value + land_assets_value + plant_machinery_value + 
            portable_items_value + ict_assets_value
        )

        # Recent additions (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        recent_buildings = await db.scalar(
            select(func.count()).select_from(Building).where(Building.created_at >= seven_days_ago)
        ) or 0
        recent_vehicles = await db.scalar(
            select(func.count()).select_from(Vehicle).where(Vehicle.created_at >= seven_days_ago)
        ) or 0
        recent_office_equipment = await db.scalar(
            select(func.count()).select_from(OfficeEquipment).where(OfficeEquipment.created_at >= seven_days_ago)
        ) or 0
        recent_furniture = await db.scalar(
            select(func.count()).select_from(FurnitureEquipment).where(FurnitureEquipment.created_at >= seven_days_ago)
        ) or 0
        recent_land_assets = await db.scalar(
            select(func.count()).select_from(LandAsset).where(LandAsset.created_at >= seven_days_ago)
        ) or 0
        recent_plant_machinery = await db.scalar(
            select(func.count()).select_from(PlantMachinery).where(PlantMachinery.created_at >= seven_days_ago)
        ) or 0
        recent_portable_items = await db.scalar(
            select(func.count()).select_from(PortableItem).where(PortableItem.created_at >= seven_days_ago)
        ) or 0
        recent_ict_assets = await db.scalar(
            select(func.count()).select_from(IctAsset).where(IctAsset.created_at >= seven_days_ago)
        ) or 0

        total_recent_additions = (
            recent_buildings + recent_vehicles + 
            recent_office_equipment + recent_furniture + recent_land_assets + 
            recent_plant_machinery + recent_portable_items + recent_ict_assets
        )

        # Assets requiring attention (maintenance, repairs, etc.)
        maintenance_due_vehicles = await db.scalar(
            select(func.count()).select_from(Vehicle).where(Vehicle.asset_condition.in_(["Poor", "Needs Repair"]))
        ) or 0
        maintenance_due_office = await db.scalar(
            select(func.count()).select_from(OfficeEquipment).where(OfficeEquipment.asset_condition.in_(["Poor", "Needs Repair"]))
        ) or 0
        maintenance_due_furniture = await db.scalar(
            select(func.count()).select_from(FurnitureEquipment).where(FurnitureEquipment.asset_condition.in_(["Poor", "Needs Repair"]))
        ) or 0
        maintenance_due_ict = await db.scalar(
            select(func.count()).select_from(IctAsset).where(IctAsset.asset_condition.in_(["Poor", "Needs Repair"]))
        ) or 0

        total_maintenance_due = (
            maintenance_due_vehicles + 
            maintenance_due_office + maintenance_due_furniture + maintenance_due_ict
        )

        # Count assets that have been disposed (have disposal_date in the past)
        now = datetime.utcnow()
        
        disposed_furniture = await db.scalar(
            select(func.count()).select_from(FurnitureEquipment).where(
                and_(FurnitureEquipment.disposal_date.isnot(None), FurnitureEquipment.disposal_date <= now)
            )
        ) or 0
        disposed_ict = await db.scalar(
            select(func.count()).select_from(IctAsset).where(
                and_(IctAsset.disposal_date.isnot(None), IctAsset.disposal_date <= now)
            )
        ) or 0
        disposed_land = await db.scalar(
            select(func.count()).select_from(LandAsset).where(
                and_(LandAsset.disposal_date.isnot(None), LandAsset.disposal_date <= now)
            )
        ) or 0
        disposed_office = await db.scalar(
            select(func.count()).select_from(OfficeEquipment).where(
                and_(OfficeEquipment.date_of_disposal.isnot(None), OfficeEquipment.date_of_disposal <= now)
            )
        ) or 0
        disposed_plant = await db.scalar(
            select(func.count()).select_from(PlantMachinery).where(
                and_(PlantMachinery.disposal_date.isnot(None), PlantMachinery.disposal_date <= now)
            )
        ) or 0
        disposed_portable = await db.scalar(
            select(func.count()).select_from(PortableItem).where(
                and_(PortableItem.disposal_date.isnot(None), PortableItem.disposal_date <= now)
            )
        ) or 0
        disposed_vehicles = await db.scalar(
            select(func.count()).select_from(Vehicle).where(
                and_(Vehicle.date_of_disposal.isnot(None), Vehicle.date_of_disposal <= now)
            )
        ) or 0
        
        total_disposed = (
            disposed_furniture + disposed_ict + disposed_land + 
            disposed_office + disposed_plant + disposed_portable + disposed_vehicles
        )

        # Count assets nearing end of lifecycle (disposal date within next 90 days)
        ninety_days_from_now = now + timedelta(days=90)
        
        nearing_disposal_furniture = await db.scalar(
            select(func.count()).select_from(FurnitureEquipment).where(
                and_(
                    FurnitureEquipment.disposal_date.isnot(None),
                    FurnitureEquipment.disposal_date > now,
                    FurnitureEquipment.disposal_date <= ninety_days_from_now
                )
            )
        ) or 0
        nearing_disposal_ict = await db.scalar(
            select(func.count()).select_from(IctAsset).where(
                and_(
                    IctAsset.disposal_date.isnot(None),
                    IctAsset.disposal_date > now,
                    IctAsset.disposal_date <= ninety_days_from_now
                )
            )
        ) or 0
        nearing_disposal_land = await db.scalar(
            select(func.count()).select_from(LandAsset).where(
                and_(
                    LandAsset.disposal_date.isnot(None),
                    LandAsset.disposal_date > now,
                    LandAsset.disposal_date <= ninety_days_from_now
                )
            )
        ) or 0
        nearing_disposal_office = await db.scalar(
            select(func.count()).select_from(OfficeEquipment).where(
                and_(
                    OfficeEquipment.date_of_disposal.isnot(None),
                    OfficeEquipment.date_of_disposal > now,
                    OfficeEquipment.date_of_disposal <= ninety_days_from_now
                )
            )
        ) or 0
        nearing_disposal_plant = await db.scalar(
            select(func.count()).select_from(PlantMachinery).where(
                and_(
                    PlantMachinery.disposal_date.isnot(None),
                    PlantMachinery.disposal_date > now,
                    PlantMachinery.disposal_date <= ninety_days_from_now
                )
            )
        ) or 0
        nearing_disposal_portable = await db.scalar(
            select(func.count()).select_from(PortableItem).where(
                and_(
                    PortableItem.disposal_date.isnot(None),
                    PortableItem.disposal_date > now,
                    PortableItem.disposal_date <= ninety_days_from_now
                )
            )
        ) or 0
        nearing_disposal_vehicles = await db.scalar(
            select(func.count()).select_from(Vehicle).where(
                and_(
                    Vehicle.date_of_disposal.isnot(None),
                    Vehicle.date_of_disposal > now,
                    Vehicle.date_of_disposal <= ninety_days_from_now
                )
            )
        ) or 0
        
        total_nearing_disposal = (
            nearing_disposal_furniture + nearing_disposal_ict + nearing_disposal_land + 
            nearing_disposal_office + nearing_disposal_plant + nearing_disposal_portable + 
            nearing_disposal_vehicles
        )

        # Asset activity over last 7 days (for trend analysis)
        activity_data = []
        for i in range(7):
            date = datetime.utcnow() - timedelta(days=6-i)
            date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            date_end = date_start + timedelta(days=1)
            
            daily_additions = 0
            categories = [Building, Vehicle, OfficeEquipment, FurnitureEquipment, 
                         LandAsset, PlantMachinery, PortableItem, IctAsset]
            
            for category in categories:
                if hasattr(category, 'created_at'):
                    count = await db.scalar(
                        select(func.count()).select_from(category).where(
                            and_(category.created_at >= date_start, category.created_at < date_end)
                        )
                    ) or 0
                    daily_additions += count
            
            activity_data.append({
                "date": date.strftime("%b %d"),
                "count": daily_additions
            })

        return {
            "summary": {
                "total_assets": total_assets,
                "total_value": float(total_value),
                "recent_additions": total_recent_additions,
                "maintenance_due": total_maintenance_due,
                "disposed_items": total_disposed,
                "nearing_disposal": total_nearing_disposal
            },
            "asset_breakdown": {
                "buildings": buildings_count,
                "vehicles": vehicles_count,
                "office_equipment": office_equipment_count,
                "furniture_equipment": furniture_count,
                "land_assets": land_assets_count,
                "plant_machinery": plant_machinery_count,
                "portable_items": portable_items_count,
                "ict_assets": ict_assets_count
            },
            "value_breakdown": {
                "buildings": float(buildings_value),
                "vehicles": float(vehicles_value),
                "office_equipment": float(office_equipment_value),
                "furniture_equipment": float(furniture_value),
                "land_assets": float(land_assets_value),
                "plant_machinery": float(plant_machinery_value),
                "portable_items": float(portable_items_value),
                "ict_assets": float(ict_assets_value)
            },
            "recent_breakdown": {
                "buildings": recent_buildings,
                "vehicles": recent_vehicles,
                "office_equipment": recent_office_equipment,
                "furniture_equipment": recent_furniture,
                "land_assets": recent_land_assets,
                "plant_machinery": recent_plant_machinery,
                "portable_items": recent_portable_items,
                "ict_assets": recent_ict_assets
            },
            "activity_trend": activity_data,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard statistics: {str(e)}"
        )

@router.get("/overview")
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get high-level dashboard overview with key metrics"""
    try:
        # Total asset count across all categories
        total_assets = 0
        categories = [Building, Vehicle, OfficeEquipment, FurnitureEquipment, 
                     LandAsset, PlantMachinery, PortableItem, IctAsset]
        
        for category in categories:
            count = await db.scalar(select(func.count()).select_from(category)) or 0
            total_assets += count

        # Total system value
        total_value = 0
        value_fields = [
            (Building, Building.net_book_value),
            (Vehicle, Vehicle.net_book_value),
            (OfficeEquipment, OfficeEquipment.net_book_value),
            (FurnitureEquipment, FurnitureEquipment.net_book_value),
            (LandAsset, LandAsset.fair_value),
            (PlantMachinery, PlantMachinery.net_book_value),
            (PortableItem, PortableItem.net_book_value),
            (IctAsset, IctAsset.net_book_value)
        ]
        
        for model, field in value_fields:
            value = await db.scalar(select(func.sum(field))) or 0
            total_value += value

        # Active users count
        active_users = await db.scalar(select(func.count()).select_from(User)) or 0

        # Recent activity (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_activity = 0
        
        for category in categories:
            if hasattr(category, 'created_at'):
                count = await db.scalar(
                    select(func.count()).select_from(category).where(category.created_at >= seven_days_ago)
                ) or 0
                recent_activity += count

        return {
            "total_assets": total_assets,
            "total_value": float(total_value),
            "active_users": active_users,
            "recent_activity": recent_activity,
            "system_health": "operational",
            "last_updated": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard overview: {str(e)}"
        )

@router.get("/password-status")
async def get_password_change_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if user needs to change password and provide deadline info"""
    
    now = datetime.utcnow()
    days_since_creation = (now - current_user.created_at).days
    days_since_password_change = None
    
    if current_user.password_changed_at:
        days_since_password_change = (now - current_user.password_changed_at).days
    
    # Calculate deadline (5 days from account creation)
    deadline = current_user.created_at + timedelta(days=5)
    days_until_deadline = (deadline - now).days
    
    password_status = "valid"
    show_banner = False
    force_change = False
    
    # Scenario 4: Password already expired
    if current_user.is_password_expired():
        password_status = "expired"
        show_banner = True
        force_change = True
    
    # Scenario 1-3: New user scenarios (password_changed_at is None)
    elif current_user.password_changed_at is None:
        days_since_creation = (now - current_user.created_at).days
        
        if days_since_creation >= 5:
            # Scenario 2: After 5 days → force change
            password_status = "expired_grace_period"
            show_banner = True
            force_change = True
        elif days_since_creation >= 3:
            # Scenario 3: Nearing expiry (3+ days, max 5) → show warning banner
            password_status = "nearing_expiry"
            show_banner = True
            force_change = False
        else:
            # Scenario 1: Brand new account (< 3 days) → show banner but not forcing
            password_status = "new_user"
            show_banner = True
            force_change = False
    
    return {
        "password_status": password_status,
        "show_banner": show_banner,
        "force_change": force_change,
        "password_changed_at": current_user.password_changed_at.isoformat() if current_user.password_changed_at else None,
        "requires_password_change": current_user.requires_password_change,
        "is_password_expired": current_user.is_password_expired(),
        "days_since_creation": days_since_creation,
        "days_since_password_change": days_since_password_change,
        "password_expiration": current_user.password_expiration.isoformat() if current_user.password_expiration else None,
        "deadline": deadline.isoformat(),
        "days_until_deadline": max(0, days_until_deadline),
        "message": _get_password_status_message(password_status, days_since_creation, days_until_deadline)
    }


def _get_password_status_message(status: str, days_since_creation: int = 0, days_until_deadline: int = 0) -> str:
    """Generate appropriate message based on password change status"""
    if status == "valid":
        return "Your password is valid."
    elif status == "new_user":
        return "Welcome! Please change your password to continue. You have 5 days."
    elif status == "nearing_expiry":
        days_left = max(0, 5 - days_since_creation)
        return f"Your password will expire soon. Please change it within {days_left} day(s)."
    elif status == "expired_grace_period":
        return "Your password change deadline has passed. You must change your password to continue."
    elif status == "expired":
        return "Your password has expired. You must change it immediately to continue using the system."
    
    return "Please update your password."
