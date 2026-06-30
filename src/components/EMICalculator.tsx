/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Calculator, Calendar, Percent, Landmark, Info, Table } from "lucide-react";

interface EMICalculatorProps {
  initialPrincipal?: number;
  initialRoi?: number;
  customerName?: string;
}

export default function EMICalculator({
  initialPrincipal = 1500000,
  initialRoi = 8.5,
  customerName
}: EMICalculatorProps) {
  const [principal, setPrincipal] = React.useState<number>(initialPrincipal || 1500000);
  const [roi, setRoi] = React.useState<number>(initialRoi || 8.5);
  const [tenure, setTenure] = React.useState<number>(15); // Default 15 years
  const [viewMode, setViewMode] = React.useState<"chart" | "table">("chart");
  const [timeScale, setTimeScale] = React.useState<"monthly" | "yearly">("monthly");

  // Sync state if props change
  React.useEffect(() => {
    if (initialPrincipal) setPrincipal(initialPrincipal);
  }, [initialPrincipal]);

  React.useEffect(() => {
    if (initialRoi) setRoi(initialRoi);
  }, [initialRoi]);

  // EMI Calculations
  const calculateEMIValues = React.useMemo(() => {
    const P = principal;
    const r = roi / 12 / 100;
    const n = tenure * 12;

    let emi = 0;
    if (r === 0) {
      emi = P / n;
    } else {
      emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const totalPayable = emi * n;
    const totalInterest = totalPayable - P;

    // Generate schedule
    const monthlySchedule = [];
    let remainingBalance = P;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;

    for (let m = 1; m <= n; m++) {
      const interestPayment = remainingBalance * r;
      const principalPayment = Math.min(emi - interestPayment, remainingBalance);
      remainingBalance = Math.max(remainingBalance - principalPayment, 0);

      cumulativeInterest += interestPayment;
      cumulativePrincipal += principalPayment;

      monthlySchedule.push({
        month: m,
        year: Math.ceil(m / 12),
        payment: emi,
        interest: interestPayment,
        principal: principalPayment,
        balance: remainingBalance,
        cumulativeInterest,
        cumulativePrincipal
      });
    }

    // Group by year for cleaner yearly chart
    const yearlySchedule = [];
    for (let y = 1; y <= tenure; y++) {
      const monthsInYear = monthlySchedule.filter((item) => item.year === y);
      const interestPaidInYear = monthsInYear.reduce((sum, item) => sum + item.interest, 0);
      const principalPaidInYear = monthsInYear.reduce((sum, item) => sum + item.principal, 0);
      const lastMonthOfYear = monthsInYear[monthsInYear.length - 1];

      yearlySchedule.push({
        year: y,
        interest: interestPaidInYear,
        principal: principalPaidInYear,
        balance: lastMonthOfYear.balance,
        cumulativeInterest: lastMonthOfYear.cumulativeInterest,
        cumulativePrincipal: lastMonthOfYear.cumulativePrincipal
      });
    }

    return {
      emi,
      totalPayable,
      totalInterest,
      monthlySchedule,
      yearlySchedule
    };
  }, [principal, roi, tenure]);

  const { emi, totalPayable, totalInterest, monthlySchedule, yearlySchedule } = calculateEMIValues;

  // Format currency in Indian Rupees
  const formatINR = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value);
  };

  // Donut chart data for Principal vs Interest
  const pieData = [
    { name: "Principal Amount", value: principal, color: "#10b981" }, // Emerald
    { name: "Interest Amount", value: totalInterest, color: "#f59e0b" } // Amber
  ];

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden p-6 space-y-6 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#30363d] pb-4 gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#f0a500]" />
            EMI Repayment & Loan Amortization Tool
          </h3>
          <p className="text-xs text-[#8b949e] mt-1">
            {customerName ? `Estimating repayment scenarios for ${customerName}` : "Calculate monthly EMI and view full payment schedules"}
          </p>
        </div>
        <div className="flex bg-[#0d1117] border border-[#30363d] p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode("chart")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === "chart" ? "bg-[#30363d] text-[#e6edf3]" : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            Visual Chart
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === "table" ? "bg-[#30363d] text-[#e6edf3]" : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            Amortization Table
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Panel */}
        <div className="lg:col-span-5 space-y-5">
          {/* Principal Amount slider & input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#8b949e] flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#f0a500]" />
                Principal Amount (P)
              </span>
              <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-0.5">
                <span className="text-[#8b949e] text-xs font-bold mr-1">₹</span>
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                  className="w-24 bg-transparent outline-none text-[#e6edf3] font-mono text-xs font-bold text-right"
                />
              </div>
            </div>
            <input
              type="range"
              min="50000"
              max="15000000"
              step="50000"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full accent-[#f0a500] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#8b949e] font-mono">
              <span>₹50K</span>
              <span>₹50L</span>
              <span>₹1.5Cr</span>
            </div>
          </div>

          {/* Interest Rate slider & input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#8b949e] flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#f0a500]" />
                Rate of Interest (R)
              </span>
              <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-0.5">
                <input
                  type="number"
                  step="0.05"
                  value={roi}
                  onChange={(e) => setRoi(Math.max(0.1, Number(e.target.value)))}
                  className="w-16 bg-transparent outline-none text-[#e6edf3] font-mono text-xs font-bold text-right"
                />
                <span className="text-[#8b949e] text-xs font-bold ml-1">%</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="0.05"
              value={roi}
              onChange={(e) => setRoi(Number(e.target.value))}
              className="w-full accent-[#f0a500] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#8b949e] font-mono">
              <span>1% p.a.</span>
              <span>10%</span>
              <span>20% p.a.</span>
            </div>
          </div>

          {/* Tenure slider & input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#8b949e] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#f0a500]" />
                Tenure (N)
              </span>
              <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-0.5">
                <input
                  type="number"
                  value={tenure}
                  onChange={(e) => setTenure(Math.max(1, Number(e.target.value)))}
                  className="w-12 bg-transparent outline-none text-[#e6edf3] font-mono text-xs font-bold text-right"
                />
                <span className="text-[#8b949e] text-xs font-bold ml-1">Yrs</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              className="w-full accent-[#f0a500] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#8b949e] font-mono">
              <span>1 Year</span>
              <span>15 Years</span>
              <span>30 Years</span>
            </div>
          </div>

          {/* Summary results ribbon */}
          <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl space-y-3.5">
            <div>
              <span className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider block">Estimated Monthly EMI</span>
              <span className="text-xl font-bold font-mono text-[#f0a500] mt-0.5 block">
                {formatINR(emi)}<span className="text-xs text-[#8b949e] font-normal font-sans"> / month</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#30363d]">
              <div>
                <span className="text-[9px] text-[#8b949e] uppercase font-mono block">Interest Payable</span>
                <span className="text-xs font-bold font-mono text-[#f59e0b] mt-0.5 block">
                  {formatINR(totalInterest)}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[#8b949e] uppercase font-mono block">Total Amount</span>
                <span className="text-xs font-bold font-mono text-[#10b981] mt-0.5 block">
                  {formatINR(totalPayable)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual View (Amortization Chart + Pie Chart) */}
        <div className="lg:col-span-7 flex flex-col justify-between min-h-[350px]">
          {viewMode === "chart" ? (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Amortization Over Tenure
                </span>
                <div className="flex bg-[#0d1117] border border-[#30363d] p-0.5 rounded-lg text-[10px]">
                  <button
                    onClick={() => setTimeScale("monthly")}
                    className={`px-2 py-0.5 font-semibold rounded transition-all ${
                      timeScale === "monthly" ? "bg-[#30363d] text-[#e6edf3]" : "text-[#8b949e] hover:text-[#e6edf3]"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setTimeScale("yearly")}
                    className={`px-2 py-0.5 font-semibold rounded transition-all ${
                      timeScale === "yearly" ? "bg-[#30363d] text-[#e6edf3]" : "text-[#8b949e] hover:text-[#e6edf3]"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-64 w-full flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timeScale === "monthly" ? monthlySchedule : yearlySchedule}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPrinc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
                    <XAxis
                      dataKey={timeScale === "monthly" ? "month" : "year"}
                      stroke="#8b949e"
                      fontSize={10}
                      tickLine={false}
                      label={{
                        value: timeScale === "monthly" ? "Month Number" : "Year Number",
                        position: "insideBottom",
                        offset: -5,
                        style: { fill: "#8b949e", fontSize: 10 }
                      }}
                    />
                    <YAxis
                      stroke="#8b949e"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161b22",
                        borderColor: "#30363d",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#e6edf3"
                      }}
                      formatter={(value: any, name: string) => {
                        const labels: { [key: string]: string } = {
                          balance: "Outstanding Balance",
                          cumulativePrincipal: "Total Principal Paid",
                          cumulativeInterest: "Total Interest Paid"
                        };
                        return [formatINR(Number(value)), labels[name] || name];
                      }}
                      labelFormatter={(label) => `${timeScale === "monthly" ? "Month" : "Year"} ${label}`}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconSize={10}
                      wrapperStyle={{ fontSize: "10px" }}
                    />
                    <Area
                      type="monotone"
                      name="balance"
                      dataKey="balance"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorBal)"
                    />
                    <Area
                      type="monotone"
                      name="cumulativePrincipal"
                      dataKey="cumulativePrincipal"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPrinc)"
                    />
                    <Area
                      type="monotone"
                      name="cumulativeInterest"
                      dataKey="cumulativeInterest"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorInt)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Composition Breakdown Legend */}
              <div className="flex flex-col sm:flex-row items-center justify-around bg-[#0d1117] p-3 border border-[#30363d] rounded-xl gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-[10px] text-emerald-400">
                    {((principal / totalPayable) * 100).toFixed(0)}%
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-[#8b949e] uppercase block font-semibold">Principal</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{formatINR(principal)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-[10px] text-amber-400">
                    {((totalInterest / totalPayable) * 100).toFixed(0)}%
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-[#8b949e] uppercase block font-semibold">Interest Paid</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">{formatINR(totalInterest)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Table Amortization View */
            <div className="flex-1 flex flex-col min-h-0 max-h-[350px]">
              <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-2 flex items-center gap-1">
                <Table className="w-3.5 h-3.5" />
                Amortization Amortization Schedule (Grouped by Year)
              </span>
              <div className="overflow-y-auto border border-[#30363d] rounded-xl flex-1 bg-[#0d1117]/60 no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#161b22] text-[#8b949e] uppercase text-[9px] font-bold tracking-wider border-b border-[#30363d] sticky top-0">
                    <tr>
                      <th className="p-3 text-center">Year</th>
                      <th className="p-3">Principal Paid</th>
                      <th className="p-3">Interest Paid</th>
                      <th className="p-3 text-right">Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d] font-mono text-[11px]">
                    {yearlySchedule.map((row) => (
                      <tr key={row.year} className="hover:bg-[#161b22]/30 transition-all">
                        <td className="p-3 text-center text-[#f0a500] font-bold">{row.year}</td>
                        <td className="p-3 text-emerald-400">{formatINR(row.principal)}</td>
                        <td className="p-3 text-amber-400">{formatINR(row.interest)}</td>
                        <td className="p-3 text-right text-[#e6edf3]">{formatINR(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
