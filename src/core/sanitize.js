/**
 * Escapes HTML special characters to prevent injection when rendering user-provided strings.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
