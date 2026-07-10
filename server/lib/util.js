const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeText = (value = '') => escapeHtml(String(value || '')).trim();

// Validate and normalize numeric identifiers from route params
const parsePositiveInt = (value) => {
    const num = Number.parseInt(value, 10);
    if (!Number.isInteger(num) || num <= 0) {
        return null;
    }
    return num;
};

const parseBooleanInput = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) {
            return true;
        }
        if (['false', '0', 'no', 'off', ''].includes(normalized)) {
            return false;
        }
    }
    return Boolean(value);
};

module.exports = {
    escapeHtml,
    sanitizeText,
    parsePositiveInt,
    parseBooleanInput
};
