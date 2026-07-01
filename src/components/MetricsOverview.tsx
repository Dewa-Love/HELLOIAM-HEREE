/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ShieldAlert, CheckCircle, Hourglass, Landmark, HelpCircle } from "lucide-react";
import { Customer } from "../types";

interface MetricsOverviewProps {
  customers: Customer[];
}

export default function MetricsOverview({ customers }: MetricsOverviewProps) {
  // Aggregate stats from the filtered list of customers
  const aggregates = React.useMemo(() => {
    let sanctioned = 0;
    let disbursed = 0;
    let pending = 0;
    let loansCount = 0;
    let tranchesCount = 0;

    customers.forEach((c) => {
      sanctioned += c.total_sanctioned;
      disbursed += c.total_disbursed;
      pending += c.total_pending;
      loansCount += c.loan_count;
      tranchesCount += c.total_tranches;
    });

    return { sanctioned, disbursed, pending, loansCount, tranchesCount };
  }, [customers]);

  const formatCurrency = (val: number) => {
    return "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  return (
    <div className="flex md:grid md:grid-cols-5 gap-3 md:gap-4 p-4 md:p-6 bg-[#0d1117] overflow-x-auto no-scrollbar snap-x snap-mandatory">
      {/* Sanctioned */}
      <div className="min-w-[140px] snap-start bg-[#161b22] border border-[#30363d] p-3 md:p-4 rounded-xl flex flex-col justify-between hover:border-[#8b949e] transition-all group">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">Approved Limit</span>
            <Landmark className="w-4 h-4 text-[#8b949e] group-hover:text-[#f0a500]" />
          </div>
          <div className="text-lg font-extrabold text-[#e6edf3] font-mono mt-2 tracking-tight">
            {formatCurrency(aggregates.sanctioned)}
          </div>
        </div>
        <span className="text-[10px] text-[#8b949e] mt-1.5 font-medium block">Total Net Sanction</span>
      </div>

      <div className="min-w-[140px] snap-start bg-[#161b22] border border-[#30363d] p-3 md:p-4 rounded-xl flex flex-col justify-between hover:border-[#8b949e] transition-all group">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">Released Funds</span>
            <CheckCircle className="w-4 h-4 text-[#8b949e] group-hover:text-[#3fb950]" />
          </div>
          <div className="text-lg font-extrabold text-[#3fb950] font-mono mt-2 tracking-tight">
            {formatCurrency(aggregates.disbursed)}
          </div>
        </div>
        <span className="text-[10px] text-[#8b949e] mt-1.5 font-medium block">Capital Released</span>
      </div>

      <div className="min-w-[140px] snap-start bg-[#161b22] border border-[#30363d] p-3 md:p-4 rounded-xl flex flex-col justify-between hover:border-[#8b949e] transition-all group">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">Locked Capital</span>
            <Hourglass className="w-4 h-4 text-[#8b949e] group-hover:text-[#f85149]" />
          </div>
          <div className="text-lg font-extrabold text-[#f85149] font-mono mt-2 tracking-tight">
            {formatCurrency(aggregates.pending)}
          </div>
        </div>
        <span className="text-[10px] text-[#8b949e] mt-1.5 font-medium block">Awaiting disbursement</span>
      </div>

      <div className="min-w-[140px] snap-start bg-[#161b22] border border-[#30363d] p-3 md:p-4 rounded-xl flex flex-col justify-between hover:border-[#8b949e] transition-all group">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">Active Accounts</span>
            <HelpCircle className="w-4 h-4 text-[#8b949e] group-hover:text-blue-400" />
          </div>
          <div className="text-lg font-extrabold text-[#e6edf3] font-mono mt-2 tracking-tight">
            {aggregates.loansCount}
          </div>
        </div>
        <span className="text-[10px] text-[#8b949e] mt-1.5 font-medium block">Loans in selection</span>
      </div>

      <div className="min-w-[140px] snap-start bg-[#161b22] border border-[#30363d] p-3 md:p-4 rounded-xl flex flex-col justify-between hover:border-[#8b949e] transition-all group">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider font-mono">Tranche History</span>
            <ShieldAlert className="w-4 h-4 text-[#8b949e] group-hover:text-purple-400" />
          </div>
          <div className="text-lg font-extrabold text-[#e6edf3] font-mono mt-2 tracking-tight">
            {aggregates.tranchesCount}
          </div>
        </div>
        <span className="text-[10px] text-[#8b949e] mt-1.5 font-medium block">Disbursement rows</span>
      </div>
    </div>
  );
}
