// search.js
// Regular-expression search with highlighted matches.

import { formatDuration } from "./state.js";

// Turn the text the user typed into a RegExp object.
// new RegExp("text", "gi") builds a pattern from a string while the app runs.
//   "g" = look for every match (needed for highlighting)
//   "i" = ignore upper/lower case (only when the checkbox is ticked)
// If the user types a broken pattern such as "(abc", new RegExp throws an
// error. try...catch catches it so the app keeps working.
export function compileSearch(text, ignoreCase) {
  if (text === "") {
    return { regex: null, error: "" };
  }
  const flags = ignoreCase ? "gi" : "g";
  try {
    const regex = new RegExp(text, flags);
    return { regex: regex, error: "" };
  } catch (error) {
    return {
      regex: null,
      error: "That is not a valid regular expression, so all tasks are shown. Check for unclosed brackets or a stray \\ or *."
    };
  }
}

// The status words people can search for.
export function getStatusText(task) {
  return task.completed ? "Completed" : "Incomplete";
}

// Does the pattern match ANY of the fields shown on the task card?
// We search the same text the user sees, so highlights always line up.
// (String.search ignores the "g" flag, so it is safe to reuse the regex.)
export function taskMatches(task, regex, unit) {
  const fields = [
    task.title,
    task.dueDate,
    formatDuration(task.durationMinutes, unit),
    task.tag,
    getStatusText(task)
  ];
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].search(regex) !== -1) {
      return true;
    }
  }
  return false;
}

// Put text inside "parent", wrapping each match in a <mark> element.
// SAFE: we make text nodes and set mark.textContent, never innerHTML,
// so what the user typed or saved can never run as HTML.
export function addHighlightedText(parent, text, regex) {
  if (!regex) {
    parent.appendChild(document.createTextNode(text));
    return;
  }

  regex.lastIndex = 0;          // start searching from the beginning
  let position = 0;             // how much of the text we have already added
  let match = regex.exec(text); // find the first match

  while (match !== null) {
    if (match[0] === "") {
      regex.lastIndex++;        // empty match (e.g. "a*"): skip ahead, avoid an endless loop
    } else {
      if (match.index > position) {
        parent.appendChild(document.createTextNode(text.slice(position, match.index)));
      }
      const mark = document.createElement("mark");
      mark.textContent = match[0];
      parent.appendChild(mark);
      position = match.index + match[0].length;
    }
    match = regex.exec(text);   // find the next match
  }

  if (position < text.length) {
    parent.appendChild(document.createTextNode(text.slice(position)));
  }
}
