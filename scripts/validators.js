// validators.js
// The form rules. Each function returns an error message as text,
// or "" (an empty string) when the value is fine.
// A regular expression (regex) is a pattern for matching text.
//   ^ = start of text, $ = end of text, \d = a digit, {2,80} = 2 to 80 times

import { toMinutes } from "./state.js";

// Exported so tests.html and the README can show the exact patterns.
export const patterns = {
  // Rule 1: title. Starts with a letter or number, then 1 to 79 more
  // letters, numbers, spaces or these marks: . , ' & : ( ) / -
  title: /^[A-Za-z0-9][A-Za-z0-9 .,'&:()\/-]{1,79}$/,

  // Rule 2: duration. Digits, with up to 2 decimal places (90 or 1.5).
  // (\.\d{1,2})? means "an optional dot followed by 1 or 2 digits".
  duration: /^\d+(\.\d{1,2})?$/,

  // Rule 3: date shape. Four digits, dash, two digits, dash, two digits.
  date: /^\d{4}-\d{2}-\d{2}$/,

  // Rule 4: tag. Starts with a letter, then letters, spaces or hyphens.
  // 2 to 30 characters in total.
  tag: /^[A-Za-z][A-Za-z -]{1,29}$/,

  // Rule 5 (advanced): repeated word, using a BACKREFERENCE.
  // (\w+) captures a word. \1 means "the same word again".
  // \s+ is the space between. \b marks a word boundary.
  // It finds mistakes like "Read read chapter 3".
  repeatedWord: /\b(\w+)\s+\1\b/i
};

export function validateTitle(title) {
  if (!patterns.title.test(title)) {
    return "Use 2 to 80 characters. Start with a letter or number. Letters, numbers, spaces and . , ' & : ( ) / - are allowed.";
  }
  const repeat = title.match(patterns.repeatedWord);
  if (repeat) {
    return 'The word "' + repeat[1] + '" appears twice in a row. Please check the title.';
  }
  return "";
}

export function validateDate(date) {
  if (!patterns.date.test(date)) {
    return "Choose a date in the format YYYY-MM-DD.";
  }
  // The pattern only checks the SHAPE. This checks the day exists
  // (for example, 2026-02-31 has the right shape but is not a real date).
  const check = new Date(date + "T00:00:00Z");
  if (isNaN(check.getTime()) || check.toISOString().slice(0, 10) !== date) {
    return "That date does not exist.";
  }
  return "";
}

export function validateDuration(text, unit) {
  if (!patterns.duration.test(text)) {
    return "Enter a positive number, such as 90 or 1.5.";
  }
  const minutes = toMinutes(text, unit);
  if (minutes < 1 || minutes > 1440) {
    return "Duration must be between 1 minute and 24 hours.";
  }
  return "";
}

export function validateTag(tag) {
  if (!patterns.tag.test(tag)) {
    return "Use 2 to 30 letters, spaces or hyphens, starting with a letter.";
  }
  return "";
}

// Weekly target: same number pattern as duration, between 1 minute and 168 hours.
export function validateTarget(text, unit) {
  if (!patterns.duration.test(text)) {
    return "Enter a positive number, such as 600 or 10.5.";
  }
  const minutes = toMinutes(text, unit);
  if (minutes < 1 || minutes > 10080) {
    return "Target must be between 1 minute and 168 hours (one week).";
  }
  return "";
}
