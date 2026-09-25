/**
 * Credit Score Analyzer Module
 * Handles synchronized slider/number inputs, gauge rendering, factor breakdowns,
 * and educational credit simulation.
 */

const CreditAnalyzerModule = (function () {
  const CATEGORIES = [
    { min: 300, max: 549, label: "Poor", color: "#EF4444", desc: "High interest rates likely; high risk of loan rejection.", health: "Critical" },
    { min: 550, max: 649, label: "Fair", color: "#F59E0B", desc: "May qualify for secured loans or NBFC personal loans with higher rates.", health: "Needs Attention" },
    { min: 650, max: 749, label: "Good", color: "#00D4FF", desc: "Eligible for most personal and home loans at standard market rates.", health: "Healthy" },
    { min: 750, max: 799, label: "Very Good", color: "#7C5CFC", desc: "Strong borrower profile. Fast approvals, competitive processing fees.", health: "Strong" },
    { min: 800, max: 900, label: "Excellent", color: "#22C55E", desc: "Top-tier credit profile. Prime interest rates and pre-approved offers.", health: "Excellent" }
  ];

  function getScoreCategory(score) {
    for (const cat of CATEGORIES) {
      if (score >= cat.min && score <= cat.max) {
        return cat;
      }
    }
    return CATEGORIES[2]; // Default to Good
  }

  function updateCreditUI(score) {
    const clamped = Math.max(300, Math.min(900, score));
    const cat = getScoreCategory(clamped);

    // Sync input and slider
    const slider = document.getElementById("creditScoreSlider");
    const numInput = document.getElementById("creditScoreInput");
    if (slider && parseInt(slider.value) !== clamped) slider.value = clamped;
    if (numInput && parseInt(numInput.value) !== clamped) numInput.value = clamped;

    // Update Score Badge & Title
    const categoryBadge = document.getElementById("creditCategoryBadge");
    if (categoryBadge) {
      categoryBadge.textContent = cat.label;
      categoryBadge.style.color = cat.color;
      categoryBadge.style.borderColor = cat.color;
      categoryBadge.style.background = `${cat.color}22`;
    }

    const healthBadge = document.getElementById("creditHealthBadge");
    if (healthBadge) {
      healthBadge.textContent = cat.health;
      healthBadge.style.color = cat.color;
    }

    const descEl = document.getElementById("creditCategoryDesc");
    if (descEl) {
      descEl.textContent = cat.desc;
    }

    const scoreDisplay = document.getElementById("creditScoreDisplay");
    if (scoreDisplay) {
      scoreDisplay.textContent = clamped;
      scoreDisplay.style.color = cat.color;
    }

    // Update Credit Meter Fill / Gauge
    // 300 to 900 is a span of 600 points
    const percentage = Math.round(((clamped - 300) / 600) * 100);
    const gaugeFill = document.getElementById("creditGaugeProgress");
    if (gaugeFill) {
      // Circumference = 2 * PI * 80 ≈ 502
      const circumference = 502;
      const offset = circumference - (percentage / 100) * circumference;
      gaugeFill.style.strokeDashoffset = offset;
      gaugeFill.style.stroke = cat.color;
    }

    // Dynamic factor simulation values based on score
    updateFactors(clamped);

    // Sync with eligibility form field if present
    const elCreditInput = document.getElementById("elCreditScore");
    if (elCreditInput && parseInt(elCreditInput.value) !== clamped) {
      elCreditInput.value = clamped;
    }

    // Trigger dashboard update
    if (window.FinAI && typeof window.FinAI.onCreditScoreChange === "function") {
      window.FinAI.onCreditScoreChange(clamped, cat);
    }
  }

  function updateFactors(score) {
    const factorRatio = (score - 300) / 600; // 0 to 1

    const paymentVal = Math.min(100, Math.round(45 + factorRatio * 55));
    const utilVal = Math.max(10, Math.round(95 - factorRatio * 65)); // Lower utilization is better
    const historyVal = Math.min(100, Math.round(35 + factorRatio * 65));
    const mixVal = Math.min(100, Math.round(40 + factorRatio * 60));
    const inquiryVal = Math.max(5, Math.round(90 - factorRatio * 75)); // Fewer inquiries is better

    setFactor("factorPayment", paymentVal, `${paymentVal}% On-Time`);
    setFactor("factorUtil", 100 - utilVal, `${utilVal}% Utilized (Low is ideal)`);
    setFactor("factorHistory", historyVal, `${Math.round(historyVal / 10)} Years Vintage`);
    setFactor("factorMix", mixVal, "Healthy Mix");
    setFactor("factorInquiries", 100 - inquiryVal, "Low Inquiries");
  }

  function setFactor(id, val, text) {
    const bar = document.getElementById(`${id}Bar`);
    const txt = document.getElementById(`${id}Txt`);
    if (bar) bar.style.width = `${val}%`;
    if (txt) txt.textContent = text;
  }

  function init() {
    const slider = document.getElementById("creditScoreSlider");
    const numInput = document.getElementById("creditScoreInput");

    if (slider) {
      slider.addEventListener("input", (e) => {
        updateCreditUI(parseInt(e.target.value) || 700);
      });
    }

    if (numInput) {
      numInput.addEventListener("input", (e) => {
        let val = parseInt(e.target.value);
        if (!isNaN(val)) {
          updateCreditUI(val);
        }
      });
    }

    // Quick score selection chips
    document.querySelectorAll(".score-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = parseInt(btn.dataset.score);
        if (val) updateCreditUI(val);
      });
    });

    // Initial render with default 742
    updateCreditUI(742);
  }

  return {
    init,
    updateCreditUI
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  CreditAnalyzerModule.init();
});
