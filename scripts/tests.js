import { validateRecord, validateRecordCollection, validateImportStructure, isRealDate, normalizeTitle, RULES } from "./validators.js";
import { compileSearch, appendHighlightedText } from "./search.js";

const results = document.querySelector("#test-results");
const summary = document.querySelector("#test-total");
let passed = 0;
let failed = 0;

function assert(name, assertion) {
  const item = document.createElement("li");
  try {
    if (!assertion()) throw new Error("Assertion returned false");
    passed += 1;
    item.className = "pass";
    item.textContent = `PASS — ${name}`;
  } catch (error) {
    failed += 1;
    item.className = "fail";
    item.textContent = `FAIL — ${name}: ${error.message}`;
  }
  results.append(item);
}

const valid = {
  id: "test-1", title: "Office hours", dueDate: "2026-02-28", durationMinutes: 45.5, tag: "Study Group",
  completed: false, createdAt: "2026-02-01T10:00:00.000Z", updatedAt: "2026-02-01T10:00:00.000Z"
};

assert("valid record passes all field rules", () => Object.keys(validateRecord(valid)).length === 0);
assert("title whitespace is rejected", () => Boolean(validateRecord({ ...valid, title: " title " }).title));
assert("repeated title spaces collapse to one", () => normalizeTitle("Study   group") === "Study group");
assert("uncollapsed title spaces are rejected in imported records", () => Boolean(validateRecord({ ...valid, title: "Study   group" }).title));
assert("decimal duration with two decimal places passes", () => !validateRecord({ ...valid, durationMinutes: 0.25 }).durationMinutes);
assert("duration with too many decimal places is rejected", () => Boolean(validateRecord({ ...valid, durationMinutes: 1.234 }).durationMinutes));
assert("numeric rule rejects leading zeroes", () => !RULES.duration.test("01.5"));
assert("date format is strict", () => !isRealDate("2026-2-28") && isRealDate("2026-02-28"));
assert("impossible calendar date is rejected", () => !isRealDate("2025-02-29") && Boolean(validateRecord({ ...valid, dueDate: "2025-02-29" }).dueDate));
assert("tag accepts letters, spaces and hyphens", () => !validateRecord({ ...valid, tag: "Campus Life-Events" }).tag);
assert("tag rejects punctuation", () => Boolean(validateRecord({ ...valid, tag: "Study!" }).tag));
assert("adjacent duplicate-word rule detects repeated word", () => RULES.duplicateAdjacentWords.test("very very useful"));
assert("adjacent duplicate-word rule leaves distinct words alone", () => !RULES.duplicateAdjacentWords.test("very useful"));
assert("duplicate adjacent words are rejected in record titles", () => Boolean(validateRecord({ ...valid, title: "Review review notes" }).title));
assert("regex compilation reports invalid syntax", () => Boolean(compileSearch("[", false).error));
assert("regex compilation supports case-insensitive search", () => compileSearch("lecture", false).regex.test("LECTURE"));
assert("highlighting uses text nodes and mark elements", () => {
  const target = document.createElement("span");
  appendHighlightedText(target, "<b>study</b>", "study", false);
  return target.querySelector("mark")?.textContent === "study" && !target.querySelector("b");
});
assert("record collection requires unique IDs", () => !validateRecordCollection([valid, { ...valid }]).valid);
assert("JSON import accepts the records array", () => validateImportStructure([valid]).valid);
assert("JSON import accepts a valid export envelope", () => validateImportStructure({ format: "fieldnotes-campus-planner", version: 1, records: [valid] }).valid);
assert("JSON import refuses malformed envelope without treating it as data", () => !validateImportStructure({ format: "unknown", records: [valid] }).valid);

summary.textContent = `${passed} passed · ${failed} failed`;
