// App.tsx — Main application shell with pipeline progress tracker

import { useState } from 'react'
import { analyzeClaim, checkHealth } from './api/claimApi'
import ApprovalBadge from './components/ApprovalBadge'
import DetectionOverlay from './components/DetectionOverlay'
import EstimatePanel from './components/EstimatePanel'
import HeatmapViewer from './components/HeatmapViewer'
import ImageUploader from './components/ImageUploader'
import type { AnalyzeFormData, ClaimAnalysisResponse } from './types/claim'
import { useEffect } from 'react'

// Pipeline steps shown in the progress sidebar
const PIPELINE_STEPS = [
  { id: 'upload', label: 'Image Upload', icon: '📷', desc: 'Images decoded & queued' },
  { id: 'cv', label: 'CV Processing', icon: '👁', desc: 'Normalize · Denoise · CLAHE · POI' },
  { id: 'yolo', label: 'YOLO Detection', icon: '🔍', desc: 'Part segmentation & damage type' },
  { id: 'llm', label: 'Gemini Reasoning', icon: '🧠', desc: 'REPAIR / REPLACE + severity 1–6' },
  { id: 'pricing', label: 'Pricing Engine', icon: '💰', desc: 'Deterministic cost + GST + approval' },
]

type StepId = typeof PIPELINE_STEPS[number]['id']

function ShimmerBlock({ h = 'h-32' }: { h?: string }) {
  return (
    <div className={`${h} glass-card shimmer rounded-xl`} />
  )
}

function PipelineTracker({
  activeStep,
  done,
}: {
  activeStep: StepId | null
  done: boolean
}) {
  const doneIdx = done ? PIPELINE_STEPS.length : PIPELINE_STEPS.findIndex((s) => s.id === activeStep)

  return (
    <div className="glass-card p-4 space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
        Pipeline Status
      </p>
      {PIPELINE_STEPS.map((step, idx) => {
        const isDone = idx < doneIdx || done
        const isActive = step.id === activeStep && !done

        return (
          <div key={step.id} className={`
            flex items-center gap-3 py-1.5 px-2 rounded-lg transition-all
            ${isActive ? 'bg-blue-500/10 border border-blue-500/20' : ''}
          `}>
            <span className="text-base">{step.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${
                isDone ? 'text-emerald-400'
                : isActive ? 'text-blue-300'
                : 'text-slate-500'
              }`}>
                {step.label}
              </p>
              <p className="text-xs text-slate-600 truncate">{step.desc}</p>
            </div>
            <div className="flex-shrink-0">
              {isDone ? (
                <span className="text-emerald-400 text-xs">✓</span>
              ) : isActive ? (
                <svg className="animate-spin h-3 w-3 text-blue-400" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-dark-600 inline-block" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ClaimAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<StepId | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [primaryFile, setPrimaryFile] = useState<File | null>(null)
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    checkHealth()
      .then((h) => setGeminiConfigured(h.gemini_configured))
      .catch(() => setGeminiConfigured(false))
  }, [])

  const handleAnalyze = async (formData: AnalyzeFormData) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setPrimaryFile(formData.images[0])
    setUploadProgress(0)

    try {
      setActiveStep('upload')
      await new Promise((r) => setTimeout(r, 200))  // Let UI render

      setActiveStep('cv')
      const response = await analyzeClaim(formData, (pct) => {
        setUploadProgress(pct)
        if (pct === 100) setActiveStep('yolo')
      })

      setActiveStep('done' as StepId)
      setResult(response)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? (err as Error)?.message
        ?? 'Analysis failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
      setActiveStep(null)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Top Nav */}
      <nav className="border-b border-white/5 bg-dark-800/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              🛡
            </div>
            <div>
              <span className="font-bold text-white text-sm">Motor Claim Estimator</span>
              <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                AI-Powered
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {geminiConfigured !== null && (
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                geminiConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow" />
                {geminiConfigured ? 'Gemini Connected' : 'Gemini Offline'}
              </div>
            )}
            <span className="text-xs text-slate-500">Hyderabad 2025 Rates</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        {!result && !loading && (
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-3">
              Instant Motor Claim Estimate
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Upload vehicle damage photos. Our AI pipeline (CV → YOLO → Gemini → Pricing) generates
              a professional itemized estimate with instant pre-approval in seconds.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <ImageUploader onSubmit={handleAnalyze} loading={loading} />
            <PipelineTracker activeStep={activeStep} done={!!result} />
          </div>

          {/* Right columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error State */}
            {error && (
              <div className="glass-card border-red-500/30 bg-red-500/5 p-5 animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-red-400 mb-1">Analysis Failed</p>
                    <p className="text-sm text-slate-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                <div className="glass-card p-5 flex items-center gap-4">
                  <svg className="animate-spin h-5 w-5 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Running AI pipeline... {uploadProgress > 0 && uploadProgress < 100 && `(uploading ${uploadProgress}%)`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      CV normalization → YOLO detection → Gemini Vision reasoning → Pricing
                    </p>
                  </div>
                </div>
                <ShimmerBlock h="h-52" />
                <ShimmerBlock h="h-64" />
                <ShimmerBlock h="h-80" />
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div className="space-y-6">
                {/* Warnings */}
                {result.errors.length > 0 && (
                  <div className="glass-card border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-amber-400 flex items-start gap-2">
                        <span>⚠</span>{e}
                      </p>
                    ))}
                  </div>
                )}

                {/* Pre-Approval Badge — first thing visible */}
                <ApprovalBadge
                  status={result.estimate.approval_status}
                  total={result.estimate.grand_total_inr}
                  threshold={result.estimate.approval_threshold_inr}
                  claimId={result.claim_id}
                  processingMs={result.processing_time_ms}
                />

                {/* Heatmap + Detection side by side when wide */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <HeatmapViewer
                    heatmapUrl={result.heatmap_url ?? ''}
                    originalFile={primaryFile ?? undefined}
                    perception={result.perception}
                  />
                  {primaryFile && (
                    <DetectionOverlay
                      imageFile={primaryFile}
                      detections={result.detections.detections}
                      imageShape={result.detections.image_shape}
                    />
                  )}
                </div>

                {/* Estimate Table */}
                <EstimatePanel
                  estimate={result.estimate}
                  llmResult={result.repair_decisions}
                />

                {/* New Claim Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => { setResult(null); setError(null) }}
                    className="px-6 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300
                               hover:bg-white/5 hover:border-white/20 transition-all"
                  >
                    + New Claim
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!result && !loading && !error && (
              <div className="flex flex-col items-center justify-center h-80 glass-card text-center px-8 animate-fade-in">
                <div className="text-5xl mb-4">🚗</div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  Ready to Analyse
                </h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Upload 1–6 photos of the damaged vehicle on the left.
                  The AI pipeline will detect damage, reason repairs, and generate
                  an itemized estimate with instant pre-approval.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  {[
                    { icon: '👁', label: 'OpenCV', sub: 'Perception' },
                    { icon: '🔍', label: 'YOLOv8', sub: 'Detection' },
                    { icon: '🧠', label: 'Gemini', sub: 'Reasoning' },
                  ].map((i) => (
                    <div key={i.label} className="glass-card p-3 rounded-xl">
                      <div className="text-xl mb-1">{i.icon}</div>
                      <div className="text-xs font-medium text-slate-300">{i.label}</div>
                      <div className="text-xs text-slate-600">{i.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-6">
        <p className="text-center text-xs text-slate-600">
          Motor Claim Estimator · AI Insurance Grade System · Hyderabad 2025 Market Rates
          · CV → YOLOv8 → Gemini 1.5 Pro → Deterministic Pricing Engine
        </p>
      </footer>
    </div>
  )
}
