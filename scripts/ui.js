// ui.js
// Everything that changes what the user SEES: the task list and messages.
// We build elements with createElement and textContent instead of innerHTML.
// textContent treats text as plain text, so nothing typed by a user can
// ever run as HTML or JavaScript.

import { state, formatDuration, todayAsText, sortTasks, filterTasks, getStats, getLastSevenDays } from "./state.js";
import { addHighlightedText, getStatusText, taskMatches } from "./search.js";

const fieldNames = ["title", "date", "duration", "tag"];

// ---------- Messages ----------

// The status line has aria-live, so screen readers read changes aloud.
export function showStatus(message) {
  document.getElementById("status-message").textContent = message;
}

// Show an error under one form field, e.g. showFieldError("title", "...").
export function showFieldError(name, message) {
  document.getElementById(name + "-error").textContent = message;
  document.getElementById("task-" + name).setAttribute("aria-invalid", "true");
}

export function clearFieldErrors() {
  for (let i = 0; i < fieldNames.length; i++) {
    const name = fieldNames[i];
    document.getElementById(name + "-error").textContent = "";
    document.getElementById("task-" + name).removeAttribute("aria-invalid");
  }
}

// ---------- Task list ----------

// Make one button. data-action and data-id tell app.js which button
// was clicked and which task it belongs to.
function makeButton(text, action, taskId, styleClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = styleClass;
  button.dataset.action = action;
  button.dataset.id = taskId;
  return button;
}

// Add plain text (not highlighted) to an element.
function addText(parent, text) {
  parent.appendChild(document.createTextNode(text));
}

// Make a <span> whose text has the search matches highlighted.
function makeSpan(text, regex, styleClass) {
  const span = document.createElement("span");
  if (styleClass) span.className = styleClass;
  addHighlightedText(span, text, regex);
  return span;
}

// Make the card for one task. "regex" is the search pattern (or null).
function makeTaskCard(task, regex) {
  const card = document.createElement("li");
  card.className = "task-card";

  const isOverdue = !task.completed && task.dueDate < todayAsText();
  if (task.completed) card.classList.add("completed");
  if (isOverdue) card.classList.add("overdue");

  const title = document.createElement("h3");
  title.className = "task-title";
  addHighlightedText(title, task.title, regex);

  const unit = state.settings.displayUnit;
  const details = document.createElement("p");
  details.className = "task-details";
  addText(details, "Due ");
  details.appendChild(makeSpan(task.dueDate, regex));
  addText(details, " | ");
  details.appendChild(makeSpan(formatDuration(task.durationMinutes, unit), regex));
  addText(details, " | ");
  details.appendChild(makeSpan(task.tag, regex, "tag-label"));
  addText(details, " | ");
  details.appendChild(makeSpan(getStatusText(task), regex));

  // Words as well as colour, so overdue is not shown by colour alone.
  if (isOverdue) {
    const overdue = document.createElement("span");
    overdue.className = "overdue-label";
    overdue.textContent = " (overdue)";
    details.appendChild(overdue);
  }

  const buttons = document.createElement("div");
  buttons.className = "button-row";
  const toggleText = task.completed ? "Mark incomplete" : "Mark complete";
  buttons.appendChild(makeButton(toggleText, "toggle", task.id, "secondary-button"));
  buttons.appendChild(makeButton("Edit", "edit", task.id, "secondary-button"));
  buttons.appendChild(makeButton("Delete", "delete", task.id, "danger-button"));

  card.appendChild(title);
  card.appendChild(details);
  card.appendChild(buttons);
  return card;
}

// Draw the tasks. The steps are: filter by status and tag, search with the
// regex (if there is one), then sort.
export function renderTasks(regex, status, tag, sortValue) {
  const list = document.getElementById("task-list");
  list.innerHTML = ""; // clear the old list (no user text is involved here)

  let tasks = filterTasks(state.tasks, status, tag);
  if (regex) {
    tasks = tasks.filter(function (task) {
      return taskMatches(task, regex, state.settings.displayUnit);
    });
  }
  tasks = sortTasks(tasks, sortValue);

  if (tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    if (state.tasks.length === 0) {
      empty.textContent = "No tasks yet. Use the Add Task form to create one.";
    } else {
      empty.textContent = "No tasks match your search or filters.";
    }
    list.appendChild(empty);
  }

  for (let i = 0; i < tasks.length; i++) {
    list.appendChild(makeTaskCard(tasks[i], regex));
  }

  document.getElementById("result-count").textContent =
    "Showing " + tasks.length + " of " + state.tasks.length + " tasks.";
}

// Fill the tag filter with the tags that exist. Keeps the current choice.
export function updateTagFilter() {
  const select = document.getElementById("filter-tag");
  const chosen = select.value;
  const seen = [];

  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All tags";
  select.appendChild(allOption);

  for (let i = 0; i < state.tasks.length; i++) {
    const key = state.tasks[i].tag.toLowerCase();
    if (!seen.includes(key)) {
      seen.push(key);
      const option = document.createElement("option");
      option.value = key;
      option.textContent = state.tasks[i].tag;
      select.appendChild(option);
    }
  }
  // If the chosen tag no longer exists, the select falls back to "All tags".
  select.value = seen.includes(chosen) ? chosen : "all";
}

// ---------- Dashboard ----------

export function renderDashboard() {
  const unit = state.settings.displayUnit;
  const stats = getStats(state.tasks);
  const days = getLastSevenDays(state.tasks);

  document.getElementById("dashboard-empty").hidden = state.tasks.length > 0;
  document.getElementById("stat-total").textContent = stats.total;
  document.getElementById("stat-completed").textContent = stats.completed;
  document.getElementById("stat-incomplete").textContent = stats.incomplete;
  document.getElementById("stat-duration").textContent = formatDuration(stats.totalMinutes, unit);
  document.getElementById("stat-top-tag").textContent = stats.topTag;

  // Weekly total = planned minutes of tasks due in the last 7 days.
  let weeklyMinutes = 0;
  let biggestDay = 0;
  for (let i = 0; i < days.length; i++) {
    weeklyMinutes += days[i].minutes;
    if (days[i].minutes > biggestDay) biggestDay = days[i].minutes;
  }

  const target = state.settings.weeklyTargetMinutes;
  const percent = Math.round((weeklyMinutes / target) * 100);
  let targetText = formatDuration(weeklyMinutes, unit) + " of " +
    formatDuration(target, unit) + " planned for tasks due in the last 7 days (" + percent + "%).";
  if (weeklyMinutes > target) targetText += " You are over your target.";

  const bar = document.getElementById("target-bar");
  bar.style.width = Math.min(percent, 100) + "%";
  bar.setAttribute("aria-valuenow", Math.min(percent, 100));
  bar.setAttribute("aria-valuetext", targetText);
  bar.classList.toggle("over-target", weeklyMinutes > target);
  document.getElementById("target-text").textContent = targetText;

  // Bar chart: one column per day. The chart is decorative (aria-hidden)
  // because the sentence below it gives the same information as text.
  const chart = document.getElementById("week-chart");
  chart.innerHTML = "";
  chart.setAttribute("aria-hidden", "true");
  const summaryParts = [];

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const column = document.createElement("div");
    column.className = "chart-column";

    const value = document.createElement("span");
    value.textContent = unit === "hours" ? Math.round((day.minutes / 60) * 10) / 10 : day.minutes;

    const barDiv = document.createElement("div");
    barDiv.className = "chart-bar";
    const heightPercent = biggestDay === 0 ? 0 : Math.round((day.minutes / biggestDay) * 70);
    barDiv.style.height = heightPercent + "%";

    const label = document.createElement("span");
    label.textContent = day.label;

    column.appendChild(value);
    column.appendChild(barDiv);
    column.appendChild(label);
    chart.appendChild(column);

    summaryParts.push(day.label + " " + formatDuration(day.minutes, unit));
  }
  document.getElementById("week-summary").textContent =
    "Planned time by due date, oldest day first: " + summaryParts.join(", ") + ".";
}
