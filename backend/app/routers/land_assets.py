from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, date, timedelta

from app.core.deps import get_current_user, require_admin_or_user, get_db
from app.models.auth_models.user import User
from app.models.land_asset import LandAsset
from app.schemas.land_asset import (
    LandAsset as LandAssetSchema,
    LandAssetCreate,
    LandAssetUpdate
)
from app.services.audit_service import audit_service
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()


# ---------------------------------------------------------------------
# GET ALL LAND ASSETS
# ---------------------------------------------------------------------
@router.get("/", response_model=List[LandAssetSchema])
async def get_land_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all land assets with pagination"""
    result = await db.execute(select(LandAsset).offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------
# SEARCH LAND ASSETS
# ---------------------------------------------------------------------
@router.get("/search", response_model=List[LandAssetSchema])
async def search_land_assets(
    q: Optional[str] = Query(None, description="Search query"),
    county: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    land_tenure: Optional[str] = Query(None),
    disputed: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search land assets with filters"""
    query = select(LandAsset)

    if q:
        query = query.where(
            or_(
                LandAsset.description_of_land.ilike(f"%{q}%"),
                LandAsset.lr_certificate_no.ilike(f"%{q}%"),
                LandAsset.location.ilike(f"%{q}%"),
                LandAsset.nearest_town_location_location.ilike(f"%{q}%")
            )
        )

    if county:
        query = query.where(LandAsset.county.ilike(f"%{county}%"))
    if category:
        query = query.where(LandAsset.category.ilike(f"%{category}%"))
    if land_tenure:
        query = query.where(LandAsset.land_tenure.ilike(f"%{land_tenure}%"))
    if disputed is not None:
        query = query.where(LandAsset.disputed == disputed)

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------
# GET SINGLE LAND ASSET
# ---------------------------------------------------------------------
@router.get("/{land_asset_id}", response_model=LandAssetSchema)
async def get_land_asset(
    land_asset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific land asset by ID"""
    result = await db.execute(select(LandAsset).where(LandAsset.id == land_asset_id))
    land_asset = result.scalars().first()
    if not land_asset:
        raise HTTPException(status_code=404, detail="Land asset not found")
    return land_asset


# ---------------------------------------------------------------------
# CREATE LAND ASSET
# ---------------------------------------------------------------------
@router.post("/", response_model=LandAssetSchema, status_code=status.HTTP_201_CREATED)
async def create_land_asset(
    land_asset_data: LandAssetCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Create a new land asset"""

    if land_asset_data.lr_certificate_no:
        result = await db.execute(
            select(LandAsset).where(LandAsset.lr_certificate_no == land_asset_data.lr_certificate_no)
        )
        existing_asset = result.scalars().first()
        if existing_asset:
            raise HTTPException(
                status_code=400,
                detail="Land asset with this L.R/Certificate number already exists"
            )

    db_land_asset = LandAsset(
        **land_asset_data.dict(),
        created_by=current_user.username,
        updated_by=current_user.username
    )

    db.add(db_land_asset)
    await db.commit()
    await db.refresh(db_land_asset)

    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        entity_type="LandAsset",
        entity_id=str(db_land_asset.id),
        details=f"Created land asset {db_land_asset.description_of_land}",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )

    return db_land_asset


# ---------------------------------------------------------------------
# UPDATE LAND ASSET
# ---------------------------------------------------------------------
@router.put("/{land_asset_id}", response_model=LandAssetSchema)
async def update_land_asset(
    land_asset_id: int,
    land_asset_data: LandAssetUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Update an existing land asset"""

    result = await db.execute(select(LandAsset).where(LandAsset.id == land_asset_id))
    db_land_asset = result.scalars().first()
    if not db_land_asset:
        raise HTTPException(status_code=404, detail="Land asset not found")

    if land_asset_data.lr_certificate_no and land_asset_data.lr_certificate_no != db_land_asset.lr_certificate_no:
        result = await db.execute(
            select(LandAsset).where(
                LandAsset.lr_certificate_no == land_asset_data.lr_certificate_no,
                LandAsset.id != land_asset_id
            )
        )
        existing_asset = result.scalars().first()
        if existing_asset:
            raise HTTPException(
                status_code=400,
                detail="Another land asset with this L.R/Certificate number already exists"
            )

    update_data = land_asset_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_land_asset, field, value)

    db_land_asset.updated_by = current_user.username
    db_land_asset.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(db_land_asset)

    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="UPDATE",
        entity_type="LandAsset",
        entity_id=str(db_land_asset.id),
        details=f"Updated land asset {db_land_asset.description_of_land}",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )

    return db_land_asset


# ---------------------------------------------------------------------
# DELETE LAND ASSET
# ---------------------------------------------------------------------
@router.delete("/{land_asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_land_asset(
    land_asset_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Delete a land asset"""

    result = await db.execute(select(LandAsset).where(LandAsset.id == land_asset_id))
    db_land_asset = result.scalars().first()
    if not db_land_asset:
        raise HTTPException(status_code=404, detail="Land asset not found")

    asset_description = db_land_asset.description_of_land

    await db.delete(db_land_asset)
    await db.commit()

    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="DELETE",
        entity_type="LandAsset",
        entity_id=str(land_asset_id),
        details=f"Deleted land asset {asset_description}",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )


# ---------------------------------------------------------------------
# HISTORY
# ---------------------------------------------------------------------
@router.get("/{land_asset_id}/history")
async def get_land_asset_history(
    land_asset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get audit history for a specific land asset"""
    from app.models.audit_log import AuditLog

    result = await db.execute(select(LandAsset).where(LandAsset.id == land_asset_id))
    land_asset = result.scalars().first()
    if not land_asset:
        raise HTTPException(status_code=404, detail="Land asset not found")

    result = await db.execute(
        select(AuditLog).where(
            AuditLog.resource_type == "land_asset",
            AuditLog.resource_id == str(land_asset_id)
        ).order_by(AuditLog.timestamp.desc())
    )
    return result.scalars().all()


# ---------------------------------------------------------------------
# SUMMARY STATS
# ---------------------------------------------------------------------
@router.get("/stats/summary")
async def get_land_assets_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary statistics for land assets"""

    total_assets = await db.scalar(select(func.count()).select_from(LandAsset))
    land_count = await db.scalar(select(func.count()).where(LandAsset.category == "Land"))
    investment_property_count = await db.scalar(select(func.count()).where(LandAsset.category == "Investment Property"))
    freehold_count = await db.scalar(select(func.count()).where(LandAsset.land_tenure == "Freehold"))
    leasehold_count = await db.scalar(select(func.count()).where(LandAsset.land_tenure == "Leasehold"))
    disputed_count = await db.scalar(select(func.count()).where(LandAsset.disputed == True))

    total_size = await db.scalar(select(func.sum(LandAsset.size)))
    total_acquisition_value = await db.scalar(select(func.sum(LandAsset.acquisition_amount)))
    total_fair_value = await db.scalar(select(func.sum(LandAsset.fair_value)))

    return {
        "total_assets": total_assets or 0,
        "by_category": {
            "land": land_count or 0,
            "investment_property": investment_property_count or 0
        },
        "by_tenure": {
            "freehold": freehold_count or 0,
            "leasehold": leasehold_count or 0
        },
        "disputed_assets": disputed_count or 0,
        "total_size": float(total_size or 0),
        "total_acquisition_value": float(total_acquisition_value or 0),
        "total_fair_value": float(total_fair_value or 0)
    }


# ---------------------------------------------------------------------
# CHECK LR CERTIFICATE NUMBERS (BULK)
# ---------------------------------------------------------------------
@router.post("/check-lr-numbers")
async def check_lr_numbers(
    lr_numbers_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Check if LR certificate numbers already exist (for bulk upload validation)"""
    lr_numbers = lr_numbers_data.get("lr_numbers", [])
    
    if not lr_numbers:
        raise HTTPException(status_code=400, detail="Expected an array of LR certificate numbers")
    
    # Query for existing LR numbers
    stmt = select(LandAsset.lr_certificate_no).where(LandAsset.lr_certificate_no.in_(lr_numbers))
    result = await db.execute(stmt)
    existing_lr_numbers = [row[0] for row in result.fetchall()]
    
    return {"existing_lr_numbers": existing_lr_numbers}


# ---------------------------------------------------------------------
# Helper: Robust Date Parser
# ---------------------------------------------------------------------
def parse_flexible_date(value):
    """Try multiple date formats and return a datetime.date or None."""
    if not value or isinstance(value, date):
        return value

    value = str(value).strip()
    formats = [
        "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y",
        "%m-%d-%Y", "%Y/%m/%d", "%d.%m.%Y"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue

    # Try to detect if Excel serial number (e.g. 44927)
    try:
        excel_epoch = datetime(1899, 12, 30)
        if value.isdigit():
            return (excel_epoch + timedelta(days=int(value))).date()
    except Exception:
        pass

    return None  # fallback if parsing fails


def get_client_ip(request: Optional[Request]) -> str:
    """
    Safely extract client IP from Request.client.host, falling back to common headers
    or returning 'unknown' when not available.
    """
    try:
        if request is None:
            return "unknown"
        client = getattr(request, "client", None)
        if client and getattr(client, "host", None):
            return client.host
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
    except Exception:
        pass
    return "unknown"


# ---------------------------------------------------------------------
# UPLOAD EXCEL DATA (BULK)
# ---------------------------------------------------------------------
@router.post("/upload-excel-data", status_code=status.HTTP_201_CREATED)
async def upload_excel_data(
    excel_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """
    Upload land assets from Excel data with flexible date parsing.
    """
    assets_data = excel_data.get("data", [])
    if not assets_data or not isinstance(assets_data, list):
        raise HTTPException(status_code=400, detail="Expected a list of asset records under 'data'")

    assets_to_create = []
    seen_lr_numbers = set()
    errors = []

    for idx, asset_data in enumerate(assets_data, start=1):
        # ✅ Required fields based on model
        required_fields = ["description_of_land", "lr_certificate_no", "county", "location"]
        missing_fields = [f for f in required_fields if not asset_data.get(f)]
        if missing_fields:
            errors.append({
                "row": idx,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            })
            continue

        lr_certificate_no = asset_data["lr_certificate_no"]

        # ✅ Check for duplicates within upload
        if lr_certificate_no in seen_lr_numbers:
            errors.append({
                "row": idx,
                "error": f"Duplicate LR certificate number within upload (lr_no={lr_certificate_no})"
            })
            continue
        seen_lr_numbers.add(lr_certificate_no)

        # ✅ Check existing in DB
        existing_asset = await db.execute(
            select(LandAsset).where(LandAsset.lr_certificate_no == lr_certificate_no)
        )
        if existing_asset.scalar_one_or_none():
            errors.append({
                "row": idx,
                "error": f"Land asset with LR certificate number '{lr_certificate_no}' already exists."
            })
            continue

        # ✅ Parse dates safely (matching model field names)
        acquisition_date = parse_flexible_date(asset_data.get("acquisition_date"))
        registration_date = parse_flexible_date(asset_data.get("registration_date"))
        disposal_date = parse_flexible_date(asset_data.get("disposal_date"))
        change_of_use_date = parse_flexible_date(asset_data.get("change_of_use_date"))

        # ✅ Build the LandAsset object using only valid model fields
        asset = LandAsset(
            description_of_land=asset_data.get("description_of_land"),
            mode_of_acquisition=asset_data.get("mode_of_acquisition"),
            category=asset_data.get("category"),
            county=asset_data.get("county"),
            sub_county=asset_data.get("sub_county"),
            division=asset_data.get("division"),
            location=asset_data.get("location"),
            sub_location=asset_data.get("sub_location"),
            nearest_town_location=asset_data.get("nearest_town_location"),
            gps_coordinates=asset_data.get("gps_coordinates"),
            polygon=asset_data.get("polygon"),
            lr_certificate_no=lr_certificate_no,
            document_of_ownership=asset_data.get("document_of_ownership"),
            proprietorship_details=asset_data.get("proprietorship_details"),
            size_ha=asset_data.get("size_ha"),
            land_tenure=asset_data.get("land_tenure"),
            surveyed=asset_data.get("surveyed"),
            acquisition_date=acquisition_date,
            registration_date=registration_date,
            disposal_date=disposal_date,
            change_of_use_date=change_of_use_date,
            disputed=asset_data.get("disputed"),
            encumbrances=asset_data.get("encumbrances"),
            planned_unplanned=asset_data.get("planned_unplanned"),
            purpose_use_of_land=asset_data.get("purpose_use_of_land"),
            acquisition_amount=asset_data.get("acquisition_amount"),
            fair_value=asset_data.get("fair_value"),
            disposal_value=asset_data.get("disposal_value"),
            annual_rental_income=asset_data.get("annual_rental_income"),
            remarks=asset_data.get("remarks"),
            created_by=current_user.username,
            updated_by=current_user.username,
        )

        assets_to_create.append(asset)

    # ✅ Return early if any errors were detected
    if errors:
        return {
            "message": "Upload completed with some errors",
            "errors": errors,
            "uploaded_count": len(assets_to_create)
        }

    # ✅ Bulk insert and commit
    db.add_all(assets_to_create)
    await db.commit()

    # Create an audit log for the bulk upload using a generated upload id
    upload_id = generate_uuid()
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        entity_type="LandAsset",
        entity_id=str(upload_id),
        details=f"Uploaded {len(assets_to_create)} land assets via Excel",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )

    return {
        "message": f"{len(assets_to_create)} land assets uploaded successfully",
        "uploaded_count": len(assets_to_create)
    }
