import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, Camera, Eye, Search, Brain, IndianRupee } from 'lucide-react'

const PIPELINE_STEPS = [
    { id: 'upload', label: 'Image Upload', icon: Camera, desc: 'Images decoded & queued' },
    { id: 'cv', label: 'CV Processing', icon: Eye, desc: 'Normalize · Denoise · CLAHE · POI' },
    { id: 'llm', label: 'Gemini Reasoning', icon: Brain, desc: 'REPAIR / REPLACE + coordinates + severity' },
    { id: 'pricing', label: 'Pricing Engine', icon: IndianRupee, desc: 'Deterministic cost + GST + approval' },
]

type StepId = string

interface Props {
    activeStep: StepId | null
    done: boolean
}

export default function PipelineTracker({ activeStep, done }: Props) {
    const activeIdx = PIPELINE_STEPS.findIndex((s) => s.id === activeStep)

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl text-white shadow-2xl p-6 sm:px-10 sm:py-8 w-full max-w-5xl mx-auto print:hidden">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h3 className="font-bold text-[1.05rem] tracking-tight text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"></span>
                        Analysis Engine
                    </h3>
                    <p className="text-[13px] font-medium text-slate-400 mt-1">Real-time processing status</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-[10px] font-bold tracking-widest uppercase text-gray-400">
                    Live
                </div>
            </div>

            <div className="relative">
                {/* Background Line */}
                <div className="absolute top-5 left-8 right-8 h-[2px] bg-gray-800 rounded-full" />

                {/* Animated Progress Line */}
                <div
                    className="absolute top-5 left-8 h-[2px] bg-accent-blue rounded-full transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    style={{
                        width: done ? 'calc(100% - 4rem)' : activeIdx >= 0 ? `calc(${(activeIdx / (PIPELINE_STEPS.length - 1)) * 100}% - 4rem)` : '0%'
                    }}
                />

                <div className="relative flex justify-between">
                    {PIPELINE_STEPS.map((step, idx) => {
                        const isDone = done || (activeIdx > idx)
                        const isActive = activeIdx === idx
                        const Icon = step.icon

                        return (
                            <div key={step.id} className="relative flex flex-col items-center group w-32 text-center">
                                <div className={`
                                    relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-[1.5px] transition-all duration-500 mb-4 bg-gray-900
                                    ${isDone ? 'border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                        : isActive ? 'border-blue-500 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-110'
                                            : 'border-gray-700 text-gray-600'}
                                `}>
                                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-4 h-4" />}
                                </div>

                                <div className="flex flex-col items-center">
                                    <p className={`text-[12px] font-bold transition-colors duration-300 ${isDone ? 'text-white'
                                        : isActive ? 'text-blue-400'
                                            : 'text-gray-500'
                                        }`}>
                                        {step.label}
                                    </p>
                                    <p className={`text-[10px] mt-1 transition-colors duration-300 leading-tight ${isActive ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
