// components/ApprovalBadge.tsx — Pre-approval status indicator

import { CheckCircle2, AlertTriangle, Clock, ShieldCheck, FileText, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ApprovalStatus } from '../types/claim'

interface Props {
  status: ApprovalStatus
  total: number
  threshold: number
  claimId: string
  processingMs?: number
}

export default function ApprovalBadge({ status, total, threshold, claimId, processingMs }: Props) {
  const declined = status === 'DECLINED' || total === 0
  const approved = status === 'AUTO_APPROVE' && !declined
  const fillPct = Math.min((total / threshold) * 100, 100)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        bg-gray-800/40 backdrop-blur-3xl border rounded-3xl p-6 sm:p-8 shadow-xl
        ${declined
          ? 'border-red-200/50 bg-gradient-to-br from-red-50/80 to-red-100/30'
          : approved
            ? 'border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 to-emerald-100/30'
            : 'border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-amber-100/30'
        }
      `}
    >
      {/* Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
        <div className="flex items-center gap-5">
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border
            ${declined ? 'bg-red-100 text-red-600 border-red-200/50'
              : approved ? 'bg-emerald-100 text-emerald-600 border-emerald-200/50'
                : 'bg-amber-100 text-amber-600 border-amber-200/50'}
          `}>
            {declined ? <XCircle className="w-8 h-8" /> : (approved ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />)}
          </div>
          <div>
            <p className="text-[11px] font-bold text-black uppercase tracking-widest mb-1.5">
              Decision
            </p>
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold shadow-sm border ${declined ? 'bg-red-500 text-white border-red-600/20' : approved ? 'bg-emerald-500 text-white border-emerald-600/20' : 'bg-amber-500 text-white border-amber-600/20'}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${declined ? 'bg-red-200' : approved ? 'bg-emerald-200' : 'bg-amber-200'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${declined ? 'bg-red-100' : approved ? 'bg-emerald-100' : 'bg-amber-100'}`}></span>
              </span>
              {declined ? 'REQUEST DECLINED' : (approved ? 'AUTO APPROVED' : 'MANUAL REVIEW')}
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right bg-gray-900/50 p-3 rounded-xl border border-gray-700 shadow-sm backdrop-blur-sm">
          <p className="text-[10px] font-bold text-black uppercase tracking-widest mb-1.5 flex items-center sm:justify-end gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Claim ID
          </p>
          <p className="font-mono text-[13px] font-bold text-gray-300 tracking-tight">{claimId}</p>
        </div>
      </div>

      {/* Threshold Bar */}
      <div className="mb-8 bg-gray-900/40 p-5 rounded-2xl border border-gray-700 shadow-sm backdrop-blur-sm">
        <div className="flex justify-between items-end mb-3">
          <div>
            <p className="text-[11px] font-bold text-black uppercase tracking-widest">Calculated Total</p>
            <span className={`font-black text-2xl tracking-tight ${declined ? 'text-red-400' : approved ? 'text-emerald-400' : 'text-amber-400'}`}>
              ₹{total.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-black uppercase tracking-widest">Auto-Approval Limit</p>
            <span className="text-sm font-bold text-gray-300">₹{threshold.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner flex items-center">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className={`h-full rounded-full ${declined
              ? 'bg-gradient-to-r from-red-400 to-red-500'
              : approved
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-r from-amber-400 to-amber-500'
              }`}
          />
        </div>

        <div className="flex justify-end mt-2">
          <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">
            {approved
              ? `₹${(threshold - total).toLocaleString('en-IN')} below limit`
              : `₹${(total - threshold).toLocaleString('en-IN')} above limit`
            }
          </span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 flex items-center justify-between sm:justify-center sm:flex-col sm:text-center shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest sm:mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Rule
          </p>
          <p className="text-sm font-bold text-gray-300">
            {approved ? `< ₹${(threshold / 1000).toFixed(0)}K` : `≥ ₹${(threshold / 1000).toFixed(0)}K`}
          </p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 flex items-center justify-between sm:justify-center sm:flex-col sm:text-center shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest sm:mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Action
          </p>
          <p className={`text-sm font-bold ${declined ? 'text-red-400' : approved ? 'text-emerald-400' : 'text-amber-400'}`}>
            {declined ? 'No Cost' : (approved ? 'Instant Release' : 'Surveyor Needed')}
          </p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 flex items-center justify-between sm:justify-center sm:flex-col sm:text-center shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest sm:mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Processing
          </p>
          <p className="text-sm font-bold text-gray-300">
            {processingMs ? `${(processingMs / 1000).toFixed(1)}s` : '—'}
          </p>
        </div>
      </div>

      {/* Message */}
      <div className={`mt-6 p-4 rounded-xl text-sm font-semibold flex items-start gap-3 shadow-sm ${declined
        ? 'bg-red-500 text-white'
        : approved
          ? 'bg-emerald-500 text-white'
          : 'bg-amber-500 text-white'
        }`}>
        {declined ? <XCircle className="w-5 h-5 flex-shrink-0" /> : (approved ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />)}
        {declined
          ? 'Claim declined. The submitted images show no recognizable motor damage linked to the insured policy.'
          : (approved
            ? 'Claim pre-approved for direct settlement. Customer can proceed to authorised workshop.'
            : 'Claim exceeds auto-approval threshold. A licensed surveyor inspection is required before settlement.')
        }
      </div>
    </motion.div>
  )
}
