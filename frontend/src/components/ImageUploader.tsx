// components/ImageUploader.tsx — Drag-and-drop multi-image upload with form controls

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { AnalyzeFormData, PricingMode, VehicleClass, WorkshopType } from '../types/claim'

interface Props {
  onSubmit: (data: AnalyzeFormData) => void
  loading: boolean
}

const VEHICLE_CLASSES: { value: VehicleClass; label: string }[] = [
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV / Crossover' },
  { value: 'luxury', label: 'Luxury' },
]

export default function ImageUploader({ onSubmit, loading }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('hatchback')
  const [workshopType, setWorkshopType] = useState<WorkshopType>('independent')
  const [pricingMode, setPricingMode] = useState<PricingMode>('aftermarket')
  const [vehicleMake, setVehicleMake] = useState('')

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const merged = [...prev, ...accepted]
      return merged.slice(0, 6)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 6,
    disabled: loading,
  })

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!files.length) return
    onSubmit({
      images: files,
      vehicle_class: vehicleClass,
      workshop_type: workshopType,
      pricing_mode: pricingMode,
      vehicle_make: vehicleMake || undefined,
    })
  }

  return (
    <div className="glass-card-elevated p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 text-xl">
          📷
        </div>
        <div>
          <h2 className="font-semibold text-lg text-white">Upload Damage Images</h2>
          <p className="text-sm text-slate-400">Up to 6 exterior vehicle photos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-300
            ${isDragActive
              ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
              : 'border-white/20 hover:border-blue-400/60 hover:bg-white/5'
            }
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">
              {isDragActive ? '🎯' : '☁️'}
            </div>
            <div>
              <p className="text-slate-300 font-medium">
                {isDragActive
                  ? 'Drop images here'
                  : 'Drag & drop vehicle damage photos'
                }
              </p>
              <p className="text-slate-500 text-sm mt-1">
                or <span className="text-blue-400 underline">browse files</span> · JPG, PNG, WebP · max 6 images
              </p>
            </div>
          </div>
        </div>

        {/* Image Previews */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {files.map((f, idx) => (
              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-dark-700">
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-white text-2xl hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-1">
                  <p className="text-xs text-slate-300 truncate">{f.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Vehicle Class */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Vehicle Class
            </label>
            <select
              value={vehicleClass}
              onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
              disabled={loading}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white
                         focus:outline-none focus:border-blue-400/60 transition-colors"
            >
              {VEHICLE_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Make */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Vehicle Make <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              value={vehicleMake}
              onChange={(e) => setVehicleMake(e.target.value)}
              placeholder="e.g. Maruti, Hyundai, Honda"
              disabled={loading}
              className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white
                         placeholder-slate-600 focus:outline-none focus:border-blue-400/60 transition-colors"
            />
          </div>

          {/* Workshop Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Workshop Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['independent', 'showroom'] as WorkshopType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWorkshopType(t)}
                  disabled={loading}
                  className={`
                    py-2.5 rounded-xl text-sm font-medium border transition-all
                    ${workshopType === t
                      ? 'bg-blue-500/20 border-blue-400/60 text-blue-300'
                      : 'bg-dark-700 border-white/10 text-slate-400 hover:border-white/20'
                    }
                  `}
                >
                  {t === 'independent' ? '🔧 Independent' : '🏢 Showroom'}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Parts Pricing
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['aftermarket', 'oem'] as PricingMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPricingMode(m)}
                  disabled={loading}
                  className={`
                    py-2.5 rounded-xl text-sm font-medium border transition-all
                    ${pricingMode === m
                      ? 'bg-purple-500/20 border-purple-400/60 text-purple-300'
                      : 'bg-dark-700 border-white/10 text-slate-400 hover:border-white/20'
                    }
                  `}
                >
                  {m === 'aftermarket' ? '💰 Aftermarket' : '🏷 OEM'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || files.length === 0}
          className={`
            w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
            ${files.length > 0 && !loading
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01]'
              : 'bg-dark-700 text-slate-600 cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
              </svg>
              Analysing...
            </span>
          ) : (
            `⚡ Run AI Claim Analysis${files.length > 0 ? ` (${files.length} image${files.length > 1 ? 's' : ''})` : ''}`
          )}
        </button>
      </form>
    </div>
  )
}
