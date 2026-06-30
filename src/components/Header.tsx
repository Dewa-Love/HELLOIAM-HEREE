/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Building2, Users, FileSpreadsheet, TrendingUp, Cpu } from "lucide-react";
import { GLOBAL_STATS } from "../data";

interface HeaderProps {
  activeTab: "customers" | "worklist" | "ai";
  setActiveTab: (tab: "customers" | "worklist" | "ai") => void;
  worklistCount: number;
  customerCount: number;
  totalDisbursed: number;
}

export default function Header({
  activeTab,
  setActiveTab,
  worklistCount,
  customerCount,
  totalDisbursed
}: HeaderProps) {
  // Format currency in Indian Rupees Crores
  const formatCr = (value: number) => {
    return "₹" + (value / 10000000).toFixed(2) + "Cr";
  };

  return (
    <header className="sticky top-0 z-50 bg-[#161b22] border-b border-[#30363d] shadow-md px-6 py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Brand & RM Identity */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#f0a500] rounded-xl flex items-center justify-center font-bold text-lg text-black shadow-inner shadow-black/20 flex-shrink-0">
          LU
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[#e6edf3] font-bold text-lg tracking-tight">Sanjay Kumar Pandey</h1>
            <span className="text-[10px] bg-[#f0a500]/15 text-[#f0a500] border border-[#f0a500]/30 px-2 py-0.5 rounded-full font-mono font-semibold uppercase">
              {GLOBAL_STATS.agentCode}
            </span>
          </div>
          <p className="text-[#8b949e] text-xs flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3.5 h-3.5" />
            {GLOBAL_STATS.areaOffice} Area Office &nbsp;&middot;&nbsp; {GLOBAL_STATS.backOffice} &nbsp;&middot;&nbsp; {GLOBAL_STATS.regionalOffice}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center bg-[#0d1117] p-1 rounded-xl border border-[#30363d] self-center md:self-auto">
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            activeTab === "customers"
              ? "bg-[#f0a500] text-black shadow-md font-bold"
              : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128]"
          }`}
        >
          <Users className="w-4 h-4" />
          Customers
        </button>
        <button
          onClick={() => setActiveTab("worklist")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all relative ${
            activeTab === "worklist"
              ? "bg-[#f0a500] text-black shadow-md font-bold"
              : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128]"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Worklist
          {worklistCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-[#f85149] text-white text-[9px] font-bold font-mono rounded-full border border-[#0d1117] animate-pulse">
              {worklistCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            activeTab === "ai"
              ? "bg-[#f0a500] text-black shadow-md font-bold"
              : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128]"
          }`}
        >
          <Cpu className="w-4 h-4 text-purple-400" style={{ color: activeTab === 'ai' ? 'black' : '' }} />
          AI Auditor
        </button>
      </nav>

      {/* Stats Summary */}
      <div className="hidden lg:flex items-center gap-6 border-l border-[#30363d] pl-6">
        <div className="text-right">
          <div className="text-xs text-[#8b949e] uppercase tracking-wider font-mono">Portfolio size</div>
          <div className="text-sm font-bold text-[#e6edf3] font-mono mt-0.5">{customerCount} Client{customerCount !== 1 ? "s" : ""}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#8b949e] uppercase tracking-wider font-mono">Disbursed</div>
          <div className="text-sm font-bold text-[#3fb950] font-mono mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {formatCr(totalDisbursed)}
          </div>
        </div>
      </div>
    </header>
  );
}
