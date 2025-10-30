export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

interface PdfOptions {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  subtitle?: string;
  generatedAt?: Date;
}

export const downloadTableAsPdf = ({ title, columns, rows, subtitle, generatedAt }: PdfOptions) => {
  if (!rows.length) {
    alert('No data available to export.');
    return;
  }

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Unable to open a new window for PDF export. Please check your browser pop-up settings.');
    return;
  }

  const timestamp = generatedAt ?? new Date();
  const formattedGeneratedAt = timestamp.toLocaleString();

  const tableHead = columns
    .map(column => `<th style="text-align:${column.align ?? 'left'}; padding:8px; border-bottom:1px solid #d1d5db; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">${escapeHtml(column.label)}</th>`)
    .join('');

  const tableBody = rows
    .map(row => {
      const cells = columns
        .map(column => {
          const rawValue = row[column.key];
          const formattedValue = column.format ? column.format(rawValue, row) : rawValue;
          const display = formattedValue === undefined || formattedValue === null ? '' : String(formattedValue);
          return `<td style="text-align:${column.align ?? 'left'}; padding:8px; border-bottom:1px solid #f3f4f6; font-size:12px;">${escapeHtml(display)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; padding: 24px; }
      h1 { font-size: 24px; margin-bottom: 8px; }
      h2 { font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; }
      thead { background-color: #f9fafb; }
      tfoot { margin-top: 16px; font-size: 12px; color: #6b7280; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<h2>${escapeHtml(subtitle)}</h2>` : ''}
    <table>
      <thead><tr>${tableHead}</tr></thead>
      <tbody>${tableBody}</tbody>
    </table>
    <footer style="margin-top:24px; font-size:12px; color:#6b7280;">Generated on ${escapeHtml(formattedGeneratedAt)}</footer>
    <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 250); };</script>
  </body>
</html>`);
  win.document.close();
};
