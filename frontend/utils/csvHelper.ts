

// Helper to correctly format a value for CSV
const formatCsvCell = (value: any): string => {
    if (value === null || value === undefined) {
        return '';
    }
    const stringValue = String(value);
    // Check if we need to quote the value
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        // Escape double quotes by doubling them, then wrap the whole thing in double quotes
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

/**
 * Converts an array of objects to a CSV string. Gathers all keys from all objects to form a complete header.
 */
export function convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
        return "";
    }

    const headerSet = new Set<string>();
    data.forEach(row => {
        Object.keys(row).forEach(key => headerSet.add(key));
    });
    const headers = Array.from(headerSet);

    const headerRow = headers.map(formatCsvCell).join(',');
    const dataRows = data.map(row => 
        headers.map(fieldName => 
            formatCsvCell(row[fieldName])
        ).join(',')
    );

    return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers a browser download for a CSV string.
 */
export function downloadCSV(csvString: string, filename: string): void {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


/**
 * Parses a CSV string into an array of objects. Handles quoted fields with commas, newlines, and escaped quotes.
 * This version does not split by lines first, making it robust for multiline fields.
 */
export function parseCSV(csvText: string): any[] {
    const text = csvText.trim();
    if (!text) return [];

    const headerEndIndex = text.indexOf('\n');
    const headerLine = headerEndIndex === -1 ? text : text.substring(0, headerEndIndex).trim();
    const headers = headerLine.split(',').map(h => h.trim());
    
    if (headerEndIndex === -1 || text.substring(headerEndIndex + 1).trim() === '') {
        return []; // No data rows
    }
    
    const content = text.substring(headerEndIndex + 1);

    const result = [];
    let currentRow: { [key: string]: string } = {};
    let currentField = '';
    let inQuotedField = false;
    let fieldIndex = 0;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (inQuotedField) {
            if (char === '"') {
                if (i + 1 < content.length && content[i + 1] === '"') {
                    currentField += '"';
                    i++; // Skip the next quote (escaped quote)
                } else {
                    inQuotedField = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotedField = true;
            } else if (char === ',') {
                if(headers[fieldIndex]) currentRow[headers[fieldIndex]] = currentField;
                currentField = '';
                fieldIndex++;
            } else if (char === '\n' || (char === '\r' && content[i+1] === '\n')) {
                if (char === '\r') i++; // Move past \n in \r\n
                if(headers[fieldIndex]) currentRow[headers[fieldIndex]] = currentField;
                
                if (Object.keys(currentRow).length > 0) {
                    result.push(currentRow);
                }
                
                currentRow = {};
                currentField = '';
                fieldIndex = 0;
            } else if (char !== '\r') {
                currentField += char;
            }
        }
    }

    // Add the very last field and row if file doesn't end with a newline
    if (fieldIndex < headers.length) {
         if(headers[fieldIndex]) currentRow[headers[fieldIndex]] = currentField;
    }
    if (Object.keys(currentRow).length > 0) {
        result.push(currentRow);
    }

    return result;
}
