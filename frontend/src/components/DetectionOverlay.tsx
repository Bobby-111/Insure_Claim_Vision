// components/DetectionOverlay.tsx — Canvas overlay to render Gemini coordinates

import { useEffect, useRef } from 'react'
import { ScanSearch } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PartDecision } from '../types/claim'

interface Props {
  imageFile?: File | null
  decisions?: PartDecision[]
}

const SEVERITY_COLORS: Record<number, string> = {
  1: '#3b82f6', // Minor - Blue
  2: '#0ea5e9', // Minor - Light Blue
  3: '#f59e0b', // Moderate - Amber
  4: '#ea580c', // Moderate - Orange
  5: '#ef4444', // Severe - Red
  6: '#b91c1c', // Severe - Dark Red
}

export default function DetectionOverlay({ imageFile, decisions = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    if (imageFile) {
      img.src = URL.createObjectURL(imageFile)
    }
    imgRef.current = img

    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      // Draw original image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw each detection dot
      decisions.forEach((dec) => {
        const cx = (dec.x_percentage / 100) * canvas.width
        const cy = (dec.y_percentage / 100) * canvas.height

        const color = SEVERITY_COLORS[dec.severity_score] ?? '#94a3b8'

        // Draw a simulated bounding box around the center coordinate
        // (Assuming an average size of ~12% of the image size)
        const boxSize = Math.max(canvas.width, canvas.height) * 0.12
        const sx1 = cx - boxSize / 2
        const sy1 = cy - boxSize / 2

        // Bounding box outline
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.strokeRect(sx1, sy1, boxSize, boxSize)

        // Semi-transparent fill
        ctx.fillStyle = color + '25'
        ctx.fillRect(sx1, sy1, boxSize, boxSize)
      })
    }
  }, [imageFile, decisions])

  return (
    <motion.div
      className="bg-gray-800/40 h-full overflow-hidden flex flex-col shadow-xl border border-gray-700 rounded-3xl"
    >
      <div className="flex flex-col border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-4 p-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-900/40 flex items-center justify-center text-indigo-400 shadow-sm border border-indigo-500/30">
            <ScanSearch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[14px] text-white tracking-tight">Gemini Vision Mapping</h3>
            {decisions.length > 0 ? (
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">
                {decisions.length} part{decisions.length !== 1 ? 's' : ''} analyzed
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">
                Pending Analysis
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 py-3 border-b border-gray-700 bg-gray-800/80">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span className="w-2.5 h-2.5 rounded-[3px] inline-block shadow-sm" style={{ backgroundColor: SEVERITY_COLORS[2] }} />
          Minor
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span className="w-2.5 h-2.5 rounded-[3px] inline-block shadow-sm" style={{ backgroundColor: SEVERITY_COLORS[4] }} />
          Moderate
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span className="w-2.5 h-2.5 rounded-[3px] inline-block shadow-sm" style={{ backgroundColor: SEVERITY_COLORS[6] }} />
          Severe
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-gray-900/50 flex-1 flex items-center justify-center p-3 relative mix-blend-screen">
        <div className="absolute inset-0 pattern-grid-lg text-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        {imageFile ? (
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-72 rounded-xl object-contain shadow-sm border border-gray-700 bg-black relative z-10"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-[13px] font-bold z-10">
            Awaiting original image mapping
          </div>
        )}
      </div>

      {/* Detection List */}
      {decisions.length > 0 && (
        <div className="divide-y divide-gray-700 bg-gray-800/80 max-h-48 overflow-y-auto custom-scrollbar border-t border-gray-700">
          {decisions.map((dec, idx) => (
            <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-inner"
                  style={{ backgroundColor: SEVERITY_COLORS[dec.severity_score] ?? '#94a3b8' }}
                />
                <span className="text-[13px] font-bold text-gray-200">{dec.part}</span>
                <div className="flex flex-col gap-0.5 ml-2">
                  <span className="text-[11px] text-gray-500">
                    Coordinates: ({dec.x_percentage.toFixed(1)}%, {dec.y_percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${dec.decision === 'REPLACE'
                ? 'bg-rose-900/30 text-rose-400 border-rose-500/30'
                : 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
                }`}>
                {dec.decision}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
