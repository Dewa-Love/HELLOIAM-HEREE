import { Customer, Loan } from "../types";

// Default columns we expect — matches the loan portfolio data schema
export const FIELD_DEFINITIONS = [
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

export const extractSheetId = (input: string): string | null => {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
};

// Helper to correctly parse quoted CSV elements
export const parseCSVLine = (line: string): string[] => {
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

export const parseCSVToRows = (text: string) => {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || !lines[0].trim()) {
    throw new Error("CSV file appears to be empty.");
  }

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

  return { headers: csvHeaders, rows: jsonRows };
};

export const buildCustomersFromRows = (headers: string[], parsedRows: any[]): Customer[] => {
  if (parsedRows.length === 0) return [];

  const columnMapping: { [key: string]: string } = {};
  FIELD_DEFINITIONS.forEach((field) => {
    const matchedHeader = headers.find((h) => {
      const cleanedHeader = h.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
      return field.aliases.some((alias) => cleanedHeader === alias || cleanedHeader.includes(alias));
    });

    if (matchedHeader) {
      columnMapping[field.key] = matchedHeader;
    } else {
      const exactMatch = headers.find((h) => h.toLowerCase().trim() === field.key.toLowerCase());
      if (exactMatch) {
        columnMapping[field.key] = exactMatch;
      }
    }
  });

  const groupedCustomers: { [name: string]: Customer } = {};

  parsedRows.forEach((row, rowIndex) => {
    const nameVal = String(row[columnMapping["customer_name"]] || "").trim();
    if (!nameVal) return; // Skip rows without customer names

    const occupationVal = String(row[columnMapping["occupation"]] || "Business Owner").trim();
    const regionalOfficeVal = String(row[columnMapping["regional_office"]] || "").trim();
    const backOfficeVal = String(row[columnMapping["back_office"]] || "").trim();
    const areaOfficeVal = String(row[columnMapping["area_office"]] || "").trim();
    const agentNameVal = String(row[columnMapping["agent_name"]] || "Self / Direct").trim();
    const agentCodeVal = String(row[columnMapping["agent_code"]] || "").trim();
    const customerStatusVal = String(row[columnMapping["customer_status"]] || "").trim();
    const loanNoVal = String(row[columnMapping["loan_no"]] || `LN-${1000 + rowIndex}`).trim();
    const appNoVal = String(row[columnMapping["app_no"]] || `AP-${loanNoVal.replace(/[^0-9]/g, "") || 10000 + rowIndex}`).trim();
    const sanctionDateVal = String(row[columnMapping["sanction_date"]] || "2026-01-15").trim();
    const loanStatusVal = String(row[columnMapping["loan_status"]] || "").trim();
    const schemeVal = String(row[columnMapping["scheme"]] || "General Business Loan").trim();
    const purposeVal = String(row[columnMapping["purpose"]] || "Capital Expansion").trim();
    const sanctionAmtVal = Math.max(0, parseFloat(String(row[columnMapping["net_sanction_amt"]] || "0").replace(/[^0-9.]/g, "")) || 0);
    const roiVal = parseFloat(String(row[columnMapping["roi"]] || "8.5").replace(/[^0-9.]/g, "")) || 8.5;
    const interestTypeVal = String(row[columnMapping["interest_type"]] || "Reducing Balance").trim();
    const loanDisbursedVal = Math.max(0, parseFloat(String(row[columnMapping["loan_total_disbursed"]] || "0").replace(/[^0-9.]/g, "")) || 0);
    const loanPendingVal = Math.max(0, parseFloat(String(row[columnMapping["loan_pending"]] || "0").replace(/[^0-9.]/g, "")) || 0);
    const disbDateVal = String(row[columnMapping["disb_date"]] || sanctionDateVal).trim();
    const disbTypeVal = String(row[columnMapping["disb_type"]] || "First Tranche").trim();
    const disbAmtVal = Math.max(0, parseFloat(String(row[columnMapping["disb_amt"]] || "0").replace(/[^0-9.]/g, "")) || 0);
    const cancelledAmtVal = Math.max(0, parseFloat(String(row[columnMapping["cancelled_amt"]] || "0").replace(/[^0-9.]/g, "")) || 0);
    const netDisbAmtVal = Math.max(0, parseFloat(String(row[columnMapping["net_disb_amt"]] || "0").replace(/[^0-9.]/g, "")) || 0);
    const paymentTypeVal = String(row[columnMapping["payment_type"]] || "NEFT").trim();
    const chequeNoVal = row[columnMapping["cheque_no"]] ? String(row[columnMapping["cheque_no"]]).trim() : null;
    const beneficiaryVal = String(row[columnMapping["beneficiary"]] || nameVal).trim();
    const beneficiaryAcVal = row[columnMapping["beneficiary_ac"]] ? String(row[columnMapping["beneficiary_ac"]]).trim() : null;
    const txnRefVal = String(row[columnMapping["txn_ref"]] || `TXN-${loanNoVal}`).trim();
    const realizationVal = String(row[columnMapping["realization"]] || "").trim();
    const mandateStatusVal = String(row[columnMapping["mandate_status"]] || "Active").trim();
    const collateralIdVal = row[columnMapping["collateral_id"]] ? String(row[columnMapping["collateral_id"]]).trim() : null;

    const disbursedVal = loanDisbursedVal || disbAmtVal || netDisbAmtVal;
    const pendingVal = loanPendingVal || Math.max(0, sanctionAmtVal - disbursedVal);

    let statusVal = loanStatusVal || customerStatusVal;
    if (!statusVal) {
      if (disbursedVal === 0) {
        statusVal = "Stalled / Zero Payout";
      } else if (disbursedVal >= sanctionAmtVal) {
        statusVal = "Fully Disbursed";
      } else {
        statusVal = "Partially Disbursed";
      }
    }

    const loanObj: Loan = {
      loan_no: loanNoVal,
      app_no: appNoVal,
      year: parseInt(sanctionDateVal.split("-")[0]) || 2026,
      sanction_date: sanctionDateVal,
      status: statusVal,
      age_days: 15,
      loan_type: "Term Loan",
      gross_sanction_amt: sanctionAmtVal,
      canc_amt: cancelledAmtVal,
      net_sanction_amt: sanctionAmtVal,
      roi: roiVal,
      disbursement_amt: disbAmtVal || disbursedVal,
      total_disbursed: disbursedVal,
      pending: pendingVal,
      agent_type: "Direct",
      scheme: schemeVal,
      purpose: purposeVal,
      roi_package: `ROI-${roiVal}%`,
      interest_type: interestTypeVal,
      product_code: "PL-101",
      tranche_count: disbursedVal > 0 ? 1 : 0,
      has_txn_detail: disbursedVal > 0,
      any_unrealized: realizationVal.toLowerCase().includes("unrealized"),
      mandate_status: mandateStatusVal,
      collateral_id: collateralIdVal,
      connector_name: agentNameVal !== "Self / Direct" ? agentNameVal : null,
      disbursements: disbursedVal > 0 ? [
        {
          date: disbDateVal,
          disb_type: disbTypeVal,
          disb_amt: disbAmtVal || disbursedVal,
          canc_amt: cancelledAmtVal,
          net_disb_amt: netDisbAmtVal || disbursedVal,
          payment_type: paymentTypeVal,
          cheque_no: chequeNoVal,
          beneficiary: beneficiaryVal,
          beneficiary_ac: beneficiaryAcVal,
          txn_ref: txnRefVal,
          realization: realizationVal || "Realized",
          mandate_status: mandateStatusVal,
          connector_name: agentNameVal !== "Self / Direct" ? agentNameVal : null,
          collateral_id: collateralIdVal
        }
      ] : []
    };

    if (groupedCustomers[nameVal]) {
      groupedCustomers[nameVal].loans.push(loanObj);
      groupedCustomers[nameVal].loan_count = groupedCustomers[nameVal].loans.length;
      groupedCustomers[nameVal].total_sanctioned += sanctionAmtVal;
      groupedCustomers[nameVal].total_disbursed += disbursedVal;
      groupedCustomers[nameVal].total_pending += pendingVal;
      groupedCustomers[nameVal].total_tranches += loanObj.tranche_count;
    } else {
      groupedCustomers[nameVal] = {
        name: nameVal,
        occupation: occupationVal,
        address: areaOfficeVal || "Gorakhpur, Uttar Pradesh",
        regional_office: regionalOfficeVal || "GORAKHPUR RO",
        back_office: backOfficeVal || "GORAKHPUR HO",
        area_office: areaOfficeVal || "GKP OFFICE",
        agent_name: agentNameVal,
        agent_code: agentCodeVal || "AG-DIR",
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

  return customerArray;
};

export const fetchLiveCustomers = async (sheetId: string): Promise<Customer[]> => {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("Sheet 1")}`;
  
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

  const { headers, rows } = parseCSVToRows(text);
  return buildCustomersFromRows(headers, rows);
};
