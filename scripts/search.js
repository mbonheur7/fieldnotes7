// Regex compilation is guarded: user-entered patterns are data, never markup.
export function compileSearch(pattern, caseSensitive = false) {
  if (!pattern) return { regex: null, error: "" };
  try {
    return { regex: new RegExp(pattern, caseSensitive ? "g" : "gi"), error: "" };
  } catch (error) {
    return { regex: null, error: `That pattern is not valid: ${error.message}` };
  }
}

export function matchesRecord(record, regex) {
  if (!regex) return true;
  const text = [record.title, record.dueDate, record.durationMinutes, record.tag, record.completed ? "completed" : "open"].join(" ");
  regex.lastIndex = 0;
  return regex.test(text);
}

export function appendHighlightedText(parent, text, pattern, caseSensitive = false) {
  const source = String(text ?? "");
  if (!pattern) {
    parent.append(document.createTextNode(source));
    return;
  }
  const { regex } = compileSearch(pattern, caseSensitive);
  if (!regex) {
    parent.append(document.createTextNode(source));
    return;
  }
  regex.lastIndex = 0;
  let cursor = 0;
  let match;
  while ((match = regex.exec(source)) !== null) {
    if (match.index > cursor) parent.append(document.createTextNode(source.slice(cursor, match.index)));
    const mark = document.createElement("mark");
    mark.textContent = match[0];
    parent.append(mark);
    cursor = match.index + match[0].length;
    // Avoid an infinite loop for zero-length matches such as /^/.
    if (match[0].length === 0) regex.lastIndex += 1;
    if (regex.lastIndex > source.length) break;
  }
  if (cursor < source.length) parent.append(document.createTextNode(source.slice(cursor)));
}
