import { createState, createRecord, updateRecord } from "./state.js";
import { loadSavedData, readStoredPayload, saveRecords, saveSettings, clearSavedData } from "./storage.js";
import { validateRecord, validateRecordCollection, validateImportStructure, normalizeTitle, RULES } from "./validators.js";
import { renderAll, navigate, setForm, showFormErrors, clearFormErrors } from "./ui.js";

const $ = (selector, root = document) => root.querySelector(selector);
let state = createState();
let sampleRecords = [];
let currentEditId = null;
let inlineEditId = null;
let searchPattern = "";
let caseSensitive = false;
let sortKey = "date-asc";
let recordsStorageBlocked = false;
let settingsStorageBlocked = false;

start();

async function start() {
  bindEvents();
  const local = loadSavedData();
  const seedResult = await loadSeed();
  sampleRecords = seedResult;
  if (local.status === "error") {
    state.records = materializeSamples(sampleRecords);
    announce(local.error);
    showStorageWarning(`${local.error} The sample list is available for this session, but changes may not be saved.`);
  } else if (local.status === "loaded") {
    const parsed = local.raw === null ? { ok: true, value: [] } : readStoredPayload(local.raw);
    const validation = parsed.ok ? validateRecordCollection(parsed.value) : { valid: false, message: parsed.message };
    let savedSettings = null;
    if (local.settingsRaw) {
      savedSettings = readStoredPayload(local.settingsRaw);
      if (!savedSettings.ok || !isSettings(savedSettings.value)) settingsStorageBlocked = true;
    }
    if (!validation.valid) {
      recordsStorageBlocked = true;
      announce(`${validation.message} Nothing was changed. Use Settings → Restore sample data if you want to replace it.`);
      $("#data-status").textContent = validation.message;
      showStorageWarning(`${validation.message} Saved records were left untouched. Use Settings → Restore sample data or import a valid backup to replace them.`);
    } else {
      state.records = parsed.value;
      if (savedSettings && savedSettings.ok && isSettings(savedSettings.value)) state.settings = { ...state.settings, ...savedSettings.value };
      else if (savedSettings) {
        const message = savedSettings.ok ? "Saved settings are invalid; default settings are being used. Import or restore before replacing them." : savedSettings.message;
        announce(message);
        showStorageWarning(message);
      }
    }
  } else {
    state.records = materializeSamples(sampleRecords);
    persistRecords();
    persistSettings();
  }
  updateSettingsControls();
  renderAll(state, searchPattern, caseSensitive, sortKey);
  const requestedView = location.hash.slice(1);
  const validView = ["dashboard", "planner", "settings", "about", "add-edit"].includes(requestedView);
  if (requestedView === "add-edit") setForm(null);
  navigate(validView ? requestedView : "dashboard", false);
  if (!validView) history.replaceState(null, "", "#dashboard");
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  $("#record-form").addEventListener("submit", handleFormSubmit);
  $("#search-pattern").addEventListener("input", (event) => {
    searchPattern = event.target.value;
    renderAll(state, searchPattern, caseSensitive, sortKey);
  });
  $("#case-sensitive").addEventListener("change", (event) => {
    caseSensitive = event.target.checked;
    renderAll(state, searchPattern, caseSensitive, sortKey);
  });
  $("#sort-by").addEventListener("change", (event) => {
    sortKey = event.target.value;
    renderAll(state, searchPattern, caseSensitive, sortKey);
  });
  $("#save-target").addEventListener("click", saveTarget);
  $("#duration-display").addEventListener("change", (event) => {
    state.settings.durationDisplay = event.target.value;
    const saved = persistSettings();
    renderAll(state, searchPattern, caseSensitive, sortKey);
    settingsMessage(saved ? "Duration display saved." : "Changed for this session only; saved settings were not replaced.");
  });
  $("#export-data").addEventListener("click", exportData);
  $("#import-file").addEventListener("change", importData);
  $("#restore-samples").addEventListener("click", restoreSamples);
  $("#clear-search").addEventListener("click", () => {
    searchPattern = "";
    $("#search-pattern").value = "";
    $("#search-error").textContent = "";
    renderAll(state, searchPattern, caseSensitive, sortKey);
    $("#search-pattern").focus();
  });
  window.addEventListener("hashchange", () => {
    const target = location.hash.slice(1);
    if (["dashboard", "planner", "settings", "about"].includes(target)) {
      state.view = target;
      navigate(target);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#add-edit").hidden) {
      navigate("planner");
      history.replaceState(null, "", "#planner");
    }
  });
}

function handleClick(event) {
  const actionButton = event.target.closest("[data-action]");
  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    const view = goButton.dataset.go;
    history.pushState(null, "", `#${view}`);
    if (view === "add-edit") openForm(null);
    else { state.view = view; navigate(view); }
    return;
  }
  if (!actionButton) return;
  const { action, id } = actionButton.dataset;
  if (action === "new-record") { history.pushState(null, "", "#planner"); openForm(null); return; }
  if (action === "edit") {
    const record = state.records.find((item) => item.id === id);
    if (window.matchMedia("(max-width: 767px)").matches) openForm(record);
    else startInlineEdit(id);
    return;
  }
  if (action === "cancel-inline") { inlineEditId = null; renderAll(state, searchPattern, caseSensitive, sortKey); return; }
  if (action === "save-inline") { saveInlineEdit(id); return; }
  if (action === "delete") {
    const record = state.records.find((item) => item.id === id);
    if (record && window.confirm(`Delete “${record.title}” from your planner? This cannot be undone.`)) {
      state.records = state.records.filter((item) => item.id !== id);
      const saved = persistRecords(); renderAll(state, searchPattern, caseSensitive, sortKey);
      announce(recordSaveMessage(saved, "deleted"));
    }
  }
}

function handleChange(event) {
  const checkbox = event.target.closest('[data-action="toggle"]');
  if (!checkbox) return;
  const row = checkbox.closest("[data-record-id]");
  const record = state.records.find((item) => item.id === row?.dataset.recordId);
  if (!record) return;
  state.records = updateRecord(state.records, record.id, { completed: checkbox.checked });
  const saved = persistRecords(); renderAll(state, searchPattern, caseSensitive, sortKey);
  announce(saved ? (checkbox.checked ? "Entry marked complete." : "Entry marked open.") : recordSaveMessage(false, "updated"));
}

function openForm(record) {
  currentEditId = record?.id || null;
  setForm(record);
  navigate("add-edit");
}

function handleFormSubmit(event) {
  event.preventDefault();
  clearFormErrors();
  const durationText = $("#record-duration").value;
  const raw = {
    title: normalizeTitle($("#record-title").value),
    dueDate: $("#record-date").value,
    durationMinutes: Number($("#record-duration").value),
    tag: $("#record-tag").value,
    completed: $("#record-completed").checked
  };
  const errors = validateRecord(raw);
  if (!RULES.duration.test(durationText)) errors.durationMinutes = "Use a positive decimal number with up to two decimal places (no exponent notation).";
  if (Object.keys(errors).length) {
    showFormErrors(errors);
    $("#form-status").textContent = "Please correct the marked fields before saving.";
    const first = document.querySelector("[data-error]:not(:empty)");
    if (first) document.getElementById(first.dataset.error === "dueDate" ? "record-date" : first.dataset.error === "durationMinutes" ? "record-duration" : `record-${first.dataset.error}`).focus();
    return;
  }
  if (currentEditId) {
    state.records = updateRecord(state.records, currentEditId, raw);
  } else {
    state.records = [createRecord(raw, state.records), ...state.records];
  }
  const saved = persistRecords();
  announce(recordSaveMessage(saved, currentEditId ? "updated" : "added"));
  currentEditId = null;
  history.replaceState(null, "", "#planner");
  navigate("planner");
  renderAll(state, searchPattern, caseSensitive, sortKey);
}

function startInlineEdit(id) {
  inlineEditId = id;
  renderAll(state, searchPattern, caseSensitive, sortKey, inlineEditId);
  const first = document.querySelector(`[data-record-id="${CSS.escape(id)}"] input[data-edit="title"]`);
  first?.focus();
}

function saveInlineEdit(id) {
  const row = document.querySelector(`[data-record-id="${CSS.escape(id)}"]`);
  if (!row) return;
  const raw = {
    title: normalizeTitle(row.querySelector('[data-edit="title"]').value),
    dueDate: row.querySelector('[data-edit="dueDate"]').value,
    durationMinutes: Number(row.querySelector('[data-edit="durationMinutes"]').value),
    tag: row.querySelector('[data-edit="tag"]').value,
    completed: state.records.find((item) => item.id === id)?.completed ?? false
  };
  const errors = validateRecord(raw);
  if (!RULES.duration.test(row.querySelector('[data-edit="durationMinutes"]').value)) errors.durationMinutes = "Use a positive decimal number with up to two decimal places.";
  if (Object.keys(errors).length) {
    announce(`Could not save inline edit: ${Object.values(errors)[0]}`);
    row.classList.add("has-inline-error");
    let note = row.querySelector(".inline-validation-error");
    if (!note) {
      note = document.createElement("p");
      note.className = "inline-validation-error";
      row.append(note);
    }
    note.textContent = Object.values(errors)[0];
    return;
  }
  state.records = updateRecord(state.records, id, raw);
  inlineEditId = null;
  const saved = persistRecords(); renderAll(state, searchPattern, caseSensitive, sortKey);
  announce(recordSaveMessage(saved, "updated"));
}

function saveTarget() {
  const input = $("#weekly-target");
  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 1 || value > 10080) {
    settingsMessage("Enter a whole-number target from 1 to 10,080 minutes.");
    input.focus();
    return;
  }
  state.settings.weeklyTarget = value;
  const saved = persistSettings();
  renderAll(state, searchPattern, caseSensitive, sortKey);
  settingsMessage(saved ? "Weekly target saved." : "Changed for this session only; saved settings were not replaced.");
}

function exportData() {
  const payload = { format: "fieldnotes-campus-planner", version: 1, exportedAt: new Date().toISOString(), settings: state.settings, records: state.records };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `fieldnotes-planner-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
  dataMessage("A JSON backup has been downloaded.");
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const result = validateImportStructure(parsed);
    if (!result.valid) {
      dataMessage(`Import not applied. ${result.message}`);
      return;
    }
    // Replacement happens only after the whole file passes validation.
    state.records = structuredClone(result.records);
    if (result.settings && isSettings(result.settings)) state.settings = { ...state.settings, ...result.settings };
    recordsStorageBlocked = false;
    settingsStorageBlocked = false;
    const savedRecords = persistRecords();
    const savedSettings = persistSettings();
    renderAll(state, searchPattern, caseSensitive, sortKey);
    dataMessage(savedRecords && savedSettings ? `Imported ${state.records.length} records.` : "Import loaded for this session, but browser storage could not save it.");
    if (savedRecords && savedSettings) clearStorageWarning();
    else showStorageWarning("Imported records are available for this session, but browser storage could not save them.");
  } catch (error) {
    dataMessage(`Import not applied. The file could not be read as JSON: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function restoreSamples() {
  if (!window.confirm("Replace the current planner with the original sample records and default settings?")) return;
  state.records = materializeSamples(sampleRecords);
  state.settings = { weeklyTarget: 600, durationDisplay: "minutes" };
  recordsStorageBlocked = false;
  settingsStorageBlocked = false;
  clearStorageWarning();
  const cleared = clearSavedData();
  persistRecords(); persistSettings();
  renderAll(state, searchPattern, caseSensitive, sortKey);
  dataMessage(cleared.ok ? "Sample records restored." : `${cleared.message} Samples are active for this session.`);
}

function persistRecords() {
  if (recordsStorageBlocked) {
    const message = "Saved records are malformed and were not overwritten. Import valid data or use Restore sample data to replace them.";
    announce(message);
    showStorageWarning(message);
    return false;
  }
  const result = saveRecords(state.records);
  if (!result.ok) {
    announce(result.message);
    showStorageWarning(result.message);
  }
  return result.ok;
}
function persistSettings() {
  if (settingsStorageBlocked) {
    const message = "Saved settings were malformed and were not overwritten. Import valid data or use Restore sample data to replace them.";
    announce(message);
    showStorageWarning(message);
    return false;
  }
  const result = saveSettings(state.settings);
  if (!result.ok) {
    announce(result.message);
    showStorageWarning(result.message);
  }
  return result.ok;
}
function updateSettingsControls() {
  $("#weekly-target").value = String(state.settings.weeklyTarget);
  $("#duration-display").value = state.settings.durationDisplay;
}
function isSettings(value) {
  return value && typeof value === "object" &&
    (value.weeklyTarget === undefined || (Number.isInteger(value.weeklyTarget) && value.weeklyTarget >= 1 && value.weeklyTarget <= 10080)) &&
    (value.durationDisplay === undefined || ["minutes", "hours"].includes(value.durationDisplay));
}
function announce(message) { $("#global-status").textContent = message; }
function showStorageWarning(message) {
  const warning = $("#storage-warning");
  warning.textContent = message;
  warning.hidden = false;
}
function clearStorageWarning() {
  const warning = $("#storage-warning");
  warning.textContent = "";
  warning.hidden = true;
}
function recordSaveMessage(saved, action) {
  return saved ? `Entry ${action}.` : `Entry ${action} in this session only; browser storage could not save it.`;
}
function settingsMessage(message) { $("#settings-status").textContent = message; }
function dataMessage(message) { $("#data-status").textContent = message; announce(message); }

async function loadSeed() {
  try {
    const response = await fetch("./seed.json");
    if (!response.ok) throw new Error("Sample file was not available.");
    const data = await response.json();
    const validation = validateRecordCollection(data);
    if (!validation.valid) throw new Error(validation.message);
    return data;
  } catch (error) {
    announce(`Sample data could not be loaded: ${error.message}`);
    return [];
  }
}

function materializeSamples(source) {
  const now = Date.now();
  return source.map((record, index) => {
    const created = new Date(now - ((index * 19 + 4) % 7) * 86400000 - (index % 4) * 3600000).toISOString();
    return { ...record, createdAt: created, updatedAt: created };
  });
}
