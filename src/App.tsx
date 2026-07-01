/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Search, SlidersHorizontal, Info, User, HelpCircle, ChevronRight, RefreshCw, X, ArrowLeft, Filter } from "lucide-react";
import { CUSTOMERS as RAW_CUSTOMERS } from "./data";
import { Customer } from "./types";
import Header from "./components/Header";
import MetricsOverview from "./components/MetricsOverview";
import CustomerDetail from "./components/CustomerDetail";
import WorklistManager from "./components/WorklistManager";
import AIAnalyst from "./components/AIAnalyst";
import DataImporter from "./components/DataImporter";
import { FileSpreadsheet, Users, Cpu } from "lucide-react";

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

  // Mobile-specific state
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

  const hasActiveFilters = statusFilter !== "all" || yearFilter !== "all" || occFilter !== "all" || searchVal !== "" || loanSearchVal !== "";

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#e6edf3] font-sans select-none overflow-hidden">
      {/* Top Banner Navigation — hidden on mobile, replaced by bottom nav */}
      <div className="hidden md:block">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          worklistCount={worklistPendingCount}
          customerCount={customers.length}
          totalDisbursed={customers.reduce((sum, c) => sum + c.total_disbursed, 0)}
        />
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#161b22] border-b border-[#30363d] px-4 py-3 flex items-center justify-between safe-top flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f0a500] rounded-lg flex items-center justify-center font-bold text-sm text-black">
            LU
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#e6edf3] leading-tight">Sanjay Kumar Pandey</h1>
            <p className="text-[10px] text-[#8b949e]">Gorakhpur Office</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImporter(!showImporter)}
            className={`p-2 rounded-lg border transition-all ${
              showImporter
                ? "bg-[#f0a500]/10 border-[#f0a500] text-[#f0a500]"
                : "border-[#30363d] text-[#8b949e]"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Router Switch */}
      {activeTab === "customers" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Metrics Overview Grid Ribbon */}
          <MetricsOverview customers={filteredCustomers} />

          {/* Directory Toolbar Search & Filters */}
          <div className="bg-[#161b22] border-y border-[#30363d] px-4 md:px-6 py-3 md:py-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 md:gap-4 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              {/* Search Name */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                <input
                  type="text"
                  placeholder="Search name..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] rounded-lg pl-9 pr-4 py-2.5 md:py-1.5 text-sm md:text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none transition-all"
                />
              </div>

              {/* Mobile: Filter toggle button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`md:hidden p-2.5 rounded-lg border transition-all relative ${
                  hasActiveFilters
                    ? "bg-[#f0a500]/10 border-[#f0a500] text-[#f0a500]"
                    : "border-[#30363d] text-[#8b949e]"
                }`}
              >
                <Filter className="w-4 h-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f0a500] rounded-full" />
                )}
              </button>

              {/* Desktop: Inline filters */}
              <div className="hidden md:flex items-center gap-2">
                {/* Search Loan Account */}
                <div className="relative w-48">
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
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter("full")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                      statusFilter === "full"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
                    }`}
                  >
                    Disbursed
                  </button>
                  <button
                    onClick={() => setStatusFilter("progress")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                      statusFilter === "progress"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
                    }`}
                  >
                    Progress
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
            </div>

            {/* Dropdown selects — Desktop only */}
            <div className="hidden md:flex items-center gap-3 self-end xl:self-auto flex-shrink-0">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-all"
              >
                <option value="all">All Years</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={occFilter}
                onChange={(e) => setOccFilter(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-all"
              >
                <option value="all">All Occupations</option>
                {uniqueOccupations.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>

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

              <button
                onClick={handleResetFilters}
                title="Clear all filters"
                className="p-1.5 bg-[#0d1117] hover:bg-[#30363d] border border-[#30363d] hover:border-[#8b949e] rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Filter Drawer */}
          {showFilters && (
            <>
              <div className="filter-backdrop md:hidden" onClick={() => setShowFilters(false)} />
              <div className="filter-drawer md:hidden">
                <div className="drag-handle" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#e6edf3]">Filters</h3>
                    <button
                      onClick={() => { handleResetFilters(); setShowFilters(false); }}
                      className="text-xs text-[#f0a500] font-semibold"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Loan search */}
                  <div>
                    <label className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider block mb-1.5">Loan / App No</label>
                    <input
                      type="text"
                      placeholder="Search loan number..."
                      value={loanSearchVal}
                      onChange={(e) => setLoanSearchVal(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#f0a500] rounded-lg px-3 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider block mb-1.5">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "all" as const, label: "All", cls: "border-[#f0a500] text-[#f0a500] bg-[#f0a500]/10" },
                        { key: "full" as const, label: "Fully Disbursed", cls: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
                        { key: "progress" as const, label: "In Progress", cls: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
                        { key: "stalled" as const, label: "Stalled", cls: "border-rose-500/30 text-rose-400 bg-rose-500/10" },
                      ].map(({ key, label, cls }) => (
                        <button
                          key={key}
                          onClick={() => setStatusFilter(key)}
                          className={`py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                            statusFilter === key ? cls : "bg-[#0d1117] border-[#30363d] text-[#8b949e]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider block mb-1.5">Sanction Year</label>
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] rounded-lg px-3 py-2.5 outline-none"
                    >
                      <option value="all">All Years</option>
                      {uniqueYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Occupation */}
                  <div>
                    <label className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider block mb-1.5">Occupation</label>
                    <select
                      value={occFilter}
                      onChange={(e) => setOccFilter(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] rounded-lg px-3 py-2.5 outline-none"
                    >
                      <option value="all">All Occupations</option>
                      {uniqueOccupations.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full py-3 bg-[#f0a500] text-black font-bold rounded-lg text-sm"
                  >
                    Apply Filters ({filteredCustomers.length} results)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Conditional Bulk Data Importer Draw-Down Panel */}
          {showImporter && (
            <div className="px-4 md:px-6 py-4 bg-[#0d1117] border-b border-[#30363d] flex-shrink-0 max-h-[500px] overflow-y-auto no-scrollbar">
              <DataImporter
                onImport={(newCustomers, mode) => {
                  if (mode === "replace") {
                    setCustomers(newCustomers);
                    localStorage.setItem("gcp_imported_customers", JSON.stringify(newCustomers));
                  } else {
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
            {/* Sidebar customer directory — full width on mobile */}
            <aside className={`w-full md:w-80 flex-shrink-0 border-r border-[#30363d] bg-[#161b22]/30 flex flex-col min-h-0 relative h-full ${activeCustomerName ? 'hidden md:flex' : 'flex'}`}>
              <div className="px-4 py-2.5 md:py-2 border-b border-[#30363d] bg-[#161b22]/60 flex items-center justify-between text-[11px] font-bold text-[#8b949e] font-mono uppercase tracking-wider flex-shrink-0">
                <span>Customer Index</span>
                <span>{filteredCustomers.length} of {customers.length}</span>
              </div>
              <ul className="flex-1 overflow-y-auto divide-y divide-[#30363d] no-scrollbar pb-20 md:pb-0">
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
                        className={`p-4 md:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-all active:bg-[#21262d] ${
                          isActive
                            ? "bg-[#21262d] border-l-4 border-[#f0a500] pl-3"
                            : "hover:bg-[#161b22]/60 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-sm md:text-xs font-bold text-[#e6edf3] truncate">
                            {c.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] md:text-[10px] text-[#8b949e]">
                            <span className={`w-2 h-2 md:w-1.5 md:h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(c.status)}`} />
                            <span className="truncate">{c.occupation}</span>
                            <span>&middot;</span>
                            <span>{c.loans.length} loan{c.loans.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-sm md:text-xs font-bold text-[#e6edf3]">
                            ₹{(c.total_sanctioned / 100000).toFixed(0)}L
                          </div>
                          <div className="text-[10px] md:text-[9px] text-[#8b949e] uppercase font-mono mt-0.5">sanction</div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-[#8b949e] flex-shrink-0" />
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>

            {/* Profile detail main workspace — Desktop: inline, Mobile: slide-over overlay */}
            {/* Desktop view */}
            <main className="hidden md:block flex-1 h-full min-h-0 bg-[#0d1117] relative">
              <CustomerDetail customer={activeCustomer} />
            </main>

            {/* Mobile: Full-screen slide-over */}
            {activeCustomerName && (
              <div className="md:hidden mobile-detail-overlay pb-20">
                {/* Mobile back button */}
                <div className="sticky top-0 z-50 bg-[#161b22] border-b border-[#30363d] px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => setActiveCustomerName(null)}
                    className="p-2 -ml-2 rounded-lg text-[#8b949e] active:bg-[#30363d] transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-[#e6edf3] truncate">{activeCustomer?.name}</h2>
                    <p className="text-[10px] text-[#8b949e]">{activeCustomer?.occupation} · {activeCustomer?.loans.length} loans</p>
                  </div>
                </div>
                <CustomerDetail customer={activeCustomer} />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "worklist" && (
        <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
          <WorklistManager
            customers={customers}
            onSelectCustomer={setActiveCustomerName}
            setActiveTab={setActiveTab}
          />
        </div>
      )}

      {activeTab === "ai" && (
        <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
          <AIAnalyst customers={customers} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav md:hidden">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => { setActiveTab("customers"); setActiveCustomerName(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition-all ${
              activeTab === "customers" ? "text-[#f0a500]" : "text-[#8b949e]"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Customers</span>
          </button>
          <button
            onClick={() => setActiveTab("worklist")}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition-all relative ${
              activeTab === "worklist" ? "text-[#f0a500]" : "text-[#8b949e]"
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Worklist</span>
            {worklistPendingCount > 0 && (
              <span className="absolute -top-0.5 right-2 px-1.5 py-0.5 bg-[#f85149] text-white text-[8px] font-bold font-mono rounded-full min-w-[16px] text-center">
                {worklistPendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition-all ${
              activeTab === "ai" ? "text-[#f0a500]" : "text-[#8b949e]"
            }`}
          >
            <Cpu className="w-5 h-5" />
            <span className="text-[10px] font-semibold">AI Audit</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
