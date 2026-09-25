# AI Loan Eligibility Checker

A production-ready Banking, Financial Services & Insurance (BFSI) fintech web platform that empowers borrowers to evaluate personal loan eligibility, analyze credit profile health, calculate EMI amortization schedules, and receive context-aware financial guidance powered by Claude AI and Google Sheets.

Designed with a premium dark glassmorphism aesthetic tailored for Indian retail banking and financial transparency.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#features)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Project Directory Structure](#project-directory-structure)
- [Installation & Setup](#installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
  - [Claude AI Configuration](#claude-ai-configuration)
  - [Google Sheets Configuration](#google-sheets-configuration)
- [Running Locally](#running-locally)
- [API Documentation](#api-documentation)
- [Deploying to GitHub](#github-deployment)
- [Security Guidelines](#security)
- [Disclaimer](#disclaimer)

---

## Overview

Applying blindly for loans across multiple financial institutions triggers hard credit inquiries that can damage a borrower's credit score. The **AI Loan Eligibility Checker** (FinAI) solves this by providing pre-application intelligence:

1. **FOIR & DTI Underwriting Algorithms:** Calculates eligibility using Fixed Obligation to Income Ratio (FOIR) standards (40% to 60%) and Debt-to-Income (DTI) metrics used by leading banks.
2. **Context-Aware Claude AI Financial Advice:** Borrowers can chat with an AI assistant that inspects their income, liabilities, and desired tenure to explain affordability and suggest debt reduction paths.
3. **Instant Interactive Simulations:** Credit health score visualizer (300–900 scale) and real-time EMI repayment breakdowns with dynamic SVG donut charts.
4. **Google Sheets Sync:** Non-sensitive assessment records can be automatically logged to Google Sheets via Service Account integration with automatic local fallback.

---

## Features

### 1. Loan Eligibility Checker
- **Detailed Parameter Form:** Captures monthly income, other income, living expenses, existing loan EMIs, employment category, requested loan amount, tenure (years/months), interest rate, and credit score.
- **1-Click "Fill Demo Data":** Instantly populates the form with a typical borrower scenario (₹75,000 income, ₹10 Lakhs loan, 742 credit score) for fast demonstration.
- **Animated Circular Score:** Dynamic SVG circular meter showing overall eligibility percentage (0–100%) with status tiers (*High Approval Probability*, *Moderate*, *Elevated Risk*).
- **Comprehensive Financial Metrics:** Displays maximum allowable loan principal, requested EMI, Debt-to-Income (DTI) ratio, and net monthly disposable buffer.
- **Contribution Breakdown:** Progress meters illustrating the relative impact of Credit Score (35%), DTI Ratio (30%), Income Buffer (20%), and Employment Stability (15%).
- **Save to Google Sheets:** One-click submission to persist non-sensitive assessment summaries to Google Sheets.

### 2. Credit Score Analyzer
- **Dual Synchronized Inputs:** Slider and number input (300 to 900) synchronized in real-time.
- **5 Standard Credit Categories:**
  - `300–549`: Poor (Critical Risk)
  - `550–649`: Fair (Needs Attention)
  - `650–749`: Good (Healthy Profile)
  - `750–799`: Very Good (Strong Profile)
  - `800–900`: Excellent (Prime Tier)
- **5 Credit Bureau Factors:** Visual progress meters for Payment History (35%), Credit Utilization (30%), Vintage Length (15%), Credit Mix (10%), and Hard Inquiries (10%).
- **Preset Quick-Select Chips:** Test common credit scores with one click (520, 620, 720, 780, 850).

### 3. Dynamic EMI Calculator
- **Mathematical Formula:** 
  $$\text{EMI} = P \times R \times \frac{(1 + R)^N}{(1 + R)^N - 1}$$
- **Tenure Unit Toggle:** Switch seamlessly between **Years** (1–30) and **Months** (6–360).
- **Repayment Donut Chart:** Interactive SVG chart displaying the exact ratio of Principal vs. Interest paid.
- **Annual Amortization Schedule:** Complete table detailing Principal Paid, Interest Paid, Total Paid, and Remaining Balance year by year.
- **Indian Numbering Format:** Formats currency consistently using the Indian numbering system (`₹10,00,000`, `₹21,494`).

### 4. AI Financial Tips (Claude AI Assistant)
- **Conversational Chat Interface:** User queries on the right, AI guidance on the left with typing indicators and timestamps.
- **Pre-Built Financial Prompts:**
  - *"How can I improve my credit score?"*
  - *"Can I afford a ₹10 lakh loan?"*
  - *"How much EMI should I pay?"*
  - *"How can I reduce my debt?"*
  - *"Should I choose a longer loan tenure?"*
- **Context-Augmented Intelligence:** The backend automatically feeds the applicant's current metrics (income, expenses, credit score, existing EMIs) to Claude to produce tailored, mathematically verified answers.
- **Resilient Fallback Mode:** If an Anthropic API key is not configured, the assistant automatically switches to a built-in expert rule engine so the application works out-of-the-box without errors.

---

## Technology Stack

- **Frontend:**
  - HTML5 (Semantic elements, accessible forms, ARIA tags)
  - CSS3 (Custom properties, dark glassmorphism, responsive CSS grid/flexbox, keyframe animations)
  - Vanilla JavaScript (Modular ES6 architecture, real-time calculations, zero framework overhead)
- **Backend:**
  - Python 3.9+
  - Flask (REST API microservices & static asset serving)
  - Flask-CORS (Cross-Origin Resource Sharing)
  - python-dotenv (Environment configuration)
- **External Integrations:**
  - Anthropic Claude Messages API (`claude-3-5-sonnet-20241022`)
  - Google Sheets API v4 (`google-api-python-client`, `google-auth`)

---

## Project Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Client Browser                       │
│  Landing Page (index.html) | Dashboard (dashboard.html) │
│  Vanilla JS Modules: eligibility, credit, emi, ai-chat │
└───────────▲────────────────────────────────┬───────────┘
            │ Static Assets                  │ REST API Calls
            │ (HTML, CSS, JS)                │ (/api/...)
┌───────────┴────────────────────────────────▼───────────┐
│              Python / Flask Backend Server             │
│                       (app.py)                         │
├─────────────────────┬──────────────────┬───────────────┤
│   Eligibility API   │    Claude AI     │ Google Sheets │
│ (/check-eligibility)│(/financial-advice│(/save-app...) │
└──────────┬──────────┴────────┬─────────┴───────┬───────┘
           │                   │                 │
           ▼                   ▼                 ▼
    FOIR/DTI Math         Anthropic        Google Sheets
   Calculation Engine   Claude Messages     Spreadsheet
    (Local Fallback)       API Cloud       (Local JSON)
```

---

## Project Directory Structure

```
ai-loan-eligibility-checker/
├── frontend/
│   ├── index.html              # Marketing landing page with hero & previews
│   ├── dashboard.html          # Central unified fintech dashboard
│   ├── css/
│   │   ├── style.css           # Core theme variables, typography & glassmorphism
│   │   ├── dashboard.css       # Dashboard widgets, charts & chat styling
│   │   └── responsive.css      # Breakpoints for mobile, tablet, and desktop
│   ├── js/
│   │   ├── app.js              # State manager, health checks & tab router
│   │   ├── eligibility.js      # Eligibility calculation & form validator
│   │   ├── credit-score.js     # Credit analyzer gauge & factor simulator
│   │   ├── emi.js              # EMI formula calculator & donut visualizer
│   │   └── ai-chat.js          # Chat controller & Claude API interface
│   └── assets/
│       └── icons/              # Scalable SVG vectors
│
├── backend/
│   ├── app.py                  # Flask server entry point & static asset router
│   ├── requirements.txt        # Python backend dependencies
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── ai.py               # AI advice endpoint (/api/financial-advice)
│   │   ├── eligibility.py      # Calculations endpoint (/api/check-eligibility)
│   │   └── sheets.py           # Google Sheets sync (/api/save-application)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── claude_service.py   # Anthropic API client with smart fallback
│   │   └── google_sheets.py    # Google Sheets client with local JSON fallback
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── calculations.py     # Banking math (FOIR, DTI, PV, Amortization)
│   │   └── formatters.py       # Indian numbering system (INR) formatter
│   └── data/
│       ├── .gitkeep
│       └── applications.json   # Local persistent store for applications
│
├── app.py                      # Root convenience launcher (python app.py)
├── .env.example                # Configuration template
├── .gitignore                  # Production gitignore (excludes secrets/cache)
├── LICENSE                     # MIT License
└── README.md                   # Full documentation
```

---

## Installation & Setup

### Prerequisites

- Python 3.9, 3.10, 3.11, or 3.12
- Web browser (Chrome, Edge, Firefox, Safari)
- Git (optional, for version control)

### Backend Setup

1. **Clone or navigate to the repository:**
   ```bash
   cd ai-loan-eligibility-checker
   ```

2. **Create and activate a Python virtual environment (Recommended):**
   - **On Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **On macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

### Frontend Setup

No build steps, node_modules, or package managers required. The frontend uses standard HTML5, CSS3, and modern Vanilla JavaScript that runs directly in any modern browser.

---

## Environment Variables

Open your `.env` file to configure external service credentials.

```env
# Server
PORT=5000
HOST=127.0.0.1

# Anthropic Claude API Key
CLAUDE_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Google Sheets Integration (Optional)
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

### Claude AI Configuration

1. Visit [Anthropic Console](https://console.anthropic.com/) and generate an API key.
2. Paste the key into `CLAUDE_API_KEY` in `.env`.
3. If no key is provided, the application automatically engages its built-in BFSI rule engine, providing accurate responses without throwing errors.

### Google Sheets Configuration

To log applications to a Google Spreadsheet:

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Google Sheets API**.
3. Create a **Service Account** under **IAM & Admin > Service Accounts** and generate a JSON key.
4. Create a new Google Sheet in Google Drive and note the Spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`
5. Share the Google Sheet with the Service Account email (give **Editor** permissions).
6. Copy the Spreadsheet ID, Service Account email, and Private Key into `.env`.
7. *Note:* If credentials are not provided, submissions are saved locally to `backend/data/applications.json` without failing.

---

## Running Locally

### Option 1: Run Full App via Python Server (Recommended)

Run the one-command server from the root directory:

```bash
python app.py
```
*(Or `python backend/app.py`)*

Output:
```
==================================================
 AI Loan Eligibility Checker Server
 Running at: http://127.0.0.1:5000/
 Landing Page: http://127.0.0.1:5000/
 Dashboard:    http://127.0.0.1:5000/dashboard
 API Health:   http://127.0.0.1:5000/api/health
==================================================
```

- Open **`http://localhost:5000/`** to view the Landing Page.
- Open **`http://localhost:5000/dashboard`** to access the Dashboard.

### Option 2: Run Frontend Directly (Standalone Mode)

You can also run the frontend independently by opening `frontend/index.html` or `frontend/dashboard.html` in your browser (or using VS Code Live Server). 

The frontend automatically detects whether the backend is online:
- If connected: Uses backend APIs for calculations and Claude responses.
- If standalone: Engages the client-side calculation engine and offline assistant.

---

## API Documentation

### 1. Check Eligibility
- **Endpoint:** `POST /api/check-eligibility`
- **Request Body:**
  ```json
  {
    "name": "Rahul Sharma",
    "age": 32,
    "employment_type": "Salaried",
    "monthly_income": 75000,
    "other_income": 10000,
    "existing_emi": 8000,
    "monthly_expenses": 25000,
    "desired_amount": 1000000,
    "tenure_years": 5,
    "interest_rate": 10.5,
    "credit_score": 742
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "eligibility_score": 78,
      "status": "High Approval Probability",
      "risk_level": "Low Risk",
      "max_eligible_amount": 1850000,
      "requested_emi": 21494,
      "dti_ratio": 28.7,
      "insights": [
        "Your income comfortably covers the requested loan EMI under standard FOIR criteria."
      ]
    }
  }
  ```

### 2. Financial Advice (Claude AI)
- **Endpoint:** `POST /api/financial-advice`
- **Request Body:**
  ```json
  {
    "question": "Can I afford a ₹10 lakh loan?",
    "financialContext": {
      "income": 75000,
      "expenses": 25000,
      "creditScore": 742,
      "existingEmi": 8000,
      "desiredLoan": 1000000,
      "tenureYears": 5
    }
  }
  ```
- **Response:**
  ```json
  {
    "response": "Based on your declared income of ₹75,000 / month...",
    "source": "Claude AI (Anthropic)",
    "status": "success"
  }
  ```

### 3. Calculate EMI
- **Endpoint:** `POST /api/calculate-emi`
- **Request Body:**
  ```json
  {
    "principal": 1000000,
    "annual_rate": 10.5,
    "tenure_months": 60
  }
  ```

### 4. Save Application (Google Sheets)
- **Endpoint:** `POST /api/save-application`
- **Request Body:**
  ```json
  {
    "name": "Rahul Sharma",
    "employment_type": "Salaried",
    "monthly_income": 75000,
    "desired_amount": 1000000,
    "tenure_years": 5,
    "credit_score": 742,
    "eligibility_score": "78% (High Approval Probability)",
    "requested_emi": "₹21,494"
  }
  ```

### 5. Health Check
- **Endpoint:** `GET /api/health`

---

## Deploying to GitHub

Follow these steps to upload the repository to GitHub:

1. **Initialize Git repository (if not already initialized):**
   ```bash
   git init
   ```

2. **Verify `.gitignore` is active:**
   Ensure `.env`, `credentials.json`, and `__pycache__` are excluded:
   ```bash
   git status
   ```

3. **Stage and commit all project files:**
   ```bash
   git add .
   git commit -m "Initial commit: Production-quality AI Loan Eligibility Checker"
   ```

4. **Create a new repository on GitHub:**
   - Go to [github.com/new](https://github.com/new)
   - Name your repository (e.g. `ai-loan-eligibility-checker`)
   - Choose **Public** or **Private**
   - Do **NOT** initialize with a README, .gitignore, or license (already included)

5. **Link and push to GitHub:**
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/ai-loan-eligibility-checker.git
   git branch -M main
   git push -u origin main
   ```

---

## Security Guidelines

- **Never Expose Credentials in Frontend:** Claude API keys, Google Service Account emails, and private keys are strictly managed on the Python backend via environment variables.
- **Non-Sensitive Data Collection:** The platform collects only operational financial estimates. It strictly **does NOT** request, process, or store:
  - Bank account numbers
  - Credit or debit card numbers
  - Netbanking passwords
  - OTPs / 2FA secrets
  - Government IDs (PAN, Aadhaar numbers)
- **Safe Version Control:** `.gitignore` excludes all `.env` files, virtual environments, and credential files.

---

## Disclaimer

This tool provides estimates for educational and informational purposes only. It does not constitute financial advice, credit approval, or a guarantee of loan eligibility. Actual lending decisions are made by individual financial institutions based on their own policies, verification processes, and applicable regulations.
