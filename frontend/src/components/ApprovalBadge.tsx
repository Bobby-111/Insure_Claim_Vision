// components/ApprovalBadge.tsx — Pre-approval status indicator

import type { ApprovalStatus } from '../types/claim'

interface Props {
  status: ApprovalStatus
  total: number
  threshold: number
  claimId: string
  processingMs?: number
}

export default function ApprovalBadge({ status, total, threshold, claimId, processingMs }: Props) {
  const approved = status === 'AUTO_APPROVE'

  return (
    <div className={`
      glass-card-elevated p-6 animate-slide-up
      ${approved
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : 'border-amber-500/30 bg-amber-500/5'
      }
    `}>
      {/* Status Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center text-2xl
            ${approved ? 'bg-emerald-500/20' : 'bg-amber-500/20'}
          `}>
            {approved ? '✅' : '⚠️'}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
              Pre-Approval Decision
            </p>
            <div className={approved ? 'badge-approve' : 'badge-review'}>
              {approved ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
                  AUTO APPROVED
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-slow" />
                  MANUAL REVIEW
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">Claim ID</p>
          <p className="font-mono text-xs text-slate-300">{claimId}</p>
        </div>
      </div>

      {/* Threshold Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Claim Total</span>
          <span>Auto-Approval Limit ₹{threshold.toLocaleString('en-IN')}</span>
        </div>
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              approved
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
            style={{ width: `${Math.min((total / threshold) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className={`font-semibold ${approved ? 'text-emerald-400' : 'text-amber-400'}`}>
            ₹{total.toLocaleString('en-IN')}
          </span>
          <span className="text-slate-500">
            {approved
              ? `₹${(threshold - total).toLocaleString('en-IN')} below limit`
              : `₹${(total - threshold).toLocaleString('en-IN')} above limit`
            }
          </span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dark-700/60 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Approval Rule</p>
          <p className="text-xs font-medium text-slate-300">
            {approved ? `< ₹${(threshold/1000).toFixed(0)}K` : `≥ ₹${(threshold/1000).toFixed(0)}K`}
          </p>
        </div>
        <div className="bg-dark-700/60 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Decision</p>
          <p className={`text-xs font-semibold ${approved ? 'text-emerald-400' : 'text-amber-400'}`}>
            {approved ? 'Instant Release' : 'Surveyor Needed'}
          </p>
        </div>
        <div className="bg-dark-700/60 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Processing</p>
          <p className="text-xs font-medium text-slate-300">
            {processingMs ? `${(processingMs / 1000).toFixed(1)}s` : '—'}
          </p>
        </div>
      </div>

      {/* Message */}
      <div className={`mt-4 p-3 rounded-xl text-sm ${
        approved
          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
      }`}>
        {approved
          ? '✓ Claim pre-approved for direct settlement. Customer can proceed to authorised workshop.'
          : '⚠ Claim exceeds auto-approval threshold. A licensed surveyor inspection is required before settlement.'
        }
      </div>
    </div>
  )
}
