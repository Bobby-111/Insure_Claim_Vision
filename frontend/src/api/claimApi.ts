// api/claimApi.ts — Axios wrapper for all FastAPI endpoints

import axios from 'axios'
import type { AnalyzeFormData, ClaimAnalysisResponse } from '../types/claim'

const api = axios.create({
  baseURL: '/api',
  timeout: 120_000, // 2 minutes — YOLO + Gemini can be slow
})

export async function analyzeClaim(
  formData: AnalyzeFormData,
  onProgress?: (pct: number) => void
): Promise<ClaimAnalysisResponse> {
  const fd = new FormData()

  for (const file of formData.images) {
    fd.append('images', file)
  }
  fd.append('vehicle_class', formData.vehicle_class)
  fd.append('workshop_type', formData.workshop_type)
  fd.append('pricing_mode', formData.pricing_mode)
  if (formData.vehicle_make) {
    fd.append('vehicle_make', formData.vehicle_make)
  }

  const response = await api.post<ClaimAnalysisResponse>('/analyze', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })

  return response.data
}

export async function getEstimate(claimId: string): Promise<ClaimAnalysisResponse> {
  const response = await api.get<ClaimAnalysisResponse>(`/estimate/${claimId}`)
  return response.data
}

export async function listClaims(): Promise<{ claim_id: string; created_at: string; status: string }[]> {
  const response = await api.get('/claims')
  return response.data
}

export async function checkHealth(): Promise<{ status: string; gemini_configured: boolean }> {
  const response = await api.get('/health')
  return response.data
}

export function getHeatmapUrl(heatmapPath: string): string {
  return heatmapPath.startsWith('/') ? heatmapPath : `/static/${heatmapPath}`
}
