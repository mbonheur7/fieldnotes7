// storage.js
// Saving and loading data with localStorage.
// localStorage keeps TEXT in the browser under a name (a "key").
// So we turn arrays into text with JSON.stringify and back with JSON.parse.

import { state } from "./state.js";

const TASKS_KEY = "campusLifePlanner.tasks";
const SETTINGS_KEY = "campusLifePlanner.settings";

// Check that a date like "2026-10-15" is really a date.
// The pattern only checks the shape. The Date object checks it exists
// (for example, 2026-02-31 matches the shape but is not a real day).
function isRealDate(text) {
  if (typeof text !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(text + "T00:00:00Z");
  if (isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === text;
}

// Check ONE task object. Returns "" when it is fine, or a short sentence
// describing the first problem. We use this for saved data and imported files.
export function describeTaskProblem(task) {
  if (typeof task !== "object" || task === null || Array.isArray(task)) return "is not a task object";
  if (typeof task.id !== "string" || task.id.trim() === "") return "needs an id (text)";
  if (typeof task.title !== "string" || task.title.trim() === "") return "needs a title (text)";
  if (task.title.length > 80) return "has a title longer than 80 characters";
  if (!isRealDate(task.dueDate)) return "needs a real dueDate such as 2026-10-15";
  if (typeof task.durationMinutes !== "number" || !Number.isInteger(task.durationMinutes)) return "needs durationMinutes as a whole number";
  if (task.durationMinutes < 1 || task.durationMinutes > 1440) return "needs durationMinutes between 1 and 1440";
  if (typeof task.tag !== "string" || task.tag.trim() === "") return "needs a tag (text)";
  if (task.tag.length > 30) return "has a tag longer than 30 characters";
  if (typeof task.completed !== "boolean") return "needs completed to be true or false";
  if (typeof task.createdAt !== "string" || isNaN(Date.parse(task.createdAt))) return "needs a valid createdAt date and time";
  if (typeof task.updatedAt !== "string" || isNaN(Date.parse(task.updatedAt))) return "needs a valid updatedAt date and time";
  return "";
}

export function isValidTask(task) {
  return describeTaskProblem(task) === "";
}

// Keep only the valid tasks, and skip any repeated ids.
export function keepValidTasks(list) {
  const goodTasks = [];
  const idsSeen = [];
  for (let i = 0; i < list.length; i++) {
    const task = list[i];
    if (isValidTask(task) && !idsSeen.includes(task.id)) {
      goodTasks.push(task);
      idsSeen.push(task.id);
    }
  }
  return goodTasks;
}

// ---------- Tasks ----------

export function saveTasks() {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks));
  } catch (error) {
    console.error("Could not save tasks:", error);
  }
}

// Read seed.json from the website folder.
async function loadSeedTasks() {
  const seedUrl = new URL("./seed.json", import.meta.url);
  const response = await fetch(seedUrl);

  if (!response.ok) {
    throw new Error("Could not load seed.json: " + response.status);
  }

  const data = await response.json();
  return keepValidTasks(data);
}

// Load tasks when the app starts. Returns a message to show the user
// (or an empty string). Three cases:
//   1. Nothing saved yet (first visit)  -> load the sample data.
//   2. Saved data is fine               -> use it.
//   3. Saved data is broken             -> use the sample data instead.
export async function loadTasks() {
  const savedText = localStorage.getItem(TASKS_KEY);

  if (savedText === null) {
    state.tasks = await loadSeedTasks();
    saveTasks();
    return "Welcome! We loaded some sample tasks to get you started.";
  }

  try {
    const savedList = JSON.parse(savedText);
    if (!Array.isArray(savedList)) {
      throw new Error("Saved tasks are not a list.");
    }
    state.tasks = keepValidTasks(savedList);
    if (state.tasks.length < savedList.length) {
      saveTasks(); // save the cleaned list
      return "Some saved tasks were damaged and were removed.";
    }
    return "";
  } catch (error) {
    state.tasks = await loadSeedTasks();
    saveTasks();
    return "Your saved data could not be read, so the sample tasks were loaded.";
  }
}

// Replace everything with the sample data (the "Restore" button).
export async function restoreSampleTasks() {
  state.tasks = await loadSeedTasks();
  saveTasks();
}

// ---------- Settings ----------

export function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (error) {
    console.error("Could not save settings:", error);
  }
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (saved === null) return; // nothing saved: keep the defaults

    const target = saved.weeklyTargetMinutes;
    if (Number.isInteger(target) && target >= 1) {
      state.settings.weeklyTargetMinutes = target;
    }
    if (saved.displayUnit === "minutes" || saved.displayUnit === "hours") {
      state.settings.displayUnit = saved.displayUnit;
    }
  } catch (error) {
    // Broken settings are ignored; the defaults stay in place.
  }
}

// ---------- Importing a JSON file ----------

// Check the text of an imported file BEFORE anything is changed.
// Returns { tasks: [...clean tasks], error: "" } or { tasks: [], error: "message" }.
// If even one task is wrong, the whole import is refused, so the user's
// data is never half-changed. We only ever read the text with JSON.parse.
// It is never run as code (no eval).
export function checkImportedData(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { tasks: [], error: "This file is not valid JSON, so nothing was imported." };
  }
  if (!Array.isArray(data)) {
    return { tasks: [], error: "The file must contain a list of tasks, so nothing was imported." };
  }
  if (data.length === 0) {
    return { tasks: [], error: "The file contains no tasks, so nothing was imported." };
  }
  if (data.length > 1000) {
    return { tasks: [], error: "The file has more than 1000 tasks, so nothing was imported." };
  }

  const problems = [];
  const cleanTasks = [];
  const idsSeen = [];

  for (let i = 0; i < data.length; i++) {
    let problem = describeTaskProblem(data[i]);
    if (problem === "" && idsSeen.includes(data[i].id)) {
      problem = "repeats an id used earlier in the file";
    }
    if (problem !== "") {
      problems.push("Task " + (i + 1) + " " + problem + ".");
    } else {
      idsSeen.push(data[i].id);
      // Copy only the fields we know, so unexpected extra data is dropped.
      cleanTasks.push({
        id: data[i].id,
        title: data[i].title.trim(),
        dueDate: data[i].dueDate,
        durationMinutes: data[i].durationMinutes,
        tag: data[i].tag.trim(),
        completed: data[i].completed,
        createdAt: data[i].createdAt,
        updatedAt: data[i].updatedAt
      });
    }
  }

  if (problems.length > 0) {
    let message = "Import cancelled and nothing was changed. " + problems.slice(0, 3).join(" ");
    if (problems.length > 3) {
      message += " (" + (problems.length - 3) + " more problems not shown.)";
    }
    return { tasks: [], error: message };
  }
  return { tasks: cleanTasks, error: "" };
}

// Merge: keep every existing task, and add imported tasks whose id is new.
// An imported task with an id we already have is skipped, so two tasks can
// never share an id.
export function mergeImportedTasks(existing, imported) {
  const merged = existing.slice();
  let added = 0;
  let skipped = 0;
  for (let i = 0; i < imported.length; i++) {
    const alreadyHere = merged.some(function (task) { return task.id === imported[i].id; });
    if (alreadyHere) {
      skipped++;
    } else {
      merged.push(imported[i]);
      added++;
    }
  }
  return { tasks: merged, added: added, skipped: skipped };
}
