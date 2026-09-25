/**
 * AI Financial Tips & Advisory Chat Module
 * Handles conversational queries with context-aware BFSI intelligence,
 * typing animations, quick prompt chips, and Claude API communication.
 */

const AiChatModule = (function () {
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("btnSendChat");

  // Basic markdown to HTML converter for AI answers
  function parseMarkdown(md) {
    if (!md) return "";
    let html = md
      // Escape HTML entities
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      // Unordered lists
      .replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>")
      // Line breaks
      .replace(/\n\n/g, "<br><br>");
    return html;
  }

  function appendMessage(text, sender = "ai", meta = "") {
    if (!chatMessages) return;

    const row = document.createElement("div");
    row.className = `chat-message-row ${sender}`;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (sender === "user") {
      row.innerHTML = `
        <div class="msg-bubble">
          <p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          <div class="msg-meta">${timeStr}</div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="chat-avatar" style="width: 32px; height: 32px; font-size: 0.8rem; margin-top: 4px;">AI</div>
        <div class="msg-bubble">
          ${parseMarkdown(text)}
          <div class="msg-meta">${meta ? meta + ' • ' : ''}${timeStr}</div>
        </div>
      `;
    }

    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTypingIndicator() {
    if (!chatMessages) return null;
    const indicator = document.createElement("div");
    indicator.id = "aiTypingIndicator";
    indicator.className = "chat-message-row ai";
    indicator.innerHTML = `
      <div class="chat-avatar" style="width: 32px; height: 32px; font-size: 0.8rem; margin-top: 4px;">AI</div>
      <div class="msg-bubble">
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
  }

  function removeTypingIndicator() {
    const el = document.getElementById("aiTypingIndicator");
    if (el) el.remove();
  }

  // Get current borrower financial metrics for context-augmented generation
  function getFinancialContext() {
    return {
      income: parseFloat(document.getElementById("elMonthlyIncome")?.value) || 75000,
      expenses: parseFloat(document.getElementById("elMonthlyExpenses")?.value) || 25000,
      creditScore: parseInt(document.getElementById("elCreditScore")?.value) || 742,
      existingEmi: parseFloat(document.getElementById("elExistingEmi")?.value) || 8000,
      desiredLoan: parseFloat(document.getElementById("elDesiredAmount")?.value) || 1000000,
      tenureYears: parseFloat(document.getElementById("elLoanTenure")?.value) || 5
    };
  }

  async function sendQuestion(question) {
    const q = (question || chatInput.value || "").trim();
    if (!q) return;

    // Display user message
    appendMessage(q, "user");
    if (chatInput) chatInput.value = "";

    const indicator = showTypingIndicator();
    const ctx = getFinancialContext();

    try {
      const response = await fetch("/api/financial-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          financialContext: ctx
        })
      });

      removeTypingIndicator();

      if (response.ok) {
        const data = await response.json();
        appendMessage(data.response, "ai", data.source || "Claude AI Advisor");
      } else {
        // Use client-side intelligence fallback
        const fallback = generateClientFallback(q, ctx);
        appendMessage(fallback, "ai", "FinAI Knowledge Engine");
      }
    } catch (err) {
      removeTypingIndicator();
      const fallback = generateClientFallback(q, ctx);
      appendMessage(fallback, "ai", "FinAI Offline Engine");
    }
  }

  // Smart client-side rule engine fallback
  function generateClientFallback(q, ctx) {
    const lower = q.toLowerCase();
    const income = ctx.income || 75000;
    const existing = ctx.existingEmi || 8000;
    const score = ctx.creditScore || 742;

    if (lower.includes("credit score") || lower.includes("improve")) {
      return `### How to Boost Your Credit Score (Current: ${score})

To strengthen your profile for premium interest rates:
- **On-Time Payments:** Ensure 100% on-time repayment of all card bills and installments.
- **Credit Utilization:** Keep card spends strictly below **30%** of your approved credit limits.
- **Limit Inquiries:** Avoid applying to multiple lenders in a short span.
- **Credit Vintage:** Keep your oldest credit card active to maintain an extended credit history.`;
    } else if (lower.includes("afford") || lower.includes("10 lakh")) {
      const emi = 21494;
      const totalDebt = existing + emi;
      const dti = ((totalDebt / income) * 100).toFixed(1);
      return `### Affordability Analysis for a ₹10,00,000 Loan

- **Estimated EMI:** ~₹${emi.toLocaleString("en-IN")} / month (at 10.5% for 5 years).
- **Projected Total Monthly Debt:** ₹${totalDebt.toLocaleString("en-IN")} (Existing + New EMI).
- **Estimated DTI Ratio:** **${dti}%** of your ₹${income.toLocaleString("en-IN")} monthly earnings.
- **Conclusion:** Standard banking norms recommend keeping your total DTI below 50%. This loan fits comfortably within typical eligibility thresholds!`;
    } else if (lower.includes("how much emi") || lower.includes("emi should i pay")) {
      const safeCeiling = Math.round(income * 0.45);
      const safeNew = Math.max(0, safeCeiling - existing);
      return `### Recommended EMI Guidelines

- **Golden 40-50% Rule:** Total EMI obligations across all loans should not exceed 40% to 50% of your take-home pay.
- **Your Total Debt Ceiling:** ~₹${safeCeiling.toLocaleString("en-IN")} / month.
- **Available Capacity:** After deducting your existing EMI of ₹${existing.toLocaleString("en-IN")}, you can safely afford a new EMI of up to **₹${safeNew.toLocaleString("en-IN")} / month**.`;
    } else if (lower.includes("reduce") || lower.includes("debt")) {
      return `### Effective Debt Reduction Strategies

1. **Avalanche Strategy:** Direct extra savings towards your highest interest rate loan (e.g. credit cards or high-interest personal loans) to minimize overall interest outflow.
2. **Prepayment Strategy:** Use annual bonuses or tax refunds to make part-prepayments towards your loan principal.
3. **Refinancing:** If your credit score has improved, explore balance transfer options to a lender offering lower rates.`;
    } else if (lower.includes("tenure") || lower.includes("longer")) {
      return `### Longer vs. Shorter Tenure Trade-Off

- **Longer Tenure (e.g. 5–7 years):** Reduces your monthly EMI burden and increases approval likelihood, but incurs significantly higher total interest.
- **Shorter Tenure (e.g. 2–3 years):** Saves substantial money on interest and makes you debt-free sooner, but requires higher monthly income to satisfy FOIR limits.
- **Best Practice:** Choose a tenure that gives you a comfortable monthly cushion, with zero or minimal prepayment penalty so you can pay off early.`;
    } else {
      return `### FinAI Financial Guidance

Regarding your inquiry: *"**${q}**"*

With a monthly income of **₹${income.toLocaleString("en-IN")}** and a credit score of **${score}**, you have a healthy borrowing profile. 

Key pillars to remember:
- Keep emergency funds covering at least 3-6 months of expenses before taking large loans.
- Ensure your Debt-to-Income (DTI) ratio stays under 40-50%.
- Always compare processing fees and foreclosure terms across banks.`;
    }
  }

  function init() {
    if (sendBtn) {
      sendBtn.addEventListener("click", () => sendQuestion());
    }

    if (chatInput) {
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendQuestion();
        }
      });
    }

    // Connect Prompt Chips
    document.querySelectorAll(".prompt-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const text = chip.dataset.prompt || chip.textContent.trim();
        sendQuestion(text);
      });
    });
  }

  return {
    init,
    sendQuestion
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  AiChatModule.init();
});
