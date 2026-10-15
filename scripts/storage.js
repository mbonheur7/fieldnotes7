const DATA_KEY = "fieldnotes.records.v1";
const SETTINGS_KEY = "fieldnotes.settings.v1";

export function loadSavedData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    const settingsRaw = localStorage.getItem(SETTINGS_KEY);
    return { status: raw === null && settingsRaw === null ? "empty" : "loaded", raw, settingsRaw };
  } catch (error) {
    return { status: "error", error: `This browser could not read local storage: ${error.message}` };
  }
}

export function saveRecords(records) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(records));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: `Could not save records in this browser: ${error.message}` };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: `Could not save settings in this browser: ${error.message}` };
  }
}

export function clearSavedData() {
  try {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: `Could not clear saved data: ${error.message}` };
  }
}

export function readStoredPayload(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, message: `Saved planner data is malformed and was left untouched: ${error.message}` };
  }
}
