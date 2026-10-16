// app.js
// The starting point. It connects the buttons and form to the functions
// that add, edit, delete and complete tasks.

import { state, makeTask, updateTaskFields, removeTaskById, toggleTask, toMinutes, todayAsText } from "./state.js";
import { loadTasks, loadSettings, saveTasks, saveSettings, checkImportedData, mergeImportedTasks, restoreSampleTasks } from "./storage.js";
import { renderTasks, renderDashboard, updateTagFilter, showStatus, showFieldError, clearFieldErrors } from "./ui.js";
import { validateTitle, validateDate, validateDuration, validateTag, validateTarget } from "./validators.js";
import { compileSearch } from "./search.js";

// Find the page elements we need, once.
const form = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const cancelButton = document.getElementById("cancel-edit-button");

// ---------- Form checking ----------
// Each rule lives in validators.js and returns an error message or "".
function checkForm(title, date, durationText, unit, tag) {
  clearFieldErrors();

  const errors = {
    title: validateTitle(title),
    date: validateDate(date),
    duration: validateDuration(durationText, unit),
    tag: validateTag(tag)
  };

  const names = ["title", "date", "duration", "tag"];
  let firstBadField = "";
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (errors[name] !== "") {
      showFieldError(name, errors[name]);
      if (firstBadField === "") firstBadField = name;
    }
  }

  // Move the keyboard focus to the first field with a problem.
  if (firstBadField !== "") {
    document.getElementById("task-" + firstBadField).focus();
    return false;
  }
  return true;
}

// ---------- Add and edit ----------

// Called when the form is submitted. If the hidden "task-id" box has a
// value we are editing; if it is empty we are adding a new task.
function saveTaskFromForm(event) {
  event.preventDefault(); // stop the page from reloading

  const id = document.getElementById("task-id").value;
  const title = document.getElementById("task-title").value.trim();
  const date = document.getElementById("task-date").value;
  const durationText = document.getElementById("task-duration").value.trim();
  const unit = document.getElementById("task-unit").value;
  const tag = document.getElementById("task-tag").value.trim();

  if (!checkForm(title, date, durationText, unit, tag)) {
    return;
  }

  const minutes = toMinutes(durationText, unit); // always store minutes

  if (id === "") {
    addTask(title, date, minutes, tag);
  } else {
    editTask(id, title, date, minutes, tag);
  }

  saveTasks();
  refreshList();
  resetForm();
}

function addTask(title, date, minutes, tag) {
  state.tasks.push(makeTask(title, date, minutes, tag));
  showStatus('Added "' + title + '".');
}

function editTask(id, title, date, minutes, tag) {
  const task = state.tasks.find(function (t) { return t.id === id; });
  if (!task) return;
  updateTaskFields(task, title, date, minutes, tag);
  showStatus('Saved changes to "' + title + '".');
}

// Put a task's values into the form so the user can change them.
function startEditing(id) {
  const task = state.tasks.find(function (t) { return t.id === id; });
  if (!task) return;

  clearFieldErrors();
  document.getElementById("task-id").value = task.id;
  document.getElementById("task-title").value = task.title;
  document.getElementById("task-date").value = task.dueDate;
  document.getElementById("task-duration").value = task.durationMinutes;
  document.getElementById("task-unit").value = "minutes";
  document.getElementById("task-tag").value = task.tag;

  document.getElementById("form-heading").textContent = "Edit Task";
  document.getElementById("save-button").textContent = "Save changes";
  cancelButton.hidden = false;

  document.getElementById("task-form-section").scrollIntoView();
  document.getElementById("task-title").focus();
}

// Empty the form and switch it back to "Add Task" mode.
function resetForm() {
  form.reset();
  document.getElementById("task-id").value = "";
  document.getElementById("task-unit").value = state.settings.displayUnit;
  document.getElementById("form-heading").textContent = "Add Task";
  document.getElementById("save-button").textContent = "Add task";
  cancelButton.hidden = true;
  clearFieldErrors();
}

// ---------- Delete and complete ----------

function deleteTask(id) {
  const task = state.tasks.find(function (t) { return t.id === id; });
  if (!task) return;

  // confirm() shows an OK / Cancel box and returns true or false.
  if (!confirm('Delete "' + task.title + '"? This cannot be undone.')) {
    return;
  }
  state.tasks = removeTaskById(state.tasks, id);
  saveTasks();
  refreshList();
  showStatus('Deleted "' + task.title + '".');
}

function toggleCompleted(id) {
  const task = state.tasks.find(function (t) { return t.id === id; });
  if (!task) return;
  toggleTask(task);
  saveTasks();
  refreshList();
  showStatus('"' + task.title + '" is now ' + (task.completed ? "completed." : "incomplete."));
}

// ---------- Redraw the page ----------

// Read the search box, filters and sort menu, then redraw everything.
// If the search pattern is invalid we show a friendly message and list everything.
function refreshList() {
  //update the record list when this page has one.
  const searchInput = document.getElementById("Search-input")

  if (searchInput) {
    const searchText = searchInput.value;
    const ignoreCase = document.getElementById("search-case").checked;
    const result = compileSearch(searchText, ignoreCase);

    document.getElementById("search-error").textContent = result.error;

    updateTagFilter();

    const status = document.getElementById("filter-status").value;
    const tag = document.getElementById("filter-tag").value;
    const sortValue = document.getElementById("sort-select").value;

    renderTasks(result.regex, status, tag, sortValue);
  }

  //updating dashB statistics when the page has them
  const totalStat = document.getElementById("atat-total");

  if (totalStat) {
    renderDashboard();
  }
}

// ---------- Settings ----------

// Show the saved settings in the Settings form.
// The target is shown in the chosen unit; it is stored in minutes.
function showSettingsInForm() {
  const unit = state.settings.displayUnit;
  let shown = state.settings.weeklyTargetMinutes;
  if (unit === "hours") {
    shown = Math.round((shown / 60) * 100) / 100;
  }
  document.getElementById("target-input").value = shown;
  document.getElementById("display-unit").value = unit;
  // New tasks start with the unit the user prefers.
  if (document.getElementById("task-id").value === "") {
    document.getElementById("task-unit").value = unit;
  }
}

function saveSettingsFromForm() {
  const text = document.getElementById("target-input").value.trim();
  const unit = document.getElementById("display-unit").value;

  const error = validateTarget(text, unit);
  document.getElementById("target-error").textContent = error;
  if (error !== "") {
    document.getElementById("target-input").focus();
    return;
  }

  state.settings.weeklyTargetMinutes = toMinutes(text, unit);
  state.settings.displayUnit = unit;
  saveSettings();
  showSettingsInForm();
  refreshList();
  showStatus("Settings saved.");
}

// ---------- Export, import and restore ----------

// Download the tasks as a .json file.
// A Blob is a chunk of data. We make a temporary link to it and click it.
function exportTasks() {
  const text = JSON.stringify(state.tasks, null, 2); // 2 = indent, so it is readable
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "campus-life-planner-" + todayAsText() + ".json";
  link.click();
  URL.revokeObjectURL(url);

  showStatus("Exported " + state.tasks.length + " tasks.");
}

// Runs when the user picks a file. Nothing changes until the file passes
// every check AND the user confirms.
async function importTasksFromFile(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  const errorBox = document.getElementById("import-error");
  errorBox.textContent = "";
  if (!file) return;

  if (file.size > 1000000) {
    errorBox.textContent = "That file is larger than 1 MB, so nothing was imported.";
    fileInput.value = "";
    return;
  }

  let text = "";
  try {
    text = await file.text();
  } catch (error) {
    errorBox.textContent = "The file could not be read.";
    fileInput.value = "";
    return;
  }

  const result = checkImportedData(text);
  if (result.error !== "") {
    errorBox.textContent = result.error;
    fileInput.value = "";
    return;
  }

  const mode = document.getElementById("import-mode").value;
  let newTasks = [];
  let message = "";

  if (mode === "replace") {
    const question = "Replace all " + state.tasks.length + " of your current tasks with the " +
      result.tasks.length + " tasks in this file? This cannot be undone.";
    if (!confirm(question)) {
      showStatus("Import cancelled. Nothing was changed.");
      fileInput.value = "";
      return;
    }
    newTasks = result.tasks;
    message = "Replaced your tasks with " + result.tasks.length + " imported tasks.";
  } else {
    const merged = mergeImportedTasks(state.tasks, result.tasks);
    const question = "Add " + merged.added + " new tasks to your current tasks? " +
      merged.skipped + " tasks in the file use IDs you already have and will be skipped. " +
      "Your existing tasks will not be changed.";
    if (!confirm(question)) {
      showStatus("Import cancelled. Nothing was changed.");
      fileInput.value = "";
      return;
    }
    newTasks = merged.tasks;
    message = "Imported " + merged.added + " tasks. Skipped " + merged.skipped + " with existing IDs.";
  }

  state.tasks = newTasks;
  saveTasks();
  refreshList();
  showStatus(message);
  fileInput.value = ""; // so the same file can be chosen again later
}

async function restoreSample() {
  const question = "Replace all your tasks with the sample tasks? Your current tasks will be removed.";
  if (!confirm(question)) return;
  try {
    await restoreSampleTasks();
    refreshList();
    showStatus("Sample tasks restored.");
  } catch (error) {
    showStatus("Could not load the sample data. Open the site through a local server (see the README).");
  }
}

// ---------- Connect everything ----------

//only connect a form if it exisists on the page(current)
if (form) {
  form.addEventListener("submit", saveTaskFromForm);

}

if (cancelButton) {
  cancelButton.addEventListener("click", resetForm);
}

const searchInput = document.getElementById("search-input");

if (searchInput) {
  searchInput.addEventListener("input", refreshList);
  document.getElementById("search-case").addEventListener("change", refreshList);
  document.getElementById("filter-status").addEventListener("change", refreshList);
  document.getElementById("filter-tag").addEventListener("change", refreshList);
  document.getElementById("sort-select").addEventListener("change", refreshList);
}

//settings control belongs to the comtrol page
const saveSettingsButton = document.getElementById("save-settings-button");

if (saveSettingsButton) {
  saveSettingsButton.addEventListener("click", saveSettingsFromForm);
}

const exportButton = document.getElementById("export-button");

if (exportButton) {
  exportButton.addEventListener("click", exportTasks);
}

const restoreButton = document.getElementById("restore-button");

if (restoreButton) {
  restoreButton.addEventListener("click", restoreSample);
}

const importFile = document.getElementById("import-file");

if (importFile) {
  importFile.addEventListener("change", importTasksFromFile);
}

//Task butts belongs to the record page
if (taskList) {
  taskList.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "toggle") toggleCompleted(id);
    if (action === "edit") startEditing(id);
    if (action === "delete") deleteTask(id);
  })
}

// ---------- Start the app ----------

async function startApp() {
  loadSettings();
  try {
    const message = await loadTasks();
    if (message !== "") {
      showStatus(message);
    }
  } catch (error) {
    showStatus(
      "Could not load the sample data. Open the site through a local server.");
  }

  const targetInput = document.getElementById("target-input");

  if ("targetInput") {
    showSettingsInForm();
  }

  if (form) {
    resetForm();
  }

  refreshList();
}

startApp();
