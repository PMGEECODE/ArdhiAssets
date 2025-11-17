import uuid
from sqlalchemy import Column, String, DateTime, Integer, Numeric, Index, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Building(Base):
    """Building model for buildings register management"""

    __tablename__ = "buildings_register"

    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    description_name_of_building = Column(String, nullable=False, index=True)

    building_ownership = Column(String, nullable=True, index=True)
    category = Column(String, nullable=True, index=True)
    building_no = Column(String, nullable=True, index=True)
    institution_no = Column(String, nullable=True, index=True)

    nearest_town_shopping_centre = Column(String, nullable=True, index=True)
    street = Column(String, nullable=True)
    county = Column(String, nullable=True, index=True)
    sub_county = Column(String, nullable=True)
    division = Column(String, nullable=True)
    location = Column(String, nullable=True, index=True)
    sub_location = Column(String, nullable=True)

    lr_no = Column(String, nullable=True, index=True)
    size_of_land_ha = Column(Numeric(10, 4), nullable=True)
    ownership_status = Column(String, nullable=True)
    source_of_funds = Column(String, nullable=True)
    mode_of_acquisition = Column(String, nullable=True)
    date_of_purchase_or_commissioning = Column(DateTime, nullable=True, index=True)

    type_of_building = Column(String, nullable=True, index=True)
    designated_use = Column(String, nullable=True, index=True)
    estimated_useful_life = Column(Integer, nullable=True)
    no_of_floors = Column(Integer, nullable=True)
    plinth_area = Column(Numeric(12, 2), nullable=True)

    cost_of_construction_or_valuation = Column(Numeric(15, 2), nullable=True)
    annual_depreciation = Column(Numeric(15, 2), nullable=True)
    accumulated_depreciation_to_date = Column(Numeric(15, 2), nullable=True)
    net_book_value = Column(Numeric(15, 2), nullable=True)
    annual_rental_income = Column(Numeric(15, 2), nullable=True)

    support_files = Column(JSON, nullable=True)
    remarks = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return (
            f"<Building(id='{self.id}', name='{self.description_name_of_building}', "
            f"location='{self.location}')>"
        )


# Additional helpful indexes
Index("idx_building_search", Building.description_name_of_building, Building.location, Building.county)
Index("idx_building_value", Building.net_book_value)
Index("idx_building_acquisition", Building.mode_of_acquisition, Building.date_of_purchase_or_commissioning)
Index("idx_building_rental", Building.annual_rental_income)
Index("idx_building_type_use", Building.type_of_building, Building.designated_use)
Index("idx_building_funds_status", Building.source_of_funds, Building.ownership_status)
Index("idx_building_updated_at", Building.updated_at)
Index("idx_building_created_at", Building.created_at)
Index("idx_building_county_location", Building.county, Building.location)
Index("idx_building_category_ownership", Building.category, Building.building_ownership)
Index("idx_building_floors_area", Building.no_of_floors, Building.plinth_area)
Index("idx_building_land_size", Building.size_of_land_ha)
Index("idx_building_depreciation", Building.annual_depreciation, Building.accumulated_depreciation_to_date) 
Index("idx_building_cost_value", Building.cost_of_construction_or_valuation, Building.net_book_value)
Index("idx_building_lr_no", Building.lr_no)
Index("idx_building_street", Building.street)
Index("idx_building_nearest_town", Building.nearest_town_shopping_centre)
Index("idx_building_date_of_purchase", Building.date_of_purchase_or_commissioning)
