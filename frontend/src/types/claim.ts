// types/claim.ts — All TypeScript interfaces mirroring the FastAPI Pydantic models

export type DamageType = 'Dent' | 'Scratch' | 'Crack' | 'Deformation' | 'Paint Damage' | 'Unknown'
export type RepairDecision = 'REPAIR' | 'REPLACE'
export type ApprovalStatus = 'AUTO_APPROVE' | 'MANUAL_REVIEW' | 'DECLINED'
export type VehicleClass = 'hatchback' | 'sedan' | 'suv' | 'luxury'
export type WorkshopType = 'independent' | 'showroom'
export type PricingMode = 'oem' | 'aftermarket'

export interface DamageRegion {
  region_id: number
  area_px: number
  centroid: [number, number]
  bounding_box: [number, number, number, number]
  gradient_intensity: number
}

export interface ImageMetrics {
  brightness: number
  blur_score: number
  resolution: [number, number]
  contrast_score: number
}

export interface PerceptionResult {
  poi: string
  orientation: string
  damage_regions: DamageRegion[]
  image_metrics: ImageMetrics
  heatmap_path?: string
}

export interface PartDecision {
  part: string
  part_key: string
  decision: RepairDecision
  severity_score: number
  justification: string
  damage_type?: DamageType
  x_percentage: number
  y_percentage: number
}

export interface LLMResult {
  decisions: PartDecision[]
  model_used: string
  prompt_tokens?: number
}

export interface EstimateLineItem {
  part: string
  part_key: string
  action: RepairDecision
  severity_score: number
  part_cost_inr: number
  labor_cost_inr: number
  subtotal_inr: number
  gst_inr: number
  total_inr: number
  pricing_mode: PricingMode
  workshop_type: WorkshopType
  is_estimated_cost: boolean
  justification: string
}

export interface EstimateResult {
  line_items: EstimateLineItem[]
  subtotal_inr: number
  gst_inr: number
  grand_total_inr: number
  approval_status: ApprovalStatus
  approval_threshold_inr: number
  gst_rate: number
  vehicle_class: VehicleClass
  pricing_mode: PricingMode
  workshop_type: WorkshopType
}

export interface ClaimAnalysisResponse {
  claim_id: string
  status: string
  perception: PerceptionResult
  repair_decisions: LLMResult
  estimate: EstimateResult
  heatmap_url?: string
  processing_time_ms?: number
  errors: string[]
}

export interface AnalyzeFormData {
  images: File[]
  vehicle_class: VehicleClass
  workshop_type: WorkshopType
  pricing_mode: PricingMode
  vehicle_make?: string
}
