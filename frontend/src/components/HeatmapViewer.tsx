// components/HeatmapViewer.tsx — Display the CV-generated damage heatmap overlay

import { useState } from 'react'
import type { PerceptionResult } from '../types/claim'

interface Props {
  heatmapUrl: string
  originalFile?: File
  perception: PerceptionResult
}

export default function HeatmapViewer({ heatmapUrl, originalFile, perception }: Props) {
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [imgError, setImgError] = useState(false)

  const orientationMap: Record<string, string> = {
    '12': '12 o\'clock — Front',
    '3': '3 o\'clock — Right',
    '6': '6 o\'clock — Rear',
    '9': '9 o\'clock — Left',
    '12-9': '12-9 — Front-Left',
    '12-3': '12-3 — Front-Right',
    '6-9': '6-9 — Rear-Left',
    '6-3': '6-3 — Rear-Right',
    'C': 'Center',
    '?': 'Unknown',
  }

  const orientationLabel =
    orientationMap[perception.orientation] ?? perception.orientation

  return (
    <div className="glass-card-elevated overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            🔥
          </div>
          <div>
            <h3 className="font-medium text-sm text-white">Damage Heatmap</h3>
            <p className="text-xs text-slate-500">OpenCV gradient magnitude overlay</p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-2 bg-dark-700 rounded-lg p-1">
          <button
            onClick={() => setShowHeatmap(false)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              !showHeatmap
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setShowHeatmap(true)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              showHeatmap
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Image Panel */}
      <div className="relative aspect-video bg-dark-900">
        {showHeatmap ? (
          imgError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-3xl">🖼</span>
              <p className="text-sm">Heatmap processing...</p>
              <p className="text-xs text-slate-600">Refresh once analysis completes</p>
            </div>
          ) : (
            <img
              src={heatmapUrl}
              alt="Damage Heatmap"
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          )
        ) : (
          originalFile ? (
            <img
              src={URL.createObjectURL(originalFile)}
              alt="Original"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
              Original image not available
            </div>
          )
        )}

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-black/70 backdrop-blur-sm text-xs text-cyan-300 px-2 py-1 rounded-lg border border-cyan-500/30">
            POI: {perception.poi}
          </span>
          <span className="bg-black/70 backdrop-blur-sm text-xs text-purple-300 px-2 py-1 rounded-lg border border-purple-500/30">
            {orientationLabel}
          </span>
        </div>

        {/* Heatmap scale legend */}
        {showHeatmap && !imgError && (
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg p-2">
            <p className="text-xs text-slate-400 mb-1.5 text-center">Damage Intensity</p>
            <div className="h-2 w-28 rounded-full" style={{
              background: 'linear-gradient(to right, #00008b, #008000, #ffff00, #ff4500, #8b0000)'
            }} />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Footer */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/10">
        <div className="p-3 text-center">
          <p className="text-xs text-slate-500 mb-0.5">Brightness</p>
          <p className="text-sm font-mono text-slate-200">
            {(perception.image_metrics.brightness * 100).toFixed(0)}%
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-slate-500 mb-0.5">Sharpness</p>
          <p className={`text-sm font-mono ${
            perception.image_metrics.blur_score > 50 ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {perception.image_metrics.blur_score.toFixed(0)}
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-slate-500 mb-0.5">Regions</p>
          <p className="text-sm font-mono text-slate-200">
            {perception.damage_regions.length}
          </p>
        </div>
      </div>
    </div>
  )
}
