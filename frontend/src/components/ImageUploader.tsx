// components/ImageUploader.tsx — Drag-and-drop multi-image upload with form controls

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, UploadCloud, Target, X, Car, Wrench, Tag, Building2, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-gray-800/40 border border-gray-700 h-full p-6 sm:p-8 backdrop-blur-3xl transition-shadow duration-300 hover:shadow-glow-lg hover:border-blue-500/40 flex flex-col rounded-3xl"
    >
      <div className="flex items-center gap-4 mb-8 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-center text-blue-400 shadow-lg">
          <Camera className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-extrabold text-2xl tracking-tighter text-white">Vehicle Imagery</h2>
          <p className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Maximum 6 exterior photos</p>
        </div>
      </div>


      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
        {/* Drop Zone - now flexible to fill height */}
        <div
          {...getRootProps()}
          className={`
            relative z-10 flex-1 flex flex-col items-center justify-center border-[3px] border-dashed rounded-[2.5rem] p-10 text-center cursor-pointer
            transition-all duration-500 ease-out group overflow-hidden bg-gray-900/40 backdrop-blur-sm min-h-[220px]
            ${isDragActive
              ? 'border-blue-500 bg-blue-500/10 scale-[1.01] shadow-glow-lg'
              : 'border-gray-700 hover:border-blue-500 hover:bg-gray-800/80 hover:shadow-glow'
            }
            ${loading ? 'opacity-50 cursor-not-allowed filter grayscale' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{
                y: isDragActive ? -8 : 0,
                scale: isDragActive ? 1.05 : 1
              }}
              transition={{ duration: 0.3, type: 'spring' }}
              className={`p-5 rounded-full shadow-sm ${isDragActive ? 'bg-white text-accent-blue shadow-glow' : 'bg-white text-slate-400 group-hover:text-accent-blue'
                }`}
            >
              {isDragActive ? <Target className="w-10 h-10" /> : <UploadCloud className="w-10 h-10" />}
            </motion.div>
            <div>
              <p className="text-white font-extrabold text-lg tracking-tight">
                {isDragActive ? 'Drop images here' : 'Drop damage photos'}
              </p>
              <p className="text-gray-400 text-[13px] mt-1 font-medium">
                or <span className="text-blue-400 hover:underline decoration-blue-500/30 underline-offset-4">browse your device</span>
              </p>
            </div>
          </div>
        </div>

        {/* Image Previews */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-3 sm:grid-cols-6 gap-3"
            >
              {files.map((f, idx) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: idx * 0.05 }}
                  key={`${f.name}-${idx}`}
                  className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm"
                >
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="p-1.5 bg-white/20 hover:bg-red-500 text-white rounded-full transition-colors duration-200"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
              {files.length < 6 && (
                <div
                  {...getRootProps()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-accent-blue/50 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 py-6 border-t border-slate-100/60 mt-auto">
          {/* Vehicle Class/Make Grid row */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Car className="w-3 h-3" /> Vehicle Class
            </label>
            <div className="relative">
              <select
                value={vehicleClass}
                onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
                disabled={loading}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-[13px] font-bold text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-gray-800 transition-all appearance-none"
              >
                {VEHICLE_CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Tag className="w-3 h-3" /> Vehicle Make
            </label>
            <input
              type="text"
              value={vehicleMake}
              onChange={(e) => setVehicleMake(e.target.value)}
              placeholder="e.g. BMW, Audi"
              disabled={loading}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-[13px] font-bold text-white
                         placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-gray-800 transition-all"
            />
          </div>

          {/* Workshop Selection */}
          <div className="space-y-2 sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Building2 className="w-3 h-3" /> Preferred Workshop
            </label>
            <div className="flex bg-gray-900 p-1.5 rounded-2xl border border-gray-700">
              {(['independent', 'showroom'] as WorkshopType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWorkshopType(t)}
                  disabled={loading}
                  className={`
                    flex-1 py-2.5 px-3 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-2
                    ${workshopType === t
                      ? 'bg-gray-800 text-white shadow-sm border border-gray-600'
                      : 'text-gray-500 hover:text-gray-400 hover:bg-gray-800/50'
                    }
                  `}
                >
                  {t === 'independent' ? <Wrench className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                  {t === 'independent' ? 'Independent' : 'Showroom'}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Model */}
          <div className="space-y-2 sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Tag className="w-3 h-3" /> Pricing Logic
            </label>
            <div className="flex bg-gray-900 p-1.5 rounded-2xl border border-gray-700">
              {(['aftermarket', 'oem'] as PricingMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPricingMode(m)}
                  disabled={loading}
                  className={`
                    flex-1 py-2.5 px-3 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-2
                    ${pricingMode === m
                      ? 'bg-gray-800 text-white shadow-sm border border-gray-600'
                      : 'text-gray-500 hover:text-gray-400 hover:bg-gray-800/50'
                    }
                  `}
                >
                  {m === 'aftermarket' ? 'Aftermarket' : 'Official OEM'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileHover={files.length > 0 && !loading ? { scale: 1.01 } : {}}
          whileTap={files.length > 0 && !loading ? { scale: 0.99 } : {}}
          type="submit"
          disabled={loading || files.length === 0}
          className={`
            w-full py-4 rounded-xl font-extrabold text-[15px] transition-all duration-300 flex items-center justify-center gap-2.5 mt-4 group
            ${files.length > 0 && !loading
              ? 'bg-gradient-to-r from-accent-blue to-accent-cyan hover:from-blue-600 hover:to-cyan-600 text-white shadow-glow'
              : 'bg-white/50 text-slate-400 cursor-not-allowed border border-white'
            }
          `}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
              </svg>
              Starting Engine...
            </>
          ) : (
            <>
              Generate Estimate
              {files.length > 0 && <span className="bg-green-600 px-2 py-0.5 rounded-full text-xs ml-1">{files.length}</span>}
            </>
          )}
        </motion.button>
      </form>
    </motion.div >
  )
}
