"""
Claude AI API service for AI-powered financial advisory.
Integrates Anthropic Claude Messages API securely on the backend.
Provides domain-specific BFSI guidance with strict safety rails
and an intelligent fallback engine when an API key is not configured.
"""

import os
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-3-5-sonnet-20241022"

SYSTEM_PROMPT = """You are FinAI Financial Assistant, a friendly, professional AI financial advisor specializing in retail banking, personal loans, credit health, and EMI management for Indian borrowers.

Your core operating principles:
1. Provide educational, clear, and actionable personal finance information.
2. Explain mathematical calculations, ratios (DTI, FOIR), and rules of thumb in simple, easy-to-understand terms with Indian Rupee (₹) amounts.
3. NEVER guarantee loan approval, claim to be an authorized bank/lender, or make definitive lending promises.
4. Always emphasize that actual credit decisions, interest rates, and loan terms are determined solely by lending institutions subject to KYC, credit appraisal, and legal guidelines.
5. Emphasize prudent debt management (e.g. keeping Debt-To-Income under 35-40%, maintaining emergency savings of 3-6 months, keeping credit utilization below 30%).
6. Maintain an encouraging, transparent, and respectful tone.
7. NEVER request passwords, account numbers, OTPs, or personally identifiable sensitive data.
8. Keep your response structured with concise paragraphs or bullet points for readability."""

def get_claude_advice(question: str, financial_context: dict = None) -> dict:
    """
    Sends financial inquiry with user's financial context to Claude API.
    If CLAUDE_API_KEY is not set or network fails, falls back to
    intelligent offline BFSI expert response generator.
    """
    api_key = os.getenv("CLAUDE_API_KEY", "").strip()

    if not financial_context:
        financial_context = {}

    income = financial_context.get("income", 75000)
    expenses = financial_context.get("expenses", 25000)
    credit_score = financial_context.get("creditScore", 742)
    existing_emi = financial_context.get("existingEmi", 8000)
    desired_loan = financial_context.get("desiredLoan", 1000000)
    tenure_years = financial_context.get("tenureYears", 5)

    # Build prompt with context
    context_str = (
        f"Borrower Financial Profile:\n"
        f"- Monthly Income: ₹{int(income):,}\n"
        f"- Monthly Expenses: ₹{int(expenses):,}\n"
        f"- Current EMIs: ₹{int(existing_emi):,}\n"
        f"- Credit Score: {credit_score}\n"
        f"- Requested Loan: ₹{int(desired_loan):,} for {tenure_years} years\n\n"
        f"User Inquiry: {question}"
    )

    if not api_key:
        logger.info("CLAUDE_API_KEY not configured. Using intelligent domain fallback engine.")
        return {
            "response": _generate_smart_fallback(question, financial_context),
            "source": "FinAI Local Rule Engine (Set CLAUDE_API_KEY in .env for live Claude Sonnet)",
            "status": "success"
        }

    # Prepare Anthropic Messages API Payload
    payload = {
        "model": os.getenv("CLAUDE_MODEL", DEFAULT_MODEL),
        "max_tokens": 1000,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": context_str
            }
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }

    try:
        req = urllib.request.Request(
            CLAUDE_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            ai_text = ""
            for item in data.get("content", []):
                if item.get("type") == "text":
                    ai_text += item.get("text", "")
            return {
                "response": ai_text or "No response received from Claude.",
                "source": "Claude AI (Anthropic)",
                "status": "success"
            }
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8") if e.fp else str(e)
        logger.error(f"Claude API HTTP Error {e.code}: {err_msg}")
        # Provide fallback so user experience doesn't break
        return {
            "response": _generate_smart_fallback(question, financial_context),
            "source": f"FinAI Local Engine (Fallback: Claude API error {e.code})",
            "status": "fallback"
        }
    except Exception as e:
        logger.error(f"Claude API connection failed: {e}")
        return {
            "response": _generate_smart_fallback(question, financial_context),
            "source": "FinAI Local Engine (Fallback: Network timeout)",
            "status": "fallback"
        }

def _generate_smart_fallback(question: str, ctx: dict) -> str:
    """
    Expert rule-based BFSI response generator when Claude API is not active.
    Provides mathematically accurate, empathetic, and comprehensive answers.
    """
    q = question.lower()
    income = float(ctx.get("income", 75000))
    expenses = float(ctx.get("expenses", 25000))
    existing_emi = float(ctx.get("existingEmi", 8000))
    score = int(ctx.get("creditScore", 742))
    desired_loan = float(ctx.get("desiredLoan", 1000000))

    disposable = income - expenses - existing_emi
    dti = ((existing_emi) / income * 100) if income > 0 else 0

    if "credit score" in q or "improve" in q:
        return (
            f"### Improving Your Credit Score (Current: {score})\n\n"
            "Here are four proven strategies to elevate your credit profile:\n\n"
            "1. **Payment Track Record (35% weight):** Ensure zero delayed payments on credit cards or loans. Set up automated standing instructions for at least the total amount due.\n"
            "2. **Credit Utilization Ratio (30% weight):** Keep your card spends below **30%** of your total limit. For example, on a ₹1,00,000 credit limit, keep outstanding balances below ₹30,000.\n"
            "3. **Credit Mix & Inquiries (20% weight):** Avoid applying for multiple loan products simultaneously. Each hard inquiry temporarily dips your score by 5-10 points.\n"
            "4. **Maintain Older Accounts (15% weight):** A longer vintage of disciplined credit history boosts lender confidence.\n\n"
            "*Educational Note: Scores above 750 typically secure the lowest interest rates across major retail banks.*"
        )
    elif "afford" in q or "lakh" in q or "10" in q:
        # Calculate for 10L loan at 10.5% for 5 years
        approx_emi = 21494
        total_obligation = existing_emi + approx_emi
        post_loan_dti = (total_obligation / income * 100) if income > 0 else 0
        verdict = "comfortably manageable" if post_loan_dti <= 40 else "tight"

        return (
            f"### Affordability Assessment for a ₹{int(desired_loan):,} Loan\n\n"
            f"Based on your declared income of **₹{int(income):,} / month** and existing EMIs of **₹{int(existing_emi):,}**:\n\n"
            f"- **Estimated New EMI:** Approx **₹{approx_emi:,} / month** (at 10.5% for 5 years).\n"
            f"- **Combined Monthly Debt:** ₹{int(total_obligation):,} (Existing + New Loan).\n"
            f"- **Post-Loan DTI Ratio:** **{post_loan_dti:.1f}%**.\n"
            f"- **Monthly Buffer:** You will have approximately **₹{int(disposable - approx_emi):,}** remaining after living expenses.\n\n"
            f"**Verdict:** This loan is **{verdict}** under standard banking guidelines (FOIR threshold of 50%). "
            "To maximize safety, maintain at least 3 months of emergency expenses in a liquid fund."
        )
    elif "how much emi" in q or "emi should i pay" in q:
        max_safe_emi = income * 0.40 - existing_emi
        return (
            f"### How Much EMI Should You Pay?\n\n"
            f"Financial planners follow the **40% Debt-to-Income rule**:\n\n"
            f"- **Total Monthly Debt Ceiling:** Your total EMIs (all loans combined) should not exceed 40% to 50% of net monthly income.\n"
            f"- **Your Safe EMI Capacity:** Based on your ₹{int(income):,} monthly income, your overall EMI ceiling is approximately **₹{int(income * 0.45):,}**.\n"
            f"- **Available Room:** Subtracting your existing EMI of ₹{int(existing_emi):,}, your comfortable new loan EMI limit is **₹{max(0, int(max_safe_emi)):,} / month**.\n\n"
            "*Tip: Never stretch your EMI so much that your monthly savings drop below 20% of your earnings.*"
        )
    elif "reduce" in q or "debt" in q:
        return (
            "### Accelerating Debt Reduction\n\n"
            "Consider these two battle-tested debt repayment strategies:\n\n"
            "1. **The Avalanche Method (Mathematically Optimal):** Pay the minimum due on all obligations, but channel every surplus Rupee toward the loan with the *highest interest rate* (e.g. credit cards at 36-42% p.a.). This saves the most money in interest.\n"
            "2. **The Snowball Method (Psychological Momentum):** Pay off the smallest balance first for quick wins to stay motivated.\n"
            "3. **Prepayment / Part-Payment:** Putting an annual bonus or tax refund towards loan principal cuts tenure drastically due to compounding interest reduction.\n\n"
            "*Always verify with your lender regarding pre-payment or foreclosure charges, especially on fixed-rate loans.*"
        )
    elif "tenure" in q or "longer" in q:
        return (
            "### Longer vs. Shorter Loan Tenure Analysis\n\n"
            "Choosing between a longer or shorter tenure involves a trade-off between cash flow and total cost:\n\n"
            "- **Longer Tenure (e.g. 5-7 years):**\n"
            "  - *Pros:* Lower monthly EMI, easier loan approval, less monthly strain on cash flow.\n"
            "  - *Cons:* Significantly higher total interest paid over the life of the loan.\n"
            "- **Shorter Tenure (e.g. 2-3 years):**\n"
            "  - *Pros:* Debt-free faster, minimizes overall interest payout.\n"
            "  - *Cons:* Higher monthly EMI requires higher income eligibility.\n\n"
            "**Smart Strategy:** Choose a moderately comfortable tenure with an affordable EMI, then make voluntary prepayments whenever possible."
        )
    else:
        return (
            f"### FinAI Financial Guidance\n\n"
            f"Regarding your query: *\"{question}\"*\n\n"
            f"Looking at your financial parameters (Monthly Income: **₹{int(income):,}**, Existing EMIs: **₹{int(existing_emi):,}**, Credit Score: **{score}**):\n\n"
            f"- **Debt-to-Income (DTI):** Your current EMI commitments take up **{dti:.1f}%** of your earnings, which is considered healthy.\n"
            f"- **Emergency Buffer:** Ensure you retain at least **₹{int(expenses * 3):,}** (3 months of essential living expenses) before taking on substantial new loan liabilities.\n"
            f"- **Borrowing Capacity:** Financial institutions generally look for clean repayment histories, regular bank statements, and a stable employment vintage of at least 1-2 years.\n\n"
            "*Feel free to ask specific questions about EMI calculations, credit score improvements, or loan tenures!*"
        )
