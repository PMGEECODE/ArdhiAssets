# fastapi-server/app/api/routes/furniture_equipment.py

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
import random
import string

from app.core.deps import get_current_user, require_admin_or_user, get_db
from app.models.auth_models.user import User
from app.models.furniture_equipment import FurnitureEquipment
from app.schemas.furniture_equipement import (
    FurnitureEquipment as FurnitureEquipmentSchema,
    FurnitureEquipmentCreate,
    FurnitureEquipmentUpdate
)
from app.models.furniture_equipment_transfer import FurnitureEquipmentTransfer
from app.schemas.furniture_equipment_transfer import (
    FurnitureEquipmentTransferCreate,
    FurnitureEquipmentTransferResponse
)
from app.utils.generate_custom_id import generate_uuid
from app.core.audit import log_audit_event

router = APIRouter()


# ---------------------------------------------------------------------
# GET ALL FURNITURE & EQUIPMENT
# ---------------------------------------------------------------------
@router.get("/", response_model=List[FurnitureEquipmentSchema])
async def get_furniture_equipment(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all furniture & equipment with pagination"""
    result = await db.execute(select(FurnitureEquipment).offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------
# SEARCH FURNITURE & EQUIPMENT
# ---------------------------------------------------------------------
@router.get("/search", response_model=List[FurnitureEquipmentSchema])
async def search_furniture_equipment(
    q: Optional[str] = Query(None, description="Search query"),
    asset_condition: Optional[str] = Query(None),
    responsible_officer: Optional[str] = Query(None),
    current_location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search furniture & equipment with filters"""
    query = select(FurnitureEquipment)

    if q:
        query = query.where(
            or_(
                FurnitureEquipment.asset_description.ilike(f"%{q}%"),
                FurnitureEquipment.serial_number.ilike(f"%{q}%"),
                FurnitureEquipment.tag_number.ilike(f"%{q}%"),
                FurnitureEquipment.make_model.ilike(f"%{q}%")
            )
        )

    if asset_condition:
        query = query.where(FurnitureEquipment.asset_condition.ilike(f"%{asset_condition}%"))
    if responsible_officer:
        query = query.where(FurnitureEquipment.responsible_officer.ilike(f"%{responsible_officer}%"))
    if current_location:
        query = query.where(FurnitureEquipment.current_location.ilike(f"%{current_location}%"))

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------
# GET SINGLE FURNITURE & EQUIPMENT
# ---------------------------------------------------------------------
@router.get("/{equipment_id}", response_model=FurnitureEquipmentSchema)
async def get_furniture_equipment_item(
    equipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific furniture or equipment item by ID"""
    result = await db.execute(
        select(FurnitureEquipment).where(FurnitureEquipment.id == str(equipment_id))
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Furniture/Equipment not found")
    return item


# ---------------------------------------------------------------------
# CREATE FURNITURE & EQUIPMENT
# ---------------------------------------------------------------------
@router.post("/", response_model=FurnitureEquipmentSchema, status_code=status.HTTP_201_CREATED)
async def create_furniture_equipment(
    equipment_data: FurnitureEquipmentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Create a new furniture or equipment item"""

    # Check for duplicate serial/tag numbers
    if equipment_data.serial_number:
        result = await db.execute(
            select(FurnitureEquipment).where(FurnitureEquipment.serial_number == equipment_data.serial_number)
        )
        existing_item = result.scalars().first()
        if existing_item:
            raise HTTPException(
                status_code=400,
                detail="An asset with this serial number already exists"
            )

    if equipment_data.tag_number:
        result = await db.execute(
            select(FurnitureEquipment).where(FurnitureEquipment.tag_number == equipment_data.tag_number)
        )
        existing_tag = result.scalars().first()
        if existing_tag:
            raise HTTPException(
                status_code=400,
                detail="An asset with this tag number already exists"
            )

    db_equipment = FurnitureEquipment(
        **equipment_data.dict(),
        created_by=current_user.username,
        updated_by=current_user.username
    )

    db.add(db_equipment)
    await db.commit()
    await db.refresh(db_equipment)

    await log_audit_event(
        db,
        user_id=current_user.id,
        action="CREATE",
        entity_type="FurnitureEquipment",
        entity_id=db_equipment.id,
        details=f"Created furniture/equipment {db_equipment.asset_description}",
        ip_address=request.client.host
    )

    return db_equipment


# ---------------------------------------------------------------------
# UPDATE FURNITURE & EQUIPMENT
# ---------------------------------------------------------------------
@router.put("/{equipment_id}", response_model=FurnitureEquipmentSchema)
async def update_furniture_equipment(
    equipment_id: UUID,
    equipment_data: FurnitureEquipmentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Update an existing furniture or equipment item"""

    result = await db.execute(
        select(FurnitureEquipment).where(FurnitureEquipment.id == str(equipment_id))
    )
    db_equipment = result.scalars().first()
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Furniture/Equipment not found")

    # Duplicate serial check
    if equipment_data.serial_number and equipment_data.serial_number != db_equipment.serial_number:
        result = await db.execute(
            select(FurnitureEquipment).where(
                FurnitureEquipment.serial_number == equipment_data.serial_number,
                FurnitureEquipment.id != str(equipment_id)
            )
        )
        existing_serial = result.scalars().first()
        if existing_serial:
            raise HTTPException(status_code=400, detail="Another asset with this serial number already exists")

    # Duplicate tag check
    if equipment_data.tag_number and equipment_data.tag_number != db_equipment.tag_number:
        result = await db.execute(
            select(FurnitureEquipment).where(
                FurnitureEquipment.tag_number == equipment_data.tag_number,
                FurnitureEquipment.id != str(equipment_id)
            )
        )
        existing_tag = result.scalars().first()
        if existing_tag:
            raise HTTPException(status_code=400, detail="Another asset with this tag number already exists")

    update_data = equipment_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_equipment, field, value)

    db_equipment.updated_by = current_user.username
    db_equipment.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(db_equipment)

    await log_audit_event(
        db,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="FurnitureEquipment",
        entity_id=str(equipment_id),
        details=f"Updated furniture/equipment {db_equipment.asset_description}",
        ip_address=request.client.host
    )

    return db_equipment


# ---------------------------------------------------------------------
# DELETE FURNITURE & EQUIPMENT
# ---------------------------------------------------------------------
@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_furniture_equipment(
    equipment_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Delete a furniture or equipment item"""

    result = await db.execute(
        select(FurnitureEquipment).where(FurnitureEquipment.id == str(equipment_id))
    )
    db_equipment = result.scalars().first()
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Furniture/Equipment not found")

    item_desc = db_equipment.asset_description

    await db.delete(db_equipment)
    await db.commit()

    await log_audit_event(
        db,
        user_id=current_user.id,
        action="DELETE",
        entity_type="FurnitureEquipment",
        entity_id=str(equipment_id),
        details=f"Deleted furniture/equipment {item_desc}",
        ip_address=request.client.host
    )


# ---------------------------------------------------------------------
# SUMMARY STATS
# ---------------------------------------------------------------------
@router.get("/stats/summary")
async def get_furniture_equipment_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary statistics for furniture & equipment"""

    total_items = await db.scalar(select(func.count()).select_from(FurnitureEquipment))
    total_value = await db.scalar(select(func.sum(FurnitureEquipment.purchase_amount)))
    total_net_book_value = await db.scalar(select(func.sum(FurnitureEquipment.net_book_value)))
    total_disposal_value = await db.scalar(select(func.sum(FurnitureEquipment.disposal_value)))

    return {
        "total_items": total_items or 0,
        "total_purchase_value": float(total_value or 0),
        "total_net_book_value": float(total_net_book_value or 0),
        "total_disposal_value": float(total_disposal_value or 0)
    }


# ---------------------------------------------------------------------
# GET FURNITURE EQUIPMENT TRANSFERS
# ---------------------------------------------------------------------
@router.get("/{equipment_id}/transfers", response_model=List[FurnitureEquipmentTransferResponse])
async def get_furniture_equipment_transfers(
    equipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get transfer history for a specific furniture equipment"""
    equipment_stmt = select(FurnitureEquipment).where(FurnitureEquipment.id == str(equipment_id))
    equipment_result = await db.execute(equipment_stmt)
    equipment = equipment_result.scalar_one_or_none()
    
    if not equipment:
        raise HTTPException(status_code=404, detail="Furniture equipment not found")
    
    transfers_stmt = select(FurnitureEquipmentTransfer).where(
        FurnitureEquipmentTransfer.furniture_equipment_id == str(equipment_id)
    ).order_by(FurnitureEquipmentTransfer.transfer_date.desc())
    
    transfers_result = await db.execute(transfers_stmt)
    transfers = transfers_result.scalars().all()
    
    return transfers


# ---------------------------------------------------------------------
# TRANSFER FURNITURE EQUIPMENT
# ---------------------------------------------------------------------
@router.post("/{equipment_id}/transfer", status_code=status.HTTP_201_CREATED)
async def transfer_furniture_equipment(
    equipment_id: UUID,
    transfer_data: FurnitureEquipmentTransferCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Transfer furniture equipment to a new owner/location"""
    
    result = await db.execute(
        select(FurnitureEquipment).where(FurnitureEquipment.id == str(equipment_id))
    )
    equipment = result.scalars().first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Furniture equipment not found")

    transfer_record = FurnitureEquipmentTransfer(
        id=generate_uuid(),
        furniture_equipment_id=str(equipment_id),
        previous_owner=transfer_data.previous_owner,
        assigned_to=transfer_data.assigned_to,
        location=equipment.current_location,
        room_or_floor=getattr(equipment, 'room_or_floor', None),
        transfer_department=transfer_data.transfer_department,
        transfer_location=transfer_data.transfer_location,
        transfer_room_or_floor=transfer_data.transfer_room_or_floor,
        transfer_reason=transfer_data.transfer_reason,
        created_by=current_user.username
    )

    equipment.responsible_officer = transfer_data.assigned_to
    equipment.current_location = transfer_data.transfer_location
    equipment.updated_by = current_user.username
    equipment.updated_at = datetime.utcnow()

    db.add(transfer_record)
    await db.commit()

    await log_audit_event(
        db,
        user_id=current_user.id,
        action="TRANSFER",
        entity_type="FurnitureEquipment",
        entity_id=str(equipment_id),
        details=f"Transferred furniture equipment to {transfer_data.assigned_to}",
        ip_address=request.client.host
    )

    return {"message": "Furniture equipment transfer successful"}


# ---------------------------------------------------------------------
# GENERATE TAG NUMBER (for furniture equipment)
# ---------------------------------------------------------------------
@router.post("/generate-tag", response_model=dict)
async def generate_tag_number(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Generate a unique tag number for furniture equipment"""
    
    max_attempts = 10
    for attempt in range(max_attempts):
        random_number = random.randint(1000, 9999)
        random_letter = random.choice(string.ascii_uppercase)
        
        tag_number = f"F-{random_number}{random_letter}"  # 'F' prefix for Furniture
        
        result = await db.execute(
            select(FurnitureEquipment).where(FurnitureEquipment.tag_number == tag_number)
        )
        existing_asset = result.scalars().first()
        
        if not existing_asset:
            return {
                "tag_number": tag_number,
                "message": "Tag number generated successfully"
            }
    
    raise HTTPException(
        status_code=500, 
        detail="Unable to generate unique tag number. Please try again."
    )


# ---------------------------------------------------------------------
# VALIDATE TAG NUMBER (for furniture equipment)
# ---------------------------------------------------------------------
@router.post("/validate-tag", response_model=dict)
async def validate_tag_number(
    tag_data: dict,
    equipment_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Validate if a tag number is available for furniture equipment"""
    tag_number = tag_data.get("tag_number", "").strip()
    
    if not tag_number:
        raise HTTPException(status_code=400, detail="Tag number is required")
    
    query = select(FurnitureEquipment).where(FurnitureEquipment.tag_number == tag_number)
    if equipment_id:
        query = query.where(FurnitureEquipment.id != equipment_id)
    
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
# CHECK SERIAL NUMBERS (BULK)
# ---------------------------------------------------------------------
@router.post("/check-serial-numbers")
async def check_serial_numbers(
    serial_numbers_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Check if serial numbers already exist (for bulk upload validation)"""
    serial_numbers = serial_numbers_data.get("serial_numbers", [])
    
    if not serial_numbers:
        raise HTTPException(status_code=400, detail="Expected an array of serial numbers")
    
    # Query for existing serial numbers
    stmt = select(FurnitureEquipment.serial_number).where(FurnitureEquipment.serial_number.in_(serial_numbers))
    result = await db.execute(stmt)
    existing_serial_numbers = [row[0] for row in result.fetchall()]
    
    return {"existing_serial_numbers": existing_serial_numbers}


# ---------------------------------------------------------------------
# Helper: Robust Date Parser
# ---------------------------------------------------------------------
def parse_flexible_date(value):
    """Try multiple date formats and return a datetime.date or None."""
    from datetime import date, timedelta
    
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
    current_user: User = Depends(require_admin_or_user)
):
    """
    Upload furniture equipment from Excel data with flexible date parsing.
    """
    equipment_data = excel_data.get("data", [])
    if not equipment_data or not isinstance(equipment_data, list):
        raise HTTPException(status_code=400, detail="Expected a list of equipment records under 'data'")

    equipment_to_create = []
    seen_serials, seen_tags = set(), set()
    errors = []

    for idx, item_data in enumerate(equipment_data, start=1):
        required_fields = ["asset_description", "serial_number", "tag_number", "purchase_amount"]
        missing_fields = [f for f in required_fields if not item_data.get(f)]
        if missing_fields:
            errors.append({
                "row": idx,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            })
            continue

        serial_number = item_data["serial_number"]
        tag_number = item_data["tag_number"]

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
        existing_equipment = await db.execute(
            select(FurnitureEquipment).where(
                (FurnitureEquipment.serial_number == serial_number) |
                (FurnitureEquipment.tag_number == tag_number)
            )
        )
        if existing_equipment.scalar_one_or_none():
            errors.append({
                "row": idx,
                "error": f"Equipment with serial '{serial_number}' or tag '{tag_number}' already exists."
            })
            continue

        # Parse dates safely
        delivery_installation_date = parse_flexible_date(item_data.get("delivery_installation_date"))
        replacement_date = parse_flexible_date(item_data.get("replacement_date"))
        disposal_date = parse_flexible_date(item_data.get("disposal_date"))

        equipment = FurnitureEquipment(
            id=generate_uuid(),
            asset_description=item_data.get("asset_description"),
            financed_by=item_data.get("financed_by"),
            serial_number=serial_number,
            tag_number=tag_number,
            make_model=item_data.get("make_model"),
            pv_number=item_data.get("pv_number"),
            original_location=item_data.get("original_location"),
            current_location=item_data.get("current_location"),
            responsible_officer=item_data.get("responsible_officer"),
            delivery_installation_date=delivery_installation_date,
            replacement_date=replacement_date,
            disposal_date=disposal_date,
            purchase_amount=item_data.get("purchase_amount"),
            depreciation_rate=item_data.get("depreciation_rate"),
            annual_depreciation=item_data.get("annual_depreciation"),
            accumulated_depreciation=item_data.get("accumulated_depreciation"),
            net_book_value=item_data.get("net_book_value"),
            disposal_value=item_data.get("disposal_value"),
            asset_condition=item_data.get("asset_condition"),
            notes=item_data.get("notes"),
            created_by=current_user.username,
            updated_by=current_user.username,
        )

        equipment_to_create.append(equipment)

    # Return early if errors
    if errors:
        return {
            "message": "Upload completed with some errors",
            "errors": errors,
            "uploaded_count": len(equipment_to_create)
        }

    # Bulk insert
    db.add_all(equipment_to_create)
    await db.commit()

    # Log audit
    await log_audit_event(
        db=db,
        user_id=current_user.id,
        action="BULK_UPLOAD",
        entity_type="FurnitureEquipment",
        entity_id=None,
        details=f"User '{current_user.username}' uploaded {len(equipment_to_create)} furniture equipment items.",
        ip_address=request.client.host,
    )

    return {
        "message": f"{len(equipment_to_create)} furniture equipment items uploaded successfully",
        "uploaded_count": len(equipment_to_create)
    }
