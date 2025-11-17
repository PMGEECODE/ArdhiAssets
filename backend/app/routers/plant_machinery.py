# fastapi-server/app/api/routes/plant_machinery.py

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.core.deps import get_current_user, require_admin_or_user, get_db
from app.models.auth_models.user import User
from app.models.plant_machinery import PlantMachinery
from app.models.plant_machinery_transfer import PlantMachineryTransfer
from app.schemas.plant_machinery import (
    PlantMachinery as PlantMachinerySchema,
    PlantMachineryCreate,
    PlantMachineryUpdate
)
from app.schemas.plant_machinery_transfer import (
    PlantMachineryTransferCreate,
    PlantMachineryTransferResponse
)
from app.core.audit import log_audit_event
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()


# ---------------------------------------------------------------------
# GET ALL PLANT & MACHINERY
# ---------------------------------------------------------------------
@router.get("/", response_model=List[PlantMachinerySchema])
async def get_plant_machinery(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all plant & machinery with pagination"""
    result = await db.execute(select(PlantMachinery).offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------
# SEARCH PLANT & MACHINERY
# ---------------------------------------------------------------------
@router.get("/search", response_model=List[PlantMachinerySchema])
async def search_plant_machinery(
    q: Optional[str] = Query(None, description="Search query"),
    asset_condition: Optional[str] = Query(None),
    responsible_officer: Optional[str] = Query(None),
    current_location: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search plant & machinery with filters"""
    query = select(PlantMachinery)

    if q:
        query = query.where(
            or_(
                PlantMachinery.asset_description.ilike(f"%{q}%"),
                PlantMachinery.serial_number.ilike(f"%{q}%"),
                PlantMachinery.tag_number.ilike(f"%{q}%"),
                PlantMachinery.make_model.ilike(f"%{q}%")
            )
        )

    if asset_condition:
        query = query.where(PlantMachinery.asset_condition.ilike(f"%{asset_condition}%"))
    if responsible_officer:
        query = query.where(PlantMachinery.responsible_officer.ilike(f"%{responsible_officer}%"))
    if current_location:
        query = query.where(PlantMachinery.current_location.ilike(f"%{current_location}%"))

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


# ---------------------------------------------------------------------
# GET SINGLE PLANT & MACHINERY
# ---------------------------------------------------------------------
@router.get("/{item_id}", response_model=PlantMachinerySchema)
async def get_plant_machinery_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific plant or machinery item by UUID"""
    result = await db.execute(
        select(PlantMachinery).where(PlantMachinery.id == str(item_id))
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Plant/Machinery not found")
    return item


# ---------------------------------------------------------------------
# CREATE PLANT & MACHINERY
# ---------------------------------------------------------------------
@router.post("/", response_model=PlantMachinerySchema, status_code=status.HTTP_201_CREATED)
async def create_plant_machinery(
    item_data: PlantMachineryCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Create a new plant or machinery item"""

    # Duplicate checks
    if item_data.serial_number:
        result = await db.execute(
            select(PlantMachinery).where(PlantMachinery.serial_number == item_data.serial_number)
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="An item with this serial number already exists")

    if item_data.tag_number:
        result = await db.execute(
            select(PlantMachinery).where(PlantMachinery.tag_number == item_data.tag_number)
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="An item with this tag number already exists")

    db_item = PlantMachinery(
        **item_data.dict(),
        created_by=current_user.username,
        updated_by=current_user.username
    )

    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)

    await log_audit_event(
        db,
        user_id=current_user.id,
        action="CREATE",
        entity_type="PlantMachinery",
        entity_id=db_item.id,
        details=f"Created plant/machinery item {db_item.asset_description}",
        ip_address=request.client.host
    )

    return db_item


# ---------------------------------------------------------------------
# UPDATE PLANT & MACHINERY
# ---------------------------------------------------------------------
@router.put("/{item_id}", response_model=PlantMachinerySchema)
async def update_plant_machinery(
    item_id: UUID,
    item_data: PlantMachineryUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Update an existing plant or machinery item"""

    result = await db.execute(
        select(PlantMachinery).where(PlantMachinery.id == str(item_id))
    )
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Plant/Machinery not found")

    # Duplicate checks
    if item_data.serial_number and item_data.serial_number != db_item.serial_number:
        result = await db.execute(
            select(PlantMachinery).where(
                PlantMachinery.serial_number == item_data.serial_number,
                PlantMachinery.id != str(item_id)
            )
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Another item with this serial number exists")

    if item_data.tag_number and item_data.tag_number != db_item.tag_number:
        result = await db.execute(
            select(PlantMachinery).where(
                PlantMachinery.tag_number == item_data.tag_number,
                PlantMachinery.id != str(item_id)
            )
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Another item with this tag number exists")

    update_data = item_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)

    db_item.updated_by = current_user.username
    db_item.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(db_item)

    await log_audit_event(
        db,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="PlantMachinery",
        entity_id=db_item.id,
        details=f"Updated plant/machinery item {db_item.asset_description}",
        ip_address=request.client.host
    )

    return db_item


# ---------------------------------------------------------------------
# GET PLANT MACHINERY TRANSFERS
# ---------------------------------------------------------------------
@router.get("/{item_id}/transfers", response_model=List[PlantMachineryTransferResponse])
async def get_plant_machinery_transfers(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get transfer history for a specific plant machinery item"""
    # First check if item exists
    item_stmt = select(PlantMachinery).where(PlantMachinery.id == str(item_id))
    item_result = await db.execute(item_stmt)
    item = item_result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Plant machinery not found")
    
    # Get transfer history ordered by transfer date (most recent first)
    transfers_stmt = select(PlantMachineryTransfer).where(
        PlantMachineryTransfer.plant_machinery_id == str(item_id)
    ).order_by(PlantMachineryTransfer.transfer_date.desc())
    
    transfers_result = await db.execute(transfers_stmt)
    transfers = transfers_result.scalars().all()
    
    return transfers


# ---------------------------------------------------------------------
# TRANSFER PLANT MACHINERY
# ---------------------------------------------------------------------
@router.post("/{item_id}/transfer", status_code=status.HTTP_201_CREATED)
async def transfer_plant_machinery(
    item_id: UUID,
    transfer_data: PlantMachineryTransferCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Transfer plant machinery to a new owner/location"""
    
    result = await db.execute(
        select(PlantMachinery).where(PlantMachinery.id == str(item_id))
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Plant machinery not found")

    # Create transfer record
    transfer_record = PlantMachineryTransfer(
        id=generate_uuid(),
        plant_machinery_id=str(item_id),
        previous_owner=transfer_data.previous_owner,
        assigned_to=transfer_data.assigned_to,
        location=item.current_location,
        room_or_floor=getattr(item, 'room_or_floor', None),
        transfer_department=transfer_data.transfer_department,
        transfer_location=transfer_data.transfer_location,
        transfer_room_or_floor=transfer_data.transfer_room_or_floor,
        transfer_reason=transfer_data.transfer_reason,
        created_by=current_user.username
    )

    # Update item with new transfer information
    item.responsible_officer = transfer_data.assigned_to
    item.current_location = transfer_data.transfer_location
    item.updated_by = current_user.username
    item.updated_at = datetime.utcnow()

    db.add(transfer_record)
    await db.commit()

    await log_audit_event(
        db,
        user_id=current_user.id,
        action="TRANSFER",
        entity_type="PlantMachinery",
        entity_id=str(item_id),
        details=f"Transferred plant machinery to {transfer_data.assigned_to}",
        ip_address=request.client.host
    )

    return {"message": "Plant machinery transfer successful"}


# ---------------------------------------------------------------------
# SUMMARY STATS
# ---------------------------------------------------------------------
@router.get("/stats/summary")
async def get_plant_machinery_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary statistics for plant & machinery"""

    total_items = await db.scalar(select(func.count()).select_from(PlantMachinery))
    total_value = await db.scalar(select(func.sum(PlantMachinery.purchase_amount)))
    total_net_book_value = await db.scalar(select(func.sum(PlantMachinery.net_book_value)))
    total_disposal_value = await db.scalar(select(func.sum(PlantMachinery.disposal_value)))

    return {
        "total_items": total_items or 0,
        "total_purchase_value": float(total_value or 0),
        "total_net_book_value": float(total_net_book_value or 0),
        "total_disposal_value": float(total_disposal_value or 0)
    }


# ---------------------------------------------------------------------
# GENERATE TAG NUMBER (for plant machinery)
# ---------------------------------------------------------------------
@router.post("/generate-tag", response_model=dict)
async def generate_tag_number(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Generate a unique tag number for plant machinery"""
    import random
    import string
    
    max_attempts = 10
    for attempt in range(max_attempts):
        random_number = random.randint(1000, 9999)
        random_letter = random.choice(string.ascii_uppercase)
        
        tag_number = f"P-{random_number}{random_letter}"  # 'P' prefix for Plant Machinery
        
        # Check if tag number already exists
        result = await db.execute(
            select(PlantMachinery).where(PlantMachinery.tag_number == tag_number)
        )
        existing_item = result.scalars().first()
        
        if not existing_item:
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
# VALIDATE TAG NUMBER (for plant machinery)
# ---------------------------------------------------------------------
@router.post("/validate-tag", response_model=dict)
async def validate_tag_number(
    tag_data: dict,
    item_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Validate if a tag number is available for plant machinery"""
    tag_number = tag_data.get("tag_number", "").strip()
    
    if not tag_number:
        raise HTTPException(status_code=400, detail="Tag number is required")
    
    # Check if tag number already exists (excluding current item if editing)
    query = select(PlantMachinery).where(PlantMachinery.tag_number == tag_number)
    if item_id:
        query = query.where(PlantMachinery.id != item_id)
    
    result = await db.execute(query)
    existing_item = result.scalars().first()
    
    if existing_item:
        return {
            "valid": False,
            "message": f"Tag number '{tag_number}' is already in use by another item"
        }
    
    return {
        "valid": True,
        "message": "Tag number is available"
    }
