"""
Building management routes
"""

from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from datetime import date, datetime, timedelta
import aiofiles
from pathlib import Path
import uuid
import json

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin_or_user
from app.models.building import Building
from app.models.auth_models.user import User
from app.schemas.building import BuildingCreate, BuildingUpdate, BuildingResponse
from app.services.audit_service import audit_service
from app.utils.generate_custom_id import generate_uuid

router = APIRouter()

UPLOAD_DIR = Path("uploads/buildings")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

async def save_uploaded_file(file: UploadFile, building_id: str) -> str:
    """Save uploaded file and return the file path"""
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ".pdf"
    filename = f"{building_id}_{uuid.uuid4().hex}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Return relative path for URL
    return f"/uploads/buildings/{filename}"

@router.get("/", response_model=List[BuildingResponse])
async def get_all_buildings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all buildings"""
    try:
        stmt = select(Building).order_by(Building.created_at.desc())
        result = await db.execute(stmt)
        buildings = result.scalars().all()
        return buildings
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching buildings: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch buildings: {str(e)}"
        )

@router.get("/search", response_model=List[BuildingResponse])
async def search_buildings(
    query: str = Query(..., description="Search query"),
    field: Optional[str] = Query(None, description="Specific field to search in"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Search buildings by query"""
    try:
        if field:
            if hasattr(Building, field):
                search_condition = getattr(Building, field).ilike(f"%{query}%")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid field: {field}"
                )
        else:
            search_condition = or_(
                Building.description_name_of_building.ilike(f"%{query}%"),
                Building.location.ilike(f"%{query}%"),
                Building.type_of_building.ilike(f"%{query}%"),
                Building.county.ilike(f"%{query}%"),
                Building.designated_use.ilike(f"%{query}%")
            )
        
        stmt = select(Building).where(search_condition).order_by(Building.created_at.desc())
        result = await db.execute(stmt)
        buildings = result.scalars().all()
        return buildings
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search buildings"
        )

@router.get("/{building_id}", response_model=BuildingResponse)
async def get_building(
    building_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single building by ID"""
    try:
        stmt = select(Building).where(Building.id == building_id)
        result = await db.execute(stmt)
        building = result.scalar_one_or_none()
        
        if not building:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Building not found"
            )
        
        return building
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch building details"
        )

@router.post("/", response_model=BuildingResponse, status_code=status.HTTP_201_CREATED)
async def create_building(
    request: Request,
    description_name_of_building: str = Form(...),
    building_ownership: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    building_no: Optional[str] = Form(None),
    institution_no: Optional[str] = Form(None),
    nearest_town_shopping_centre: Optional[str] = Form(None),
    street: Optional[str] = Form(None),
    county: Optional[str] = Form(None),
    sub_county: Optional[str] = Form(None),
    division: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    sub_location: Optional[str] = Form(None),
    lr_no: Optional[str] = Form(None),
    size_of_land_ha: Optional[float] = Form(None),
    ownership_status: Optional[str] = Form(None),
    source_of_funds: Optional[str] = Form(None),
    mode_of_acquisition: Optional[str] = Form(None),
    date_of_purchase_or_commissioning: Optional[str] = Form(None),
    type_of_building: Optional[str] = Form(None),
    designated_use: Optional[str] = Form(None),
    estimated_useful_life: Optional[int] = Form(None),
    no_of_floors: Optional[int] = Form(None),
    plinth_area: Optional[float] = Form(None),
    cost_of_construction_or_valuation: Optional[float] = Form(None),
    annual_depreciation: Optional[float] = Form(None),
    accumulated_depreciation_to_date: Optional[float] = Form(None),
    net_book_value: Optional[float] = Form(None),
    annual_rental_income: Optional[float] = Form(None),
    remarks: Optional[str] = Form(None),
    support_files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new building with optional file uploads"""
    try:
        building_id = generate_uuid()
        
        # Process files
        file_urls: List[str] = []
        for file in support_files:
            if file.filename and file.content_type:
                file_url = await save_uploaded_file(file, building_id)
                file_urls.append(file_url)
        
        # Parse date
        parsed_date = None
        if date_of_purchase_or_commissioning:
            try:
                parsed_date = datetime.fromisoformat(date_of_purchase_or_commissioning)
            except ValueError:
                parsed_date = None
        
        new_building = Building(
            id=building_id,
            description_name_of_building=description_name_of_building,
            building_ownership=building_ownership,
            category=category,
            building_no=building_no,
            institution_no=institution_no,
            nearest_town_shopping_centre=nearest_town_shopping_centre,
            street=street,
            county=county,
            sub_county=sub_county,
            division=division,
            location=location,
            sub_location=sub_location,
            lr_no=lr_no,
            size_of_land_ha=size_of_land_ha,
            ownership_status=ownership_status,
            source_of_funds=source_of_funds,
            mode_of_acquisition=mode_of_acquisition,
            date_of_purchase_or_commissioning=parsed_date,
            type_of_building=type_of_building,
            designated_use=designated_use,
            estimated_useful_life=estimated_useful_life,
            no_of_floors=no_of_floors,
            plinth_area=plinth_area,
            cost_of_construction_or_valuation=cost_of_construction_or_valuation,
            annual_depreciation=annual_depreciation,
            accumulated_depreciation_to_date=accumulated_depreciation_to_date,
            net_book_value=net_book_value,
            annual_rental_income=annual_rental_income,
            remarks=remarks,
            support_files=json.dumps(file_urls)  # Store as list for JSON column
        )
        
        db.add(new_building)
        await db.commit()
        await db.refresh(new_building)
        
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="CREATE",
            entity_type="Building",
            entity_id=building_id,
            details=f"Created building {new_building.description_name_of_building} with {len(file_urls)} files",
            ip_address=audit_service.get_client_ip(request)
        )
        
        return new_building
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create building: {str(e)}"
        )

@router.post("/with-files", response_model=BuildingResponse, status_code=status.HTTP_201_CREATED)
async def create_building_with_files(
    request: Request,
    description_name_of_building: str = Form(...),
    building_ownership: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    building_no: Optional[str] = Form(None),
    institution_no: Optional[str] = Form(None),
    nearest_town_shopping_centre: Optional[str] = Form(None),
    street: Optional[str] = Form(None),
    county: Optional[str] = Form(None),
    sub_county: Optional[str] = Form(None),
    division: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    sub_location: Optional[str] = Form(None),
    lr_no: Optional[str] = Form(None),
    size_of_land_ha: Optional[float] = Form(None),
    ownership_status: Optional[str] = Form(None),
    source_of_funds: Optional[str] = Form(None),
    mode_of_acquisition: Optional[str] = Form(None),
    date_of_purchase_or_commissioning: Optional[str] = Form(None),
    type_of_building: Optional[str] = Form(None),
    designated_use: Optional[str] = Form(None),
    estimated_useful_life: Optional[int] = Form(None),
    no_of_floors: Optional[int] = Form(None),
    plinth_area: Optional[float] = Form(None),
    cost_of_construction_or_valuation: Optional[float] = Form(None),
    annual_depreciation: Optional[float] = Form(None),
    accumulated_depreciation_to_date: Optional[float] = Form(None),
    net_book_value: Optional[float] = Form(None),
    annual_rental_income: Optional[float] = Form(None),
    remarks: Optional[str] = Form(None),
    support_files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new building with file uploads"""
    try:
        building_id = generate_uuid()
        
        # Process files
        file_urls: List[str] = []
        for file in support_files:
            if file.filename:
                file_url = await save_uploaded_file(file, building_id)
                file_urls.append(file_url)
        
        # Parse date
        parsed_date = None
        if date_of_purchase_or_commissioning:
            try:
                parsed_date = datetime.fromisoformat(date_of_purchase_or_commissioning)
            except ValueError:
                parsed_date = None
        
        new_building = Building(
            id=building_id,
            description_name_of_building=description_name_of_building,
            building_ownership=building_ownership,
            category=category,
            building_no=building_no,
            institution_no=institution_no,
            nearest_town_shopping_centre=nearest_town_shopping_centre,
            street=street,
            county=county,
            sub_county=sub_county,
            division=division,
            location=location,
            sub_location=sub_location,
            lr_no=lr_no,
            size_of_land_ha=size_of_land_ha,
            ownership_status=ownership_status,
            source_of_funds=source_of_funds,
            mode_of_acquisition=mode_of_acquisition,
            date_of_purchase_or_commissioning=parsed_date,
            type_of_building=type_of_building,
            designated_use=designated_use,
            estimated_useful_life=estimated_useful_life,
            no_of_floors=no_of_floors,
            plinth_area=plinth_area,
            cost_of_construction_or_valuation=cost_of_construction_or_valuation,
            annual_depreciation=annual_depreciation,
            accumulated_depreciation_to_date=accumulated_depreciation_to_date,
            net_book_value=net_book_value,
            annual_rental_income=annual_rental_income,
            remarks=remarks,
            support_files=json.dumps(file_urls)
        )
        
        db.add(new_building)
        await db.commit()
        await db.refresh(new_building)
        
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="CREATE",
            entity_type="Building",
            entity_id=building_id,
            details=f"Created building {new_building.description_name_of_building} with {len(file_urls)} files",
            ip_address=audit_service.get_client_ip(request)
        )
        
        return new_building
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create building: {str(e)}"
        )

# ---------------------------------------------------------------------
# CHECK BUILDING NUMBERS (BULK)
# ---------------------------------------------------------------------
@router.post("/check-building-numbers")
async def check_building_numbers(
    building_numbers_data: Dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """Check if building numbers already exist (for bulk upload validation)"""
    building_numbers = building_numbers_data.get("building_numbers", [])
    
    if not building_numbers:
        raise HTTPException(status_code=400, detail="Expected an array of building numbers")
    
    # Query for existing building numbers
    stmt = select(Building.building_no).where(Building.building_no.in_(building_numbers))
    result = await db.execute(stmt)
    existing_building_numbers = [row[0] for row in result.fetchall()]
    
    return {"existing_building_numbers": existing_building_numbers}


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
    excel_data: Dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_or_user)
):
    """
    Upload buildings from Excel data with flexible date parsing.
    """
    buildings_data = excel_data.get("data", [])
    if not buildings_data or not isinstance(buildings_data, list):
        raise HTTPException(status_code=400, detail="Expected a list of building records under 'data'")

    buildings_to_create = []
    seen_building_numbers = set()
    errors = []

    for idx, building_data in enumerate(buildings_data, start=1):
        required_fields = ["description_name_of_building", "building_no", "location"]
        missing_fields = [f for f in required_fields if not building_data.get(f)]
        if missing_fields:
            errors.append({
                "row": idx,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            })
            continue

        building_no = building_data["building_no"]

        # Check for duplicates within upload
        if building_no in seen_building_numbers:
            errors.append({
                "row": idx,
                "error": f"Duplicate building number within upload (building_no={building_no})"
            })
            continue

        seen_building_numbers.add(building_no)

        # Check existing in DB
        existing_building = await db.execute(
            select(Building).where(Building.building_no == building_no)
        )
        if existing_building.scalar_one_or_none():
            errors.append({
                "row": idx,
                "error": f"Building with number '{building_no}' already exists."
            })
            continue

        # Parse dates safely
        date_of_purchase_or_commissioning = parse_flexible_date(building_data.get("date_of_purchase_or_commissioning"))

        building = Building(
            id=generate_uuid(),
            description_name_of_building=building_data.get("description_name_of_building"),
            building_ownership=building_data.get("building_ownership"),
            category=building_data.get("category"),
            building_no=building_no,
            institution_no=building_data.get("institution_no"),
            nearest_town_shopping_centre=building_data.get("nearest_town_shopping_centre"),
            street=building_data.get("street"),
            county=building_data.get("county"),
            sub_county=building_data.get("sub_county"),
            division=building_data.get("division"),
            location=building_data.get("location"),
            sub_location=building_data.get("sub_location"),
            lr_no=building_data.get("lr_no"),
            size_of_land_ha=building_data.get("size_of_land_ha"),
            ownership_status=building_data.get("ownership_status"),
            source_of_funds=building_data.get("source_of_funds"),
            mode_of_acquisition=building_data.get("mode_of_acquisition"),
            date_of_purchase_or_commissioning=date_of_purchase_or_commissioning,
            type_of_building=building_data.get("type_of_building"),
            designated_use=building_data.get("designated_use"),
            estimated_useful_life=building_data.get("estimated_useful_life"),
            no_of_floors=building_data.get("no_of_floors"),
            plinth_area=building_data.get("plinth_area"),
            cost_of_construction_or_valuation=building_data.get("cost_of_construction_or_valuation"),
            annual_depreciation=building_data.get("annual_depreciation"),
            accumulated_depreciation_to_date=building_data.get("accumulated_depreciation_to_date"),
            net_book_value=building_data.get("net_book_value"),
            annual_rental_income=building_data.get("annual_rental_income"),
            remarks=building_data.get("remarks")
        )

        buildings_to_create.append(building)

    # Return early if errors
    if errors:
        return {
            "message": "Upload completed with some errors",
            "errors": errors,
            "uploaded_count": len(buildings_to_create)
        }

    # Bulk insert
    db.add_all(buildings_to_create)
    await db.commit()

    # Log audit
    await audit_service.create_audit_log(
        db=db,
        user=current_user,
        action="BULK_UPLOAD",
        entity_type="Building",
        entity_id=None,
        details=f"User '{current_user.username}' uploaded {len(buildings_to_create)} buildings.",
        ip_address=audit_service.get_client_ip(request),
    )

    return {
        "message": f"{len(buildings_to_create)} buildings uploaded successfully",
        "uploaded_count": len(buildings_to_create)
    }

def parse_iso_naive_utc(value: Optional[str]) -> Optional[datetime]:
    """
    Parse an ISO datetime string and return a naive UTC datetime.
    Handles formats like:
      - '2023-04-01'
      - '2023-04-01T00:00:00'
      - '2023-04-01T00:00:00Z'
      - '2023-04-01T00:00:00+03:00'
    """
    if not value:
        return None

    try:
        # Normalize Zulu time (Z) to +00:00 for fromisoformat
        cleaned = value.strip().replace("Z", "+00:00")

        # Attempt to parse ISO string
        dt = datetime.fromisoformat(cleaned)

        # Convert timezone-aware → naive UTC
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)

        return dt
    except Exception:
        # Try fallback plain date parsing (e.g. '2023-04-01')
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except Exception:
            return None


@router.put("/{building_id}", response_model=BuildingResponse)
async def update_building(
    building_id: str,
    request: Request,
    description_name_of_building: Optional[str] = Form(None),
    building_ownership: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    building_no: Optional[str] = Form(None),
    institution_no: Optional[str] = Form(None),
    nearest_town_shopping_centre: Optional[str] = Form(None),
    street: Optional[str] = Form(None),
    county: Optional[str] = Form(None),
    sub_county: Optional[str] = Form(None),
    division: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    sub_location: Optional[str] = Form(None),
    lr_no: Optional[str] = Form(None),
    size_of_land_ha: Optional[float] = Form(None),
    ownership_status: Optional[str] = Form(None),
    source_of_funds: Optional[str] = Form(None),
    mode_of_acquisition: Optional[str] = Form(None),
    date_of_purchase_or_commissioning: Optional[str] = Form(None),
    type_of_building: Optional[str] = Form(None),
    designated_use: Optional[str] = Form(None),
    estimated_useful_life: Optional[int] = Form(None),
    no_of_floors: Optional[int] = Form(None),
    plinth_area: Optional[float] = Form(None),
    cost_of_construction_or_valuation: Optional[float] = Form(None),
    annual_depreciation: Optional[float] = Form(None),
    accumulated_depreciation_to_date: Optional[float] = Form(None),
    net_book_value: Optional[float] = Form(None),
    annual_rental_income: Optional[float] = Form(None),
    remarks: Optional[str] = Form(None),
    support_files: List[UploadFile] = File(default=[]),
    keep_existing_files: bool = Form(True),
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db),
):
    """Update building with optional file uploads and safe date handling."""
    stmt = select(Building).where(Building.id == building_id)
    result = await db.execute(stmt)
    building: Optional[Building] = result.scalar_one_or_none()

    if not building:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Building not found",
        )

    try:
        # --- Deserialize existing files ---
        existing_files: List[str] = []
        if keep_existing_files and building.support_files:
            try:
                if isinstance(building.support_files, str):
                    existing_files = json.loads(building.support_files)
                elif isinstance(building.support_files, list):
                    existing_files = building.support_files
            except (TypeError, json.JSONDecodeError):
                existing_files = []

        # --- Process new uploads ---
        new_file_urls: List[str] = []
        for file in support_files:
            if file.filename and file.content_type:
                file_url = await save_uploaded_file(file, building_id)
                new_file_urls.append(file_url)

        all_file_urls: List[str] = list(existing_files) + list(new_file_urls)

        # --- Prepare fields ---
        update_fields = {
            "description_name_of_building": description_name_of_building,
            "building_ownership": building_ownership,
            "category": category,
            "building_no": building_no,
            "institution_no": institution_no,
            "nearest_town_shopping_centre": nearest_town_shopping_centre,
            "street": street,
            "county": county,
            "sub_county": sub_county,
            "division": division,
            "location": location,
            "sub_location": sub_location,
            "lr_no": lr_no,
            "size_of_land_ha": size_of_land_ha,
            "ownership_status": ownership_status,
            "source_of_funds": source_of_funds,
            "mode_of_acquisition": mode_of_acquisition,
            "date_of_purchase_or_commissioning": parse_iso_naive_utc(date_of_purchase_or_commissioning),
            "type_of_building": type_of_building,
            "designated_use": designated_use,
            "estimated_useful_life": estimated_useful_life,
            "no_of_floors": no_of_floors,
            "plinth_area": plinth_area,
            "cost_of_construction_or_valuation": cost_of_construction_or_valuation,
            "annual_depreciation": annual_depreciation,
            "accumulated_depreciation_to_date": accumulated_depreciation_to_date,
            "net_book_value": net_book_value,
            "annual_rental_income": annual_rental_income,
            "remarks": remarks,
        }

        # --- Apply updates dynamically ---
        for field, value in update_fields.items():
            if value is not None:
                setattr(building, field, value)

        building.support_files = all_file_urls

        await db.commit()
        await db.refresh(building)

        # --- Audit log ---
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="UPDATE",
            entity_type="Building",
            entity_id=building_id,
            ip_address=audit_service.get_client_ip(request),
        )

        return building

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A building with that name already exists",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update building: {e}",
        )

@router.put("/{building_id}/with-files", response_model=BuildingResponse)
async def update_building_with_files(
    building_id: str,
    request: Request,
    description_name_of_building: Optional[str] = Form(None),
    building_ownership: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    building_no: Optional[str] = Form(None),
    institution_no: Optional[str] = Form(None),
    nearest_town_shopping_centre: Optional[str] = Form(None),
    street: Optional[str] = Form(None),
    county: Optional[str] = Form(None),
    sub_county: Optional[str] = Form(None),
    division: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    sub_location: Optional[str] = Form(None),
    lr_no: Optional[str] = Form(None),
    size_of_land_ha: Optional[float] = Form(None),
    ownership_status: Optional[str] = Form(None),
    source_of_funds: Optional[str] = Form(None),
    mode_of_acquisition: Optional[str] = Form(None),
    date_of_purchase_or_commissioning: Optional[str] = Form(None),
    type_of_building: Optional[str] = Form(None),
    designated_use: Optional[str] = Form(None),
    estimated_useful_life: Optional[int] = Form(None),
    no_of_floors: Optional[int] = Form(None),
    plinth_area: Optional[float] = Form(None),
    cost_of_construction_or_valuation: Optional[float] = Form(None),
    annual_depreciation: Optional[float] = Form(None),
    accumulated_depreciation_to_date: Optional[float] = Form(None),
    net_book_value: Optional[float] = Form(None),
    annual_rental_income: Optional[float] = Form(None),
    remarks: Optional[str] = Form(None),
    support_files: List[UploadFile] = File(default=[]),
    keep_existing_files: bool = Form(True),
    current_user: User = Depends(require_admin_or_user),
    db: AsyncSession = Depends(get_db)
):
    """Update building with file uploads"""
    try:
        stmt = select(Building).where(Building.id == building_id)
        result = await db.execute(stmt)
        building = result.scalar_one_or_none()
        
        if not building:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Building not found"
            )
        
        # Get existing files
        existing_files: List[str] = []
        if keep_existing_files and building.support_files:
            try:
                existing_files = json.loads(building.support_files)
            except (TypeError, json.JSONDecodeError):
                existing_files = []
        
        # Process new files
        new_file_urls: List[str] = []
        for file in support_files:
            if file.filename:
                file_url = await save_uploaded_file(file, building_id)
                new_file_urls.append(file_url)
        
        # Combine files
        all_files = existing_files + new_file_urls
        
        # Update building fields
        if description_name_of_building:
            building.description_name_of_building = description_name_of_building
        if building_ownership is not None:
            building.building_ownership = building_ownership
        if category is not None:
            building.category = category
        if building_no is not None:
            building.building_no = building_no
        if institution_no is not None:
            building.institution_no = institution_no
        if nearest_town_shopping_centre is not None:
            building.nearest_town_shopping_centre = nearest_town_shopping_centre
        if street is not None:
            building.street = street
        if county is not None:
            building.county = county
        if sub_county is not None:
            building.sub_county = sub_county
        if division is not None:
            building.division = division
        if location is not None:
            building.location = location
        if sub_location is not None:
            building.sub_location = sub_location
        if lr_no is not None:
            building.lr_no = lr_no
        if size_of_land_ha is not None:
            building.size_of_land_ha = size_of_land_ha
        if ownership_status is not None:
            building.ownership_status = ownership_status
        if source_of_funds is not None:
            building.source_of_funds = source_of_funds
        if mode_of_acquisition is not None:
            building.mode_of_acquisition = mode_of_acquisition
        if date_of_purchase_or_commissioning:
            try:
                building.date_of_purchase_or_commissioning = datetime.fromisoformat(date_of_purchase_or_commissioning)
            except ValueError:
                pass
        if type_of_building is not None:
            building.type_of_building = type_of_building
        if designated_use is not None:
            building.designated_use = designated_use
        if estimated_useful_life is not None:
            building.estimated_useful_life = estimated_useful_life
        if no_of_floors is not None:
            building.no_of_floors = no_of_floors
        if plinth_area is not None:
            building.plinth_area = plinth_area
        if cost_of_construction_or_valuation is not None:
            building.cost_of_construction_or_valuation = cost_of_construction_or_valuation
        if annual_depreciation is not None:
            building.annual_depreciation = annual_depreciation
        if accumulated_depreciation_to_date is not None:
            building.accumulated_depreciation_to_date = accumulated_depreciation_to_date
        if net_book_value is not None:
            building.net_book_value = net_book_value
        if annual_rental_income is not None:
            building.annual_rental_income = annual_rental_income
        if remarks is not None:
            building.remarks = remarks
        
        building.support_files = json.dumps(all_files)
        
        await db.commit()
        await db.refresh(building)
        
        await audit_service.create_audit_log(
            db=db,
            user=current_user,
            action="UPDATE",
            entity_type="Building",
            entity_id=building_id,
            details=f"Updated building {building.description_name_of_building} with {len(new_file_urls)} new files",
            ip_address=audit_service.get_client_ip(request)
        )
        
        return building
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update building: {str(e)}"
        )
