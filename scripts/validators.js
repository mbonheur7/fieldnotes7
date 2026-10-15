// Validation stays in one module so forms, imports, and browser tests agree.
export const RULES = {
  title: /^\S(?:.*\S)?$/,
  duration: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  duplicateAdjacentWords: /\b([A-Za-z]+)\s+\1\b/i
};

export function normalizeTitle(value) {
  return typeof value === "string" ? value.replace(/ {2,}/g, " ") : value;
}

export function validateRecord(record) {
  const errors = {};
  if (typeof record.title !== "string" || record.title.length > 90 ||
      !RULES.title.test(record.title) || record.title.trim() !== record.title ||
      normalizeTitle(record.title) !== record.title) {
    errors.title = "Use single spaces between words, no leading or trailing spaces, and at most 90 characters.";
  } else if (RULES.duplicateAdjacentWords.test(record.title)) {
    errors.title = "Remove an accidental repeated word, such as “the the”.";
  }
  if (typeof record.dueDate !== "string" || !RULES.date.test(record.dueDate) || !isRealDate(record.dueDate)) {
    errors.dueDate = "Use a real calendar date in YYYY-MM-DD format.";
  }
  if (typeof record.durationMinutes !== "number" || !Number.isFinite(record.durationMinutes) ||
      !RULES.duration.test(String(record.durationMinutes)) || record.durationMinutes <= 0) {
    errors.durationMinutes = "Enter a number greater than zero, with up to two decimal places.";
  }
  if (typeof record.tag !== "string" || (record.tag !== "" && !RULES.tag.test(record.tag))) {
    errors.tag = "Use letters, spaces, or single hyphens between words.";
  }
  if (typeof record.completed !== "boolean") errors.completed = "Completion must be true or false.";
  return errors;
}

export function isRealDate(value) {
  if (!RULES.date.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateRecordCollection(records) {
  if (!Array.isArray(records)) return { valid: false, message: "Expected an array of planner records." };
  const seen = new Set();
  for (let index = 0; index < records.length; index += 1) {
    const item = records[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { valid: false, message: `Record ${index + 1} is not an object.` };
    }
    const required = ["id", "title", "dueDate", "durationMinutes", "tag", "completed", "createdAt", "updatedAt"];
    for (const key of required) {
      if (!(key in item)) return { valid: false, message: `Record ${index + 1} is missing “${key}”.` };
    }
    if (typeof item.id !== "string" || !item.id.trim() || seen.has(item.id)) {
      return { valid: false, message: `Record ${index + 1} has a missing or duplicate ID.` };
    }
    seen.add(item.id);
    const problems = validateRecord(item);
    if (Object.keys(problems).length) return { valid: false, message: `Record ${index + 1}: ${Object.values(problems)[0]}` };
    for (const key of ["createdAt", "updatedAt"]) {
      if (typeof item[key] !== "string" || !Number.isFinite(Date.parse(item[key])) || new Date(item[key]).toISOString() !== item[key]) {
        return { valid: false, message: `Record ${index + 1} needs a valid ISO timestamp for ${key}.` };
      }
    }
  }
  return { valid: true, message: "" };
}

export function validateImportStructure(input) {
  if (Array.isArray(input)) {
    const validation = validateRecordCollection(input);
    return validation.valid ? { ...validation, records: input, settings: {} } : validation;
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, message: "The file must contain a record array or a Fieldnotes export." };
  }
  if (input.format !== "fieldnotes-campus-planner" || input.version !== 1 || !Array.isArray(input.records)) {
    return { valid: false, message: "The export envelope is not recognized. Expected Fieldnotes format version 1." };
  }
  const validation = validateRecordCollection(input.records);
  if (!validation.valid) return validation;
  if (input.settings !== undefined &&
      (!input.settings || typeof input.settings !== "object" ||
       (input.settings.weeklyTarget !== undefined && (!Number.isInteger(input.settings.weeklyTarget) || input.settings.weeklyTarget < 1 || input.settings.weeklyTarget > 10080)) ||
       (input.settings.durationDisplay !== undefined && !["minutes", "hours"].includes(input.settings.durationDisplay)))) {
    return { valid: false, message: "The export contains invalid settings." };
  }
  return { valid: true, message: "", records: input.records, settings: input.settings || {} };
}
