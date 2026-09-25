/**
 * EMI Calculator Module
 * Real-time loan repayment calculator with SVG donut breakdown and amortization table.
 */

const EmiCalculatorModule = (function () {
  let isTenureInYears = true;

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

  function calculate() {
    const principal = parseFloat(document.getElementById("emiPrincipalInput")?.value) || 1000000;
    const rateAnnual = parseFloat(document.getElementById("emiRateInput")?.value) || 10.5;
    const tenureRaw = parseFloat(document.getElementById("emiTenureInput")?.value) || 5;

    const tenureMonths = isTenureInYears ? Math.round(tenureRaw * 12) : Math.round(tenureRaw);

    let emi = 0;
    let totalPayment = 0;
    let totalInterest = 0;

    if (principal > 0 && tenureMonths > 0) {
      if (rateAnnual > 0) {
        const monthlyRate = (rateAnnual / 100) / 12;
        const factor = Math.pow(1 + monthlyRate, tenureMonths);
        emi = principal * monthlyRate * factor / (factor - 1);
        totalPayment = emi * tenureMonths;
        totalInterest = totalPayment - principal;
      } else {
        emi = principal / tenureMonths;
        totalPayment = principal;
        totalInterest = 0;
      }
    }

    // Update displays
    const emiDisplay = document.getElementById("emiResultMonthly");
    if (emiDisplay) emiDisplay.textContent = formatINR(emi);

    const principalDisplay = document.getElementById("emiResultPrincipal");
    if (principalDisplay) principalDisplay.textContent = formatINR(principal);

    const interestDisplay = document.getElementById("emiResultInterest");
    if (interestDisplay) interestDisplay.textContent = formatINR(totalInterest);

    const totalDisplay = document.getElementById("emiResultTotal");
    if (totalDisplay) totalDisplay.textContent = formatINR(totalPayment);

    // Update Donut Chart
    updateDonutChart(principal, totalInterest, totalPayment);

    // Update Amortization Table
    renderAmortization(principal, rateAnnual, tenureMonths, emi);

    // Sync with Dashboard overview
    if (window.FinAI && typeof window.FinAI.onEmiChange === "function") {
      window.FinAI.onEmiChange(emi, principal, totalInterest);
    }
  }

  function updateDonutChart(principal, interest, total) {
    const principalCircle = document.getElementById("emiDonutPrincipal");
    const interestCircle = document.getElementById("emiDonutInterest");
    const principalPercentEl = document.getElementById("emiPrincipalPercent");
    const interestPercentEl = document.getElementById("emiInterestPercent");

    if (!principalCircle || !interestCircle || total <= 0) return;

    const principalRatio = principal / total;
    const interestRatio = interest / total;

    const principalPct = Math.round(principalRatio * 100);
    const interestPct = 100 - principalPct;

    if (principalPercentEl) principalPercentEl.textContent = `${principalPct}%`;
    if (interestPercentEl) interestPercentEl.textContent = `${interestPct}%`;

    // SVG donut circumference = 2 * PI * 40 ≈ 251.2
    const circ = 251.2;
    const principalDash = circ * principalRatio;
    const interestDash = circ * interestRatio;

    principalCircle.style.strokeDasharray = `${principalDash} ${circ}`;
    principalCircle.style.strokeDashoffset = "0";

    interestCircle.style.strokeDasharray = `${interestDash} ${circ}`;
    interestCircle.style.strokeDashoffset = `-${principalDash}`;
  }

  function renderAmortization(principal, rateAnnual, totalMonths, emi) {
    const tableBody = document.getElementById("amortizationTableBody");
    if (!tableBody) return;

    let balance = principal;
    const monthlyRate = (rateAnnual / 100) / 12;
    let yearlyRows = [];
    let currentYearPrincipal = 0;
    let currentYearInterest = 0;
    let year = 1;

    for (let m = 1; m <= totalMonths; m++) {
      const monthInterest = balance * monthlyRate;
      const monthPrincipal = Math.min(balance, emi - monthInterest);
      balance = Math.max(0, balance - monthPrincipal);

      currentYearPrincipal += monthPrincipal;
      currentYearInterest += monthInterest;

      if (m % 12 === 0 || m === totalMonths) {
        yearlyRows.push({
          year: year,
          principalPaid: Math.round(currentYearPrincipal),
          interestPaid: Math.round(currentYearInterest),
          totalYearPaid: Math.round(currentYearPrincipal + currentYearInterest),
          endingBalance: Math.round(balance)
        });
        currentYearPrincipal = 0;
        currentYearInterest = 0;
        year++;
      }
    }

    tableBody.innerHTML = yearlyRows.map(row => `
      <tr>
        <td><strong>Year ${row.year}</strong></td>
        <td>${formatINR(row.principalPaid)}</td>
        <td>${formatINR(row.interestPaid)}</td>
        <td>${formatINR(row.totalYearPaid)}</td>
        <td>${formatINR(row.endingBalance)}</td>
      </tr>
    `).join("");
  }

  function syncInputs(sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    if (!slider || !input) return;

    slider.addEventListener("input", () => {
      input.value = slider.value;
      calculate();
    });

    input.addEventListener("input", () => {
      slider.value = input.value;
      calculate();
    });
  }

  function init() {
    syncInputs("emiPrincipalSlider", "emiPrincipalInput");
    syncInputs("emiRateSlider", "emiRateInput");
    syncInputs("emiTenureSlider", "emiTenureInput");

    // Tenure Toggle (Years vs Months)
    const toggleYearsBtn = document.getElementById("tenureToggleYears");
    const toggleMonthsBtn = document.getElementById("tenureToggleMonths");
    const tenureSlider = document.getElementById("emiTenureSlider");
    const tenureInput = document.getElementById("emiTenureInput");

    if (toggleYearsBtn && toggleMonthsBtn) {
      toggleYearsBtn.addEventListener("click", () => {
        if (isTenureInYears) return;
        isTenureInYears = true;
        toggleYearsBtn.classList.add("btn-primary");
        toggleYearsBtn.classList.remove("btn-secondary");
        toggleMonthsBtn.classList.remove("btn-primary");
        toggleMonthsBtn.classList.add("btn-secondary");

        const curMonths = parseFloat(tenureInput.value) || 60;
        const years = Math.max(1, Math.min(30, Math.round(curMonths / 12)));
        tenureSlider.max = 30;
        tenureSlider.min = 1;
        tenureSlider.value = years;
        tenureInput.value = years;
        document.getElementById("tenureUnitLabel").textContent = "Years";
        calculate();
      });

      toggleMonthsBtn.addEventListener("click", () => {
        if (!isTenureInYears) return;
        isTenureInYears = false;
        toggleMonthsBtn.classList.add("btn-primary");
        toggleMonthsBtn.classList.remove("btn-secondary");
        toggleYearsBtn.classList.remove("btn-primary");
        toggleYearsBtn.classList.add("btn-secondary");

        const curYears = parseFloat(tenureInput.value) || 5;
        const months = Math.max(6, Math.min(360, Math.round(curYears * 12)));
        tenureSlider.max = 360;
        tenureSlider.min = 6;
        tenureSlider.value = months;
        tenureInput.value = months;
        document.getElementById("tenureUnitLabel").textContent = "Months";
        calculate();
      });
    }

    calculate();
  }

  return {
    init,
    calculate
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  EmiCalculatorModule.init();
});
