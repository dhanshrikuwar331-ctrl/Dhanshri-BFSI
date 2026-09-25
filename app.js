/**
 * FinAI - Core Application Controller
 * Handles tab navigation, mobile sidebar, backend health checks,
 * financial state synchronization, and activity streaming.
 */

window.FinAI = (function () {
  let backendOnline = false;

  // Global state across tools
  const state = {
    monthlyIncome: 75000,
    monthlyExpenses: 25000,
    existingEmi: 8000,
    creditScore: 742,
    eligibilityScore: 78,
    maxEligibleAmount: 1850000,
    currentEmi: 21494
  };

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

  // Check Backend Connection
  async function checkBackendHealth() {
    const statusPill = document.getElementById("backendStatusPill");
    const statusDot = document.getElementById("backendStatusDot");
    const statusText = document.getElementById("backendStatusText");

    try {
      const res = await fetch("/api/health", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        backendOnline = true;
        if (statusDot) {
          statusDot.className = "status-dot online";
        }
        if (statusText) {
          statusText.textContent = "Backend: Connected";
        }
        if (statusPill) {
          statusPill.title = `API Active • Claude: ${data.integrations?.claude_ai || 'Ready'} • Sheets: ${data.integrations?.google_sheets || 'Ready'}`;
        }
        return;
      }
    } catch (e) {
      // Backend not running on same origin
    }

    backendOnline = false;
    if (statusDot) {
      statusDot.className = "status-dot standalone";
    }
    if (statusText) {
      statusText.textContent = "Standalone Mode";
    }
    if (statusPill) {
      statusPill.title = "Frontend running in standalone browser mode. Local financial engines active.";
    }
  }

  // Switch Active Tab View
  function switchTab(targetTabId) {
    // Hide all tab views
    document.querySelectorAll(".tab-view").forEach(view => {
      view.classList.remove("active");
    });

    // Deselect sidebar items
    document.querySelectorAll(".sidebar-item").forEach(item => {
      item.classList.remove("active");
    });

    // Activate selected view
    const targetView = document.getElementById(targetTabId);
    if (targetView) {
      targetView.classList.add("active");
    }

    // Highlight matching sidebar item
    const matchingNav = document.querySelector(`.sidebar-item[data-tab="${targetTabId}"]`);
    if (matchingNav) {
      matchingNav.classList.add("active");
    }

    // Update Topbar Title
    const titleMap = {
      "view-overview": "Financial Health Dashboard",
      "view-eligibility": "Loan Eligibility Checker",
      "view-credit": "Credit Score Analyzer",
      "view-emi": "EMI Calculator",
      "view-ai": "AI Financial Tips & Guidance",
      "view-profile": "Borrower Profile",
      "view-settings": "System Settings & Privacy"
    };

    const topbarTitle = document.getElementById("topbarPageTitle");
    if (topbarTitle && titleMap[targetTabId]) {
      topbarTitle.textContent = titleMap[targetTabId];
    }

    // Close mobile sidebar
    closeMobileSidebar();

    // Update URL hash
    const hash = targetTabId.replace("view-", "");
    history.replaceState(null, null, `#${hash}`);
  }

  function openMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.add("open");
    if (backdrop) backdrop.classList.add("active");
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("active");
  }

  // Synchronize dashboard summary cards and chart
  function updateDashboardSummary(eligibilityData) {
    if (eligibilityData) {
      state.eligibilityScore = eligibilityData.eligibility_score;
      state.maxEligibleAmount = eligibilityData.max_eligible_amount;
      state.currentEmi = eligibilityData.requested_emi;
    }

    // 1. Loan Eligibility Card
    const elCardVal = document.getElementById("sumCardEligibilityVal");
    if (elCardVal) {
      elCardVal.textContent = `${state.eligibilityScore}%`;
    }
    const elCardSub = document.getElementById("sumCardEligibilitySub");
    if (elCardSub) {
      elCardSub.textContent = `Eligible up to ${formatINR(state.maxEligibleAmount)}`;
    }

    // 2. Credit Score Card
    const creditCardVal = document.getElementById("sumCardCreditVal");
    if (creditCardVal) {
      creditCardVal.textContent = state.creditScore;
    }

    // 3. Monthly EMI Card
    const emiCardVal = document.getElementById("sumCardEmiVal");
    if (emiCardVal) {
      emiCardVal.textContent = formatINR(state.currentEmi);
    }

    // 4. Financial Health Index (composite)
    const healthCardVal = document.getElementById("sumCardHealthVal");
    if (healthCardVal) {
      const compositeHealth = Math.round((state.eligibilityScore * 0.6) + ((state.creditScore / 900) * 40));
      healthCardVal.textContent = `${compositeHealth}/100`;
    }

    // Update Overview Financial Breakdown Bars
    updateOverviewBars();
  }

  function updateOverviewBars() {
    const income = state.monthlyIncome;
    const expenses = state.monthlyExpenses;
    const emis = state.existingEmi + state.currentEmi;
    const disposable = Math.max(0, income - expenses - emis);

    const valIncome = document.getElementById("barValIncome");
    const valExpenses = document.getElementById("barValExpenses");
    const valEmis = document.getElementById("barValEmis");
    const valDisposable = document.getElementById("barValDisposable");

    if (valIncome) valIncome.textContent = formatINR(income);
    if (valExpenses) valExpenses.textContent = formatINR(expenses);
    if (valEmis) valEmis.textContent = formatINR(emis);
    if (valDisposable) valDisposable.textContent = formatINR(disposable);

    // Percentage of income for visual bars
    const expPct = income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : 0;
    const emiPct = income > 0 ? Math.min(100, Math.round((emis / income) * 100)) : 0;
    const dispPct = income > 0 ? Math.min(100, Math.round((disposable / income) * 100)) : 0;

    const fillIncome = document.getElementById("barFillIncome");
    const fillExpenses = document.getElementById("barFillExpenses");
    const fillEmis = document.getElementById("barFillEmis");
    const fillDisposable = document.getElementById("barFillDisposable");

    if (fillIncome) fillIncome.style.width = "100%";
    if (fillExpenses) fillExpenses.style.width = `${expPct}%`;
    if (fillEmis) fillEmis.style.width = `${emiPct}%`;
    if (fillDisposable) fillDisposable.style.width = `${dispPct}%`;
  }

  function onCreditScoreChange(newScore, category) {
    state.creditScore = newScore;
    const creditCardVal = document.getElementById("sumCardCreditVal");
    if (creditCardVal) {
      creditCardVal.textContent = newScore;
      creditCardVal.style.color = category.color;
    }
  }

  function onEmiChange(newEmi, principal, interest) {
    state.currentEmi = Math.round(newEmi);
    const emiCardVal = document.getElementById("sumCardEmiVal");
    if (emiCardVal) {
      emiCardVal.textContent = formatINR(state.currentEmi);
    }
    updateOverviewBars();
  }

  function setupEventListeners() {
    // Navigation items click
    document.querySelectorAll(".sidebar-item").forEach(item => {
      item.addEventListener("click", () => {
        const tab = item.dataset.tab;
        if (tab) switchTab(tab);
      });
    });

    // Summary cards click -> switch to relevant tool
    document.querySelectorAll(".summary-card").forEach(card => {
      card.addEventListener("click", () => {
        const tab = card.dataset.tab;
        if (tab) switchTab(tab);
      });
    });

    // Mobile Sidebar Toggles
    const toggleBtn = document.getElementById("btnToggleSidebar");
    if (toggleBtn) toggleBtn.addEventListener("click", openMobileSidebar);

    const backdrop = document.getElementById("sidebarBackdrop");
    if (backdrop) backdrop.addEventListener("click", closeMobileSidebar);

    // Check URL Hash on load
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const tabId = `view-${hash}`;
      const targetView = document.getElementById(tabId);
      if (targetView) {
        switchTab(tabId);
      }
    }
  }

  function init() {
    setupEventListeners();
    checkBackendHealth();
    updateDashboardSummary();

    // Check backend health periodically every 30 seconds
    setInterval(checkBackendHealth, 30000);
  }

  return {
    init,
    switchTab,
    updateDashboardSummary,
    onCreditScoreChange,
    onEmiChange,
    formatINR
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  FinAI.init();
});
