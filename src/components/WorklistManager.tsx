/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Search, ShieldAlert, ArrowUpDown, Download, CheckSquare, Save } from "lucide-react";
import { Customer, Loan } from "../types";

interface WorklistItem {
  customer: Customer;
  loan: Loan;
  noteKey: string;
}

interface WorklistManagerProps {
  customers: Customer[];
  onSelectCustomer: (customerName: string) => void;
  setActiveTab: (tab: "customers" | "worklist" | "ai") => void;
}

export default function WorklistManager({ customers, onSelectCustomer, setActiveTab }: WorklistManagerProps) {
  const [activeBucket, setActiveBucket] = React.useState<"all" | "fresh" | "warm" | "stale" | "cold">("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<"age_desc" | "age_asc" | "pending_desc" | "pending_asc" | "name">("age_desc");
  const [localNotes, setLocalNotes] = React.useState<{ [key: string]: string }>({});
  const [savedNotesStatus, setSavedNotesStatus] = React.useState<{ [key: string]: boolean }>({});

  // Fetch pending loans across all customer files
  const pendingLoansList = React.useMemo(() => {
    const list: WorklistItem[] = [];
    customers.forEach((c) => {
      c.loans.forEach((l) => {
        if (l.status !== "Fully Disbursed" && l.pending > 0) {
          list.push({
            customer: c,
            loan: l,
            noteKey: `${l.loan_no}_${c.name}`,
          });
        }
      });
    });
    return list;
  }, [customers]);

  // Load saved notes from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("gcp_loan_notes");
    if (saved) {
      try {
        setLocalNotes(JSON.parse(saved));
      } catch (err) {
        console.error("Error reading saved loan notes", err);
      }
    }
  }, []);

  const getAgeBucket = (days: number) => {
    if (days <= 90) return "fresh";
    if (days <= 180) return "warm";
    if (days <= 365) return "stale";
    return "cold";
  };

  const getBucketLabel = (b: "fresh" | "warm" | "stale" | "cold") => {
    return {
      fresh: "0-90 days (Fresh)",
      warm: "90-180 days (Warm)",
      stale: "180-365 days (Stale)",
      cold: "365+ days (Stagnant)",
    }[b];
  };

  // Bucket aggregations
  const buckets = React.useMemo(() => {
    const counts = { fresh: 0, warm: 0, stale: 0, cold: 0, all: pendingLoansList.length };
    const amounts = { fresh: 0, warm: 0, stale: 0, cold: 0, all: 0 };

    pendingLoansList.forEach((pl) => {
      const b = getAgeBucket(pl.loan.age_days);
      counts[b]++;
      amounts[b] += pl.loan.pending;
      amounts.all += pl.loan.pending;
    });

    return { counts, amounts };
  }, [pendingLoansList]);

  // Handle Note Save
  const handleSaveNote = (key: string, value: string) => {
    const updated = { ...localNotes, [key]: value };
    setLocalNotes(updated);
    localStorage.setItem("gcp_loan_notes", JSON.stringify(updated));

    // Show saved feedback
    setSavedNotesStatus({ ...savedNotesStatus, [key]: true });
    setTimeout(() => {
      setSavedNotesStatus((prev) => ({ ...prev, [key]: false }));
    }, 1800);
  };

  // Filtered and Sorted Worklist
  const processedList = React.useMemo(() => {
    let result = pendingLoansList;

    // Apply bucket filter
    if (activeBucket !== "all") {
      result = result.filter((pl) => getAgeBucket(pl.loan.age_days) === activeBucket);
    }

    // Apply search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pl) =>
          pl.customer.name.toLowerCase().includes(query) ||
          pl.loan.loan_no.includes(query) ||
          (pl.loan.scheme || "").toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result = [...result];
    switch (sortBy) {
      case "age_desc":
        result.sort((a, b) => b.loan.age_days - a.loan.age_days);
        break;
      case "age_asc":
        result.sort((a, b) => a.loan.age_days - b.loan.age_days);
        break;
      case "pending_desc":
        result.sort((a, b) => b.loan.pending - a.loan.pending);
        break;
      case "pending_asc":
        result.sort((a, b) => a.loan.pending - b.loan.pending);
        break;
      case "name":
        result.sort((a, b) => a.customer.name.localeCompare(b.customer.name));
        break;
    }

    return result;
  }, [pendingLoansList, activeBucket, searchQuery, sortBy]);

  const handleRowClick = (customerName: string) => {
    onSelectCustomer(customerName);
    setActiveTab("customers");
  };

  // Export to CSV
  const handleExportCSV = () => {
    const header = [
      "Customer Name",
      "Occupation",
      "Loan No",
      "Scheme",
      "Sanction date",
      "Age (Days)",
      "Net Sanction (INR)",
      "Disbursed (INR)",
      "Pending release (INR)",
      "Status",
      "Agent Code",
      "Follow-up Action Note",
    ];

    const rows = processedList.map((pl) => {
      const note = (localNotes[pl.noteKey] || "").replace(/"/g, '""');
      return [
        pl.customer.name,
        pl.customer.occupation,
        pl.loan.loan_no,
        pl.loan.scheme,
        pl.loan.sanction_date,
        pl.loan.age_days,
        pl.loan.net_sanction_amt,
        pl.loan.total_disbursed,
        pl.loan.pending,
        pl.loan.status,
        pl.customer.agent_code,
        note,
      ].map((v) => `"${v}"`).join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Worklist_Audit_${activeBucket}_GPH0020.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-[#0d1117] min-h-screen">
      {/* Title & Metadata */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#e6edf3] tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Credit Risk Portfolio Worklist
          </h2>
          <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">
            Monitor capital lockups across stalled and partially disbursed tranches. Sort by severity, log follow-up actions, and export audits.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs font-semibold text-[#c9d1d9] hover:text-[#e6edf3] hover:border-[#8b949e] transition-all cursor-pointer shadow-sm flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          Export Audit CSV
        </button>
      </div>

      {/* Bucket Grid Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Bucket All */}
        <div
          onClick={() => setActiveBucket("all")}
          className={`border rounded-xl p-4 cursor-pointer select-none transition-all ${
            activeBucket === "all"
              ? "bg-[#f0a500]/10 border-[#f0a500] shadow-sm"
              : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50"
          }`}
        >
          <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">All Pending</div>
          <div className={`text-xl font-extrabold font-mono mt-1.5 ${activeBucket === "all" ? "text-[#f0a500]" : "text-[#e6edf3]"}`}>
            {buckets.counts.all}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1 font-mono">{formatCurrency(buckets.amounts.all)}</div>
        </div>

        {/* Bucket Fresh */}
        <div
          onClick={() => setActiveBucket("fresh")}
          className={`border rounded-xl p-4 cursor-pointer select-none transition-all ${
            activeBucket === "fresh"
              ? "bg-emerald-500/10 border-emerald-400 shadow-sm"
              : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50"
          }`}
        >
          <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">0-90 Days (Fresh)</div>
          <div className="text-xl font-extrabold font-mono mt-1.5 text-emerald-400">
            {buckets.counts.fresh}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1 font-mono">{formatCurrency(buckets.amounts.fresh)}</div>
        </div>

        {/* Bucket Warm */}
        <div
          onClick={() => setActiveBucket("warm")}
          className={`border rounded-xl p-4 cursor-pointer select-none transition-all ${
            activeBucket === "warm"
              ? "bg-blue-500/10 border-blue-400 shadow-sm"
              : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50"
          }`}
        >
          <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">90-180 Days (Warm)</div>
          <div className="text-xl font-extrabold font-mono mt-1.5 text-blue-400">
            {buckets.counts.warm}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1 font-mono">{formatCurrency(buckets.amounts.warm)}</div>
        </div>

        {/* Bucket Stale */}
        <div
          onClick={() => setActiveBucket("stale")}
          className={`border rounded-xl p-4 cursor-pointer select-none transition-all ${
            activeBucket === "stale"
              ? "bg-amber-500/10 border-amber-400 shadow-sm"
              : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50"
          }`}
        >
          <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">180-365 (Stale)</div>
          <div className="text-xl font-extrabold font-mono mt-1.5 text-amber-400">
            {buckets.counts.stale}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1 font-mono">{formatCurrency(buckets.amounts.stale)}</div>
        </div>

        {/* Bucket Cold */}
        <div
          onClick={() => setActiveBucket("cold")}
          className={`border rounded-xl p-4 col-span-2 sm:col-span-1 cursor-pointer select-none transition-all ${
            activeBucket === "cold"
              ? "bg-rose-500/10 border-rose-400 shadow-sm"
              : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50"
          }`}
        >
          <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">365+ (Stagnant)</div>
          <div className="text-xl font-extrabold font-mono mt-1.5 text-rose-400">
            {buckets.counts.cold}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1 font-mono">{formatCurrency(buckets.amounts.cold)}</div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
          <input
            type="text"
            placeholder="Search by client name, loan number, scheme..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] rounded-lg pl-10 pr-4 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[#8b949e]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-lg px-3 py-2 outline-none cursor-pointer transition-all"
          >
            <option value="age_desc">Oldest Pipeline first</option>
            <option value="age_asc">Newest Pipeline first</option>
            <option value="pending_desc">Highest Outstanding first</option>
            <option value="pending_asc">Lowest Outstanding first</option>
            <option value="name">Customer Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Spreadsheet Worklist Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full border-collapse text-left text-xs min-w-[900px]">
          <thead>
            <tr className="bg-[#1c2128] text-[#8b949e] font-semibold border-b border-[#30363d] uppercase tracking-wider text-[10px] font-mono">
              <th className="p-4">Customer</th>
              <th className="p-4">Loan Account</th>
              <th className="p-4">Sanctioned</th>
              <th className="p-4">Disbursed</th>
              <th className="p-4">Locked Balance</th>
              <th className="p-4">Days Open</th>
              <th className="p-4" style={{ width: "300px" }}>Follow-up Action Log</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363d]">
            {processedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#8b949e]">
                  No pending cases matched your active filter parameters. Everything is fully liquidated!
                </td>
              </tr>
            ) : (
              processedList.map((pl) => {
                const { customer, loan, noteKey } = pl;
                const noteVal = localNotes[noteKey] || "";
                const isSaved = savedNotesStatus[noteKey];

                const daysColor =
                  loan.age_days > 365
                    ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                    : loan.age_days > 180
                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    : "text-blue-400 bg-blue-500/10 border-blue-500/20";

                return (
                  <tr
                    key={loan.loan_no}
                    className="hover:bg-[#0d1117]/30 transition-all cursor-pointer group"
                    onClick={() => handleRowClick(customer.name)}
                  >
                    {/* Customer */}
                    <td className="p-4">
                      <div className="font-bold text-[#e6edf3] group-hover:text-[#f0a500] transition-all">
                        {customer.name}
                      </div>
                      <div className="text-[10px] text-[#8b949e] mt-0.5">{customer.occupation}</div>
                    </td>

                    {/* Loan Account */}
                    <td className="p-4">
                      <div className="font-mono font-medium text-[#e6edf3]">{loan.loan_no}</div>
                      <div className="text-[10px] text-[#8b949e] mt-0.5">{loan.scheme}</div>
                    </td>

                    {/* Sanctioned */}
                    <td className="p-4 font-mono text-[#e6edf3]">{formatCurrency(loan.net_sanction_amt)}</td>

                    {/* Disbursed */}
                    <td className="p-4 font-mono text-[#3fb950]">{formatCurrency(loan.total_disbursed)}</td>

                    {/* Locked Balance */}
                    <td className="p-4 font-mono font-bold text-[#f85149]">{formatCurrency(loan.pending)}</td>

                    {/* Days Open */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${daysColor}`}>
                        {loan.age_days}d
                      </span>
                    </td>

                    {/* Follow-up Note */}
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 items-center">
                        <textarea
                          value={noteVal}
                          onChange={(e) => handleSaveNote(noteKey, e.target.value)}
                          placeholder="Log conversation or bottlenecks..."
                          rows={1}
                          className="flex-1 bg-[#0d1117] border border-[#30363d] focus:border-purple-500 rounded-lg p-2 text-xs text-[#e6edf3] focus:outline-none transition-all resize-none max-h-12"
                        />
                        <button
                          title="Save action plan"
                          className={`p-2 rounded-lg border text-xs font-bold transition-all flex-shrink-0 flex items-center justify-center ${
                            isSaved
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]"
                          }`}
                        >
                          {isSaved ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
