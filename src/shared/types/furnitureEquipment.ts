export interface FurnitureEquipment {
  id: string;
  asset_description: string;
  financed_by: string;
  serial_number: string;
  tag_number: string;
  make_model: string;
  delivery_installation_date: string;
  pv_number: string;
  original_location: string;
  current_location: string;
  replacement_date?: string | null;
  purchase_amount: number;
  depreciation_rate: number;
  annual_depreciation: number;
  accumulated_depreciation: number;
  net_book_value: number;
  disposal_date?: string | null;
  disposal_value?: number | null;
  responsible_officer: string;
  asset_condition: "New" | "Good" | "Worn" | "Needs Replacement";
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateFurnitureEquipmentData = Omit<
  FurnitureEquipment,
  "id" | "created_at" | "updated_at"
>;
export type UpdateFurnitureEquipmentData =
  Partial<CreateFurnitureEquipmentData>;
