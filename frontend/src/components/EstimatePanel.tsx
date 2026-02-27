// components/EstimatePanel.tsx — Itemized cost breakdown table

import type { EstimateResult, LLMResult } from '../types/claim'

interface Props {
  estimate: EstimateResult
  llmResult: LLMResult
}

const SEVERITY_LABELS = ['', 'Cosmetic', 'Light', 'Moderate', 'Significant', 'Severe', 'Critical']
const SEVERITY_COLORS = ['', 'text-slate-400', 'text-blue-400', 'text-yellow-400', 'text-orange-400', 'text-red-400', 'text-red-600']

function SeverityBar({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div
          key={n}
          className={`h-1.5 w-3 rounded-full transition-all ${
            n <= score
              ? score <= 2 ? 'bg-blue-400'
              : score <= 4 ? 'bg-yellow-400'
              : 'bg-red-400'
              : 'bg-dark-600'
          }`}
        />
      ))}
    </div>
  )
}

export default function EstimatePanel({ estimate, llmResult }: Props) {
  const decisionMap = Object.fromEntries(
    llmResult.decisions.map((d) => [d.part_key, d])
  )

  const fmt = (n: number) =>
    '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="glass-card-elevated animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
            📋
          </div>
          <div>
            <h3 className="font-semibold text-white">Itemized Estimate</h3>
            <p className="text-xs text-slate-500">
              Hyderabad 2025 · GST {(estimate.gst_rate * 100).toFixed(0)}% included ·{' '}
              {estimate.pricing_mode === 'oem' ? 'OEM Parts' : 'Aftermarket Parts'} ·{' '}
              {estimate.workshop_type === 'showroom' ? 'Showroom Labor' : 'Workshop Labor'} ·{' '}
              {estimate.vehicle_class.charAt(0).toUpperCase() + estimate.vehicle_class.slice(1)}
            </p>
          </div>
        </div>

        {llmResult.model_used && (
          <div className="text-right">
            <p className="text-xs text-slate-600">Reasoned by</p>
            <p className="text-xs font-mono text-slate-400">{llmResult.model_used}</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Part</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Severity</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Part Cost</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Labour</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">GST</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {estimate.line_items.map((item, idx) => {
              const dec = decisionMap[item.part_key]
              return (
                <tr
                  key={idx}
                  className="hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-200">{item.part}</div>
                    {dec && (
                      <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate" title={dec.justification}>
                        {dec.justification}
                      </div>
                    )}
                    {item.is_estimated_cost && (
                      <span className="text-xs text-amber-500/80">~ estimated</span>
                    )}
                  </td>

                  <td className="px-3 py-3.5 text-center">
                    <span className={`
                      inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold
                      ${item.action === 'REPLACE'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                      }
                    `}>
                      {item.action === 'REPLACE' ? '🔄 REPLACE' : '🔧 REPAIR'}
                    </span>
                  </td>

                  <td className="px-3 py-3.5">
                    <div className="flex flex-col items-center gap-1">
                      <SeverityBar score={item.severity_score} />
                      <span className={`text-xs ${SEVERITY_COLORS[item.severity_score]}`}>
                        {SEVERITY_LABELS[item.severity_score]} ({item.severity_score}/6)
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono text-slate-300 text-sm">
                    {fmt(item.part_cost_inr)}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono text-slate-300 text-sm">
                    {fmt(item.labor_cost_inr)}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono text-slate-500 text-sm">
                    {fmt(item.gst_inr)}
                  </td>

                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-white text-sm">
                    {fmt(item.total_inr)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Footer */}
      <div className="border-t border-white/10 p-5">
        <div className="max-w-xs ml-auto space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal (pre-GST)</span>
            <span className="font-mono">{fmt(estimate.subtotal_inr)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-400">
            <span>GST ({(estimate.gst_rate * 100).toFixed(0)}%)</span>
            <span className="font-mono">{fmt(estimate.gst_inr)}</span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex justify-between text-base font-semibold">
            <span className="text-white">Grand Total</span>
            <span className="font-mono text-xl text-white">
              {fmt(estimate.grand_total_inr)}
            </span>
          </div>
        </div>
      </div>

      {/* Formula footer */}
      <div className="px-5 pb-4">
        <p className="text-xs text-slate-600 font-mono text-center">
          Formula: Σ(Part Cost + Labour) × 1.{(estimate.gst_rate * 100).toFixed(0)} | Hyderabad 2025 Market Rates
        </p>
      </div>
    </div>
  )
}
