function cell(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  const lines = [headers.map(cell).join(",")];
  for (const row of rows) lines.push(row.map(cell).join(","));
  return `\uFEFF${lines.join("\n")}\n`;
}

export function csvFilename(slug: string, kind: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `synapse-${slug}-${kind}-${day}.csv`;
}
