"""
Vehicle management routes
"""

import json
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
import aiofiles
from pathlib import Path
import uuid
from app.core.audit import log_audit_event

from datetime import datetime, timedelta, date

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin_or_user
from app.models.vehicle import Vehicle
from app.models.auth_models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.services.audit_service import audit_service
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()

UPLOAD_DIR = Path("uploads/vehicles")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

async def save_uploaded_file(file: UploadFile, vehicle_id: str) -> str:
    """Save uploaded file and return the file path"""
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"{vehicle_id}_{uuid.uuid4().hex}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Return relative path for URL
    return f"/uploads/vehicles/{filename}"

# -------------------- GET ALL --------------------
@router.get("/", response_model=List[VehicleResponse])
async def get_all_vehicles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all vehicles"""
    try:
        stmt = select(Vehicle).order_by(Vehicle.created_at.desc())
        result = await db.execute(stmt)
        vehicles = result.scalars().all()
        return vehicles
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch vehicles"
        )


# -------------------- SEARCH --------------------
@router.get("/search", response_model=List[VehicleResponse])
async def search_vehicles(
    query: str = Query(..., description="Search query"),
    field: Optional[str] = Query(None, description="Specific field to search in"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Search vehicles by query"""
    try:
        if field:
            # Search in specific field
            if hasattr(Vehicle, field):
                search_condition = getattr(Vehicle, field).ilike(f"%{query}%")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid field: {field}"
                )
        else:
            # Default: search across common fields
            search_condition = or_(
                Vehicle.registration_number.ilike(f"%{query}%"),
                Vehicle.chassis_number.ilike(f"%{query}%"),
                Vehicle.engine_number.ilike(f"%{query}%"),
                Vehicle.make_model.ilike(f"%{query}%"),
                Vehicle.financed_by.ilike(f"%{query}%"),
                Vehicle.responsible_officer.ilike(f"%{query}%"),
                Vehicle.asset_condition.ilike(f"%{query}%"),
                Vehicle.original_location.ilike(f"%{query}%"),
                Vehicle.current_location.ilike(f"%{query}%"),
            )

        stmt = select(Vehicle).where(search_condition).order_by(Vehicle.created_at.desc())
        result = await db.execute(stmt)
        vehicles = result.scalars().all()
        return vehicles
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search vehicles"
        )


# -------------------- GET BY ID --------------------
@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single vehicle by ID"""
    stmt = select(Vehicle).where(Vehicle.id == vehicle_id)
    result = await db.execute(stmt)
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    return vehicle


# -------------------- CREATE --------------------
@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    request: Request,  # move it here
    registration_number: str = Form(...),
    chassis_number: Optional[str] = Form(None),
    engine_number: Optional[str] = Form(None),
    tag_number: Optional[str] = Form(None),
    make_model: Optional[str] = Form(None),
    asset_condition: Optional[str] = Form(None),
    year_of_purchase: Optional[str] = Form(None),
    pv_number: Optional[str] = Form(None),
    financed_by: Optional[str] = Form(None),
    amount: Optional[float] = Form(None),
    depreciation_rate: Optional[float] = Form(None),
    annual_depreciation: Optional[float] = Form(None),
    accumulated_depreciation: Optional[float] = Form(None),
    net_book_value: Optional[float] = Form(None),
    date_of_disposal: Optional[str] = Form(None),
    disposal_value: Optional[float] = Form(None),
    replacement_date: Optional[str] = Form(None),
    has_logbook: Optional[str] = Form(None),
    responsible_officer: Optional[str] = Form(None),
    original_location: Optional[str] = Form(None),
    current_location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db)
):

    """Create a new vehicle with optional image uploads"""
    try:
        vehicle_id = generate_uuid()

        # Process images
        image_urls: List[str] = []
        for image in images:
            if image.filename and image.content_type:
                if not image.content_type.startswith("image/"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File {image.filename} is not an image"
                    )
                file_url = await save_uploaded_file(image, vehicle_id)
                image_urls.append(file_url)

        # Parse dates
        parsed_date_of_disposal: Optional[datetime] = None
        if date_of_disposal:
            try:
                parsed_date_of_disposal = datetime.fromisoformat(date_of_disposal)
            except ValueError:
                parsed_date_of_disposal = None

        parsed_replacement_date: Optional[datetime] = None
        if replacement_date:
            try:
                parsed_replacement_date = datetime.fromisoformat(replacement_date)
            except ValueError:
                parsed_replacement_date = None

        payload = {
            "id": vehicle_id,
            "registration_number": registration_number,
            "chassis_number": chassis_number,
            "engine_number": engine_number,
            "tag_number": tag_number,
            "make_model": make_model,
            "asset_condition": asset_condition,
            "year_of_purchase": year_of_purchase,
            "pv_number": pv_number,
            "financed_by": financed_by,
            "amount": amount,
            "depreciation_rate": depreciation_rate,
            "annual_depreciation": annual_depreciation,
            "accumulated_depreciation": accumulated_depreciation,
            "net_book_value": net_book_value,
            "date_of_disposal": parsed_date_of_disposal,
            "disposal_value": disposal_value,
            "replacement_date": parsed_replacement_date,
            "has_logbook": has_logbook,
            "responsible_officer": responsible_officer,
            "original_location": original_location,
            "current_location": current_location,
            "notes": notes,
            "image_urls": image_urls  # keep as list for JSON column
        }

        new_vehicle = Vehicle(**payload)
        db.add(new_vehicle)
        await db.commit()
        await db.refresh(new_vehicle)

        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="create",
            entity_type="vehicle",
            entity_id=vehicle_id,
            details="Created new vehicle",
            ip_address=audit_service.get_client_ip(request),
            user_agent=request.headers.get("user-agent")
        )

        return new_vehicle

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A vehicle with that registration number already exists"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create vehicle: {str(e)}"
        )


# -------------------- UPDATE --------------------
@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    request: Request,  # <- must come first
    registration_number: Optional[str] = Form(None),
    chassis_number: Optional[str] = Form(None),
    engine_number: Optional[str] = Form(None),
    tag_number: Optional[str] = Form(None),
    make_model: Optional[str] = Form(None),
    asset_condition: Optional[str] = Form(None),
    year_of_purchase: Optional[str] = Form(None),
    pv_number: Optional[str] = Form(None),
    financed_by: Optional[str] = Form(None),
    amount: Optional[float] = Form(None),
    depreciation_rate: Optional[float] = Form(None),
    annual_depreciation: Optional[float] = Form(None),
    accumulated_depreciation: Optional[float] = Form(None),
    net_book_value: Optional[float] = Form(None),
    date_of_disposal: Optional[str] = Form(None),
    disposal_value: Optional[float] = Form(None),
    replacement_date: Optional[str] = Form(None),
    has_logbook: Optional[str] = Form(None),
    responsible_officer: Optional[str] = Form(None),
    original_location: Optional[str] = Form(None),
    current_location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    keep_existing_images: bool = Form(True),
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db)
):

    """Update an existing vehicle with optional new image uploads"""
    stmt = select(Vehicle).where(Vehicle.id == vehicle_id)
    result = await db.execute(stmt)
    vehicle: Optional[Vehicle] = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    try:
        # Deserialize existing images safely
        existing_images: List[str] = []
        if keep_existing_images and vehicle.image_urls is not None:
            try:
                # Ensure we are loading from the actual value, not a column object
                if isinstance(vehicle.image_urls, str):
                    existing_images = json.loads(vehicle.image_urls)
                elif isinstance(vehicle.image_urls, list):
                    existing_images = vehicle.image_urls
                else:
                    existing_images = []
            except (TypeError, json.JSONDecodeError):
                existing_images = []

        # Process new images
        new_image_urls: List[str] = []
        for image in images:
            if image.filename and image.content_type:
                if not image.content_type.startswith("image/"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File {image.filename} is not an image"
                    )
                file_url = await save_uploaded_file(image, vehicle_id)
                new_image_urls.append(file_url)

        # Combine existing and new images
        if not isinstance(existing_images, list):
            existing_images = []
        if not isinstance(new_image_urls, list):
            new_image_urls = []
        all_image_urls: List[str] = list(existing_images) + list(new_image_urls)

        # Prepare update fields
        update_fields = {
            "registration_number": registration_number,
            "chassis_number": chassis_number,
            "engine_number": engine_number,
            "tag_number": tag_number,
            "make_model": make_model,
            "asset_condition": asset_condition,
            "year_of_purchase": year_of_purchase,
            "pv_number": pv_number,
            "financed_by": financed_by,
            "amount": amount,
            "depreciation_rate": depreciation_rate,
            "annual_depreciation": annual_depreciation,
            "accumulated_depreciation": accumulated_depreciation,
            "net_book_value": net_book_value,
            "date_of_disposal": None,
            "disposal_value": disposal_value,
            "replacement_date": None,
            "has_logbook": has_logbook,
            "responsible_officer": responsible_officer,
            "original_location": original_location,
            "current_location": current_location,
            "notes": notes,
        }

        # Parse dates
        if date_of_disposal:
            try:
                update_fields["date_of_disposal"] = datetime.fromisoformat(date_of_disposal)
            except ValueError:
                update_fields["date_of_disposal"] = None

        if replacement_date:
            try:
                update_fields["replacement_date"] = datetime.fromisoformat(replacement_date)
            except ValueError:
                update_fields["replacement_date"] = None

        # Apply updates
        for field, value in update_fields.items():
            if value is not None:
                setattr(vehicle, field, value)

        # Assign images list as JSON string if necessary
        vehicle.image_urls = all_image_urls
        await db.commit()
        await db.refresh(vehicle)
        await db.commit()
        await db.refresh(vehicle)

        # Audit log
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="update",
            entity_type="vehicle",
            entity_id=vehicle_id,
            details="Updated vehicle details",
            ip_address=audit_service.get_client_ip(request),
            user_agent=request.headers.get("user-agent")
        )

        return vehicle

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A vehicle with that registration number already exists"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update vehicle: {str(e)}"
        )

# -------------------- GENERATE TAG NUMBER --------------------
@router.post("/generate-tag", response_model=dict)
async def generate_tag_number(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Generate a unique tag number for vehicles"""
    import random
    import string
    
    max_attempts = 10
    for attempt in range(max_attempts):
        random_number = random.randint(1000, 9999)
        random_letter = random.choice(string.ascii_uppercase)
        
        tag_number = f"V-{random_number}{random_letter}"  # 'V' prefix for Vehicle
        
        # Check if tag number already exists
        result = await db.execute(
            select(Vehicle).where(Vehicle.tag_number == tag_number)
        )
        existing_vehicle = result.scalars().first()
        
        if not existing_vehicle:
            return {
                "tag_number": tag_number,
                "message": "Tag number generated successfully"
            }
    
    # If we couldn't generate a unique tag after max attempts
    raise HTTPException(
        status_code=500, 
        detail="Unable to generate unique tag number. Please try again."
    )


# -------------------- VALIDATE TAG NUMBER --------------------
@router.post("/validate-tag", response_model=dict)
async def validate_tag_number(
    tag_data: dict,
    vehicle_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Validate if a tag number is available for vehicles"""
    tag_number = tag_data.get("tag_number", "").strip()
    
    if not tag_number:
        raise HTTPException(status_code=400, detail="Tag number is required")
    
    # Check if tag number already exists (excluding current vehicle if editing)
    query = select(Vehicle).where(Vehicle.tag_number == tag_number)
    if vehicle_id:
        query = query.where(Vehicle.id != vehicle_id)
    
    result = await db.execute(query)
    existing_vehicle = result.scalars().first()
    
    if existing_vehicle:
        return {
            "valid": False,
            "message": f"Tag number '{tag_number}' is already in use by another vehicle"
        }
    
    return {
        "valid": True,
        "message": "Tag number is available"
    }

# -------------------- CHECK REGISTRATION NUMBERS --------------------
@router.post("/check-registration-numbers")
async def check_registration_numbers(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Check which registration numbers already exist in the database"""
    try:
        body = await request.json()
        registration_numbers = body.get("registration_numbers", [])
        
        if not registration_numbers:
            return {"existing_registration_numbers": []}
        
        stmt = select(Vehicle.registration_number).where(
            Vehicle.registration_number.in_(registration_numbers)
        )
        result = await db.execute(stmt)
        existing = [row[0] for row in result.fetchall()]
        
        return {"existing_registration_numbers": existing}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check registration numbers: {str(e)}"
        )

# ---------------------------------------------------------------------
# UPLOAD EXCEL DATA (BULK) - Motor Vehicles
# ---------------------------------------------------------------------
@router.post("/upload-excel-data", status_code=status.HTTP_201_CREATED)
async def upload_excel_data(
    excel_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """
    Upload motor vehicles from Excel data with flexible date parsing and validation.
    """
    vehicles_data = excel_data.get("data", [])
    if not vehicles_data or not isinstance(vehicles_data, list):
        raise HTTPException(status_code=400, detail="Expected a list of vehicle records under 'data'")

    vehicles_to_create = []
    seen_reg_numbers = set()
    errors = []

    for idx, vehicle_data in enumerate(vehicles_data, start=1):
        # ✅ Required fields
        required_fields = ["registration_number", "make_model"]
        missing_fields = [f for f in required_fields if not vehicle_data.get(f)]
        if missing_fields:
            errors.append({
                "row": idx,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            })
            continue

        reg_no = str(vehicle_data["registration_number"]).strip()

        # ✅ Check duplicates in upload
        if reg_no in seen_reg_numbers:
            errors.append({
                "row": idx,
                "error": f"Duplicate registration number within upload ({reg_no})"
            })
            continue
        seen_reg_numbers.add(reg_no)

        # ✅ Check duplicates in DB
        existing_vehicle = await db.execute(
            select(Vehicle).where(Vehicle.registration_number == reg_no)
        )
        if existing_vehicle.scalar_one_or_none():
            errors.append({
                "row": idx,
                "error": f"Vehicle with registration number '{reg_no}' already exists."
            })
            continue

        # ✅ Parse and normalize fields
        replacement_date = parse_flexible_date(vehicle_data.get("replacement_date"))
        date_of_disposal = parse_flexible_date(vehicle_data.get("date_of_disposal"))

        def to_decimal(v):
            try:
                return Decimal(str(v)) if v not in [None, ""] else None
            except Exception:
                return None

        # ✅ Normalize yes/no and booleans
        def normalize_logbook(v: Optional[str]) -> str:
            if not v:
                return "N"
            v = str(v).strip().lower()
            if v in {"yes", "y", "true", "1"}:
                return "Y"
            return "N"

        # ✅ Ensure year is string (avoid asyncpg DataError)
        year_of_purchase = vehicle_data.get("year_of_purchase")
        if year_of_purchase is not None:
            year_of_purchase = str(year_of_purchase).strip()

        try:
            vehicle = Vehicle(
                id=generate_uuid(),
                registration_number=reg_no,
                financed_by=vehicle_data.get("financed_by"),
                engine_number=vehicle_data.get("engine_number"),
                chassis_number=vehicle_data.get("chassis_number"),
                tag_number=vehicle_data.get("tag_number"),
                make_model=vehicle_data.get("make_model"),
                color=vehicle_data.get("color"),
                asset_condition=vehicle_data.get("asset_condition"),
                year_of_purchase=year_of_purchase,
                pv_number=vehicle_data.get("pv_number"),
                original_location=vehicle_data.get("original_location"),
                current_location=vehicle_data.get("current_location"),
                replacement_date=replacement_date,
                amount=to_decimal(vehicle_data.get("amount")),
                depreciation_rate=to_decimal(vehicle_data.get("depreciation_rate")),
                annual_depreciation=to_decimal(vehicle_data.get("annual_depreciation")),
                accumulated_depreciation=to_decimal(vehicle_data.get("accumulated_depreciation")),
                net_book_value=to_decimal(vehicle_data.get("net_book_value")),
                date_of_disposal=date_of_disposal,
                disposal_value=to_decimal(vehicle_data.get("disposal_value")),
                responsible_officer=vehicle_data.get("responsible_officer"),
                has_logbook=normalize_logbook(vehicle_data.get("has_logbook")),
                notes=vehicle_data.get("notes"),
                # created_by=current_user.username,
                # updated_by=current_user.username,
            )

            vehicles_to_create.append(vehicle)

        except Exception as e:
            errors.append({
                "row": idx,
                "error": f"Error building vehicle object: {str(e)}"
            })
            continue

    # ✅ If errors found, return without crashing
    if errors:
        return {
            "message": "Upload completed with some errors",
            "errors": errors,
            "uploaded_count": len(vehicles_to_create)
        }

    # ✅ Bulk insert
    db.add_all(vehicles_to_create)
    await db.commit()

    # ✅ Log audit
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="bulk_create",
        entity_type="vehicle",
        details="Created new motor vehicles via Excel upload",
        ip_address=audit_service.get_client_ip(request),
        user_agent=request.headers.get("user-agent")
    )

    return {
        "message": f"{len(vehicles_to_create)} motor vehicles uploaded successfully",
        "uploaded_count": len(vehicles_to_create)
    }


# ---------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------
from datetime import datetime, date, timedelta
from decimal import Decimal


def parse_flexible_date(date_value: any) -> Optional[datetime]:
    """Parse Excel-style or human-readable dates safely."""
    if not date_value:
        return None

    if isinstance(date_value, datetime):
        return date_value

    if isinstance(date_value, date):
        return datetime.combine(date_value, datetime.min.time())

    # Excel serial date (int or float)
    if isinstance(date_value, (int, float)):
        try:
            return datetime(1899, 12, 30) + timedelta(days=float(date_value))
        except Exception:
            return None

    if isinstance(date_value, str):
        date_value = date_value.strip()
        formats = [
            "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
            "%d-%m-%Y", "%m-%d-%Y", "%B %d, %Y", "%d %B %Y"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_value, fmt)
            except ValueError:
                continue
    return None


def normalize_has_logbook(value: Optional[str]) -> str:
    """Normalize Yes/No and boolean to 'Y' or 'N'."""
    if not value:
        return "N"
    value = str(value).strip().lower()
    if value in {"yes", "y", "true", "1"}:
        return "Y"
    return "N"