/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sparkles, Loader2, FileText, CheckCircle, Lightbulb, AlertTriangle, ShieldCheck } from "lucide-react";
import { Customer, Loan } from "../types";
import { GLOBAL_STATS } from "../data";

interface AIAnalystProps {
  customers: Customer[];
}

export default function AIAnalyst({ customers }: AIAnalystProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [auditReport, setAuditReport] = React.useState<string | null>(null);

  // Auto-generate a basic report structure on load if not already generated
  React.useEffect(() => {
    const cached = localStorage.getItem("gcp_audit_report");
    if (cached) {
      setAuditReport(cached);
    }
  }, []);

  // Filter stalled vs pending loans for the AI audit payload
  const auditData = React.useMemo(() => {
    const stalled: any[] = [];
    const pending: any[] = [];
    let totalSanctioned = 0;
    let totalDisbursed = 0;
    let totalPending = 0;

    customers.forEach((c) => {
      totalSanctioned += c.total_sanctioned;
      totalDisbursed += c.total_disbursed;
      totalPending += c.total_pending;

      c.loans.forEach((l) => {
        if (l.status === "Stalled / Zero Payout") {
          stalled.push({
            customerName: c.name,
            occupation: c.occupation,
            loanNo: l.loan_no,
            scheme: l.scheme,
            sanctionDate: l.sanction_date,
            netSanction: l.net_sanction_amt,
            ageDays: l.age_days,
            purpose: l.purpose,
          });
        } else if (l.pending > 0) {
          pending.push({
            customerName: c.name,
            loanNo: l.loan_no,
            scheme: l.scheme,
            sanctionDate: l.sanction_date,
            netSanction: l.net_sanction_amt,
            totalDisbursed: l.total_disbursed,
            pendingRelease: l.pending,
            ageDays: l.age_days,
            purpose: l.purpose,
          });
        }
      });
    });

    return {
      summary: {
        agentName: GLOBAL_STATS.agentName,
        agentCode: GLOBAL_STATS.agentCode,
        office: GLOBAL_STATS.areaOffice,
        totalCustomers: customers.length,
        totalSanctioned,
        totalDisbursed,
        totalPending,
      },
      stalled,
      pending,
    };
  }, [customers]);

  const handleRunAudit = async () => {
    setLoading(true);
    setAuditReport(null);
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioSummary: auditData.summary,
          stalledLoans: auditData.stalled,
          pendingLoans: auditData.pending,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAuditReport(data.report);
      localStorage.setItem("gcp_audit_report", data.report);
    } catch (err: any) {
      console.error(err);
      setAuditReport(`## ❌ AI Portfolio Audit Failed\n\nThere was an issue connecting to the server-side Gemini auditor. Please ensure the \`GEMINI_API_KEY\` secret is correctly configured in **Settings > Secrets**.\n\n### Error Details\n${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearReport = () => {
    setAuditReport(null);
    localStorage.removeItem("gcp_audit_report");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-[#0d1117] min-h-screen">
      {/* Overview Block */}
      <div className="bg-gradient-to-r from-purple-950/40 via-[#161b22] to-indigo-950/30 border border-[#30363d] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 text-purple-400">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            <h2 className="font-extrabold text-[#e6edf3] tracking-tight">AI Credit Risk Auditor</h2>
          </div>
          <p className="text-xs text-[#8b949e] max-w-2xl leading-relaxed">
            Run a full-scale portfolio audit backed by Gemini AI. This process analyzes Sanjay Kumar Pandey's stagnant pipelines, isolates zero-payout cases, alerts you of critical delay gaps, and crafts precise actionable resolutions.
          </p>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex-shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Auditing Portfolio...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-purple-200" />
              Generate Risk Audit
            </>
          )}
        </button>
      </div>

      {/* Grid Quick Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex gap-4 items-center">
          <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">Stalled accounts</div>
            <div className="text-base font-extrabold text-rose-400 mt-0.5">{auditData.stalled.length} files</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex gap-4 items-center">
          <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">In-progress tranches</div>
            <div className="text-base font-extrabold text-amber-400 mt-0.5">{auditData.pending.length} files</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex gap-4 items-center">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">Locked capital</div>
            <div className="text-base font-extrabold text-purple-400 mt-0.5 font-mono">
              ₹{(auditData.summary.totalPending / 100000).toFixed(1)} Lakhs
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-sm">
        {/* Banner header */}
        <div className="p-4 border-b border-[#30363d] bg-[#1c2128] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-xs text-[#e6edf3]">Audit Documentation Report</span>
          </div>
          {auditReport && (
            <button
              onClick={handleClearReport}
              className="text-[10px] text-[#8b949e] hover:text-[#f85149] font-semibold transition-all"
            >
              Reset Audit
            </button>
          )}
        </div>

        {/* Content body */}
        <div className="p-8">
          {auditReport ? (
            <div className="prose prose-invert prose-sm text-[#e6edf3] max-w-none leading-relaxed space-y-6">
              {auditReport.split("\n").map((line, idx) => {
                const cleanLine = line.trim();

                // Format Headings
                if (cleanLine.startsWith("##")) {
                  return (
                    <h3
                      key={idx}
                      className="font-extrabold text-base text-[#f0a500] mt-8 mb-4 border-b border-[#30363d] pb-2 flex items-center gap-2"
                    >
                      <Lightbulb className="w-4.5 h-4.5 text-[#f0a500] flex-shrink-0" />
                      {cleanLine.replace("##", "").replace(/\*/g, "")}
                    </h3>
                  );
                }
                if (cleanLine.startsWith("#")) {
                  return (
                    <h2
                      key={idx}
                      className="font-extrabold text-lg text-purple-400 mt-4 mb-4 border-b-2 border-purple-500/20 pb-2 flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      {cleanLine.replace("#", "").replace(/\*/g, "")}
                    </h2>
                  );
                }
                if (cleanLine.startsWith("1.") || cleanLine.startsWith("2.") || cleanLine.startsWith("3.") || cleanLine.startsWith("4.") || cleanLine.startsWith("5.")) {
                  return (
                    <h4
                      key={idx}
                      className="font-bold text-sm text-purple-300 mt-6 mb-2 flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      {cleanLine.replace(/^\d+\.\s*/, "").replace(/\*\*/g, "")}
                    </h4>
                  );
                }

                // Bold markers
                if (cleanLine.startsWith("**") && cleanLine.endsWith("**")) {
                  return (
                    <p key={idx} className="font-extrabold text-[#e6edf3] text-xs">
                      {cleanLine.replace(/\*\*/g, "")}
                    </p>
                  );
                }

                // Handle standard markdown bullet lines
                if (cleanLine.startsWith("*") || cleanLine.startsWith("-")) {
                  return (
                    <ul key={idx} className="list-disc pl-5 my-1 text-xs text-[#c9d1d9]">
                      <li>{cleanLine.substring(1).trim().replace(/\*\*/g, "")}</li>
                    </ul>
                  );
                }

                // Standard paragraph
                return cleanLine ? (
                  <p key={idx} className="text-xs text-[#c9d1d9] my-2 leading-relaxed">
                    {line.replace(/\*\*/g, "")}
                  </p>
                ) : null;
              })}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Sparkles className="w-12 h-12 text-[#f0a500]/20 animate-pulse" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#e6edf3]">No active audit report loaded</h4>
                <p className="text-xs text-[#8b949e] max-w-md mx-auto leading-relaxed">
                  Click the "Generate Risk Audit" button above to evaluate Sanjay's portfolio. Gemini will parse all credit profiles and create a customized credit-compliance document.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
