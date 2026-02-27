import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2, Camera, Eye, Brain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeClaim } from '../api/claimApi'
import ApprovalBadge from '../components/ApprovalBadge'
import DetectionOverlay from '../components/DetectionOverlay'
import EstimatePanel from '../components/EstimatePanel'
import HeatmapViewer from '../components/HeatmapViewer'
import ImageUploader from '../components/ImageUploader'
import type { AnalyzeFormData, ClaimAnalysisResponse } from '../types/claim'
import PipelineTracker from '../components/PipelineTracker'

export type StepId = 'upload' | 'cv' | 'llm' | 'pricing' | 'done'

function ShimmerBlock({ h = 'h-32' }: { h?: string }) {
    return (
        <div className={`${h} card shimmer bg-gray-800/50 rounded-2xl w-full border-gray-700`} />
    )
}

export default function EstimatorPage() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ClaimAnalysisResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [activeStep, setActiveStep] = useState<StepId | null>(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [primaryFile, setPrimaryFile] = useState<File | null>(null)

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const handleAnalyze = async (formData: AnalyzeFormData) => {
        setLoading(true)
        setError(null)
        setResult(null)
        setPrimaryFile(formData.images[0])
        setUploadProgress(0)

        try {
            setActiveStep('upload')
            await new Promise((r) => setTimeout(r, 200))

            setActiveStep('cv')
            const response = await analyzeClaim(formData, (pct) => {
                setUploadProgress(pct)
                if (pct === 100) setActiveStep('llm')
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
        <main className="max-w-[1400px] mx-auto px-6 pb-32 relative z-20 pt-8 sm:pt-12 bg-gray-950 min-h-screen text-white">

            {/* Horizontal Pipeline Tracker (Top) */}
            <div className="mb-10 w-full flex justify-center">
                <div className="w-full">
                    <PipelineTracker activeStep={activeStep} done={!!result} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 relative z-10 items-stretch">
                {/* Left column - Uploader */}
                <div className="lg:col-span-4 space-y-6 print:hidden h-full">
                    <motion.div layout transition={{ duration: 0.4 }} className="h-full">
                        <ImageUploader onSubmit={handleAnalyze} loading={loading} />
                    </motion.div>
                </div>

                {/* Right column - Analysis Stats/Cards */}
                <div className="lg:col-span-8 space-y-8">
                    <AnimatePresence mode="popLayout">
                        {/* Error State */}
                        {error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="bg-red-900/20 border border-red-500/30 rounded-3xl p-6 shadow-lg"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-red-900/40 rounded-lg text-red-400">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-red-400 mb-1">Analysis Failed</p>
                                        <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Loading State */}
                        {loading && !error && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 shadow-xl">
                                    <div className="w-14 h-14 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 shadow-inner relative">
                                        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
                                        <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                                        <Loader2 className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <p className="text-[17px] font-bold text-white mb-1">
                                            Synthesizing Estimate... {uploadProgress > 0 && uploadProgress < 100 && `(Uploading ${uploadProgress}%)`}
                                        </p>
                                        <p className="text-sm text-gray-400 font-medium">
                                            Running deep perception and reasoning models
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ShimmerBlock h="h-64" />
                                    <ShimmerBlock h="h-64" />
                                </div>
                                <ShimmerBlock h="h-96" />
                            </motion.div>
                        )}

                        {/* Empty State / Loading State for Results Area */}
                        {(!result && !loading && !error) && (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center min-h-[400px] py-12 bg-gray-800/30 text-center px-8 border-dashed border-[3px] border-gray-700 rounded-3xl"
                            >
                                <div className="w-20 h-20 rounded-[24px] bg-gray-900 flex items-center justify-center text-gray-500 mb-6 shadow-sm border border-gray-800">
                                    <Camera className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                                    Awaiting Images
                                </h3>
                                <p className="text-[15px] text-gray-400 max-w-md leading-relaxed">
                                    Select damage photos using the uploader. The AI pipeline will automatically extract contextual data and provide an instant estimate.
                                </p>
                            </motion.div>
                        )}

                        {/* Analysis Cards (Heatmap + Layer) */}
                        {result && !loading && !error && (
                            <motion.div
                                key="result-visuals"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="space-y-8"
                            >
                                {/* Warnings */}
                                {result.errors.length > 0 && (
                                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-3xl p-5 space-y-2.5 shadow-lg">
                                        {result.errors.map((e, i) => (
                                            <p key={i} className="text-sm text-amber-400 flex items-start gap-3">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                {e}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {/* Status Badges */}
                                <div className="print:hidden">
                                    <ApprovalBadge
                                        status={result.estimate.approval_status}
                                        total={result.estimate.grand_total_inr}
                                        threshold={result.estimate.approval_threshold_inr}
                                        claimId={result.claim_id}
                                        processingMs={result.processing_time_ms}
                                    />
                                </div>

                                {/* Comparison Cards Always Visible */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:hidden items-stretch">
                                    <HeatmapViewer
                                        heatmapUrl={result?.heatmap_url ?? ''}
                                        originalFile={primaryFile ?? undefined}
                                        perception={result?.perception}
                                    />
                                    <DetectionOverlay
                                        imageFile={primaryFile ?? null}
                                        decisions={result?.repair_decisions.decisions ?? []}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Full Width Invoice Section */}
            <AnimatePresence>
                {result && !loading && !error && (
                    <motion.div
                        key="full-width-invoice"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="mt-12 space-y-10"
                    >
                        <div className="w-full">
                            <EstimatePanel
                                estimate={result.estimate}
                                llmResult={result.repair_decisions}
                            />
                        </div>

                        {/* Form Controls / Reset */}
                        <motion.div
                            className="flex justify-center pt-8 print:hidden"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <button
                                onClick={() => {
                                    setResult(null)
                                    setError(null)
                                    setPrimaryFile(null)
                                    setActiveStep(null)
                                    window.scrollTo(0, 0)
                                }}
                                className="px-10 py-4 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center gap-2 border border-blue-500/50"
                            >
                                Process Another Claim
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    )
}
