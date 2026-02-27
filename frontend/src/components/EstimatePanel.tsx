// components/EstimatePanel.tsx — Itemized cost breakdown table

import { FileSpreadsheet, BrainCircuit, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import type { EstimateResult, LLMResult } from '../types/claim'

interface Props {
  estimate: EstimateResult
  llmResult: LLMResult
}

const SEVERITY_COLORS = [
  '',
  'text-slate-300 bg-slate-800 border border-slate-700/50',
  'text-blue-400 bg-blue-900/30 border border-blue-500/30',
  'text-amber-400 bg-amber-900/30 border border-amber-500/30',
  'text-orange-400 bg-orange-900/30 border border-orange-500/30',
  'text-red-400 bg-red-900/30 border border-red-500/30',
  'text-rose-400 bg-rose-900/30 border border-rose-500/30'
]

function SeverityPill({ score }: { score: number }) {
  return (
    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${SEVERITY_COLORS[score] || SEVERITY_COLORS[1]}`}>
      {score}
    </div>
  )
}

export default function EstimatePanel({ estimate, llmResult }: Props) {
  const decisionMap = Object.fromEntries(
    llmResult.decisions.map((d) => [d.part_key, d])
  )

  const fmt = (n: number) =>
    'Rs.' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const handleSavePDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const now = new Date()
    const claimId = `MCE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-4)}`

    // ── Header ───────────────────────────────────────────────────────────────
    doc.setFillColor(17, 24, 39)  // gray-900
    doc.rect(0, 0, pageW, 38, 'F')

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('MOTOR CLAIM ESTIMATE', 14, 14)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)  // gray-400
    doc.text('AI-Powered Damage Assessment | Hyderabad 2025 Market Rates', 14, 20)

    // Date and Claim ID (right-aligned)
    doc.setTextColor(209, 213, 219)
    doc.setFontSize(8)
    doc.text(`Invoice Date: ${now.toLocaleDateString('en-IN')}`, pageW - 14, 12, { align: 'right' })
    doc.text(`Claim ID: ${claimId}`, pageW - 14, 18, { align: 'right' })
    doc.text(`AI Model: ${llmResult.model_used}`, pageW - 14, 24, { align: 'right' })

    // ── Vehicle Info ─────────────────────────────────────────────────────────
    doc.setTextColor(30, 41, 59)
    doc.setFillColor(241, 245, 249)
    doc.rect(0, 38, pageW, 18, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('VEHICLE CLASS', 14, 44)
    doc.text('PRICING MODE', 60, 44)
    doc.text('WORKSHOP TYPE', 110, 44)
    doc.text('GST RATE', 162, 44)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(9)
    doc.text(estimate.vehicle_class.toUpperCase(), 14, 51)
    doc.text(estimate.pricing_mode === 'oem' ? 'OEM Parts' : 'Aftermarket Parts', 60, 51)
    doc.text(estimate.workshop_type === 'showroom' ? 'Authorised Showroom' : 'Independent Workshop', 110, 51)
    doc.text(`${(estimate.gst_rate * 100).toFixed(0)}%`, 162, 51)

    // ── Items Table ──────────────────────────────────────────────────────────
    const rows = estimate.line_items.map((item) => {
      const dec = decisionMap[item.part_key]
      return [
        item.part + (dec ? `\n${dec.justification.slice(0, 60)}${dec.justification.length > 60 ? '...' : ''}` : ''),
        item.action,
        String(item.severity_score),
        fmt(item.part_cost_inr),
        fmt(item.labor_cost_inr),
        fmt(item.gst_inr),
        fmt(item.total_inr),
      ]
    })

    autoTable(doc, {
      startY: 58,
      head: [['Part & Justification', 'Action', 'Sev.', 'Material', 'Labour', 'GST', 'Total']],
      body: rows,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [30, 58, 138],  // indigo-900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    // ── Totals ───────────────────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 6
    const boxX = pageW - 14 - 80
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(boxX, finalY, 80, 36, 2, 2, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Subtotal', boxX + 5, finalY + 8)
    doc.text(fmt(estimate.subtotal_inr), boxX + 75, finalY + 8, { align: 'right' })
    doc.text(`GST (${(estimate.gst_rate * 100).toFixed(0)}%)`, boxX + 5, finalY + 16)
    doc.text(fmt(estimate.gst_inr), boxX + 75, finalY + 16, { align: 'right' })

    doc.setDrawColor(203, 213, 225)
    doc.line(boxX + 5, finalY + 20, boxX + 75, finalY + 20)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text('GRAND TOTAL', boxX + 5, finalY + 29)
    doc.text(
      estimate.grand_total_inr === 0 ? 'No Insurance Cost' : fmt(estimate.grand_total_inr),
      boxX + 75,
      finalY + 29,
      { align: 'right' }
    )

    // ── Footer ───────────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFillColor(17, 24, 39)
    doc.rect(0, pageH - 14, pageW, 14, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text('This is a computer-generated AI estimate. Subject to surveyor verification.', 14, pageH - 6)
    doc.text(`Generated: ${now.toLocaleString('en-IN')}`, pageW - 14, pageH - 6, { align: 'right' })

    doc.save(`motor-claim-${claimId}.pdf`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/40 backdrop-blur-3xl border border-gray-700/50 rounded-3xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 border-b border-gray-700/50 bg-gray-900/40">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-sm border border-indigo-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-[1.1rem] text-white tracking-tight">Invoice Estimate</h3>
            <p className="text-[12px] text-gray-400 font-medium mt-1 tracking-wide">
              {(estimate.gst_rate * 100).toFixed(0)}% GST included ·{' '}
              {estimate.pricing_mode === 'oem' ? 'OEM Parts' : 'Aftermarket Parts'} ·{' '}
              {estimate.workshop_type === 'showroom' ? 'Showroom Labor' : 'Independent Labor'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 sm:mt-0">
          {llmResult.model_used && (
            <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-700/50 shadow-sm backdrop-blur-md">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <BrainCircuit className="w-3 h-3 text-indigo-400" /> AI Reasoner
              </p>
              <p className="text-xs font-mono font-bold text-gray-300">{llmResult.model_used}</p>
            </div>
          )}

          <button
            onClick={handleSavePDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold tracking-wide shadow-soft-lg transition-all border border-gray-700/50 hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" /> Save PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/40 border-b border-gray-700/50 backdrop-blur-md">
            <tr>
              <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Part & Justification</th>
              <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
              <th className="text-center px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Severity</th>
              <th className="text-right px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Material</th>
              <th className="text-right px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Labor</th>
              <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50 bg-transparent">
            {estimate.line_items.map((item, idx) => {
              const dec = decisionMap[item.part_key]
              return (
                <tr
                  key={idx}
                  className="hover:bg-gray-800/50 transition-colors group border-b border-gray-800"
                >
                  <td className="px-6 py-5 group-hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-[14px] text-white">{item.part}</div>
                      {item.is_estimated_cost && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-900/30 border border-amber-500/30 px-1.5 py-0.5 rounded-md">Est.</span>
                      )}
                    </div>
                    {dec && (
                      <div className="text-[12px] text-gray-400 mt-1.5 max-w-sm leading-relaxed" title={dec.justification}>
                        {dec.justification}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-5 text-center group-hover:bg-gray-800/30 transition-colors">
                    <span className={`
                      inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em]
                      ${item.action === 'REPLACE'
                        ? 'bg-rose-900/30 text-rose-400 border border-rose-500/30'
                        : 'bg-indigo-900/30 text-indigo-400 border border-indigo-500/30'
                      }
                    `}>
                      {item.action === 'REPLACE' ? 'Replace' : 'Repair'}
                    </span>
                  </td>

                  <td className="px-4 py-5 text-center group-hover:bg-gray-800/30 transition-colors">
                    <SeverityPill score={item.severity_score} />
                  </td>

                  <td className="px-4 py-5 text-right font-mono font-medium text-gray-400 text-[13px] group-hover:bg-gray-800/30 transition-colors">
                    {fmt(item.part_cost_inr)}
                  </td>

                  <td className="px-4 py-5 text-right font-mono font-medium text-gray-400 text-[13px] group-hover:bg-gray-800/30 transition-colors">
                    {fmt(item.labor_cost_inr)}
                  </td>

                  <td className="px-6 py-5 text-right font-mono font-bold text-white text-[14px] group-hover:bg-gray-800/30 transition-colors">
                    {fmt(item.total_inr)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Footer */}
      <div className="border-t border-gray-700/50 print:border-slate-200 p-6 sm:px-8 sm:py-7 bg-gray-900/30 print:bg-transparent flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6 backdrop-blur-md print:backdrop-filter-none">
        <div className="text-[11px] text-gray-500 print:text-slate-600 font-mono uppercase tracking-widest hidden sm:block">
          Formula: Σ(Material + Labour) × 1.{(estimate.gst_rate * 100).toFixed(0)} <br />
          Hyderabad 2025 Market
        </div>

        <div className="w-full sm:w-auto min-w-[280px] space-y-3.5 bg-gray-900/80 print:bg-white p-5 rounded-2xl border border-gray-700/50 print:border-slate-300 shadow-sm print:shadow-none backdrop-blur-md print:backdrop-filter-none">
          <div className="flex justify-between text-[13px] font-semibold text-gray-300 print:text-slate-800">
            <span>Subtotal</span>
            <span className="font-mono text-gray-200 print:text-slate-900">{fmt(estimate.subtotal_inr)}</span>
          </div>
          <div className="flex justify-between text-[13px] font-semibold text-gray-400 print:text-slate-700">
            <span>GST ({(estimate.gst_rate * 100).toFixed(0)}%)</span>
            <span className="font-mono text-gray-200 print:text-slate-900">{fmt(estimate.gst_inr)}</span>
          </div>
          <div className="h-px bg-gray-700 print:bg-slate-300 my-2" />
          <div className="flex justify-between items-center text-base">
            <span className="text-[11px] font-bold text-gray-400 print:text-slate-600 uppercase tracking-widest">Grand Total</span>
            <span className="font-mono font-black text-2xl tracking-tight text-white print:text-black drop-shadow-sm print:drop-shadow-none">
              {estimate.grand_total_inr === 0 ? 'No Insurance Cost' : fmt(estimate.grand_total_inr)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
