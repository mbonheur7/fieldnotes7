import { appendHighlightedText, compileSearch, matchesRecord } from "./search.js";

const $ = (selector, root = document) => root.querySelector(selector);
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

export function navigate(view, shouldFocus = true) {
  document.querySelectorAll(".page-section").forEach((section) => {
    const active = section.id === view;
    section.hidden = !active;
    section.classList.toggle("active", active);
  });
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === view;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (shouldFocus) {
    if (view === "add-edit") $("#record-title").focus();
    else $("#main-content").focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function setForm(record) {
  $("#record-id").value = record?.id || "";
  $("#form-title").textContent = record ? "Edit an entry" : "Add an entry";
  $("#form-eyebrow").textContent = record ? "TUNE YOUR PLAN" : "MAKE A LITTLE SPACE";
  $("#record-title").value = record?.title || "";
  $("#record-date").value = record?.dueDate || localDate();
  $("#record-duration").value = record?.durationMinutes ?? "";
  $("#record-tag").value = record?.tag || "";
  $("#record-completed").checked = record?.completed || false;
  $("#form-unit").textContent = "(minutes)";
  clearFormErrors();
}

export function clearFormErrors() {
  document.querySelectorAll("[data-error]").forEach((node) => {
    node.textContent = "";
    const inputId = node.dataset.error === "dueDate" ? "record-date" : node.dataset.error === "durationMinutes" ? "record-duration" : `record-${node.dataset.error}`;
    document.getElementById(inputId)?.removeAttribute("aria-invalid");
  });
  $("#form-status").textContent = "";
}

export function showFormErrors(errors) {
  clearFormErrors();
  Object.entries(errors).forEach(([key, message]) => {
    const node = document.querySelector(`[data-error="${key}"]`);
    if (node) node.textContent = message;
    const inputId = key === "dueDate" ? "record-date" : key === "durationMinutes" ? "record-duration" : `record-${key}`;
    document.getElementById(inputId)?.setAttribute("aria-invalid", "true");
  });
}

export function renderAll(state, pattern = "", caseSensitive = false, sortKey = "date-asc", editingId = null) {
  renderDashboard(state);
  renderRecords(state, pattern, caseSensitive, sortKey, editingId);
  $("#weekly-target").value = String(state.settings.weeklyTarget);
  $("#duration-display").value = state.settings.durationDisplay;
}

export function renderDashboard(state) {
  const records = state.records;
  const open = records.filter((record) => !record.completed);
  const done = records.filter((record) => record.completed);
  const total = records.reduce((sum, record) => sum + record.durationMinutes, 0);
  $("#stat-total").textContent = String(records.length);
  $("#stat-open").textContent = String(open.length);
  $("#stat-done").textContent = String(done.length);
  $("#stat-time").textContent = formatDuration(total, state.settings.durationDisplay);
  $("#duration-unit").textContent = state.settings.durationDisplay === "hours" ? "hours planned" : "minutes planned";
  const counts = new Map();
  records.forEach((record) => { if (record.tag) counts.set(record.tag, (counts.get(record.tag) || 0) + 1); });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  $("#top-tag").textContent = top?.[0] || "No tags yet";
  $("#top-tag-count").textContent = top ? `${top[1]} ${top[1] === 1 ? "entry" : "entries"}` : "";

  const days = lastSevenDays();
  const chart = $("#weekly-chart");
  chart.replaceChildren();
  const countsByDay = days.map((day) => records.filter((record) => {
    const created = new Date(record.createdAt);
    return created.getFullYear() === day.date.getFullYear() && created.getMonth() === day.date.getMonth() && created.getDate() === day.date.getDate();
  }).length);
  const max = Math.max(1, ...countsByDay);
  days.forEach((day, index) => {
    const column = make("div", `chart-day${index === 6 ? " today" : ""}`);
    const track = make("div", "chart-bar-track");
    const bar = make("div", "chart-bar");
    bar.style.height = `${Math.max(4, countsByDay[index] / max * 74)}px`;
    bar.setAttribute("aria-hidden", "true");
    track.append(bar);
    column.append(track, make("span", "", day.label));
    column.setAttribute("aria-label", `${day.longLabel}: ${countsByDay[index]} ${countsByDay[index] === 1 ? "entry" : "entries"} created`);
    chart.append(column);
  });
  chart.setAttribute("aria-label", `Last seven days: ${countsByDay.reduce((sum, value) => sum + value, 0)} entries created`);
  $("#chart-caption").textContent = `${countsByDay.reduce((sum, value) => sum + value, 0)} new ${countsByDay.reduce((sum, value) => sum + value, 0) === 1 ? "entry" : "entries"} in the last seven days.`;

  const minutes = records.filter((record) => isWithinLastSevenDays(record.createdAt)).reduce((sum, record) => sum + record.durationMinutes, 0);
  const target = state.settings.weeklyTarget;
  const exceeded = minutes > target;
  const ratio = Math.min(100, minutes / target * 100);
  $("#target-value").textContent = `${target}`;
  $("#target-progress-label").textContent = `${formatDuration(minutes, "minutes")} min planned`;
  $("#target-percent").textContent = `${Math.round(minutes / target * 100)}%`;
  $("#target-meter").setAttribute("aria-valuemax", String(target));
  $("#target-meter").setAttribute("aria-valuenow", String(Math.min(target, Math.round(minutes))));
  $("#meter-fill").style.transform = `scaleX(${ratio / 100})`;
  $("#target-meter").classList.toggle("exceeded", exceeded);
  const message = $("#target-message");
  message.textContent = exceeded ? `You are ${Math.round(minutes - target)} minutes over your weekly cap. Consider giving yourself some breathing room.` : `${Math.max(0, Math.round(target - minutes))} minutes of space left in your weekly intention.`;
  message.setAttribute("aria-live", exceeded ? "assertive" : "polite");
  message.setAttribute("role", exceeded ? "alert" : "status");

  const today = localDate();
  $("#today-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${today}T12:00:00`));
  $("#today-label").textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${today}T12:00:00`)).toUpperCase();
  const upcoming = records.filter((record) => !record.completed && record.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const upcomingNode = $("#upcoming-list");
  upcomingNode.replaceChildren();
  if (!upcoming.length) {
    upcomingNode.append(emptyState("A clear patch of calendar", "Nothing upcoming yet. Add a class, study block, or campus moment to get started.", "Add an entry", "new-record"));
  } else {
    upcoming.forEach((record) => {
      const item = make("article", "upcoming-item");
      const date = new Date(`${record.dueDate}T12:00:00`);
      const tile = make("div", "date-tile");
      tile.append(make("b", "", String(date.getDate()).padStart(2, "0")), make("small", "", date.toLocaleDateString(undefined, { month: "short" })));
      const info = make("div", "upcoming-content");
      info.append(make("strong", "", record.title), make("span", "", `${formatDuration(record.durationMinutes, state.settings.durationDisplay)} ${state.settings.durationDisplay === "hours" ? "hr" : "min"}${record.tag ? ` · ${record.tag}` : ""}`));
      item.append(tile, info);
      upcomingNode.append(item);
    });
  }
}

export function renderRecords(state, pattern, caseSensitive, sortKey, editingId = null) {
  const node = $("#records-list");
  node.replaceChildren();
  const { regex, error } = compileForList(pattern, caseSensitive);
  $("#search-error").textContent = error;
  if (error) {
    $("#planner-status").textContent = "Search pattern is invalid. No records are shown.";
    node.append(emptyState("Pattern needs a second look", "Fix the expression above to search your planner.", null));
    return;
  }
  let records = state.records.filter((record) => matchesForList(record, regex));
  records = sortRecords(records, sortKey);
  $("#planner-status").textContent = `${records.length} ${records.length === 1 ? "record" : "records"} shown.`;
  if (!records.length) {
    node.append(emptyState(pattern ? "No matches this time" : "Your planner is open", pattern ? "Try a different expression or clear the search." : "Add your first class, study session, or campus plan.", pattern ? null : "Add an entry", pattern ? null : "new-record"));
    return;
  }
  records.forEach((record, index) => {
    const row = make("article", `record-row${record.completed ? " is-done" : ""}`);
    row.dataset.recordId = record.id;
    row.style.animationDelay = `${Math.min(index * 25, 200)}ms`;
    if (record.id === editingId) row.append(buildInlineEditor(record));
    else buildRecordContent(row, record, state.settings.durationDisplay, pattern, caseSensitive);
    node.append(row);
  });
}

function buildRecordContent(row, record, display, pattern, caseSensitive) {
  const main = make("div", "record-main");
  const checkbox = make("input", "record-check");
  checkbox.type = "checkbox"; checkbox.checked = record.completed; checkbox.dataset.action = "toggle"; checkbox.setAttribute("aria-label", `${record.completed ? "Mark open" : "Mark complete"}: ${record.title}`);
  const titleBox = make("div");
  const title = make("strong");
  appendHighlightedText(title, record.title, pattern, caseSensitive);
  titleBox.append(title, make("small", "", `Updated ${new Date(record.updatedAt).toLocaleDateString()}`));
  main.append(checkbox, titleBox);
  const date = make("span", "record-meta", formatDate(record.dueDate));
  const duration = make("span", "record-meta duration-meta", `${formatDuration(record.durationMinutes, display)} ${display === "hours" ? "hr" : "min"}`);
  const tagWrap = make("span", "record-tag-wrap");
  const tag = make("span", "record-tag");
  appendHighlightedText(tag, record.tag || "No tag", pattern, caseSensitive);
  tagWrap.append(tag);
  const actions = make("div", "record-actions");
  actions.append(actionButton("Edit", "edit", record.id, "✎"), actionButton("Delete", "delete", record.id, "×"));
  row.append(main, date, duration, tagWrap, actions);
}

function buildInlineEditor(record) {
  const wrap = make("div", "inline-editor");
  wrap.style.display = "contents";
  const title = document.createElement("input"); title.value = record.title; title.setAttribute("aria-label", "Edit title"); title.dataset.edit = "title";
  const date = document.createElement("input"); date.type = "date"; date.value = record.dueDate; date.setAttribute("aria-label", "Edit date"); date.dataset.edit = "dueDate";
  const duration = document.createElement("input"); duration.type = "number"; duration.min = "0.01"; duration.step = "0.01"; duration.value = record.durationMinutes; duration.setAttribute("aria-label", "Edit duration in minutes"); duration.dataset.edit = "durationMinutes";
  const tag = document.createElement("input"); tag.value = record.tag; tag.setAttribute("aria-label", "Edit tag"); tag.dataset.edit = "tag";
  const actions = make("div", "record-actions");
  actions.append(actionButton("Save edit", "save-inline", record.id, "✓"), actionButton("Cancel edit", "cancel-inline", record.id, "↩"));
  wrap.append(title, date, duration, tag, actions);
  return wrap;
}

function actionButton(label, action, id, glyph) {
  const button = make("button", `icon-button${action === "delete" ? " delete" : ""}`, glyph);
  button.type = "button"; button.dataset.action = action; button.dataset.id = id; button.title = label; button.setAttribute("aria-label", `${label} record`);
  return button;
}

function emptyState(title, copy, buttonText, action) {
  const box = make("div", "empty-state");
  box.append(make("div", "empty-glyph", "—"), make("h3", "", title), make("p", "", copy));
  if (buttonText) {
    const button = make("button", "button button-primary", buttonText);
    button.type = "button"; button.dataset.action = action;
    box.append(button);
  }
  return box;
}

function sortRecords(records, key) {
  const [field, direction] = key.split("-");
  return records.slice().sort((a, b) => {
    let compare = field === "date" ? a.dueDate.localeCompare(b.dueDate) : field === "title" ? a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) : a.durationMinutes - b.durationMinutes;
    return direction === "desc" ? -compare : compare;
  });
}
function compileForList(pattern, caseSensitive) {
  return compileSearch(pattern, caseSensitive);
}
function matchesForList(record, regex) {
  return matchesRecord(record, regex);
}
function formatDuration(minutes, display) {
  if (display === "hours") return trimNumber(minutes / 60);
  return trimNumber(minutes);
}
function trimNumber(number) { return Number(number.toFixed(2)).toString(); }
function localDate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function lastSevenDays() {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - offset);
    days.push({ date, label: date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), longLabel: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) });
  }
  return days;
}
function isWithinLastSevenDays(timestamp) {
  const date = new Date(timestamp); const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}
