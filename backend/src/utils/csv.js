// Minimal CSV generator (no external dependency needed for V1).
// rows: array of plain objects. columns: [{ key, header }]
export function toCsv(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map((c) => escape(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escape(row[c.key])).join(',')
  );

  return [headerLine, ...lines].join('\n');
}
