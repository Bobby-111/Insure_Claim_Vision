// components/HeatmapViewer.tsx — Display the CV-generated damage heatmap overlay

import { useState } from 'react'
import { Flame, Image as ImageIcon, Compass, Activity, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PerceptionResult } from '../types/claim'

interface Props {
  heatmapUrl?: string
  originalFile?: File
  perception?: PerceptionResult
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
    perception?.orientation ? (orientationMap[perception.orientation] ?? perception.orientation) : 'Unknown'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className="bg-gray-800/40 h-full overflow-hidden flex flex-col shadow-xl border border-gray-700 rounded-3xl hover:shadow-[0_20px_40px_-5px_rgba(59,130,246,0.15)] hover:border-blue-500/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-900/40 flex items-center justify-center text-orange-400 shadow-sm border border-orange-500/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[14px] text-white tracking-tight">Damage Heatmap</h3>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">OpenCV gradient overlay</p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-700 shadow-inner">
          <button
            onClick={() => setShowHeatmap(false)}
            className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all relative ${!showHeatmap
              ? 'text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-400'
              }`}
          >
            {!showHeatmap && <motion.div layoutId="heatmap-tab" className="absolute inset-0 bg-gray-800 rounded-md shadow-sm border border-gray-600" />}
            <span className="relative z-10">Original</span>
          </button>
          <button
            onClick={() => setShowHeatmap(true)}
            className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all relative ${showHeatmap
              ? 'text-orange-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-400'
              }`}
          >
            {showHeatmap && <motion.div layoutId="heatmap-tab" className="absolute inset-0 bg-gray-800 rounded-md shadow-sm border border-orange-500/30" />}
            <span className="relative z-10 flex items-center gap-1.5"><Flame className="w-3 h-3" /> Heatmap</span>
          </button>
        </div>
      </div>

      {/* Image Panel */}
      <div className="relative aspect-video flex-1 overflow-hidden p-3 mix-blend-screen bg-gray-900/50">
        <div className="absolute inset-0 pattern-grid-lg text-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        <AnimatePresence mode="wait">
          {showHeatmap ? (
            imgError ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3 z-10">
                <ImageIcon className="w-10 h-10 text-gray-500 animate-pulse" />
                <div className="text-center">
                  <p className="text-[13px] font-bold text-gray-300">Processing Heatmap...</p>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-1">Refresh when ready</p>
                </div>
              </motion.div>
            ) : (
              <motion.img
                key="heatmap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={heatmapUrl}
                alt="Damage Heatmap"
                className="w-full h-full object-contain relative z-10 rounded-xl shadow-sm border border-gray-700 bg-black"
                onError={() => setImgError(true)}
              />
            )
          ) : (
            originalFile ? (
              <motion.img
                key="original"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={URL.createObjectURL(originalFile)}
                alt="Original"
                className="w-full h-full object-contain relative z-10 rounded-xl shadow-sm border border-gray-700 bg-black"
              />
            ) : (
              <motion.div key="no-original" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center text-gray-500 text-[13px] font-bold z-10">
                Original image not available
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Overlay badges */}
        {perception && (
          <div className="absolute top-5 left-5 flex gap-2.5 z-20">
            <span className="bg-gray-800/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-cyan-400 px-3 py-1.5 rounded border border-cyan-500/30 shadow flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> POI: {perception.poi}
            </span>
            <span className="bg-gray-800/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-purple-400 px-3 py-1.5 rounded border border-purple-500/30 shadow flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> {orientationLabel}
            </span>
          </div>
        )}

        {/* Heatmap scale legend */}
        <AnimatePresence>
          {showHeatmap && !imgError && heatmapUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-5 right-5 bg-gray-800/95 backdrop-blur-md rounded-xl p-3 shadow-md border border-gray-700 z-20"
            >
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Damage Intensity</p>
              <div className="h-2.5 w-32 rounded-full shadow-inner" style={{
                background: 'linear-gradient(to right, #00008b, #008000, #ffff00, #ff4500, #8b0000)'
              }} />
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1.5">
                <span>Low</span>
                <span>High</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Metrics Footer */}
      <div className="grid grid-cols-3 divide-x divide-gray-700 border-t border-gray-700 bg-gray-900/50">
        <div className="p-4 text-center hover:bg-gray-800/50 transition-colors">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Brightness</p>
          <p className="text-[15px] font-mono font-bold text-white flex items-center justify-center gap-1">
            {perception ? `${(perception.image_metrics.brightness * 100).toFixed(0)}%` : '--'}
          </p>
        </div>
        <div className="p-4 text-center hover:bg-gray-800/50 transition-colors">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sharpness</p>
          <p className={`text-[15px] font-mono font-bold flex items-center justify-center gap-1.5 ${perception && perception.image_metrics.blur_score > 50 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
            {perception && perception.image_metrics.blur_score > 50 && <Check className="w-3.5 h-3.5" />}
            {perception ? perception.image_metrics.blur_score.toFixed(0) : '--'}
          </p>
        </div>
        <div className="p-4 text-center hover:bg-gray-800/50 transition-colors">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Regions</p>
          <p className="text-[15px] font-mono font-bold text-white">
            {perception ? perception.damage_regions.length : '--'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
