import { validateRecord, validateRecordCollection } from "./validators.js";

export function createState(records = [], settings = {}) {
  return {
    records: structuredClone(records),
    settings: { weeklyTarget: 600, durationDisplay: "minutes", ...settings },
    view: "dashboard"
  };
}

export function createRecord(values, existingRecords = []) {
  const now = new Date().toISOString();
  const existingIds = new Set(existingRecords.map((record) => record.id));
  let id = makeId();
  while (existingIds.has(id)) id = makeId();
  return { id, title: values.title, dueDate: values.dueDate, durationMinutes: Number(values.durationMinutes),
    tag: values.tag || "", completed: Boolean(values.completed), createdAt: now, updatedAt: now };
}

export function updateRecord(records, id, changes) {
  return records.map((record) => record.id === id ? { ...record, ...changes, updatedAt: new Date().toISOString() } : record);
}

export function makeId() {
  return globalThis.crypto?.randomUUID?.() || `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function validateCandidate(candidate) {
  return validateRecord(candidate);
}

export function validCollection(records) {
  return validateRecordCollection(records);
}
