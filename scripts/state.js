// state.js
// Holds the data the whole app shares, plus a few small helper functions.
// Other files import "state" and read or change state.tasks and state.settings.

// "export" lets other files use this object. We change its contents
// (state.tasks = ...) instead of replacing the object itself.
export const state = {
  tasks: [],
  settings: {
    weeklyTargetMinutes: 600,   // default target: 10 hours
    displayUnit: "minutes"      // "minutes" or "hours"
  }
};

// Make a unique id such as "task-1760524800000-482".
// Date.now() is the current time in milliseconds, plus a random number
// so two tasks created in the same millisecond still get different ids.
export function generateId() {
  const randomPart = Math.floor(Math.random() * 1000);
  return "task-" + Date.now() + "-" + randomPart;
}

// The current date and time as text, e.g. "2026-10-15T09:30:00.000Z".
// Used for createdAt and updatedAt.
export function nowAsText() {
  return new Date().toISOString();
}

// Convert what the user typed into minutes.
// Durations are ALWAYS stored in minutes, whatever unit was chosen.
export function toMinutes(value, unit) {
  const number = Number(value);
  if (unit === "hours") {
    return Math.round(number * 60);
  }
  return Math.round(number);
}

// Turn minutes into text for the screen, using the chosen unit.
// Examples: formatDuration(90, "minutes") -> "90 min"
//           formatDuration(90, "hours")   -> "1.5 h"
export function formatDuration(minutes, unit) {
  if (unit === "hours") {
    const hours = Math.round((minutes / 60) * 10) / 10; // 1 decimal place
    return hours + " h";
  }
  return minutes + " min";
}

// Today's date as "YYYY-MM-DD" in the user's own time zone.
// The "en-CA" language setting happens to write dates in this exact shape.
export function todayAsText() {
  return new Date().toLocaleDateString("en-CA");
}

// ---------- Sorting and filtering ----------

// Return a sorted COPY of the tasks. sortValue comes from the sort menu.
export function sortTasks(tasks, sortValue) {
  const sorted = tasks.slice(); // copy, so the original order is untouched
  sorted.sort(function (a, b) {
    if (sortValue === "due-asc") return a.dueDate.localeCompare(b.dueDate);
    if (sortValue === "due-desc") return b.dueDate.localeCompare(a.dueDate);
    if (sortValue === "title-asc") return a.title.localeCompare(b.title);
    if (sortValue === "title-desc") return b.title.localeCompare(a.title);
    if (sortValue === "duration-asc") return a.durationMinutes - b.durationMinutes;
    if (sortValue === "duration-desc") return b.durationMinutes - a.durationMinutes;
    return 0; // unknown option: keep the order
  });
  return sorted;
}

// Keep only tasks that match the status ("all", "completed", "incomplete")
// and the tag ("all" or a tag name, ignoring upper/lower case).
export function filterTasks(tasks, status, tag) {
  return tasks.filter(function (task) {
    if (status === "completed" && !task.completed) return false;
    if (status === "incomplete" && task.completed) return false;
    if (tag && tag !== "all" && task.tag.toLowerCase() !== tag.toLowerCase()) return false;
    return true;
  });
}

// ---------- Statistics for the dashboard ----------

export function getStats(tasks) {
  let completed = 0;
  let totalMinutes = 0;
  const counts = {};  // how many times each tag is used (key = lower-case tag)
  const names = {};   // the tag as it was first written, for display

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task.completed) completed++;
    totalMinutes += task.durationMinutes;

    const key = task.tag.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    if (!names[key]) names[key] = task.tag;
  }

  // Find the tag with the highest count (the first one wins a tie).
  let topTag = "None";
  let topCount = 0;
  for (const key in counts) {
    if (counts[key] > topCount) {
      topCount = counts[key];
      topTag = names[key];
    }
  }

  return {
    total: tasks.length,
    completed: completed,
    incomplete: tasks.length - completed,
    totalMinutes: totalMinutes,
    topTag: topTag
  };
}

// The last 7 days, oldest first, ending today (or on endDate, for tests).
// For each day: the TOTAL PLANNED MINUTES of tasks whose due date is that day.
// (This measures planned time by due date, not when tasks were created.)
export function getLastSevenDays(tasks, endDate) {
  const end = endDate || new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    const dateText = 
      day.getFullYear() + "-" +
      String(day.getMonth() + 1).padStart(2, "0") + "-" +
      String(day.getDate()).padStart(2, "0");
    let minutes = 0;
    for (let j = 0; j < tasks.length; j++) {
      if (tasks[j].dueDate === dateText) minutes += tasks[j].durationMinutes;
    }
    days.push({
      date: dateText,
      label: day.toLocaleDateString("en-GB", { weekday: "short" }),
      minutes: minutes
    });
  }
  return days;
}

// ---------- Creating and changing tasks ----------
// These small functions only work with data (no page), so tests.html can test them.

// Make a brand-new task object. Duration must already be in minutes.
export function makeTask(title, date, minutes, tag) {
  const now = nowAsText();
  return {
    id: generateId(),
    title: title,
    dueDate: date,
    durationMinutes: minutes,
    tag: tag,
    completed: false,
    createdAt: now,
    updatedAt: now
  };
}

// Change a task's fields and record when it changed.
export function updateTaskFields(task, title, date, minutes, tag) {
  task.title = title;
  task.dueDate = date;
  task.durationMinutes = minutes;
  task.tag = tag;
  task.updatedAt = nowAsText();
}

// Return a new list without the task that has this id.
export function removeTaskById(tasks, id) {
  return tasks.filter(function (task) { return task.id !== id; });
}

// Flip completed: true becomes false, false becomes true.
export function toggleTask(task) {
  task.completed = !task.completed;
  task.updatedAt = nowAsText();
}
