/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Disbursement {
  date: string;
  disb_type: string;
  disb_amt: number;
  canc_amt: number;
  net_disb_amt: number;
  payment_type: string;
  cheque_no: string | null;
  beneficiary: string;
  beneficiary_ac: string | null;
  txn_ref: string | null;
  realization: string;
  mandate_status: string | null;
  connector_name: string | null;
  collateral_id: string | null;
}

export interface Loan {
  loan_no: string;
  app_no: string;
  year: number;
  sanction_date: string;
  status: string;
  age_days: number;
  loan_type: string;
  gross_sanction_amt: number;
  canc_amt: number;
  net_sanction_amt: number;
  roi: number | null;
  disbursement_amt: number;
  total_disbursed: number;
  pending: number;
  agent_type: string;
  scheme: string;
  purpose: string;
  roi_package: string;
  interest_type: string;
  product_code: string;
  tranche_count: number;
  has_txn_detail: boolean;
  any_unrealized: boolean;
  mandate_status: string | null;
  collateral_id: string | null;
  connector_name: string | null;
  disbursements: Disbursement[];
}

export interface Customer {
  name: string;
  occupation: string;
  regional_office: string;
  back_office: string;
  area_office: string;
  agent_name: string;
  agent_code: string;
  loans: Loan[];
  loan_count: number;
  total_sanctioned: number;
  total_disbursed: number;
  total_pending: number;
  total_tranches: number;
  status: string;
  address?: string;
}

export interface FollowUpNote {
  id: string;
  customerName: string;
  loanNo: string;
  content: string;
  updatedAt: string;
}
