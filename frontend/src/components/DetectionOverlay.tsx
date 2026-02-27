// components/DetectionOverlay.tsx — Canvas bounding box overlay on original image

import { useEffect, useRef } from 'react'
import type { Detection } from '../types/claim'

interface Props {
  imageFile: File
  detections: Detection[]
  imageShape: [number, number]  // [height, width]
}

const DAMAGE_COLORS: Record<string, string> = {
  Crack: '#ef4444',
  Dent: '#f59e0b',
  Scratch: '#3b82f6',
  Deformation: '#8b5cf6',
  'Paint Damage': '#06b6d4',
  Unknown: '#6b7280',
}

export default function DetectionOverlay({ imageFile, detections, imageShape }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = URL.createObjectURL(imageFile)
    imgRef.current = img

    img.onload = () => {
      const [imgH, imgW] = imageShape
      canvas.width = img.naturalWidth || imgW
      canvas.height = img.naturalHeight || imgH

      // Draw original image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Scale factors (canvas vs model inference size)
      const scaleX = canvas.width / imgW
      const scaleY = canvas.height / imgH

      // Draw each detection bounding box
      detections.forEach((det) => {
        const [x1, y1, x2, y2] = det.bbox
        const sx1 = x1 * scaleX
        const sy1 = y1 * scaleY
        const sw = (x2 - x1) * scaleX
        const sh = (y2 - y1) * scaleY

        const color = DAMAGE_COLORS[det.damage_type] ?? '#6b7280'

        // Bounding box
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.strokeRect(sx1, sy1, sw, sh)

        // Semi-transparent fill
        ctx.fillStyle = color + '20'
        ctx.fillRect(sx1, sy1, sw, sh)

        // Label
        const label = `${det.part} · ${det.damage_type} (${(det.confidence * 100).toFixed(0)}%)`
        const fontSize = Math.max(11, Math.min(14, canvas.width / 60))
        ctx.font = `bold ${fontSize}px Inter, system-ui`
        const textW = ctx.measureText(label).width
        const padX = 6
        const padY = 4
        const labelH = fontSize + padY * 2

        // Label background
        ctx.fillStyle = color + 'ee'
        const labelY = sy1 - labelH > 0 ? sy1 - labelH : sy1 + sh + 2
        ctx.fillRect(sx1, labelY, textW + padX * 2, labelH)

        // Label text
        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, sx1 + padX, labelY + labelH - padY - 1)
      })
    }
  }, [imageFile, detections, imageShape])

  return (
    <div className="glass-card-elevated overflow-hidden animate-slide-up">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
          🎯
        </div>
        <div>
          <h3 className="font-medium text-sm text-white">YOLO Detection Overlay</h3>
          <p className="text-xs text-slate-500">
            {detections.length} part{detections.length !== 1 ? 's' : ''} detected
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-white/5">
        {Object.entries(DAMAGE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {type}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="bg-dark-900 flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-72 rounded-lg object-contain"
        />
      </div>

      {/* Detection List */}
      {detections.length > 0 && (
        <div className="divide-y divide-white/5">
          {detections.map((det, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DAMAGE_COLORS[det.damage_type] ?? '#6b7280' }}
                />
                <span className="text-sm text-slate-200">{det.part}</span>
                <span className="text-xs text-slate-500">{det.damage_type}</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {(det.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
