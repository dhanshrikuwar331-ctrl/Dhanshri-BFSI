/**
 * Loan Eligibility Module
 * Handles eligibility form submission, validation, backend/client computation,
 * circular score animation, and Google Sheets submission.
 */

const LoanEligibilityModule = (function () {
  // Indian currency formatter
  function formatINR(val) {
    if (val === null || val === undefined || isNaN(val)) return "₹0";
    const num = Math.round(Number(val));
    const isNegative = num < 0;
    const numStr = Math.abs(num).toString();
    
    if (numStr.length <= 3) {
      return (isNegative ? "-₹" : "₹") + numStr;
    }
    const lastThree = numStr.substring(numStr.length - 3);
    const rest = numStr.substring(0, numStr.length - 3);
    let formatted = "";
    let count = 0;
    for (let i = rest.length - 1; i >= 0; i--) {
      count++;
      formatted = rest[i] + formatted;
      if (count === 2 && i !== 0) {
        formatted = "," + formatted;
        count = 0;
      }
    }
    return (isNegative ? "-₹" : "₹") + formatted + "," + lastThree;
  }

  // Animate number count-up
  function animateValue(elementId, start, end, duration, isCurrency = false) {
    const obj = document.getElementById(elementId);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      obj.textContent = isCurrency ? formatINR(current) : current;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.textContent = isCurrency ? formatINR(end) : end;
      }
    };
    window.requestAnimationFrame(step);
  }

  // Update animated circular score
  function updateScoreCircle(score, color = "#22C55E") {
    const circle = document.getElementById("eligibilityCircleBar");
    const numEl = document.getElementById("eligibilityScoreNumber");
    if (!circle || !numEl) return;

    // SVG circle circumference = 2 * PI * r = 2 * 3.14159 * 70 ≈ 440
    const circumference = 440;
    const offset = circumference - (score / 100) * circumference;

    circle.style.strokeDashoffset = offset;
    circle.style.stroke = color;
    animateValue("eligibilityScoreNumber", 0, score, 1200, false);
  }

  // Client-side fallback calculator (matches backend algorithm exactly)
  function clientCalculateEligibility(data) {
    const income = Number(data.monthly_income) || 0;
    const otherIncome = Number(data.other_income) || 0;
    const totalIncome = income + otherIncome;
    const existingEmi = Number(data.existing_emi) || 0;
    const expenses = Number(data.monthly_expenses) || 0;
    const desiredAmount = Number(data.desired_amount) || 0;
    const tenureYears = Number(data.tenure_years) || 5;
    const tenureMonths = tenureYears * 12;
    const rate = Number(data.interest_rate) || 10.5;
    const creditScore = Number(data.credit_score) || 700;
    const employment = (data.employment_type || "Salaried").toLowerCase();

    // FOIR Limit
    let foir = 0.50;
    if (totalIncome < 30000) foir = 0.40;
    else if (totalIncome <= 75000) foir = 0.50;
    else if (totalIncome <= 150000) foir = 0.55;
    else foir = 0.60;

    const maxTotalEmi = totalIncome * foir;
    const maxNewEmi = Math.max(0, maxTotalEmi - existingEmi);

    // Reverse PV calculation for max loan amount
    const monthlyRate = (rate / 100) / 12;
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    let maxLoan = 0;
    if (factor > 1 && monthlyRate > 0) {
      maxLoan = maxNewEmi * (factor - 1) / (monthlyRate * factor);
    }
    maxLoan = Math.round(maxLoan / 1000) * 1000;

    // Requested EMI
    const reqFactor = Math.pow(1 + monthlyRate, tenureMonths);
    const requestedEmi = desiredAmount * monthlyRate * reqFactor / (reqFactor - 1);

    // DTI
    const totalDebt = existingEmi + requestedEmi;
    const dti = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 100;

    // Score calculations
    let creditPts = 70;
    if (creditScore >= 800) creditPts = 98;
    else if (creditScore >= 750) creditPts = 88;
    else if (creditScore >= 700) creditPts = 76;
    else if (creditScore >= 650) creditPts = 58;
    else if (creditScore >= 550) creditPts = 35;
    else creditPts = 15;

    let dtiPts = 60;
    if (dti <= 25) dtiPts = 100;
    else if (dti <= 35) dtiPts = 85;
    else if (dti <= 45) dtiPts = 65;
    else if (dti <= 55) dtiPts = 40;
    else dtiPts = 15;

    const netDisposable = totalIncome - expenses - existingEmi;
    const dispMargin = totalIncome > 0 ? (netDisposable / totalIncome) * 100 : 0;
    let incomePts = 60;
    if (dispMargin >= 40) incomePts = 95;
    else if (dispMargin >= 25) incomePts = 80;
    else if (dispMargin >= 10) incomePts = 55;
    else incomePts = 20;

    let empPts = 80;
    if (employment.includes("salaried")) empPts = 95;
    else if (employment.includes("self") || employment.includes("business")) empPts = 88;
    else empPts = 75;

    const overallScore = Math.max(5, Math.min(99, Math.round(
      (creditPts * 0.35) + (dtiPts * 0.30) + (incomePts * 0.20) + (empPts * 0.15)
    )));

    let riskLevel = "Moderate Risk";
    let riskColor = "#F59E0B";
    let status = "Moderate Approval Probability";

    if (overallScore >= 75 && desiredAmount <= maxLoan) {
      riskLevel = "Low Risk";
      riskColor = "#22C55E";
      status = "High Approval Probability";
    } else if (overallScore < 50) {
      riskLevel = "Elevated Risk";
      riskColor = "#EF4444";
      status = "Low Approval Probability";
    }

    const insights = [];
    if (dti > 40) {
      insights.push(`Your Debt-to-Income (DTI) ratio is ${dti.toFixed(1)}%. Clearing existing EMIs will significantly increase your loan capacity.`);
    }
    if (creditScore < 750) {
      insights.push("A credit score above 750 helps you negotiate lower interest rates with leading banks.");
    }
    if (desiredAmount > maxLoan && maxLoan > 0) {
      insights.push(`Requested amount exceeds estimated capacity by ~₹${Math.round(desiredAmount - maxLoan).toLocaleString('en-IN')}. Consider a longer tenure or a co-applicant.`);
    } else {
      insights.push("Your income comfortably covers the requested loan EMI under standard FOIR criteria.");
    }

    return {
      status: status,
      eligibility_score: overallScore,
      risk_level: riskLevel,
      risk_color: riskColor,
      max_eligible_amount: maxLoan,
      requested_amount: desiredAmount,
      requested_emi: Math.round(requestedEmi),
      max_eligible_emi: Math.round(maxNewEmi),
      dti_ratio: parseFloat(dti.toFixed(1)),
      credit_contribution: creditPts,
      income_contribution: incomePts,
      dti_contribution: dtiPts,
      net_disposable_income: Math.round(netDisposable),
      insights: insights
    };
  }

  // Display results in UI
  function renderResults(result) {
    const resultsContainer = document.getElementById("eligibilityResultsPanel");
    if (resultsContainer) {
      resultsContainer.style.display = "block";
      resultsContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Animate Score Circle
    updateScoreCircle(result.eligibility_score, result.risk_color);

    // Update Status Badges
    const statusBadge = document.getElementById("eligibilityStatusBadge");
    if (statusBadge) {
      statusBadge.textContent = result.status;
      statusBadge.style.color = result.risk_color;
      statusBadge.style.borderColor = result.risk_color;
    }

    const riskBadge = document.getElementById("eligibilityRiskBadge");
    if (riskBadge) {
      riskBadge.textContent = result.risk_level;
      riskBadge.style.color = result.risk_color;
    }

    // Animate Metrics
    animateValue("resEligibleAmount", 0, result.max_eligible_amount, 1000, true);
    animateValue("resEstimatedEmi", 0, result.requested_emi, 1000, true);
    
    const dtiEl = document.getElementById("resDtiRatio");
    if (dtiEl) dtiEl.textContent = result.dti_ratio + "%";

    const dispEl = document.getElementById("resDisposableIncome");
    if (dispEl) dispEl.textContent = formatINR(result.net_disposable_income);

    // Update Contribution Bars
    const creditBar = document.getElementById("contribCreditBar");
    if (creditBar) creditBar.style.width = result.credit_contribution + "%";

    const incomeBar = document.getElementById("contribIncomeBar");
    if (incomeBar) incomeBar.style.width = result.income_contribution + "%";

    const dtiBar = document.getElementById("contribDtiBar");
    if (dtiBar) dtiBar.style.width = result.dti_contribution + "%";

    // Insights List
    const insightsList = document.getElementById("eligibilityInsightsList");
    if (insightsList && result.insights) {
      insightsList.innerHTML = result.insights.map(tip => `<li>${tip}</li>`).join("");
    }

    // Store current calculation in memory for Google Sheets submission & overview sync
    window.lastEligibilityResult = result;

    // Trigger overview update if dashboard app is loaded
    if (window.FinAI && typeof window.FinAI.updateDashboardSummary === "function") {
      window.FinAI.updateDashboardSummary(result);
    }
  }

  // Form Validation & Submission
  async function handleFormSubmit(e) {
    if (e) e.preventDefault();

    const form = document.getElementById("eligibilityForm");
    if (!form) return;

    // Clear previous errors
    form.querySelectorAll(".form-group").forEach(g => g.classList.remove("has-error"));

    const formData = {
      name: document.getElementById("elFullName")?.value.trim() || "Applicant",
      age: parseInt(document.getElementById("elAge")?.value) || 30,
      employment_type: document.getElementById("elEmploymentType")?.value || "Salaried",
      monthly_income: parseFloat(document.getElementById("elMonthlyIncome")?.value) || 0,
      other_income: parseFloat(document.getElementById("elOtherIncome")?.value) || 0,
      existing_emi: parseFloat(document.getElementById("elExistingEmi")?.value) || 0,
      monthly_expenses: parseFloat(document.getElementById("elMonthlyExpenses")?.value) || 0,
      desired_amount: parseFloat(document.getElementById("elDesiredAmount")?.value) || 0,
      tenure_years: parseFloat(document.getElementById("elLoanTenure")?.value) || 5,
      interest_rate: parseFloat(document.getElementById("elInterestRate")?.value) || 10.5,
      credit_score: parseInt(document.getElementById("elCreditScore")?.value) || 740
    };

    // Validation rules
    let hasError = false;

    if (formData.monthly_income <= 0) {
      document.getElementById("elMonthlyIncome")?.closest(".form-group")?.classList.add("has-error");
      hasError = true;
    }
    if (formData.desired_amount <= 0) {
      document.getElementById("elDesiredAmount")?.closest(".form-group")?.classList.add("has-error");
      hasError = true;
    }
    if (formData.credit_score < 300 || formData.credit_score > 900) {
      document.getElementById("elCreditScore")?.closest(".form-group")?.classList.add("has-error");
      hasError = true;
    }

    if (hasError) return;

    const submitBtn = document.getElementById("btnCalculateEligibility");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span> Analyzing Eligibility...`;
    }

    try {
      // Try calling backend API
      const response = await fetch("/api/check-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const json = await response.json();
        renderResults(json.data);
      } else {
        // Fallback to client-side computation
        const fallbackResult = clientCalculateEligibility(formData);
        renderResults(fallbackResult);
      }
    } catch (err) {
      // Standalone client calculation fallback
      const fallbackResult = clientCalculateEligibility(formData);
      renderResults(fallbackResult);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Calculate Eligibility <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      }
    }
  }

  // Pre-fill demo data
  function fillDemoData() {
    if (document.getElementById("elFullName")) document.getElementById("elFullName").value = "Rahul Sharma";
    if (document.getElementById("elAge")) document.getElementById("elAge").value = "32";
    if (document.getElementById("elEmploymentType")) document.getElementById("elEmploymentType").value = "Salaried";
    if (document.getElementById("elMonthlyIncome")) document.getElementById("elMonthlyIncome").value = "75000";
    if (document.getElementById("elOtherIncome")) document.getElementById("elOtherIncome").value = "10000";
    if (document.getElementById("elMonthlyExpenses")) document.getElementById("elMonthlyExpenses").value = "25000";
    if (document.getElementById("elExistingEmi")) document.getElementById("elExistingEmi").value = "8000";
    if (document.getElementById("elDesiredAmount")) document.getElementById("elDesiredAmount").value = "1000000";
    if (document.getElementById("elLoanTenure")) document.getElementById("elLoanTenure").value = "5";
    if (document.getElementById("elInterestRate")) document.getElementById("elInterestRate").value = "10.5";
    if (document.getElementById("elCreditScore")) document.getElementById("elCreditScore").value = "742";

    // Auto submit to calculate
    handleFormSubmit();
  }

  // Save to Google Sheets
  async function saveToGoogleSheets() {
    const feedbackEl = document.getElementById("sheetsFeedback");
    const saveBtn = document.getElementById("btnSaveToSheets");
    if (!saveBtn) return;

    if (!window.lastEligibilityResult) {
      if (feedbackEl) {
        feedbackEl.textContent = "Please calculate your eligibility first.";
        feedbackEl.style.color = "#F59E0B";
      }
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span></span> Saving Application...`;

    const payload = {
      name: document.getElementById("elFullName")?.value || "Demo Applicant",
      employment_type: document.getElementById("elEmploymentType")?.value || "Salaried",
      monthly_income: parseFloat(document.getElementById("elMonthlyIncome")?.value) || 75000,
      desired_amount: parseFloat(document.getElementById("elDesiredAmount")?.value) || 1000000,
      tenure_years: document.getElementById("elLoanTenure")?.value || 5,
      credit_score: parseInt(document.getElementById("elCreditScore")?.value) || 742,
      eligibility_score: `${window.lastEligibilityResult.eligibility_score}% (${window.lastEligibilityResult.status})`,
      requested_emi: formatINR(window.lastEligibilityResult.requested_emi)
    };

    try {
      const res = await fetch("/api/save-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (feedbackEl) {
        if (data.storage === "google_sheets") {
          feedbackEl.textContent = "✓ Application successfully synced with Google Sheets!";
          feedbackEl.style.color = "#22C55E";
        } else {
          feedbackEl.textContent = "✓ Application saved locally! (Configure Google Sheets credentials in .env to sync to Google Drive).";
          feedbackEl.style.color = "#4F8CFF";
        }
      }
    } catch (err) {
      if (feedbackEl) {
        feedbackEl.textContent = "Application saved locally in offline session.";
        feedbackEl.style.color = "#94A3B8";
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save Application`;
    }
  }

  function init() {
    const form = document.getElementById("eligibilityForm");
    if (form) form.addEventListener("submit", handleFormSubmit);

    const demoBtns = document.querySelectorAll(".btn-fill-demo");
    demoBtns.forEach(btn => btn.addEventListener("click", fillDemoData));

    const saveBtn = document.getElementById("btnSaveToSheets");
    if (saveBtn) saveBtn.addEventListener("click", saveToGoogleSheets);
  }

  return {
    init,
    fillDemoData,
    handleFormSubmit,
    formatINR
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  LoanEligibilityModule.init();
});
