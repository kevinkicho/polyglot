/**
 * Escapes HTML special characters to prevent XSS when inserting
 * user/database content into innerHTML templates.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
    if (!str) return '';
    if (typeof str !== 'string') str = String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
