# fastapi-server/app/routers/ict_assets.py

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID

from app.core.deps import (
    get_current_user, 
    require_admin_or_user, 
    get_db,
    require_ict_assets_read,
    require_ict_assets_write,
    require_ict_assets_admin
)
from app.models.auth_models.user import User
from app.models.ict_asset import IctAsset
from app.models.ict_asset_transfer import IctAssetTransfer
from app.schemas.ict_asset import (
    IctAsset as IctAssetSchema,
    IctAssetCreate,
    IctAssetUpdate
)
from app.schemas.ict_asset_transfer import (
    IctAssetTransferCreate,
    IctAssetTransferResponse
)
from app.core.audit import log_audit_event
from app.services.audit_service import audit_service
from app.utils.generate_custom_id import generate_uuid
from app.services.depreciation_service import depreciation_service

router = APIRouter()


# ---------------------------------------------------------------------
# GET ALL ICT ASSETS
# ---------------------------------------------------------------------
@router.get("/", response_model=List[IctAssetSchema])
async def get_ict_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_read)
):
    """Get all ICT assets with pagination"""
    result = await db.execute(select(IctAsset).offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------
# SEARCH ICT ASSETS
# ---------------------------------------------------------------------
@router.get("/search", response_model=List[IctAssetSchema])
async def search_ict_assets(
    q: Optional[str] = Query(None, description="Search query"),
    asset_condition: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    responsible_officer: Optional[str] = Query(None),
    current_location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_read)
):
    """Search ICT assets with filters"""
    query = select(IctAsset)

    if q:
        query = query.where(
            or_(
                IctAsset.asset_description.ilike(f"%{q}%"),
                IctAsset.serial_number.ilike(f"%{q}%"),
                IctAsset.tag_number.ilike(f"%{q}%"),
                IctAsset.make_model.ilike(f"%{q}%"),
                IctAsset.asset_type.ilike(f"%{q}%"),
                IctAsset.operating_system.ilike(f"%{q}%")
            )
        )

    if asset_condition:
        query = query.where(IctAsset.asset_condition.ilike(f"%{asset_condition}%"))
    if asset_type:
        query = query.where(IctAsset.asset_type.ilike(f"%{asset_type}%"))
    if responsible_officer:
        query = query.where(IctAsset.responsible_officer.ilike(f"%{responsible_officer}%"))
    if current_location:
        query = query.where(IctAsset.current_location.ilike(f"%{current_location}%"))

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------
# GET SINGLE ICT ASSET
# ---------------------------------------------------------------------
@router.get("/{asset_id}", response_model=IctAssetSchema)
async def get_ict_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_read)
):
    """Get a specific ICT asset by UUID"""
    result = await db.execute(
        select(IctAsset).where(IctAsset.id == str(asset_id))
    )
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="ICT asset not found")
    return asset


# ---------------------------------------------------------------------
# GET ICT ASSET TRANSFERS
# ---------------------------------------------------------------------
@router.get("/{asset_id}/transfers", response_model=List[IctAssetTransferResponse])
async def get_ict_asset_transfers(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_read)
):
    """Get transfer history for a specific ICT asset"""
    # First check if asset exists
    asset_stmt = select(IctAsset).where(IctAsset.id == str(asset_id))
    asset_result = await db.execute(asset_stmt)
    asset = asset_result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(status_code=404, detail="ICT asset not found")
    
    # Get transfer history ordered by transfer date (most recent first)
    transfers_stmt = select(IctAssetTransfer).where(
        IctAssetTransfer.ict_asset_id == str(asset_id)
    ).order_by(IctAssetTransfer.transfer_date.desc())
    
    transfers_result = await db.execute(transfers_stmt)
    transfers = transfers_result.scalars().all()
    
    return transfers


# ---------------------------------------------------------------------
# CREATE ICT ASSET
# ---------------------------------------------------------------------
@router.post("/", response_model=IctAssetSchema, status_code=status.HTTP_201_CREATED)
async def create_ict_asset(
    asset_data: IctAssetCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_write)
):
    """Create a new ICT asset"""

    # Duplicate checks
    if asset_data.serial_number:
        result = await db.execute(
            select(IctAsset).where(IctAsset.serial_number == asset_data.serial_number)
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="An asset with this serial number already exists")

    if asset_data.tag_number:
        result = await db.execute(
            select(IctAsset).where(IctAsset.tag_number == asset_data.tag_number)
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="An asset with this tag number already exists")

    asset_dict = asset_data.dict()
    asset_dict = depreciation_service.apply_financial_calculations(asset_dict)

    db_asset = IctAsset(
        **asset_dict,
        created_by=current_user.username,
        updated_by=current_user.username
    )

    db.add(db_asset)
    await db.commit()
    await db.refresh(db_asset)

    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="CREATE_ICT_ASSET",
        entity_type="Create ICT Asset",
        details="Created new ICT asset",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )

    return db_asset


# ---------------------------------------------------------------------
# UPDATE ICT ASSET
# ---------------------------------------------------------------------
@router.put("/{asset_id}", response_model=IctAssetSchema)
async def update_ict_asset(
    asset_id: UUID,
    asset_data: IctAssetUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_write)
):
    """Update an existing ICT asset"""

    result = await db.execute(
        select(IctAsset).where(IctAsset.id == str(asset_id))
    )
    db_asset = result.scalars().first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="ICT asset not found")

    # Duplicate checks
    if asset_data.serial_number and asset_data.serial_number != db_asset.serial_number:
        result = await db.execute(
            select(IctAsset).where(
                IctAsset.serial_number == asset_data.serial_number,
                IctAsset.id != str(asset_id)
            )
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Another asset with this serial number exists")

    if asset_data.tag_number and asset_data.tag_number != db_asset.tag_number:
        result = await db.execute(
            select(IctAsset).where(
                IctAsset.tag_number == asset_data.tag_number,
                IctAsset.id != str(asset_id)
            )
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Another asset with this tag number exists")

    update_data = asset_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_asset, field, value)
    
    # Apply financial calculations to the asset
    asset_dict = {
        "purchase_amount": db_asset.purchase_amount,
        "depreciation_rate": db_asset.depreciation_rate,
        "delivery_installation_date": db_asset.delivery_installation_date,
        "replacement_date": db_asset.replacement_date,
        "disposal_date": db_asset.disposal_date,
    }
    financial_values = depreciation_service.apply_financial_calculations(asset_dict)
    
    # Update financial fields on asset
    db_asset.annual_depreciation = financial_values["annual_depreciation"]
    db_asset.accumulated_depreciation = financial_values["accumulated_depreciation"]
    db_asset.net_book_value = financial_values["net_book_value"]

    db_asset.updated_by = current_user.username
    db_asset.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(db_asset)

    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="UPDATE_ICT_ASSET",
        entity_type="Update ICT Asset",
        details="Updated ICT asset details",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )

    return db_asset


# ---------------------------------------------------------------------
# DELETE ICT ASSET
# ---------------------------------------------------------------------
@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ict_asset(
    asset_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_admin)
):
    """Delete an ICT asset"""

    result = await db.execute(
        select(IctAsset).where(IctAsset.id == str(asset_id))
    )
    db_asset = result.scalars().first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="ICT asset not found")

    asset_desc = db_asset.asset_description

    await db.delete(db_asset)
    await db.commit()

    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="DELETE_ICT_ASSET",
        entity_type="Delete ICT Asset",
        details=f"Deleted ICT asset {asset_desc}",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )


# ---------------------------------------------------------------------
# TRANSFER ICT ASSET
# ---------------------------------------------------------------------
@router.post("/{asset_id}/transfer", status_code=status.HTTP_201_CREATED)
async def transfer_ict_asset(
    asset_id: UUID,
    transfer_data: IctAssetTransferCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_write)
):
    """Transfer an ICT asset to a new owner/location"""
    
    result = await db.execute(
        select(IctAsset).where(IctAsset.id == str(asset_id))
    )
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="ICT asset not found")

    # Create transfer record
    transfer_record = IctAssetTransfer(
        id=generate_uuid(),
        ict_asset_id=str(asset_id),
        previous_owner=transfer_data.previous_owner,
        assigned_to=transfer_data.assigned_to,
        location=asset.current_location,
        room_or_floor=asset.transfer_room_or_floor,
        transfer_department=transfer_data.transfer_department,
        transfer_location=transfer_data.transfer_location,
        transfer_room_or_floor=transfer_data.transfer_room_or_floor,
        transfer_reason=transfer_data.transfer_reason,
        created_by=current_user.username
    )

    # Update asset with new transfer information
    asset.previous_owner = transfer_data.previous_owner
    asset.responsible_officer = transfer_data.assigned_to
    asset.transfer_department = transfer_data.transfer_department
    asset.current_location = transfer_data.transfer_location
    asset.transfer_location = transfer_data.transfer_location
    asset.transfer_room_or_floor = transfer_data.transfer_room_or_floor
    asset.transfer_reason = transfer_data.transfer_reason
    asset.updated_by = current_user.username
    asset.updated_at = datetime.utcnow()

    db.add(transfer_record)
    await db.commit()

    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="TRANSFER_ICT_ASSET",
        entity_type="Transfer ICT Asset",
        details=f"Transferred ICT asset {asset.asset_description} to {transfer_data.assigned_to}",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )

    return {"message": "ICT asset transfer successful"}


# ---------------------------------------------------------------------
# SUMMARY STATS
# ---------------------------------------------------------------------
@router.get("/stats/summary")
async def get_ict_assets_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_read)
):
    """Get summary statistics for ICT assets"""

    total_assets = await db.scalar(select(func.count()).select_from(IctAsset))
    total_value = await db.scalar(select(func.sum(IctAsset.purchase_amount)))
    total_net_book_value = await db.scalar(select(func.sum(IctAsset.net_book_value)))
    total_disposal_value = await db.scalar(select(func.sum(IctAsset.disposal_value)))

    return {
        "total_assets": total_assets or 0,
        "total_purchase_value": float(total_value or 0),
        "total_net_book_value": float(total_net_book_value or 0),
        "total_disposal_value": float(total_disposal_value or 0)
    }


# ---------------------------------------------------------------------
# GENERATE TAG NUMBER
# ---------------------------------------------------------------------
@router.post("/generate-tag", response_model=dict)
async def generate_tag_number(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_write)
):
    """Generate a unique tag number for ICT assets"""
    import random
    import string
    
    max_attempts = 10
    for attempt in range(max_attempts):
        random_number = random.randint(1000, 9999)
        random_letter = random.choice(string.ascii_uppercase)
        
        tag_number = f"Y-{random_number}{random_letter}"
        
        # Check if tag number already exists
        result = await db.execute(
            select(IctAsset).where(IctAsset.tag_number == tag_number)
        )
        existing_asset = result.scalars().first()
        
        if not existing_asset:
            return {
                "tag_number": tag_number,
                "message": "Tag number generated successfully"
            }
    
    # If we couldn't generate a unique tag after max attempts
    raise HTTPException(
        status_code=500, 
        detail="Unable to generate unique tag number. Please try again."
    )


# ---------------------------------------------------------------------
# VALIDATE TAG NUMBER
# ---------------------------------------------------------------------
@router.post("/validate-tag", response_model=dict)
async def validate_tag_number(
    tag_data: dict,
    asset_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_write)
):
    """Validate if a tag number is available"""
    tag_number = tag_data.get("tag_number", "").strip()
    
    if not tag_number:
        raise HTTPException(status_code=400, detail="Tag number is required")
    
    # Check if tag number already exists (excluding current asset if editing)
    query = select(IctAsset).where(IctAsset.tag_number == tag_number)
    if asset_id:
        query = query.where(IctAsset.id != asset_id)
    
    result = await db.execute(query)
    existing_asset = result.scalars().first()
    
    if existing_asset:
        return {
            "valid": False,
            "message": f"Tag number '{tag_number}' is already in use by another asset"
        }
    
    return {
        "valid": True,
        "message": "Tag number is available"
    }


# ---------------------------------------------------------------------
# VALIDATE SERIAL NUMBER
# ---------------------------------------------------------------------
@router.post("/validate-serial", response_model=dict)
async def validate_serial_number(
    serial_data: dict,
    asset_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_write)
):
    """Validate if a serial number is available"""
    serial_number = serial_data.get("serial_number", "").strip()
    
    if not serial_number:
        raise HTTPException(status_code=400, detail="Serial number is required")
    
    # Check if serial number already exists (excluding current asset if editing)
    query = select(IctAsset).where(IctAsset.serial_number == serial_number)
    if asset_id:
        query = query.where(IctAsset.id != asset_id)
    
    result = await db.execute(query)
    existing_asset = result.scalars().first()
    
    if existing_asset:
        return {
            "valid": False,
            "message": f"Serial number '{serial_number}' is already in use by another asset"
        }
    
    return {
        "valid": True,
        "message": "Serial number is available"
    }


# ---------------------------------------------------------------------
# CHECK SERIAL NUMBERS (BULK)
# ---------------------------------------------------------------------
@router.post("/check-serial-numbers")
async def check_serial_numbers(
    serial_numbers_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_write)
):
    """Check if serial numbers already exist (for bulk upload validation)"""
    serial_numbers = serial_numbers_data.get("serial_numbers", [])
    
    if not serial_numbers:
        raise HTTPException(status_code=400, detail="Expected an array of serial numbers")
    
    # Query for existing serial numbers
    stmt = select(IctAsset.serial_number).where(IctAsset.serial_number.in_(serial_numbers))
    result = await db.execute(stmt)
    existing_serial_numbers = [row[0] for row in result.fetchall()]
    
    return {"existing_serial_numbers": existing_serial_numbers}

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


# ---------------------------------------------------------------------
# UPLOAD EXCEL DATA (BULK)
# ---------------------------------------------------------------------
@router.post("/upload-excel-data", status_code=status.HTTP_201_CREATED)
async def upload_excel_data(
    excel_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_ict_assets_write)
):
    """
    Upload ICT assets from Excel data with flexible date parsing.
    """
    assets_data = excel_data.get("data", [])
    if not assets_data or not isinstance(assets_data, list):
        raise HTTPException(status_code=400, detail="Expected a list of asset records under 'data'")

    assets_to_create = []
    seen_serials, seen_tags = set(), set()
    errors = []

    for idx, asset_data in enumerate(assets_data, start=1):
        required_fields = ["asset_description", "financed_by", "serial_number", "tag_number", "make_model", "purchase_amount"]
        missing_fields = [f for f in required_fields if not asset_data.get(f)]
        if missing_fields:
            errors.append({
                "row": idx,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            })
            continue

        serial_number = asset_data["serial_number"]
        tag_number = asset_data["tag_number"]

        # Check for duplicates within upload
        if serial_number in seen_serials or tag_number in seen_tags:
            errors.append({
                "row": idx,
                "error": f"Duplicate serial or tag number within upload (serial={serial_number}, tag={tag_number})"
            })
            continue

        seen_serials.add(serial_number)
        seen_tags.add(tag_number)

        # Check existing in DB
        existing_asset = await db.execute(
            select(IctAsset).where(
                (IctAsset.serial_number == serial_number) |
                (IctAsset.tag_number == tag_number)
            )
        )
        if existing_asset.scalar_one_or_none():
            errors.append({
                "row": idx,
                "error": f"Asset with serial '{serial_number}' or tag '{tag_number}' already exists."
            })
            continue

        # Parse dates safely
        delivery_installation_date = parse_flexible_date(asset_data.get("delivery_installation_date"))
        replacement_date = parse_flexible_date(asset_data.get("replacement_date"))
        disposal_date = parse_flexible_date(asset_data.get("disposal_date"))

        asset = IctAsset(
            id=generate_uuid(),
            asset_description=asset_data.get("asset_description"),
            financed_by=asset_data.get("financed_by"),
            serial_number=serial_number,
            tag_number=tag_number,
            make_model=asset_data.get("make_model"),
            pv_number=asset_data.get("pv_number"),
            asset_type=asset_data.get("asset_type"),
            specifications=asset_data.get("specifications"),
            software_licenses=asset_data.get("software_licenses"),
            warranty_expiry=parse_flexible_date(asset_data.get("warranty_expiry")),
            ip_address=asset_data.get("ip_address"),
            mac_address=asset_data.get("mac_address"),
            operating_system=asset_data.get("operating_system"),
            original_location=asset_data.get("original_location"),
            current_location=asset_data.get("current_location"),
            responsible_officer=asset_data.get("responsible_officer"),
            delivery_installation_date=delivery_installation_date,
            replacement_date=replacement_date,
            disposal_date=disposal_date,
            purchase_amount=asset_data.get("purchase_amount"),
            depreciation_rate=asset_data.get("depreciation_rate"),
            annual_depreciation=asset_data.get("annual_depreciation"),
            accumulated_depreciation=asset_data.get("accumulated_depreciation"),
            net_book_value=asset_data.get("net_book_value"),
            disposal_value=asset_data.get("disposal_value"),
            asset_condition=asset_data.get("asset_condition"),
            notes=asset_data.get("notes"),
            previous_owner=asset_data.get("previous_owner"),
            transfer_department=asset_data.get("transfer_department"),
            transfer_location=asset_data.get("transfer_location"),
            transfer_room_or_floor=asset_data.get("transfer_room_or_floor"),
            transfer_reason=asset_data.get("transfer_reason"),
            created_by=current_user.username,
            updated_by=current_user.username,
        )

        assets_to_create.append(asset)

    # Return early if errors
    if errors:
        return {
            "message": "Upload completed with some errors",
            "errors": errors,
            "uploaded_count": len(assets_to_create)
        }

    # Bulk insert
    db.add_all(assets_to_create)
    await db.commit()

    # Log audit
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="BULK_UPLOAD_ICT_ASSETS",
        entity_type="Bulk Upload ICT Assets",
        details=f"Uploaded {len(assets_to_create)} ICT assets via Excel upload",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )

    return {
        "message": f"{len(assets_to_create)} ICT assets uploaded successfully",
        "uploaded_count": len(assets_to_create)
    }
