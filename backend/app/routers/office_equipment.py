"""
Office Equipment management routes
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.exc import IntegrityError
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin_or_user
from app.models.office_equipment import OfficeEquipment
from app.models.auth_models.user import User
from app.models.office_equipment_transfer import OfficeEquipmentTransfer
from app.schemas.office_equipment import OfficeEquipmentCreate, OfficeEquipmentUpdate, OfficeEquipmentResponse
from app.schemas.office_equipment_transfer import (
    OfficeEquipmentTransferCreate,
    OfficeEquipmentTransferResponse
)
from app.services.audit_service import audit_service
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()

@router.get("", response_model=List[OfficeEquipmentResponse])
@router.get("/", response_model=List[OfficeEquipmentResponse])
async def get_all_office_equipment(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all office equipment"""
    try:
        stmt = select(OfficeEquipment).order_by(OfficeEquipment.created_at.desc())
        result = await db.execute(stmt)
        equipment = result.scalars().all()
        return equipment
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch office equipment"
        )

@router.get("/search", response_model=List[OfficeEquipmentResponse])
async def search_office_equipment(
    query: str = Query(..., description="Search query"),
    field: Optional[str] = Query(None, description="Specific field to search in"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Search office equipment by query"""
    try:
        if field:
            # Search in specific field
            if hasattr(OfficeEquipment, field):
                search_condition = getattr(OfficeEquipment, field).ilike(f"%{query}%")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid field: {field}"
                )
        else:
            search_condition = or_(
                OfficeEquipment.asset_description.ilike(f"%{query}%"),
                OfficeEquipment.serial_number.ilike(f"%{query}%"),
                OfficeEquipment.tag_number.ilike(f"%{query}%"),
                OfficeEquipment.make_model.ilike(f"%{query}%"),
                OfficeEquipment.current_location.ilike(f"%{query}%"),
                OfficeEquipment.responsible_officer.ilike(f"%{query}%")
            )
        
        stmt = select(OfficeEquipment).where(search_condition).order_by(OfficeEquipment.created_at.desc())
        result = await db.execute(stmt)
        equipment = result.scalars().all()
        
        return equipment
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search office equipment"
        )

@router.get("/{equipment_id}", response_model=OfficeEquipmentResponse)
async def get_office_equipment(
    equipment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single office equipment by ID"""
    try:
        equipment_uuid = uuid.UUID(equipment_id)
        stmt = select(OfficeEquipment).where(OfficeEquipment.id == equipment_uuid)
        result = await db.execute(stmt)
        equipment = result.scalar_one_or_none()
        
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Office equipment not found"
            )
        
        return equipment
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch office equipment details"
        )

@router.post("", response_model=OfficeEquipmentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=OfficeEquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_office_equipment(
    equipment_data: OfficeEquipmentCreate,
    request: Request,
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new office equipment"""
    try:
        equipment_id = uuid.uuid4()
        
        new_equipment = OfficeEquipment(
            id=equipment_id,
            asset_description=equipment_data.asset_description,
            financed_by=equipment_data.financed_by,
            serial_number=equipment_data.serial_number,
            tag_number=equipment_data.tag_number,
            make_model=equipment_data.make_model,
            date_of_delivery=equipment_data.date_of_delivery,
            pv_number=equipment_data.pv_number,
            original_location=equipment_data.original_location,
            current_location=equipment_data.current_location,
            replacement_date=equipment_data.replacement_date,
            purchase_amount=equipment_data.purchase_amount,
            depreciation_rate=equipment_data.depreciation_rate,
            annual_depreciation=equipment_data.annual_depreciation,
            accumulated_depreciation=equipment_data.accumulated_depreciation,
            net_book_value=equipment_data.net_book_value,
            date_of_disposal=equipment_data.date_of_disposal,
            disposal_value=equipment_data.disposal_value,
            responsible_officer=equipment_data.responsible_officer,
            asset_condition=equipment_data.asset_condition,
            notes=equipment_data.notes
        )
        
        db.add(new_equipment)
        await db.commit()
        await db.refresh(new_equipment)
        
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="create",
            entity_type="office_equipment",
            entity_id=str(equipment_id),
            ip_address=audit_service.get_client_ip(request)
        )
        
        return new_equipment
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An office equipment with that description already exists"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create office equipment: {str(e)}"
        )

@router.put("/{equipment_id}", response_model=OfficeEquipmentResponse)
async def update_office_equipment(
    equipment_id: str,
    equipment_data: OfficeEquipmentUpdate,
    request: Request,
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing office equipment"""
    try:
        equipment_uuid = uuid.UUID(equipment_id)
        stmt = select(OfficeEquipment).where(OfficeEquipment.id == equipment_uuid)
        result = await db.execute(stmt)
        equipment = result.scalar_one_or_none()
        
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Office equipment not found"
            )
        
        update_data = equipment_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(equipment, field):
                setattr(equipment, field, value)
        
        await db.commit()
        await db.refresh(equipment)
        
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="update",
            entity_type="office_equipment",
            entity_id=equipment_id,
            ip_address=audit_service.get_client_ip(request)
        )
        
        return equipment
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update office equipment"
        )

# ---------------------------------------------------------------------
# GET OFFICE EQUIPMENT TRANSFERS
# ---------------------------------------------------------------------
@router.get("/{equipment_id}/transfers", response_model=List[OfficeEquipmentTransferResponse])
async def get_office_equipment_transfers(
    equipment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get transfer history for a specific office equipment"""
    try:
        equipment_uuid = uuid.UUID(equipment_id)
        
        # First check if equipment exists
        equipment_stmt = select(OfficeEquipment).where(OfficeEquipment.id == equipment_uuid)
        equipment_result = await db.execute(equipment_stmt)
        equipment = equipment_result.scalar_one_or_none()
        
        if not equipment:
            raise HTTPException(status_code=404, detail="Office equipment not found")
        
        # Get transfer history ordered by transfer date (most recent first)
        transfers_stmt = select(OfficeEquipmentTransfer).where(
            OfficeEquipmentTransfer.office_equipment_id == equipment_uuid
        ).order_by(OfficeEquipmentTransfer.transfer_date.desc())
        
        transfers_result = await db.execute(transfers_stmt)
        transfers = transfers_result.scalars().all()
        
        return transfers
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch transfer history"
        )

# ---------------------------------------------------------------------
# TRANSFER OFFICE EQUIPMENT
# ---------------------------------------------------------------------
@router.post("/{equipment_id}/transfer", status_code=status.HTTP_201_CREATED)
async def transfer_office_equipment(
    equipment_id: str,
    transfer_data: OfficeEquipmentTransferCreate,
    request: Request,
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """Transfer office equipment to a new owner/location"""
    try:
        equipment_uuid = uuid.UUID(equipment_id)
        
        stmt = select(OfficeEquipment).where(OfficeEquipment.id == equipment_uuid)
        result = await db.execute(stmt)
        equipment = result.scalar_one_or_none()
        
        if not equipment:
            raise HTTPException(status_code=404, detail="Office equipment not found")

        # Create transfer record
        transfer_record = OfficeEquipmentTransfer(
            id=generate_uuid(),
            office_equipment_id=equipment_uuid,
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

        # Update equipment with new transfer information
        equipment.responsible_officer = transfer_data.assigned_to
        equipment.current_location = transfer_data.transfer_location

        db.add(transfer_record)
        await db.commit()

        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="transfer",
            entity_type="office_equipment",
            entity_id=equipment_id,
            ip_address=audit_service.get_client_ip(request)
        )

        return {"message": "Office equipment transfer successful"}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID format"
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to transfer office equipment"
        )

# ---------------------------------------------------------------------
# GENERATE TAG NUMBER (for office equipment)
# ---------------------------------------------------------------------
@router.post("/generate-tag", response_model=dict)
async def generate_tag_number(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Generate a unique tag number for office equipment"""
    import random
    import string
    
    max_attempts = 10
    for attempt in range(max_attempts):
        random_number = random.randint(1000, 9999)
        random_letter = random.choice(string.ascii_uppercase)
        
        tag_number = f"OE-{random_number}{random_letter}"  # 'OE' prefix for Office Equipment
        
        # Check if tag number already exists
        result = await db.execute(
            select(OfficeEquipment).where(OfficeEquipment.tag_number == tag_number)
        )
        existing_equipment = result.scalars().first()
        
        if not existing_equipment:
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
# VALIDATE TAG NUMBER (for office equipment)
# ---------------------------------------------------------------------
@router.post("/validate-tag", response_model=dict)
async def validate_tag_number(
    tag_data: dict,
    equipment_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Validate if a tag number is available for office equipment"""
    tag_number = tag_data.get("tag_number", "").strip()
    
    if not tag_number:
        raise HTTPException(status_code=400, detail="Tag number is required")
    
    # Check if tag number already exists (excluding current equipment if editing)
    query = select(OfficeEquipment).where(OfficeEquipment.tag_number == tag_number)
    if equipment_id:
        try:
            equipment_uuid = uuid.UUID(equipment_id)
            query = query.where(OfficeEquipment.id != equipment_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid equipment ID format")
    
    result = await db.execute(query)
    existing_equipment = result.scalars().first()
    
    if existing_equipment:
        return {
            "valid": False,
            "message": f"Tag number '{tag_number}' is already in use by another equipment"
        }
    
    return {
        "valid": True,
        "message": "Tag number is available"
    }
