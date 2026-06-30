/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Search, SlidersHorizontal, Info, User, HelpCircle, ChevronRight, RefreshCw, X } from "lucide-react";
import { CUSTOMERS as RAW_CUSTOMERS } from "./data";
import { Customer } from "./types";
import Header from "./components/Header";
import MetricsOverview from "./components/MetricsOverview";
import CustomerDetail from "./components/CustomerDetail";
import WorklistManager from "./components/WorklistManager";
import AIAnalyst from "./components/AIAnalyst";
import DataImporter from "./components/DataImporter";
import { FileSpreadsheet } from "lucide-react";

// Augment CUSTOMERS with realistic Gorakhpur localities for complete searchable profile records
const GORAKHPUR_LOCALITIES = [
  "Golghar, Gorakhpur, Uttar Pradesh - 273001",
  "Civil Lines, Gorakhpur, Uttar Pradesh - 273001",
  "Awas Vikas Colony, Surajkund, Gorakhpur, Uttar Pradesh - 273015",
  "Shahpur, Gorakhpur, Uttar Pradesh - 273004",
  "Buxipur, Gorakhpur, Uttar Pradesh - 273005",
  "Taramandal, Gorakhpur, Uttar Pradesh - 273010",
  "Medical College Road, Gorakhpur, Uttar Pradesh - 273013",
  "Rustampur, Gorakhpur, Uttar Pradesh - 273016",
  "Betiahata, Gorakhpur, Uttar Pradesh - 273001",
  "Kargil Puram, Gorakhpur, Uttar Pradesh - 273014"
];

const INITIAL_CUSTOMERS: Customer[] = RAW_CUSTOMERS.map((c, i) => ({
  ...c,
  address: GORAKHPUR_LOCALITIES[i % GORAKHPUR_LOCALITIES.length]
}));

export default function App() {
  const [customers, setCustomers] = React.useState<Customer[]>(() => {
    const saved = localStorage.getItem("gcp_imported_customers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved customers:", e);
      }
    }
    return INITIAL_CUSTOMERS;
  });

  const [showImporter, setShowImporter] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<"customers" | "worklist" | "ai">("customers");
  
  // Real-time input states for zero-latency typing feel
  const [searchVal, setSearchVal] = React.useState<string>("");
  const [loanSearchVal, setLoanSearchVal] = React.useState<string>("");
  
  // Debounced query states used for heavy filter queries
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [loanSearchQuery, setLoanSearchQuery] = React.useState<string>("");

  const [statusFilter, setStatusFilter] = React.useState<"all" | "full" | "progress" | "stalled">("all");
  const [yearFilter, setYearFilter] = React.useState<string>("all");
  const [occFilter, setOccFilter] = React.useState<string>("all");
  const [activeCustomerName, setActiveCustomerName] = React.useState<string | null>(null);

  // Debouncing Effect: runs 300ms after user stops typing
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setLoanSearchQuery(loanSearchVal);
    }, 300);
    return () => clearTimeout(handler);
  }, [loanSearchVal]);

  // Load active notes count for the worklist indicator
  const [worklistPendingCount, setWorklistCount] = React.useState<number>(0);

  // Compute worklist count on load & whenever customer lists change
  React.useEffect(() => {
    let count = 0;
    customers.forEach((c) => {
      c.loans.forEach((l) => {
        if (l.status !== "Fully Disbursed" && l.pending > 0) {
          count++;
        }
      });
    });
    setWorklistCount(count);
  }, [customers]);

  // Filter Categories
  const uniqueYears = React.useMemo(() => {
    const yearsSet = new Set<string>();
    customers.forEach((c) => {
      c.loans.forEach((l) => {
        if (l.year) yearsSet.add(String(l.year));
      });
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [customers]);

  const uniqueOccupations = React.useMemo(() => {
    const occSet = new Set<string>();
    customers.forEach((c) => {
      if (c.occupation) occSet.add(c.occupation);
    });
    return Array.from(occSet).sort();
  }, [customers]);

  // Filter and Search logic
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      // 1. Text Search query (Name, Occupation, Address)
      const query = searchQuery.toLowerCase().trim();
      const textMatch =
        query === "" ||
        c.name.toLowerCase().includes(query) ||
        c.occupation.toLowerCase().includes(query) ||
        (c.address && c.address.toLowerCase().includes(query));

      // 2. Loan / App No query
      const loanQuery = loanSearchQuery.trim();
      const loanMatch =
        loanQuery === "" ||
        c.loans.some(
          (l) =>
            l.loan_no.toLowerCase().includes(loanQuery.toLowerCase()) ||
            l.app_no.toLowerCase().includes(loanQuery.toLowerCase())
        );

      // 3. Status filter
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "full" && c.status === "Fully Disbursed") ||
        (statusFilter === "progress" && c.status === "In Progress / Mixed") ||
        (statusFilter === "stalled" && c.status === "Stalled / Zero Payout");

      // 4. Year filter
      const yearMatch =
        yearFilter === "all" ||
        c.loans.some((l) => String(l.year) === yearFilter);

      // 5. Occupation filter
      const occMatch = occFilter === "all" || c.occupation === occFilter;

      return textMatch && loanMatch && statusMatch && yearMatch && occMatch;
    });
  }, [customers, searchQuery, loanSearchQuery, statusFilter, yearFilter, occFilter]);

  // Find active customer object
  const activeCustomer = React.useMemo(() => {
    if (!activeCustomerName) return null;
    return customers.find((c) => c.name === activeCustomerName) || null;
  }, [activeCustomerName, customers]);

  const handleResetFilters = () => {
    setSearchVal("");
    setLoanSearchVal("");
    setSearchQuery("");
    setLoanSearchQuery("");
    setStatusFilter("all");
    setYearFilter("all");
    setOccFilter("all");
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case "Fully Disbursed":
        return "bg-emerald-500";
      case "Partially Disbursed":
      case "In Progress":
      case "In Progress / Mixed":
        return "bg-amber-500";
      default:
        return "bg-rose-500";
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#e6edf3] font-sans select-none overflow-hidden">
      {/* Top Banner Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        worklistCount={worklistPendingCount}
        customerCount={customers.length}
        totalDisbursed={customers.reduce((sum, c) => sum + c.total_disbursed, 0)}
      />

      {/* Main Tab Router Switch */}
      {activeTab === "customers" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Metrics Overview Grid Ribbon */}
          <MetricsOverview customers={filteredCustomers} />

          {/* Directory Toolbar Search & Filters */}
          <div className="bg-[#161b22] border-y border-[#30363d] px-6 py-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 flex-shrink-0 shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
              {/* Search Name */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                <input
                  type="text"
                  placeholder="Search by name, address, occupation..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none transition-all"
                />
              </div>

              {/* Search Loan Account */}
              <div className="relative w-full md:w-60">
                <input
                  type="text"
                  placeholder="App / Loan number..."
                  value={loanSearchVal}
                  onChange={(e) => setLoanSearchVal(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none transition-all"
                />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    statusFilter === "all"
                      ? "bg-[#f0a500]/10 border-[#f0a500] text-[#f0a500]"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  All Statuses
                </button>
                <button
                  onClick={() => setStatusFilter("full")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    statusFilter === "full"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  Fully Disbursed
                </button>
                <button
                  onClick={() => setStatusFilter("progress")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    statusFilter === "progress"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setStatusFilter("stalled")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    statusFilter === "stalled"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  Stalled
                </button>
              </div>
            </div>

            {/* Dropdown selects */}
            <div className="flex items-center gap-3 self-end xl:self-auto flex-shrink-0">
              {/* Year Select */}
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-all"
              >
                <option value="all">All Sanction Years</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Occupation Select */}
              <select
                value={occFilter}
                onChange={(e) => setOccFilter(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-all"
              >
                <option value="all">All Occupations</option>
                {uniqueOccupations.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>

              {/* Bulk Excel/CSV Import Toggle */}
              <button
                onClick={() => setShowImporter(!showImporter)}
                className={`p-1.5 flex items-center gap-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  showImporter
                    ? "bg-[#f0a500]/10 border-[#f0a500] text-[#f0a500]"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
                }`}
                title="Bulk Import Customers CSV/Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Bulk Import</span>
              </button>

              {/* Reset Filter Button */}
              <button
                onClick={handleResetFilters}
                title="Clear all filters"
                className="p-1.5 bg-[#0d1117] hover:bg-[#30363d] border border-[#30363d] hover:border-[#8b949e] rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conditional Bulk Data Importer Draw-Down Panel */}
          {showImporter && (
            <div className="px-6 py-4 bg-[#0d1117] border-b border-[#30363d] flex-shrink-0 max-h-[500px] overflow-y-auto no-scrollbar">
              <DataImporter
                onImport={(newCustomers, mode) => {
                  if (mode === "replace") {
                    setCustomers(newCustomers);
                    localStorage.setItem("gcp_imported_customers", JSON.stringify(newCustomers));
                  } else {
                    // Append mode: Merge and preserve matching Customer name profiles
                    const merged = [...customers];
                    newCustomers.forEach((nc) => {
                      const idx = merged.findIndex((c) => c.name.toLowerCase() === nc.name.toLowerCase());
                      if (idx !== -1) {
                        const existing = merged[idx];
                        const updatedLoans = [...existing.loans];
                        nc.loans.forEach((nl) => {
                          if (!updatedLoans.some((l) => l.loan_no === nl.loan_no)) {
                            updatedLoans.push(nl);
                          }
                        });
                        merged[idx] = {
                          ...existing,
                          loans: updatedLoans,
                          loan_count: updatedLoans.length,
                          total_sanctioned: existing.total_sanctioned + nc.total_sanctioned,
                          total_disbursed: existing.total_disbursed + nc.total_disbursed,
                          total_pending: existing.total_pending + nc.total_pending,
                          total_tranches: existing.total_tranches + nc.total_tranches,
                        };
                      } else {
                        merged.push(nc);
                      }
                    });
                    setCustomers(merged);
                    localStorage.setItem("gcp_imported_customers", JSON.stringify(merged));
                  }
                  setShowImporter(false);
                }}
                onReset={() => {
                  setCustomers(INITIAL_CUSTOMERS);
                  localStorage.removeItem("gcp_imported_customers");
                  setShowImporter(false);
                }}
                currentCount={customers.length}
              />
            </div>
          )}

          {/* Directory Split Screen Layout */}
          <div className="flex flex-1 min-h-0 bg-[#0d1117] relative">
            {/* Sidebar customer directory */}
            <aside className="w-full md:w-80 flex-shrink-0 border-r border-[#30363d] bg-[#161b22]/30 flex flex-col min-h-0 relative h-full">
              <div className="px-4 py-2 border-b border-[#30363d] bg-[#161b22]/60 flex items-center justify-between text-[11px] font-bold text-[#8b949e] font-mono uppercase tracking-wider flex-shrink-0">
                <span>Customer Index</span>
                <span>{filteredCustomers.length} of {customers.length} loaded</span>
              </div>
              <ul className="flex-1 overflow-y-auto divide-y divide-[#30363d] no-scrollbar">
                {filteredCustomers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8b949e] space-y-2">
                    <p>No customer matches those filter criteria.</p>
                    <button
                      onClick={handleResetFilters}
                      className="text-[#f0a500] underline font-medium hover:text-[#f0a500]/80"
                    >
                      Clear search filters
                    </button>
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isActive = activeCustomerName === c.name;
                    return (
                      <li
                        key={c.name}
                        onClick={() => setActiveCustomerName(c.name)}
                        className={`p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                          isActive
                            ? "bg-[#21262d] border-l-4 border-[#f0a500] pl-3"
                            : "hover:bg-[#161b22]/60 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-[#e6edf3] truncate group-hover:text-[#f0a500]">
                            {c.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#8b949e]">
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(c.status)}`} />
                            <span className="truncate">{c.occupation}</span>
                            <span>&middot;</span>
                            <span className="truncate max-w-[80px]" title={c.address}>{c.address?.split(',')[0]}</span>
                            <span>&middot;</span>
                            <span>{c.loans.length} loan{c.loans.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-xs font-bold text-[#e6edf3]">
                            ₹{(c.total_sanctioned / 100000).toFixed(0)}L
                          </div>
                          <div className="text-[9px] text-[#8b949e] uppercase font-mono mt-0.5">sanction</div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-[#8b949e]" />
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>

            {/* Profile detail main workspace */}
            <main className="flex-1 h-full min-h-0 bg-[#0d1117] relative">
              <CustomerDetail customer={activeCustomer} />
            </main>
          </div>
        </div>
      )}

      {activeTab === "worklist" && (
        <WorklistManager
          customers={customers}
          onSelectCustomer={setActiveCustomerName}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "ai" && <AIAnalyst customers={customers} />}
    </div>
  );
}
