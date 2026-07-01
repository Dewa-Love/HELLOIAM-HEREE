/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Trash2,
  HelpCircle,
  Sliders,
  Link,
  Loader2,
  SheetIcon
} from "lucide-react";
import { Customer, Loan } from "../types";

interface DataImporterProps {
  onImport: (newCustomers: Customer[], mergeMode: "append" | "replace") => void;
  onReset: () => void;
  currentCount: number;
}

// Default columns we expect — matches the loan portfolio data schema
const FIELD_DEFINITIONS = [
  { key: "customer_name", label: "Customer Name", required: true, aliases: ["customer name", "name", "borrower", "client", "customer"] },
  { key: "occupation", label: "Occupation", required: false, aliases: ["occupation", "job", "profession", "work"] },
  { key: "regional_office", label: "Regional Office", required: false, aliases: ["regional office", "region", "ro"] },
  { key: "back_office", label: "Back Office", required: false, aliases: ["back office", "bo", "cluster"] },
  { key: "area_office", label: "Area Office", required: false, aliases: ["area office", "ao", "branch"] },
  { key: "agent_name", label: "Agent Name", required: false, aliases: ["agent name", "agent", "dsa name", "connector"] },
  { key: "agent_code", label: "Agent Code", required: false, aliases: ["agent code", "dsa code", "connector code"] },
  { key: "customer_status", label: "Customer Status", required: false, aliases: ["customer status", "overall status", "cust status"] },
  { key: "loan_no", label: "Loan No", required: true, aliases: ["loan no", "loan number", "loan_no", "loan #"] },
  { key: "app_no", label: "App No", required: false, aliases: ["app no", "app number", "application number", "application no"] },
  { key: "sanction_date", label: "Sanction Date", required: false, aliases: ["sanction date", "sanctioned date", "sanction dt"] },
  { key: "loan_status", label: "Loan Status", required: false, aliases: ["loan status", "status", "state"] },
  { key: "scheme", label: "Scheme", required: false, aliases: ["scheme", "loan scheme", "product", "product name"] },
  { key: "purpose", label: "Purpose", required: false, aliases: ["purpose", "loan purpose", "use"] },
  { key: "net_sanction_amt", label: "Net Sanction Amt", required: true, aliases: ["net sanction amt", "sanction amount", "sanctioned amount", "sanction amt", "total sanctioned"] },
  { key: "roi", label: "ROI %", required: false, aliases: ["roi %", "roi", "interest rate", "rate", "interest"] },
  { key: "interest_type", label: "Interest Type", required: false, aliases: ["interest type", "int type", "rate type"] },
  { key: "loan_total_disbursed", label: "Loan Total Disbursed", required: false, aliases: ["loan total disbursed", "total disbursed", "disbursed amount", "disbursed"] },
  { key: "loan_pending", label: "Loan Pending", required: false, aliases: ["loan pending", "pending", "total pending", "pending amount"] },
  { key: "disb_date", label: "Disb Date", required: false, aliases: ["disb date", "disbursement date", "payout date"] },
  { key: "disb_type", label: "Disb Type", required: false, aliases: ["disb type", "disbursement type", "payout type"] },
  { key: "disb_amt", label: "Disb Amt", required: false, aliases: ["disb amt", "disbursement amount", "payout amount"] },
  { key: "cancelled_amt", label: "Cancelled Amt", required: false, aliases: ["cancelled amt", "cancelled amount", "cancel amt"] },
  { key: "net_disb_amt", label: "Net Disb Amt", required: false, aliases: ["net disb amt", "net disbursement", "net payout"] },
  { key: "payment_type", label: "Payment Type", required: false, aliases: ["payment type", "pay type", "mode of payment"] },
  { key: "cheque_no", label: "Cheque No", required: false, aliases: ["cheque no", "cheque number", "chq no"] },
  { key: "beneficiary", label: "Beneficiary", required: false, aliases: ["beneficiary", "beneficiary name", "payee"] },
  { key: "beneficiary_ac", label: "Beneficiary A/C", required: false, aliases: ["beneficiary a/c", "beneficiary ac", "account", "a/c no"] },
  { key: "txn_ref", label: "Txn Ref", required: false, aliases: ["txn ref", "transaction ref", "txn reference", "utr"] },
  { key: "realization", label: "Realization", required: false, aliases: ["realization", "realisation", "realized"] },
  { key: "mandate_status", label: "Mandate Status", required: false, aliases: ["mandate status", "mandate", "nach status"] },
  { key: "collateral_id", label: "Collateral ID", required: false, aliases: ["collateral id", "collateral", "security id"] },
];

export default function DataImporter({ onImport, onReset, currentCount }: DataImporterProps) {
  const [activeTab, setActiveTab] = React.useState<"file" | "sheets">("file");
  const [dragActive, setDragActive] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fileDetails, setFileDetails] = React.useState<{ name: string; size: string } | null>(null);
  const [parsedRows, setParsedRows] = React.useState<any[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<{ [key: string]: string }>({});
  const [previewCustomers, setPreviewCustomers] = React.useState<Customer[]>([]);
  const [importMode, setImportMode] = React.useState<"append" | "replace">("append");
  const [showHelper, setShowHelper] = React.useState<boolean>(false);

  // Google Sheets state
  const [sheetsUrl, setSheetsUrl] = React.useState<string>("");
  const [sheetsRange, setSheetsRange] = React.useState<string>("Sheet 1");
  const [sheetsFetching, setSheetsFetching] = React.useState<boolean>(false);
  const [sheetsFetchSuccess, setSheetsFetchSuccess] = React.useState<string | null>(null);

  // Auto-detect mappings when headers are updated
  React.useEffect(() => {
    if (headers.length === 0) return;

    const newMapping: { [key: string]: string } = {};
    FIELD_DEFINITIONS.forEach((field) => {
      // Find a header that matches any of the aliases
      const matchedHeader = headers.find((h) => {
        const cleanedHeader = h.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
        return field.aliases.some((alias) => cleanedHeader === alias || cleanedHeader.includes(alias));
      });

      if (matchedHeader) {
        newMapping[field.key] = matchedHeader;
      } else {
        // Fallback to exact match check
        const exactMatch = headers.find((h) => h.toLowerCase().trim() === field.key.toLowerCase());
        if (exactMatch) {
          newMapping[field.key] = exactMatch;
        }
      }
    });

    setColumnMapping(newMapping);
  }, [headers]);

  // Regenerate customer objects whenever mapping changes
  React.useEffect(() => {
    if (parsedRows.length === 0) return;

    try {
      const groupedCustomers: { [name: string]: Customer } = {};

      parsedRows.forEach((row, rowIndex) => {
        // Extract fields based on current mapping
        const nameVal = String(row[columnMapping["name"]] || "").trim();
        if (!nameVal) return; // Skip rows without customer names

        const occupationVal = String(row[columnMapping["occupation"]] || "Business Owner").trim();
        const addressVal = String(row[columnMapping["address"]] || "Gorakhpur, Uttar Pradesh").trim();
        const loanNoVal = String(row[columnMapping["loan_no"]] || `LN-${1000 + rowIndex}`).trim();
        const schemeVal = String(row[columnMapping["scheme"]] || "General Business Loan").trim();
        const sanctionDateVal = String(row[columnMapping["sanction_date"]] || "2026-01-15").trim();
        const sanctionAmtVal = Math.max(0, parseFloat(String(row[columnMapping["net_sanction_amt"]] || "0").replace(/[^0-9.]/g, "")) || 0);
        const disbursedVal = Math.max(0, parseFloat(String(row[columnMapping["total_disbursed"]] || "0").replace(/[^0-9.]/g, "")) || 0);
        const roiVal = parseFloat(String(row[columnMapping["roi"]] || "8.5").replace(/[^0-9.]/g, "")) || 8.5;
        const purposeVal = String(row[columnMapping["purpose"]] || "Capital Expansion").trim();
        
        let statusVal = String(row[columnMapping["status"]] || "").trim();
        if (!statusVal) {
          if (disbursedVal === 0) {
            statusVal = "Stalled / Zero Payout";
          } else if (disbursedVal >= sanctionAmtVal) {
            statusVal = "Fully Disbursed";
          } else {
            statusVal = "Partially Disbursed";
          }
        }

        const pendingVal = Math.max(0, sanctionAmtVal - disbursedVal);

        // Build single Loan object
        const loanObj: Loan = {
          loan_no: loanNoVal,
          app_no: `AP-${loanNoVal.replace(/[^0-9]/g, "") || 10000 + rowIndex}`,
          year: parseInt(sanctionDateVal.split("-")[0]) || 2026,
          sanction_date: sanctionDateVal,
          status: statusVal,
          age_days: 15,
          loan_type: "Term Loan",
          gross_sanction_amt: sanctionAmtVal,
          canc_amt: 0,
          net_sanction_amt: sanctionAmtVal,
          roi: roiVal,
          disbursement_amt: disbursedVal,
          total_disbursed: disbursedVal,
          pending: pendingVal,
          agent_type: "Direct",
          scheme: schemeVal,
          purpose: purposeVal,
          roi_package: `ROI-${roiVal}%`,
          interest_type: "Reducing Balance",
          product_code: "PL-101",
          tranche_count: disbursedVal > 0 ? 1 : 0,
          has_txn_detail: disbursedVal > 0,
          any_unrealized: false,
          mandate_status: "Active",
          collateral_id: null,
          connector_name: null,
          disbursements: disbursedVal > 0 ? [
            {
              date: sanctionDateVal,
              disb_type: "First Tranche",
              disb_amt: disbursedVal,
              canc_amt: 0,
              net_disb_amt: disbursedVal,
              payment_type: "NEFT",
              cheque_no: null,
              beneficiary: nameVal,
              beneficiary_ac: null,
              txn_ref: `TXN-${loanNoVal}`,
              realization: "Realized",
              mandate_status: "Approved",
              connector_name: null,
              collateral_id: null
            }
          ] : []
        };

        if (groupedCustomers[nameVal]) {
          // Customer exists, add another loan
          groupedCustomers[nameVal].loans.push(loanObj);
          groupedCustomers[nameVal].loan_count = groupedCustomers[nameVal].loans.length;
          groupedCustomers[nameVal].total_sanctioned += sanctionAmtVal;
          groupedCustomers[nameVal].total_disbursed += disbursedVal;
          groupedCustomers[nameVal].total_pending += pendingVal;
          groupedCustomers[nameVal].total_tranches += loanObj.tranche_count;
        } else {
          // Initialize new Customer object
          groupedCustomers[nameVal] = {
            name: nameVal,
            occupation: occupationVal,
            address: addressVal,
            regional_office: "GORAKHPUR RO",
            back_office: "GORAKHPUR HO",
            area_office: "GKP OFFICE",
            agent_name: "Self / Direct",
            agent_code: "AG-DIR",
            loans: [loanObj],
            loan_count: 1,
            total_sanctioned: sanctionAmtVal,
            total_disbursed: disbursedVal,
            total_pending: pendingVal,
            total_tranches: loanObj.tranche_count,
            status: statusVal
          };
        }
      });

      // Update statuses based on aggregated loan values
      const customerArray = Object.values(groupedCustomers).map((cust) => {
        const hasStalled = cust.loans.some((l) => l.status === "Stalled / Zero Payout");
        const hasProgress = cust.loans.some((l) => l.status === "Partially Disbursed");
        
        let finalStatus = "Fully Disbursed";
        if (hasStalled) {
          finalStatus = "Stalled / Zero Payout";
        } else if (hasProgress || cust.total_pending > 0) {
          finalStatus = "Partially Disbursed";
        }

        return { ...cust, status: finalStatus };
      });

      setPreviewCustomers(customerArray);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(`Mapping failed: ${err.message || "Invalid header mapping"}`);
    }
  }, [parsedRows, columnMapping]);

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Main file processing routing
  const processFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    setFileDetails({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`
    });
    setError(null);

    const reader = new FileReader();

    if (extension === "csv") {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSVText(text);
      };
      reader.readAsText(file);
    } else if (extension === "xlsx" || extension === "xls") {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          
          if (json.length === 0) {
            setError("The Excel sheet is empty.");
            return;
          }

          // Extract unique keys
          const sheetHeaders = Object.keys(json[0] as object);
          setHeaders(sheetHeaders);
          setParsedRows(json);
        } catch (err: any) {
          setError(`Excel parsing error: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError("Unsupported file format. Please upload a .csv, .xlsx, or .xls file.");
    }
  };

  // Lightweight CSV Parser supporting double quotes & commas
  const parseCSVText = (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length === 0 || !lines[0].trim()) {
        setError("CSV file appears to be empty.");
        return;
      }

      // Parse headers
      const csvHeaders = parseCSVLine(lines[0]);
      const jsonRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const rowObject: any = {};
        
        csvHeaders.forEach((header, index) => {
          rowObject[header] = values[index] !== undefined ? values[index] : "";
        });

        jsonRows.push(rowObject);
      }

      setHeaders(csvHeaders);
      setParsedRows(jsonRows);
    } catch (err: any) {
      setError(`CSV parsing error: ${err.message}`);
    }
  };

  // Helper to correctly parse quoted CSV elements
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ""));
    return result;
  };

  // Trigger template downloads
  const handleDownloadTemplate = (type: "csv" | "xlsx") => {
    const sampleHeaders = FIELD_DEFINITIONS.map((f) => f.label);
    const sampleData = [
      ["Ramesh Prasad", "Agriculturalist", "Golghar, Gorakhpur - 273001", "GKP-9081", "Farm Mechanization Scheme", "2026-03-20", "2500000", "1800000", "9.2", "Partially Disbursed", "Purchasing John Deere Tractor"],
      ["Sita Kumari", "Micro Retailer", "Medical College Road, Gorakhpur", "GKP-4560", "Nari Shakti Loan Scheme", "2026-05-10", "350000", "350000", "8.5", "Fully Disbursed", "Kirana Store Stock Refill"],
      ["Vikram Singh", "Dairy Farmer", "Rustampur, Gorakhpur - 273016", "GKP-3321", "Milch Cattle Development", "2026-06-01", "800000", "0", "10.0", "Stalled / Zero Payout", "Constructing automated milking bay"]
    ];

    if (type === "csv") {
      const csvContent = [
        sampleHeaders.join(","),
        ...sampleData.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "gorakhpur_loan_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleData]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
      XLSX.writeFile(workbook, "gorakhpur_loan_template.xlsx");
    }
  };

  // Extract Sheet ID from a full Google Sheets URL or bare ID
  const extractSheetId = (input: string): string | null => {
    const trimmed = input.trim();
    // Match full URL: https://docs.google.com/spreadsheets/d/SHEET_ID/...
    const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    // Bare ID (no slashes)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
    return null;
  };

  const handleFetchSheets = async () => {
    setError(null);
    setSheetsFetchSuccess(null);
    const sheetId = extractSheetId(sheetsUrl);
    if (!sheetId) {
      setError("Invalid Google Sheets URL or ID. Please paste the full sharing URL or just the Sheet ID.");
      return;
    }

    setSheetsFetching(true);
    try {
      // Use Google's Visualization API endpoint to fetch public sheets as CSV directly from the browser
      // This bypasses the need for a backend server or API key, perfect for GitHub Pages!
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetsRange || "Sheet1")}`;
      
      const res = await fetch(csvUrl);
      
      if (!res.ok) {
        throw new Error(`Google Sheets returned HTTP ${res.status}. Ensure the sheet is set to 'Anyone with the link can view'.`);
      }

      const text = await res.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error("The sheet appears to be empty or does not exist.");
      }

      if (text.includes("<html")) {
         throw new Error("Google blocked the request. Please make sure the sheet is public ('Anyone with the link can view').");
      }

      // Clear any existing file data
      setFileDetails(null);
      
      // Parse the CSV text using our existing lightweight parser
      parseCSVText(text);
      
      setSheetsFetchSuccess(`✓ Loaded data successfully from Google Sheets`);
    } catch (err: any) {
      setError(err.message || "Failed to fetch from Google Sheets.");
    } finally {
      setSheetsFetching(false);
    }
  };

  const executeImport = () => {
    if (previewCustomers.length === 0) {
      setError("No valid customer records could be processed.");
      return;
    }
    onImport(previewCustomers, importMode);
    
    // Clear state
    setFileDetails(null);
    setParsedRows([]);
    setHeaders([]);
    setColumnMapping({});
    setPreviewCustomers([]);
    setSheetsUrl("");
    setSheetsFetchSuccess(null);
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#30363d] pb-4 gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#f0a500]" />
            Bulk Data Importer
          </h3>
          <p className="text-xs text-[#8b949e] mt-1">
            Import loan portfolios from a local file or directly from Google Sheets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelper(!showHelper)}
            className="p-1.5 border border-[#30363d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#f0a500]" />
            {showHelper ? "Hide Schema" : "Show Schema"}
          </button>
          {currentCount > 10 && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reverts back to the original Gorakhpur dataset"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Database
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      {parsedRows.length === 0 && (
        <div className="flex gap-1 p-1 bg-[#0d1117] rounded-xl border border-[#30363d] w-fit">
          <button
            onClick={() => { setActiveTab("file"); setError(null); setSheetsFetchSuccess(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "file"
                ? "bg-[#f0a500] text-[#0d1117]"
                : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File
          </button>
          <button
            onClick={() => { setActiveTab("sheets"); setError(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "sheets"
                ? "bg-[#f0a500] text-[#0d1117]"
                : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            Google Sheets
          </button>
        </div>
      )}

      {/* Field helper view */}
      {showHelper && (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#f0a500]" />
            Supported Mapping Fields & Layout
          </h4>
          <p className="text-xs text-[#8b949e]">
            Our engine auto-detects column names. To guarantee a perfect import, name your headers similarly to these:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] font-mono">
            {FIELD_DEFINITIONS.map((f) => (
              <div key={f.key} className="bg-[#161b22] border border-[#30363d] p-2 rounded-lg flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[#e6edf3] font-bold">{f.label}</span>
                  {f.required ? (
                    <span className="text-rose-400 text-[9px] uppercase px-1 bg-rose-500/10 rounded">Required</span>
                  ) : (
                    <span className="text-[#8b949e] text-[9px] uppercase">Optional</span>
                  )}
                </div>
                <span className="text-[10px] text-[#8b949e]">Aliases: {f.aliases.slice(0, 3).join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Stage */}
      {parsedRows.length === 0 ? (
        <div className="space-y-4">

          {/* ── Google Sheets Tab ── */}
          {activeTab === "sheets" && (
            <div className="space-y-4">
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: "linear-gradient(135deg,#0f9d58,#188038)"}}>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#e6edf3]">Import from Google Sheets</h4>
                    <p className="text-[11px] text-[#8b949e]">Paste your sheet's sharing URL or Sheet ID below</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block mb-1">Google Sheet URL or ID <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      id="sheets-url-input"
                      value={sheetsUrl}
                      onChange={e => setSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/your_sheet_id/edit  or  just_the_id"
                      className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#f0a500] rounded-lg px-3 py-2 text-xs text-[#e6edf3] placeholder:text-[#484f58] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block mb-1">Sheet / Tab Name (and optional range)</label>
                    <input
                      type="text"
                      id="sheets-range-input"
                      value={sheetsRange}
                      onChange={e => setSheetsRange(e.target.value)}
                      placeholder="Sheet1  or  Sheet1!A1:Z500"
                      className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#f0a500] rounded-lg px-3 py-2 text-xs text-[#e6edf3] placeholder:text-[#484f58] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    Make sure your Google Sheet is set to <strong className="text-[#e6edf3]">"Anyone with the link can view"</strong> in the Share settings.
                    Row 1 must be the header row with column names.
                  </p>
                </div>

                {sheetsFetchSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-emerald-400 font-semibold">{sheetsFetchSuccess}</span>
                  </div>
                )}

                <button
                  id="fetch-sheets-btn"
                  onClick={handleFetchSheets}
                  disabled={sheetsFetching || !sheetsUrl.trim()}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    sheetsFetching || !sheetsUrl.trim()
                      ? "bg-[#30363d] text-[#8b949e] cursor-not-allowed opacity-60"
                      : "bg-[#f0a500] hover:bg-[#e09400] text-[#0d1117] cursor-pointer"
                  }`}
                >
                  {sheetsFetching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Fetching from Google Sheets...</>
                  ) : (
                    <><Link className="w-4 h-4" /> Fetch & Load Sheet Data</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── File Upload Tab ── */}
          {activeTab === "file" && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-[#f0a500] bg-[#f0a500]/5 scale-[0.99]"
                    : "border-[#30363d] hover:border-[#8b949e] bg-[#0d1117]/40 hover:bg-[#0d1117]/80"
                }`}
                onClick={() => document.getElementById("file-picker-input")?.click()}
              >
                <input
                  id="file-picker-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <div className="w-12 h-12 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-3 group-hover:scale-105 transition-all">
                  <Upload className="w-6 h-6 text-[#f0a500]" />
                </div>
                <h4 className="text-sm font-bold text-[#e6edf3]">Drag &amp; Drop your spreadsheet here</h4>
                <p className="text-xs text-[#8b949e] mt-1 max-w-sm">
                  Supports Excel formats (<strong>.xlsx, .xls</strong>) and Comma-Separated Values (<strong>.csv</strong>)
                </p>
                <span className="mt-3.5 px-3 py-1.5 bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-xs font-semibold rounded-lg hover:bg-[#30363d] transition-all">
                  Choose File from Disk
                </span>
              </div>

              {/* Sample template download prompt */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-[#0d1117] p-4 rounded-xl border border-[#30363d] gap-4">
                <div className="text-left">
                  <h5 className="text-xs font-bold text-[#e6edf3]">Don't have a template ready?</h5>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">Download our pre-structured demo template to get started instantly.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadTemplate("csv")}
                    className="px-3 py-1.5 border border-[#30363d] hover:bg-[#161b22] text-[#e6edf3] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Sample CSV
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate("xlsx")}
                    className="px-3 py-1.5 border border-[#30363d] hover:bg-[#161b22] text-[#e6edf3] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Sample Excel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Configuration and Mapping Stage */
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f0a500]/10 border border-[#f0a500]/30 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-[#f0a500]" />
              </div>
              <div className="text-left">
                <h5 className="text-xs font-bold text-[#e6edf3]">{fileDetails?.name}</h5>
                <p className="text-[11px] text-[#8b949e]">{fileDetails?.size} &middot; {parsedRows.length} raw data rows parsed</p>
              </div>
            </div>
            <button
              onClick={() => {
                setParsedRows([]);
                setHeaders([]);
                setColumnMapping({});
                setFileDetails(null);
              }}
              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Change File
            </button>
          </div>

          {/* Manual Column Mapping Section */}
          <div className="bg-[#0d1117]/40 border border-[#30363d] rounded-xl p-4 space-y-4">
            <span className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider block">
              🔧 Column Mapping Schema Settings
            </span>
            <p className="text-xs text-[#8b949e]">
              Review how your spreadsheet columns link up to our core schema. Adjust dropdown mappings if auto-detection missed any.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELD_DEFINITIONS.map((field) => {
                const currentMapped = columnMapping[field.key] || "";
                return (
                  <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#30363d] pb-2 gap-2">
                    <div className="text-left">
                      <span className="text-xs font-semibold text-[#e6edf3] flex items-center gap-1.5">
                        {field.label}
                        {field.required && <span className="text-rose-400 text-[10px]">*</span>}
                      </span>
                      <span className="text-[10px] text-[#8b949e] block italic">System Field: {field.key}</span>
                    </div>
                    <select
                      className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6edf3] outline-none max-w-xs truncate cursor-pointer"
                      value={currentMapped}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                    >
                      <option value="">-- Ignored / Not Present --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Import Modes and Validation Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 bg-[#0d1117] border border-[#30363d] p-4 rounded-xl space-y-4">
              <span className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider block">
                💾 Import Settings & Mode
              </span>

              {/* Toggle append vs replace */}
              <div className="space-y-2">
                <div
                  onClick={() => setImportMode("append")}
                  className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                    importMode === "append"
                      ? "border-[#f0a500] bg-[#f0a500]/5"
                      : "border-[#30363d] hover:border-[#8b949e]"
                  }`}
                >
                  <input
                    type="radio"
                    checked={importMode === "append"}
                    onChange={() => {}}
                    className="accent-[#f0a500] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#e6edf3] block">Append Portfolio</span>
                    <span className="text-[10px] text-[#8b949e] block mt-0.5">Adds these imported customers and loans into your active dashboard.</span>
                  </div>
                </div>

                <div
                  onClick={() => setImportMode("replace")}
                  className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                    importMode === "replace"
                      ? "border-rose-500 bg-rose-500/5"
                      : "border-[#30363d] hover:border-[#8b949e]"
                  }`}
                >
                  <input
                    type="radio"
                    checked={importMode === "replace"}
                    onChange={() => {}}
                    className="accent-rose-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-rose-400 block">Overwrite Database</span>
                    <span className="text-[10px] text-[#8b949e] block mt-0.5">Clears out the entire database and overrides it solely with this file's data.</span>
                  </div>
                </div>
              </div>

              {/* Trigger import */}
              <button
                onClick={executeImport}
                disabled={previewCustomers.length === 0}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  previewCustomers.length > 0
                    ? importMode === "replace"
                      ? "bg-rose-500 hover:bg-rose-600 text-white"
                      : "bg-[#f0a500] hover:bg-[#e09400] text-[#0d1117]"
                    : "bg-[#30363d] text-[#8b949e] opacity-50 cursor-not-allowed"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Proceed with Import ({previewCustomers.length} Borrowers)
              </button>
            </div>

            {/* Validation & Preview Output */}
            <div className="lg:col-span-8 space-y-3">
              <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block">
                📋 Pre-Import Audit Preview & Schema Checks
              </span>
              
              <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0d1117]/40 max-h-[220px] overflow-y-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#161b22] text-[#8b949e] uppercase text-[9px] font-bold tracking-wider border-b border-[#30363d] sticky top-0">
                    <tr>
                      <th className="p-2.5">Customer / Borrower</th>
                      <th className="p-2.5">Occupation</th>
                      <th className="p-2.5">Loans</th>
                      <th className="p-2.5 text-right">Sanctioned Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d] font-mono text-[11px]">
                    {previewCustomers.map((cust, idx) => (
                      <tr key={idx} className="hover:bg-[#161b22]/30">
                        <td className="p-2.5 text-[#e6edf3] font-bold">{cust.name}</td>
                        <td className="p-2.5 text-[#8b949e]">{cust.occupation}</td>
                        <td className="p-2.5 text-[#f0a500] font-bold">{cust.loan_count}</td>
                        <td className="p-2.5 text-right text-emerald-400">₹{cust.total_sanctioned.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Validation Warning block if critical fields are missing */}
              {!columnMapping["name"] || !columnMapping["loan_no"] || !columnMapping["net_sanction_amt"] ? (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left text-xs">
                    <span className="font-bold text-rose-400 block">Critical Mapping Fields Missing</span>
                    <p className="text-[#8b949e] mt-0.5">
                      Ensure you map columns for <strong>Customer Name</strong>, <strong>Loan Number</strong>, and <strong>Sanctioned Amount</strong> to parse successfully.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left text-xs">
                    <span className="font-bold text-emerald-400 block">Data Parsing Successful</span>
                    <p className="text-[#8b949e] mt-0.5">
                      All required fields are mapped. Found <strong>{previewCustomers.length}</strong> unique customer profile records and <strong>{previewCustomers.reduce((acc, c) => acc + c.loans.length, 0)}</strong> loan accounts. Ready to write to active state database.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg flex items-start gap-2.5 text-left">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-rose-300 font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}
