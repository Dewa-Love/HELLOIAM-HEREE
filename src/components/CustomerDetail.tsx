/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Calendar,
  DollarSign,
  Briefcase,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Sparkles,
  Mail,
  Send,
  Loader2,
  X,
  ExternalLink,
  Info
} from "lucide-react";
import { Customer, Loan, Disbursement } from "../types";
import EMICalculator from "./EMICalculator";

interface CustomerDetailProps {
  customer: Customer | null;
}

export default function CustomerDetail({ customer }: CustomerDetailProps) {
  const [expandedLoan, setExpandedLoan] = React.useState<string | null>(null);
  const [draftingLoan, setDraftingLoan] = React.useState<Loan | null>(null);
  const [outreachContext, setOutreachContext] = React.useState<string>("");
  const [loadingDraft, setLoadingDraft] = React.useState<boolean>(false);
  const [outreachDrafts, setOutreachDrafts] = React.useState<string | null>(null);

  // Sub-tabs state inside CustomerDetail: "loans" | "timeline" | "emi"
  const [activeSubTab, setActiveSubTab] = React.useState<"loans" | "timeline" | "emi">("loans");
  const [localNotes, setLocalNotes] = React.useState<{ [key: string]: string }>({});
  const [editingLoanNoteNo, setEditingLoanNoteNo] = React.useState<string | null>(null);
  const [newNoteValue, setNewNoteValue] = React.useState<string>("");

  // Load saved notes from localStorage
  const loadNotes = () => {
    const saved = localStorage.getItem("gcp_loan_notes");
    if (saved) {
      try {
        setLocalNotes(JSON.parse(saved));
      } catch (err) {
        console.error("Error reading saved notes in CustomerDetail", err);
      }
    }
  };

  const handleSaveNote = (loanNo: string, content: string) => {
    if (!customer) return;
    const noteKey = `${loanNo}_${customer.name}`;
    const updated = { ...localNotes, [noteKey]: content };
    setLocalNotes(updated);
    localStorage.setItem("gcp_loan_notes", JSON.stringify(updated));
    setEditingLoanNoteNo(null);
  };

  // Compile chronological timeline events across all customer loans
  const chronologicalTimeline = React.useMemo(() => {
    if (!customer) return [];
    const events: any[] = [];

    customer.loans.forEach((loan) => {
      // 1. Application filed: 14 days before sanction date
      const sanctionDateVal = new Date(loan.sanction_date);
      const appDateVal = new Date(sanctionDateVal);
      appDateVal.setDate(appDateVal.getDate() - 14);
      const appDateStr = appDateVal.toISOString().split("T")[0];

      events.push({
        id: `app_${loan.loan_no}`,
        date: appDateStr,
        type: "applied",
        title: "Loan Application Logged",
        loanNo: loan.loan_no,
        scheme: loan.scheme,
        badgeText: "Application",
        badgeColor: "bg-blue-500/10 border-blue-500/30 text-blue-400",
        details: `Requested ${loan.purpose || "capital financing"} under the "${loan.scheme}" scheme. Initial processing and physical verification commenced by GORAKHPUR area office.`,
        amount: loan.gross_sanction_amt
      });

      // 2. Sanction issued
      events.push({
        id: `sanc_${loan.loan_no}`,
        date: loan.sanction_date,
        type: "sanctioned",
        title: "Credit Sanction Authorized",
        loanNo: loan.loan_no,
        scheme: loan.scheme,
        badgeText: "Sanction",
        badgeColor: "bg-purple-500/10 border-purple-500/30 text-purple-400",
        details: `Official credit sanction issued for net ₹${loan.net_sanction_amt.toLocaleString("en-IN")}. ROI package set to "${loan.roi_package}" at ${loan.roi ? `${loan.roi}%` : "Variable"} ${loan.interest_type ? `(${loan.interest_type})` : ""}.`,
        amount: loan.net_sanction_amt
      });

      // 3. Disbursements
      if (loan.has_txn_detail && loan.disbursements) {
        loan.disbursements.forEach((disb, idx) => {
          events.push({
            id: `disb_${loan.loan_no}_${idx}`,
            date: disb.date,
            type: "disbursement",
            title: `Tranche #${idx + 1} Disbursed (${disb.disb_type})`,
            loanNo: loan.loan_no,
            scheme: loan.scheme,
            badgeText: "Payout",
            badgeColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
            details: `Successfully transferred ₹${disb.net_disb_amt.toLocaleString("en-IN")} via ${disb.payment_type} to beneficiary ${disb.beneficiary}. TXN Ref: ${disb.txn_ref || "N/A"}. Bank clearance: ${disb.realization}.`,
            amount: disb.net_disb_amt
          });
        });
      }

      // 4. Status Milestones
      if (loan.status === "Fully Disbursed") {
        const finalDate = (loan.disbursements && loan.disbursements.length > 0)
          ? loan.disbursements[loan.disbursements.length - 1].date
          : loan.sanction_date;
        events.push({
          id: `status_${loan.loan_no}`,
          date: finalDate,
          type: "status",
          title: "Loan Account Closed (Fully Disbursed)",
          loanNo: loan.loan_no,
          scheme: loan.scheme,
          badgeText: "Fully Disbursed",
          badgeColor: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
          details: `The complete sanction limit of ₹${loan.net_sanction_amt.toLocaleString("en-IN")} has been successfully disbursed across ${loan.tranche_count} tranches. Account status has been updated to Fully Disbursed.`,
          amount: loan.net_sanction_amt
        });
      } else if (loan.status === "Stalled / Zero Payout") {
        const sancVal = new Date(loan.sanction_date);
        sancVal.setDate(sancVal.getDate() + 30);
        const stallDateStr = sancVal.toISOString().split("T")[0];
        events.push({
          id: `status_${loan.loan_no}`,
          date: stallDateStr,
          type: "status",
          title: "Drawdown Stalled Warning",
          loanNo: loan.loan_no,
          scheme: loan.scheme,
          badgeText: "Stalled",
          badgeColor: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          details: `No disbursements have been initiated since credit sanction issued. Account is marked as Stalled/Zero Payout. Inactivity period has reached ${loan.age_days} days. Agent outreach required immediately.`,
          amount: loan.pending
        });
      } else if (loan.pending > 0) {
        const finalDate = (loan.disbursements && loan.disbursements.length > 0)
          ? loan.disbursements[loan.disbursements.length - 1].date
          : loan.sanction_date;
        events.push({
          id: `status_${loan.loan_no}`,
          date: finalDate,
          type: "status",
          title: "Multi-Tranche Payout Cycle Active",
          loanNo: loan.loan_no,
          scheme: loan.scheme,
          badgeText: "In Progress",
          badgeColor: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          details: `Loan account in active progress. Disbursed: ₹${loan.total_disbursed.toLocaleString("en-IN")}, pending remaining sanction balance: ₹${loan.pending.toLocaleString("en-IN")}.`,
          amount: loan.pending
        });
      }

      // 5. Follow-up Notes
      const noteKey = `${loan.loan_no}_${customer.name}`;
      const savedNote = localNotes[noteKey];
      if (savedNote && savedNote.trim() !== "") {
        events.push({
          id: `note_${loan.loan_no}`,
          date: "2026-06-29",
          type: "note",
          title: "Agent Follow-up Interaction",
          loanNo: loan.loan_no,
          scheme: loan.scheme,
          badgeText: "Agent Note",
          badgeColor: "bg-[#f0a500]/10 border-[#f0a500]/30 text-[#f0a500]",
          details: savedNote,
          isNote: true
        });
      }
    });

    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [customer, localNotes]);

  // Auto-expand the first loan and load notes on customer changes
  React.useEffect(() => {
    if (customer && customer.loans.length > 0) {
      setExpandedLoan(customer.loans[0].loan_no);
    } else {
      setExpandedLoan(null);
    }
    setDraftingLoan(null);
    setOutreachDrafts(null);
    setOutreachContext("");
    setActiveSubTab("loans");
    setEditingLoanNoteNo(null);
    setNewNoteValue("");
    loadNotes();
  }, [customer]);

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#8b949e] p-8 text-center bg-[#0d1117] min-h-[500px]">
        <div className="w-16 h-16 bg-[#161b22] border border-[#30363d] rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm">
          🏦
        </div>
        <h3 className="text-[#e6edf3] font-bold text-base tracking-tight">Select a Customer</h3>
        <p className="text-xs text-[#8b949e] max-w-sm mt-1.5 leading-relaxed">
          Select a customer from the left directory sidebar to explore their complete loan accounts, analyze tranche logs, and view interactive lifecycle timelines.
        </p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Fully Disbursed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Partially Disbursed":
      case "In Progress":
      case "In Progress / Mixed":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
  };

  const calculateDaysBetween = (d1: string, d2: string) => {
    const timeDiff = new Date(d2).getTime() - new Date(d1).getTime();
    return Math.round(timeDiff / (1000 * 3600 * 24));
  };

  const getLongestInactivity = (loan: Loan) => {
    if (!loan.has_txn_detail || loan.disbursements.length === 0) return null;
    let maxGap = calculateDaysBetween(loan.sanction_date, loan.disbursements[0].date);
    for (let i = 1; i < loan.disbursements.length; i++) {
      const gap = calculateDaysBetween(loan.disbursements[i - 1].date, loan.disbursements[i].date);
      if (gap > maxGap) maxGap = gap;
    }

    if (loan.pending > 0) {
      // consider gap from last tranche to current portfolio state reference point
      const lastTrancheDate = loan.disbursements[loan.disbursements.length - 1].date;
      const daysSinceLast = calculateDaysBetween(lastTrancheDate, "2026-06-30");
      if (daysSinceLast > maxGap) maxGap = daysSinceLast;
    }

    return maxGap;
  };

  const handleGenerateOutreach = async () => {
    if (!draftingLoan) return;
    setLoadingDraft(true);
    setOutreachDrafts(null);
    try {
      const response = await fetch("/api/draft-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          loan: draftingLoan,
          context: outreachContext,
        }),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setOutreachDrafts(data.drafts);
    } catch (err: any) {
      console.error(err);
      setOutreachDrafts(`### Error Generating Follow-Up\n\nCould not connect to the server-side Gemini service. Ensure process.env.GEMINI_API_KEY is configured in Secrets.\n\n*Technical details: ${err.message}*`);
    } finally {
      setLoadingDraft(false);
    }
  };

  return (
    <div className="bg-[#0d1117] h-full overflow-y-auto">
      {/* Customer Header Profile */}
      <div className="bg-[#161b22] border-b border-[#30363d] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f0a500]/20 to-[#f0a500]/10 border border-[#f0a500]/30 flex items-center justify-center font-bold text-[#f0a500] text-xl shadow-sm">
            {customer.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e6edf3] tracking-tight">{customer.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#8b949e]">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadgeClass(customer.status)}`}>
                {customer.status}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-[#8b949e]" />
                {customer.occupation}
              </span>
              <span>&middot;</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#8b949e]" />
                Agent: {customer.agent_name}
              </span>
            </div>
          </div>
        </div>

        {/* Global Summary */}
        <div className="flex items-center gap-4 bg-[#0d1117] border border-[#30363d] p-3 rounded-xl w-full sm:w-auto">
          <div className="px-3 border-r border-[#30363d]">
            <div className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider">Sanctioned</div>
            <div className="text-sm font-bold font-mono text-[#f0a500] mt-0.5">
              {formatCurrency(customer.total_sanctioned)}
            </div>
          </div>
          <div className="px-3">
            <div className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider">Disbursed</div>
            <div className="text-sm font-bold font-mono text-[#3fb950] mt-0.5">
              {formatCurrency(customer.total_disbursed)}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selector Ribbon */}
      <div className="bg-[#161b22]/95 border-b border-[#30363d] px-6 py-2.5 flex items-center gap-2 flex-shrink-0 sticky top-0 z-50 backdrop-blur-sm">
        <button
          onClick={() => setActiveSubTab("loans")}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "loans"
              ? "bg-[#f0a500]/10 border-[#f0a500] text-[#f0a500]"
              : "bg-transparent border-transparent text-[#8b949e] hover:text-[#e6edf3]"
          }`}
        >
          📂 Loan Accounts ({customer.loans.length})
        </button>
        <button
          onClick={() => setActiveSubTab("timeline")}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "timeline"
              ? "bg-[#f0a500]/10 border-[#f0a500] text-[#f0a500]"
              : "bg-transparent border-transparent text-[#8b949e] hover:text-[#e6edf3]"
          }`}
        >
          ⏱ Activity Timeline
        </button>
        <button
          onClick={() => setActiveSubTab("emi")}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
            activeSubTab === "emi"
              ? "bg-[#f0a500]/10 border-[#f0a500] text-[#f0a500]"
              : "bg-transparent border-transparent text-[#8b949e] hover:text-[#e6edf3]"
          }`}
        >
          📊 EMI Repayment Planner
        </button>
      </div>

      {/* Profile Metrics Summary */}
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {activeSubTab === "loans" && (
          <>
            <h3 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-2">
              <span>Active Loan Accounts</span>
          <span className="h-[1px] bg-[#30363d] flex-1"></span>
        </h3>

        {/* Loan Cards */}
        <div className="space-y-4">
          {customer.loans.map((loan, idx) => {
            const isExpanded = expandedLoan === loan.loan_no;
            const maxGap = getLongestInactivity(loan);
            const isDelayed = maxGap !== null && maxGap > 60;

            return (
              <div
                key={loan.loan_no}
                className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm hover:border-[#8b949e]/50 transition-all"
              >
                {/* Accordion Trigger */}
                <div
                  onClick={() => setExpandedLoan(isExpanded ? null : loan.loan_no)}
                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#f0a500] bg-[#f0a500]/10 border border-[#f0a500]/20 px-2 py-0.5 rounded">
                        {loan.loan_no}
                      </span>
                      <h4 className="text-sm font-bold text-[#e6edf3]">
                        {loan.scheme}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${getStatusBadgeClass(loan.status)}`}>
                        {loan.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#8b949e] flex items-center gap-2">
                      <span>App No: {loan.app_no}</span>
                      <span>&middot;</span>
                      <span>Sanction date: {loan.sanction_date}</span>
                      {isDelayed && (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Inactivity gap: {maxGap} days
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Mini Summary */}
                  <div className="flex items-center gap-4 pr-2">
                    <div className="text-right">
                      <div className="text-[9px] text-[#8b949e] uppercase font-mono tracking-wider">Sanctioned</div>
                      <div className="text-xs font-bold text-[#e6edf3] font-mono mt-0.5">
                        {formatCurrency(loan.net_sanction_amt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-[#8b949e] uppercase font-mono tracking-wider">Disbursed</div>
                      <div className="text-xs font-bold text-[#3fb950] font-mono mt-0.5">
                        {formatCurrency(loan.total_disbursed)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-[#8b949e] uppercase font-mono tracking-wider">Pending</div>
                      <div className={`text-xs font-bold font-mono mt-0.5 ${loan.pending > 0 ? "text-rose-400" : "text-[#8b949e]"}`}>
                        {formatCurrency(loan.pending)}
                      </div>
                    </div>
                    <div className="text-[#8b949e] ml-2">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Accordion Detail */}
                {isExpanded && (
                  <div className="border-t border-[#30363d] bg-[#0d1117]/40">
                    {/* Meta Fields Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#30363d]">
                      <div className="p-4 border-r border-b sm:border-b-0 border-[#30363d]">
                        <div className="text-[9px] text-[#8b949e] uppercase font-mono tracking-wider">Rate of Interest</div>
                        <div className="text-xs font-semibold text-[#e6edf3] mt-1">
                          {loan.roi ? `${loan.roi}%` : "N/A"} ({loan.interest_type})
                        </div>
                      </div>
                      <div className="p-4 border-r border-b sm:border-b-0 border-[#30363d]">
                        <div className="text-[9px] text-[#8b949e] uppercase font-mono tracking-wider">ROI Package</div>
                        <div className="text-xs font-semibold text-[#e6edf3] mt-1">{loan.roi_package}</div>
                      </div>
                      <div className="p-4 border-r border-[#30363d]">
                        <div className="text-[9px] text-[#8b949e] uppercase font-mono tracking-wider">Product Code</div>
                        <div className="text-xs font-semibold text-[#e6edf3] mt-1 font-mono">{loan.product_code}</div>
                      </div>
                      <div className="p-4">
                        <div className="text-[9px] text-[#8b949e] uppercase font-mono tracking-wider">Collateral / Asset ID</div>
                        <div className="text-xs font-semibold text-[#e6edf3] mt-1 font-mono">{loan.collateral_id || "N/A"}</div>
                      </div>
                    </div>

                    {/* Timeline of Disbursements */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#f0a500]" />
                          Interactive Loan Lifecycle Timeline
                        </h5>
                        {loan.status !== "Fully Disbursed" && (
                          <button
                            onClick={() => {
                              setDraftingLoan(loan);
                              setOutreachDrafts(null);
                              setOutreachContext("");
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] text-purple-400 font-bold hover:bg-purple-500/20 transition-all shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            Draft AI Outreach
                          </button>
                        )}
                      </div>

                      {/* Timeline Rail */}
                      <div className="relative border-l-2 border-[#30363d] ml-4 pl-6 space-y-6">
                        {/* Milestone: Applied */}
                        <div className="relative">
                          {/* Dot */}
                          <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-blue-500 rounded-full border-4 border-[#161b22] ring-1 ring-[#30363d]" />
                          <div>
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider font-mono">Application Filed</span>
                            <h6 className="text-xs font-bold text-[#e6edf3] mt-0.5">Loan file logged at Gorakhpur office</h6>
                            <p className="text-[11px] text-[#8b949e] mt-1 leading-relaxed">
                              {loan.purpose} requested under scheme <span className="text-[#f0a500] font-medium">{loan.scheme}</span>
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-[10px] text-[#8b949e]">
                              <span>Amount: {formatCurrency(loan.gross_sanction_amt)}</span>
                              <span>Date: {loan.sanction_date}</span>
                            </div>
                          </div>
                        </div>

                        {/* Milestone: Sanctioned */}
                        <div className="relative">
                          {/* Dot */}
                          <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-purple-500 rounded-full border-4 border-[#161b22] ring-1 ring-[#30363d]" />
                          <div>
                            <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider font-mono">Sanction Issued</span>
                            <h6 className="text-xs font-bold text-[#e6edf3] mt-0.5">Approved net credit of {formatCurrency(loan.net_sanction_amt)}</h6>
                            <p className="text-[11px] text-[#8b949e] mt-1 leading-relaxed">
                              ROI configured at {loan.roi ? `${loan.roi}%` : "Variable"} under package <span className="text-[#f0a500] font-medium">{loan.roi_package}</span>
                            </p>
                            {loan.canc_amt > 0 && (
                              <div className="text-[10px] text-rose-400 font-semibold mt-1">
                                ⚠ ₹{loan.canc_amt.toLocaleString("en-IN")} was officially cancelled from sanction.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Milestones: Disbursements */}
                        {loan.has_txn_detail && loan.disbursements.map((disb, dIdx) => {
                          const gap = dIdx === 0
                            ? calculateDaysBetween(loan.sanction_date, disb.date)
                            : calculateDaysBetween(loan.disbursements[dIdx - 1].date, disb.date);

                          const unrealized = disb.realization === "PAYMENT UN-REALIZED";

                          return (
                            <div key={disb.txn_ref || dIdx} className="relative">
                              {/* Dot */}
                              <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-[#161b22] ring-1 ring-[#30363d] ${unrealized ? "bg-amber-500" : "bg-emerald-500"}`} />
                              <div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider font-mono ${unrealized ? "text-amber-400" : "text-emerald-400"}`}>
                                  Tranche {dIdx + 1} &middot; {disb.disb_type}
                                </span>
                                <h6 className="text-xs font-bold text-[#e6edf3] mt-0.5">
                                  Released {formatCurrency(disb.net_disb_amt)} via {disb.payment_type}
                                </h6>
                                <div className="text-[11px] text-[#8b949e] mt-1 space-y-0.5">
                                  <p>Beneficiary: <span className="text-[#e6edf3]">{disb.beneficiary}</span> (A/C: {disb.beneficiary_ac || "N/A"})</p>
                                  {disb.txn_ref && <p>Transaction Reference: <span className="font-mono">{disb.txn_ref}</span></p>}
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${unrealized ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                                    {disb.realization}
                                  </span>
                                  {disb.mandate_status && (
                                    <span className="text-[9px] bg-[#161b22] border border-[#30363d] text-[#8b949e] px-2 py-0.5 rounded font-mono">
                                      Mandate: {disb.mandate_status}
                                    </span>
                                  )}
                                </div>

                                {/* Gap Alert */}
                                {gap > 60 && (
                                  <div className="mt-2 text-[10px] text-rose-400 flex items-center gap-1 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                    Delayed release: {gap} days of stagnation between tranches (expected &lt;30 days).
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* End Outcome State */}
                        <div className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-[#161b22] ring-1 ring-[#30363d] ${loan.status === "Fully Disbursed" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider font-mono ${loan.status === "Fully Disbursed" ? "text-emerald-400" : "text-rose-400"}`}>
                              Outcome State
                            </span>
                            <h6 className="text-xs font-bold text-[#e6edf3] mt-0.5">
                              {loan.status === "Fully Disbursed" ? "Loan closed and fully paid out" : `Awaiting tranche releases. Pending: ${formatCurrency(loan.pending)}`}
                            </h6>
                            <p className="text-[11px] text-[#8b949e] mt-1 leading-relaxed">
                              {loan.status === "Fully Disbursed"
                                ? "The entire net sanctioned volume has been successfully liquidated and verified."
                                : `The pipeline has remained open for ${loan.age_days} days. Total disbursed so far is ${formatCurrency(loan.total_disbursed)}.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
        )}

        {/* Activity Timeline Section */}
        {activeSubTab === "timeline" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-[#30363d]">
              <div>
                <h3 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#f0a500]" />
                  Chronological Loan Activity Log
                </h3>
                <p className="text-xs text-[#8b949e] mt-1">
                  Historical view of credit events, payouts, and agent notes
                </p>
              </div>
            </div>

            {/* Quick Notes Logger Form */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3 shadow-sm">
              <span className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider block">
                ✍ Log Customer Interaction / Loan Note
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  className="bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] rounded-lg px-3 py-2 outline-none cursor-pointer"
                  value={editingLoanNoteNo || ""}
                  onChange={(e) => {
                    setEditingLoanNoteNo(e.target.value);
                    setNewNoteValue(localNotes[`${e.target.value}_${customer.name}`] || "");
                  }}
                >
                  <option value="">Select a Loan Account...</option>
                  {customer.loans.map((l) => (
                    <option key={l.loan_no} value={l.loan_no}>
                      {l.scheme} ({l.loan_no})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Type note content here..."
                  className="sm:col-span-2 bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] text-xs text-[#e6edf3] rounded-lg px-3 py-2 outline-none transition-all"
                  value={newNoteValue}
                  onChange={(e) => setNewNoteValue(e.target.value)}
                  disabled={!editingLoanNoteNo}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingLoanNoteNo(null);
                    setNewNoteValue("");
                  }}
                  className="px-3 py-1.5 border border-[#30363d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (editingLoanNoteNo) {
                      handleSaveNote(editingLoanNoteNo, newNoteValue);
                      setNewNoteValue("");
                    }
                  }}
                  disabled={!editingLoanNoteNo || !newNoteValue.trim()}
                  className="px-3 py-1.5 bg-[#f0a500] hover:bg-[#f0a500]/80 disabled:opacity-50 text-[#0d1117] rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Save to Log
                </button>
              </div>
            </div>

            {/* Timeline event items */}
            {chronologicalTimeline.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8b949e] border border-[#30363d] rounded-xl bg-[#161b22]/20">
                No events recorded for this customer portfolio.
              </div>
            ) : (
              <div className="relative border-l-2 border-[#30363d] ml-4 pl-6 space-y-6">
                {chronologicalTimeline.map((event) => (
                  <div key={event.id} className="relative group">
                    {/* Circle Node */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-[#161b22] rounded-full border-4 border-[#161b22] ring-1 ring-[#30363d] group-hover:ring-[#f0a500] transition-all flex items-center justify-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        event.type === "disbursement" ? "bg-emerald-500" :
                        event.type === "sanctioned" ? "bg-purple-500" :
                        event.type === "applied" ? "bg-blue-500" :
                        event.type === "status" ? "bg-amber-500" : "bg-[#f0a500]"
                      }`} />
                    </div>

                    <div className="bg-[#161b22]/60 hover:bg-[#161b22]/90 border border-[#30363d] hover:border-[#30363d]/80 p-4 rounded-xl transition-all space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${event.badgeColor}`}>
                            {event.badgeText}
                          </span>
                          <h4 className="text-xs font-bold text-[#e6edf3]">
                            {event.title}
                          </h4>
                          <span className="text-[10px] text-[#8b949e] font-mono">
                            &middot; Loan {event.loanNo}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#8b949e] bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
                          {event.date}
                        </span>
                      </div>

                      <p className="text-xs text-[#8b949e] leading-relaxed">
                        {event.details}
                      </p>

                      {event.amount && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#8b949e] font-mono">
                          <span>Amount Context:</span>
                          <span className="font-bold text-[#e6edf3]">₹{event.amount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EMI Repayment Planner Section */}
        {activeSubTab === "emi" && (
          <EMICalculator
            initialPrincipal={customer.loans[0]?.net_sanction_amt || 1500000}
            initialRoi={customer.loans[0]?.roi || undefined}
            customerName={customer.name}
          />
        )}
      </div>

      {/* AI Drafting Modal Drawer */}
      {draftingLoan && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#1c2128]">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h3 className="font-bold text-sm text-[#e6edf3]">
                  AI Outreach Planner &nbsp;&middot;&nbsp; {customer.name}
                </h3>
              </div>
              <button
                onClick={() => setDraftingLoan(null)}
                className="p-1 hover:bg-[#30363d] rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Context overview */}
              <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-xl flex items-start gap-3">
                <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-[#8b949e] space-y-1">
                  <p className="font-bold text-[#e6edf3]">Drafting follow-up for Loan No: {draftingLoan.loan_no}</p>
                  <p>Pending Amount: <span className="text-rose-400 font-mono font-medium">{formatCurrency(draftingLoan.pending)}</span> &nbsp;&middot;&nbsp; Sanction Date: {draftingLoan.sanction_date}</p>
                </div>
              </div>

              {/* Text Input area */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8b949e] uppercase block">
                  Add specific instructions or bottlenecks (Optional)
                </label>
                <textarea
                  value={outreachContext}
                  onChange={(e) => setOutreachContext(e.target.value)}
                  placeholder="e.g. They had a delay in municipal map approval. Ask them if they have received the map now so we can disburse the remaining ₹4 Lakhs."
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-purple-500 rounded-xl p-3 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none transition-all h-20"
                />
              </div>

              {/* Output Response */}
              {outreachDrafts && (
                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-4 max-h-80 overflow-y-auto">
                  <div className="prose prose-invert prose-xs text-[#e6edf3] max-w-none leading-relaxed text-xs">
                    {outreachDrafts.split("\n").map((line, lIdx) => {
                      if (line.startsWith("###")) {
                        return <h4 key={lIdx} className="font-bold text-sm text-[#f0a500] mt-4 mb-2">{line.replace("###", "")}</h4>;
                      }
                      if (line.startsWith("##")) {
                        return <h3 key={lIdx} className="font-bold text-base text-[#f0a500] mt-6 mb-3 border-b border-[#30363d] pb-1">{line.replace("##", "")}</h3>;
                      }
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <p key={lIdx} className="font-bold text-[#e6edf3]">{line.replace(/\*\*/g, "")}</p>;
                      }
                      return <p key={lIdx} className="my-1.5">{line.replace(/\*\*/g, "")}</p>;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 border-t border-[#30363d] flex items-center justify-between bg-[#1c2128]">
              <div className="text-[10px] text-[#8b949e]">
                Powered by Gemini 3.5 Flash
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDraftingLoan(null)}
                  className="px-4 py-2 border border-[#30363d] hover:bg-[#30363d] rounded-xl text-xs text-[#8b949e] hover:text-[#e6edf3] font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateOutreach}
                  disabled={loadingDraft}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loadingDraft ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Generate Draft
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
