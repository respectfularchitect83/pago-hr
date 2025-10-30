export const formatDateOnly = (value?: string | Date | null): string => {
    if (value === null || value === undefined) {
        return '';
    }

    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().split('T')[0];
};
