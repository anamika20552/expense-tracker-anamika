const STORAGE_KEY = "expenseTrackerTransactions";

let transactions = loadTransactions();
let editingId = null;

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

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 2
  }).format(amount);
}

function updateSummary() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  document.getElementById("totalIncome").textContent = formatCurrency(income);
  document.getElementById("totalExpense").textContent = formatCurrency(expenses);
  document.getElementById("balance").textContent = formatCurrency(income - expenses);
}

function getFilteredTransactions() {
    const type = typeFilter.value;
    const category = categoryFilter.value.trim().toLowerCase();

    return transactions.filter(transaction => {
        const matchesType =
            type === "all" || transaction.type === type;

        const matchesCategory =
            transaction.category
                .trim()
                .toLowerCase()
                .includes(category);

        return matchesType && matchesCategory;
    }).sort((a, b) =>
        b.date.localeCompare(a.date)
    );
}

function displayTransactions() {
  const filtered = getFilteredTransactions();
  list.replaceChildren();
  document.getElementById("transactionCount").textContent =
    `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;

  document.getElementById("emptyState").classList.toggle("visible", filtered.length === 0);

  for (const item of filtered) {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = item.date;

    const detailsCell = document.createElement("td");
    const title = document.createElement("span");
    title.className = "detail-title";
    title.textContent = item.description;
    const category = document.createElement("span");
    category.className = "detail-category";
    category.textContent = item.category;
    detailsCell.append(title, category);

    const amountCell = document.createElement("td");
    amountCell.className = `amount ${item.type}`;
    amountCell.textContent = `${item.type === "income" ? "+" : "−"}${formatCurrency(Number(item.amount))}`;

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

function refresh() {
  saveTransactions();
  updateSummary();
  displayTransactions();
}

function resetForm() {
  form.reset();
  typeInput.value = "expense";
  dateInput.value = new Date().toLocaleDateString("en-CA");
  editingId = null;
  document.getElementById("formTitle").textContent = "Add transaction";
  document.getElementById("submitButton").textContent = "Add transaction";
  document.getElementById("cancelEdit").classList.add("hidden");
  formError.textContent = "";
}

form.addEventListener("submit", event => {
  event.preventDefault();
  formError.textContent = "";

  const amount = Number(amountInput.value);
  const category = categoryInput.value.trim();
  const description = descriptionInput.value.trim();
  const date = dateInput.value;

  if (!Number.isFinite(amount) || amount <= 0) {
    formError.textContent = "Please enter an amount greater than zero.";
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
    transactions = transactions.map(item => item.id === editingId ? record : item);
  } else {
    transactions.push(record);
  }

  refresh();
  resetForm();
});

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

function deleteTransaction(id) {
  const item = transactions.find(transaction => transaction.id === id);
  if (!item) return;
  if (!window.confirm(`Delete the transaction "${item.description}"?`)) return;

  transactions = transactions.filter(transaction => transaction.id !== id);
  if (editingId === id) resetForm();
  refresh();
}

document.getElementById("cancelEdit").addEventListener("click", resetForm);
typeFilter.addEventListener("change", displayTransactions);
categoryFilter.addEventListener("input", displayTransactions);

document.getElementById("todayLabel").textContent =
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date());

resetForm();
updateSummary();
displayTransactions();
