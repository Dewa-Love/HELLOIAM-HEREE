/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true }); // local secrets override

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with safety guards
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API: Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Google Sheets data fetch proxy
app.get("/api/sheets", async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GOOGLE_SHEETS_API_KEY is not configured on the server." });
    }

    const { sheetId, range = "Sheet 1" } = req.query as { sheetId?: string; range?: string };
    if (!sheetId) {
      return res.status(400).json({ error: "Missing required query parameter: sheetId" });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as any;
      const message = errorBody?.error?.message || `Google Sheets API returned HTTP ${response.status}`;
      return res.status(response.status).json({ error: message });
    }

    const data = await response.json() as { values?: string[][] };
    const rows: string[][] = data.values || [];

    if (rows.length < 2) {
      return res.status(200).json({ headers: [], rows: [] });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });

    res.json({ headers, rows: dataRows });
  } catch (error: any) {
    console.error("Google Sheets fetch error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch Google Sheets data." });
  }
});

// API: Portfolio Audit by Gemini AI
app.post("/api/audit", async (req, res) => {
  try {
    const { portfolioSummary, stalledLoans, pendingLoans } = req.body;
    const ai = getGeminiClient();

    const prompt = `
      You are a professional senior credit risk auditor and portfolio optimizer for a housing finance company in Gorakhpur, India.
      You are auditing the loan portfolio of relationship manager Sanjay Kumar Pandey (Agent Code: LU-GPH0020).

      Here is the portfolio state:
      ${JSON.stringify(portfolioSummary, null, 2)}

      Here is a list of stalled / zero-payout loans (sanctioned but no money ever disbursed):
      ${JSON.stringify(stalledLoans, null, 2)}

      Here is a list of in-progress / partially disbursed loans with pending balances:
      ${JSON.stringify(pendingLoans, null, 2)}

      Please generate a highly professional, detailed, and action-oriented Credit Risk Audit Report. Format your response in markdown.
      Include:
      1. **Executive Summary**: A concise assessment of the portfolio health, outstanding risks, and Sanjay's performance.
      2. **Key Risk Indicators (KRIs)**: Identify the most critical risks (e.g., extreme age of stalled loans from 2013-2019, large capital lockups, or active loans that have been stuck for months).
      3. **Prioritized Action Plan**: A step-by-step priority list of loans that need immediate intervention.
      4. **Specific Recovery Strategies**: Propose concrete strategies for recovering zero-disbursement stalled loans (e.g., re-evaluating collateral, resolving title disputes, or checking if the customer has switched to competitors) and finishing partially disbursed loans.
      5. **Operational Recommendations**: Actionable advice for Sanjay Kumar Pandey to improve disbursement velocity and prevent pipeline stagnation in GPH0020.

      Keep the tone highly constructive, analytical, professional, and practical. Speak as an esteemed advisor to Sanjay and the Gorakhpur leadership.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("AI Audit Error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred during the portfolio audit.",
    });
  }
});

// API: Draft Targeted Customer Follow-up Communications
app.post("/api/draft-followup", async (req, res) => {
  try {
    const { customer, loan, context } = req.body;
    const ai = getGeminiClient();

    const prompt = `
      You are an expert customer relations manager in home finance at the Gorakhpur Area Office.
      You need to draft a personalized, polite, yet professional and persuasive follow-up communication to a customer on behalf of relationship manager Sanjay Kumar Pandey.

      Customer Details:
      Name: ${customer.name}
      Occupation: ${customer.occupation}
      Office: ${customer.area_office} (Gorakhpur)

      Loan Details:
      Loan No: ${loan.loan_no}
      Scheme: ${loan.scheme}
      Purpose: ${loan.purpose}
      Sanction Date: ${loan.sanction_date}
      Sanction Amount: ${loan.net_sanction_amt}
      Total Disbursed: ${loan.total_disbursed}
      Pending Disbursement: ${loan.pending}
      Status: ${loan.status}
      Age Since Sanction: ${loan.age_days} days

      Additional User Context/Instructions:
      "${context || "Polite check-in on construction progress and offer to release the next tranche or resolve pending paperwork."}"

      Please generate:
      1. **Draft Email**: Professional subject line and copy, explaining that we want to support them in completing their home project, highlighting the pending tranche of ₹${loan.pending.toLocaleString("en-IN")}, and inviting them to share progress or any bottlenecks.
      2. **Draft SMS/WhatsApp**: A short, friendly check-in message (under 160 characters) suitable for mobile messaging.
      3. **Recommended Actions**: 2-3 specific conversation tips for Sanjay when calling this customer (e.g., if stalled since 2013, how to politely query if they still need the loan or want to close the file).

      Format in markdown with clear, modern headings. Make it highly personalized, empathetic, and culturally appropriate for India.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ drafts: response.text });
  } catch (error: any) {
    console.error("AI Draft Follow-up Error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred while generating the follow-up draft.",
    });
  }
});

// Vite middleware & Static File serving configuration
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running successfully at http://localhost:${PORT}`);
  });
}

initializeServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
