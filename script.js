
const STORAGE_KEY = "expenseTrackerTransactions";

let transactions = loadTransactions();
let editingId = null;
let categoryChartInstance = null;

// Form elements
const form = document.getElementById("transactionForm");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const descriptionInput = document.getElementById("description");
const list = document.getElementById("transactionList");
const typeFilter = document.getElementById("typeFilter");
const categoryFilter = document.getElementById("categoryFilter");
const formError = document.getElementById("formError");

// Monthly summary and chart elements
const summaryMonth = document.getElementById("summaryMonth");
const monthlyIncome = document.getElementById("monthlyIncome");
const monthlyExpense = document.getElementById("monthlyExpense");
const monthlyBalance = document.getElementById("monthlyBalance");
const categoryChart = document.getElementById("categoryChart");
const chartEmpty = document.getElementById("chartEmpty");

// Load transactions from localStorage
function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Save transactions to localStorage
function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// Format currency in INR
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(amount);
}

// Get today's date in local YYYY-MM-DD format
function getLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Update overall summary
function updateSummary() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  document.getElementById("totalIncome").textContent =
    formatCurrency(income);

  document.getElementById("totalExpense").textContent =
    formatCurrency(expenses);

  document.getElementById("balance").textContent =
    formatCurrency(income - expenses);
}

// Filter transactions by type and category
function getFilteredTransactions() {
  const type = typeFilter.value;
  const category = categoryFilter.value.trim().toLowerCase();

  return transactions
    .filter(transaction => {
      const matchesType =
        type === "all" || transaction.type === type;

      const matchesCategory =
        transaction.category.trim().toLowerCase().includes(category);

      return matchesType && matchesCategory;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Display transactions in the table
function displayTransactions() {
  const filtered = getFilteredTransactions();

  list.replaceChildren();

  document.getElementById("transactionCount").textContent =
    `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;

  document.getElementById("emptyState").classList.toggle(
    "visible",
    filtered.length === 0
  );

  for (const item of filtered) {
    const row = document.createElement("tr");

    // Date
    const dateCell = document.createElement("td");
    dateCell.textContent = item.date;

    // Description and category
    const detailsCell = document.createElement("td");

    const title = document.createElement("span");
    title.className = "detail-title";
    title.textContent = item.description;

    const category = document.createElement("span");
    category.className = "detail-category";
    category.textContent = item.category;

    detailsCell.append(title, category);

    // Amount
    const amountCell = document.createElement("td");
    amountCell.className = `amount ${item.type}`;
    amountCell.textContent =
      `${item.type === "income" ? "+" : "−"}${formatCurrency(Number(item.amount))}`;

    // Edit and Delete buttons
    const actionsCell = document.createElement("td");
    actionsCell.className = "action-cell";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "action-button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${item.description}`);
    editButton.addEventListener("click", () => startEdit(item.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-button delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${item.description}`);
    deleteButton.addEventListener("click", () => deleteTransaction(item.id));

    actionsCell.append(editButton, deleteButton);
    row.append(dateCell, detailsCell, amountCell, actionsCell);
    list.appendChild(row);
  }
}

// Update monthly summary
function updateMonthlySummary() {
  const selectedMonth = summaryMonth.value;

  if (!selectedMonth) return;

  const monthlyTransactions = transactions.filter(item =>
    item.date.startsWith(selectedMonth)
  );

  const income = monthlyTransactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expenses = monthlyTransactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  monthlyIncome.textContent = formatCurrency(income);
  monthlyExpense.textContent = formatCurrency(expenses);
  monthlyBalance.textContent = formatCurrency(income - expenses);
}

// Update category-wise expense chart
function updateCategoryChart() {
  const selectedMonth = summaryMonth.value;

  if (!selectedMonth) return;

  const expenses = transactions.filter(item =>
    item.type === "expense" &&
    item.date.startsWith(selectedMonth)
  );

  // Group expenses by category
  const categoryTotals = {};

  expenses.forEach(item => {
    const category = item.category.trim();
    categoryTotals[category] =
      (categoryTotals[category] || 0) + Number(item.amount);
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  // No expenses for the selected month
  if (labels.length === 0) {
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }

    chartEmpty.classList.add("visible");
    categoryChart.style.display = "none";
    return;
  }

  chartEmpty.classList.remove("visible");
  categoryChart.style.display = "block";

  // Check that Chart.js is loaded
  if (typeof Chart === "undefined") {
    chartEmpty.textContent =
      "Chart.js could not be loaded. Please check your internet connection.";
    chartEmpty.classList.add("visible");
    categoryChart.style.display = "none";
    return;
  }

  // Destroy the old chart before creating a new one
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(categoryChart, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        label: "Expenses",
        data: values,
        backgroundColor: [
          "#5368cc",
          "#20a779",
          "#f59e0b",
          "#ef6461",
          "#8b5cf6",
          "#06b6d4",
          "#ec4899",
          "#84cc16",
          "#64748b",
          "#f97316"
        ],
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      }
    }
  });
}

// Refresh all transaction-related displays
function refresh() {
  saveTransactions();
  updateSummary();
  displayTransactions();
  updateMonthlySummary();
  updateCategoryChart();
}

// Reset the transaction form
function resetForm() {
  form.reset();

  typeInput.value = "expense";
  dateInput.value = getLocalDate();
  editingId = null;

  document.getElementById("formTitle").textContent = "Add transaction";
  document.getElementById("submitButton").textContent = "Add transaction";
  document.getElementById("cancelEdit").classList.add("hidden");

  formError.textContent = "";
}

// Add or update a transaction
form.addEventListener("submit", event => {
  event.preventDefault();
  formError.textContent = "";

  const amount = Number(amountInput.value);
  const category = categoryInput.value.trim();
  const description = descriptionInput.value.trim();
  const date = dateInput.value;

  if (!Number.isFinite(amount) || amount <= 0) {
    formError.textContent =
      "Please enter an amount greater than zero.";
    amountInput.focus();
    return;
  }

  if (!category || !description || !date) {
    formError.textContent = "Please complete all fields.";
    return;
  }

  const record = {
    id: editingId ?? Date.now(),
    type: typeInput.value,
    amount,
    category,
    date,
    description
  };

  if (editingId !== null) {
    transactions = transactions.map(item =>
      item.id === editingId ? record : item
    );
  } else {
    transactions.push(record);
  }

  refresh();
  resetForm();
});

// Edit a transaction
function startEdit(id) {
  const item = transactions.find(transaction => transaction.id === id);
  if (!item) return;

  editingId = id;

  typeInput.value = item.type;
  amountInput.value = item.amount;
  categoryInput.value = item.category;
  dateInput.value = item.date;
  descriptionInput.value = item.description;

  document.getElementById("formTitle").textContent = "Edit transaction";
  document.getElementById("submitButton").textContent = "Save changes";
  document.getElementById("cancelEdit").classList.remove("hidden");

  formError.textContent = "";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Delete a transaction
function deleteTransaction(id) {
  const item = transactions.find(transaction => transaction.id === id);
  if (!item) return;

  if (!window.confirm(`Delete the transaction "${item.description}"?`)) {
    return;
  }

  transactions = transactions.filter(transaction => transaction.id !== id);

  if (editingId === id) {
    resetForm();
  }

  refresh();
}

// Event listeners
document.getElementById("cancelEdit").addEventListener("click", resetForm);

typeFilter.addEventListener("change", displayTransactions);

categoryFilter.addEventListener("input", displayTransactions);

summaryMonth.addEventListener("change", () => {
  updateMonthlySummary();
  updateCategoryChart();
});

// Display today's date
document.getElementById("todayLabel").textContent =
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date());

// Initialize the application
resetForm();

// Set the monthly summary to the current month
summaryMonth.value = getLocalDate().slice(0, 7);

// Initial display
updateSummary();
displayTransactions();
updateMonthlySummary();
updateCategoryChart();