/**
 * Serialization helpers for Story Tracker data structures.
 * Supports JSON and a limited YAML dialect compatible with the generated output.
 */

const JSON_INDENT = 2;
const FORMAT_JSON = 'json';
const FORMAT_YAML = 'yaml';

function normalizeFormat(format) {
    const value = (format || FORMAT_JSON).toString().trim().toLowerCase();
    return value === 'yaml' || value === 'yml' ? FORMAT_YAML : FORMAT_JSON;
}

function detectFormatFromFilename(filename = '') {
    const name = filename.toLowerCase();
    if (name.endsWith('.yaml') || name.endsWith('.yml')) {
        return FORMAT_YAML;
    }
    return FORMAT_JSON;
}

function serializeTrackerData(data, format = FORMAT_JSON) {
    const normalized = normalizeFormat(format);
    return normalized === FORMAT_YAML
        ? serializeYaml(data)
        : JSON.stringify(data, null, JSON_INDENT);
}

function parseTrackerData(text, format = FORMAT_JSON) {
    const normalized = normalizeFormat(format);
    if (normalized === FORMAT_YAML) {
        return parseYaml(text);
    }
    return JSON.parse(text);
}

function serializeYaml(value, indentLevel = 0) {
    const padding = '  '.repeat(indentLevel);

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return padding + '[]';
        }
        return value
            .map(item => {
                if (isScalar(item)) {
                    return padding + '- ' + formatScalar(item);
                }
                const nested = serializeYaml(item, indentLevel + 1);
                return padding + '-\n' + nested;
            })
            .join('\n');
    }

    if (isPlainObject(value)) {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return padding + '{}';
        }
        const lines = [];
        for (const [key, val] of entries) {
            const safeKey = formatKey(key);
            if (isScalar(val)) {
                lines.push(padding + safeKey + ': ' + formatScalar(val));
            } else {
                const nested = serializeYaml(val, indentLevel + 1);
                lines.push(padding + safeKey + ':');
                lines.push(nested);
            }
        }
        return lines.join('\n');
    }

    return padding + formatScalar(value);
}

function parseYaml(text = '') {
    const externalParser = getExternalYamlParser();
    if (externalParser) {
        return externalParser(text);
    }

    const lines = text
        .replace(/\t/g, '  ')
        .split(/\r?\n/)
        .map(line => line.replace(/\s+#.*$/, ''));

    const { value } = parseBlock(lines, 0, 0);
    return value;
}

function parseBlock(lines, startIndex, indent) {
    let index = startIndex;
    while (index < lines.length) {
        const raw = lines[index];
        if (!raw || !raw.trim()) {
            index += 1;
            continue;
        }
        const currentIndent = countIndent(raw);
        if (currentIndent < indent) {
            break;
        }
        const trimmed = raw.slice(indent);
        if (trimmed === '-' || trimmed.startsWith('- ')) {
            return parseArray(lines, index, indent);
        }
        if (currentIndent > indent) {
            break;
        }
        return parseObject(lines, index, indent);
    }
    return { value: {}, nextIndex: index };
}

function parseArray(lines, startIndex, indent) {
    const result = [];
    let index = startIndex;

    while (index < lines.length) {
        let raw = lines[index];
        if (!raw || !raw.trim()) {
            index += 1;
            continue;
        }
        const currentIndent = countIndent(raw);
        if (currentIndent < indent) {
            break;
        }
        if (currentIndent > indent) {
            break;
        }
        const trimmed = raw.slice(indent);
        if (!(trimmed === '-' || trimmed.startsWith('- '))) {
            break;
        }

        const content = trimmed.length > 1 ? trimmed.slice(1).trimStart() : '';
        index += 1;

        if (!content) {
            const child = parseBlock(lines, index, indent + 2);
            result.push(child.value);
            index = child.nextIndex;
            continue;
        }

        const { key, value } = splitKeyValue(content);
        if (value === null) {
            result.push(parseScalar(content));
            continue;
        }

        const item = {};
        if (value === '') {
            const child = parseBlock(lines, index, indent + 2);
            item[key] = child.value;
            index = child.nextIndex;
        } else {
            item[key] = parseScalar(value);
        }

        index = consumeAdditionalObjectLines(lines, index, indent + 2, item);
        result.push(item);
    }

    return { value: result, nextIndex: index };
}

function parseObject(lines, startIndex, indent) {
    const result = {};
    let index = startIndex;

    while (index < lines.length) {
        let raw = lines[index];
        if (!raw || !raw.trim()) {
            index += 1;
            continue;
        }
        const currentIndent = countIndent(raw);
        if (currentIndent < indent) {
            break;
        }
        if (currentIndent > indent) {
            const lastKey = Object.keys(result)[Object.keys(result).length - 1];
            if (!lastKey) {
                break;
            }
            const child = parseBlock(lines, index, currentIndent);
            mergeNestedValue(result, lastKey, child.value);
            index = child.nextIndex;
            continue;
        }

        const trimmed = raw.slice(indent).trim();
        if (trimmed === '-' || trimmed.startsWith('- ')) {
            break;
        }
        const { key, value } = splitKeyValue(trimmed);
        if (value === null) {
            throw new Error(`Invalid YAML line: ${trimmed}`);
        }

        index += 1;
        if (value === '') {
            const child = parseBlock(lines, index, indent + 2);
            result[key] = child.value;
            index = child.nextIndex;
        } else {
            result[key] = parseScalar(value);
        }
    }

    return { value: result, nextIndex: index };
}

function consumeAdditionalObjectLines(lines, startIndex, indent, target) {
    let index = startIndex;

    while (index < lines.length) {
        const raw = lines[index];
        if (!raw || !raw.trim()) {
            index += 1;
            continue;
        }
        const currentIndent = countIndent(raw);
        if (currentIndent < indent) {
            break;
        }
        const trimmed = raw.slice(indent).trim();
        if (currentIndent === indent && (trimmed === '-' || trimmed.startsWith('- '))) {
            break;
        }
        if (currentIndent > indent) {
            const lastKey = Object.keys(target)[Object.keys(target).length - 1];
            if (!lastKey) {
                break;
            }
            const child = parseBlock(lines, index, currentIndent);
            mergeNestedValue(target, lastKey, child.value);
            index = child.nextIndex;
            continue;
        }

        const { key, value } = splitKeyValue(trimmed);
        if (value === null) {
            break;
        }
        index += 1;
        if (value === '') {
            const child = parseBlock(lines, index, indent + 2);
            target[key] = child.value;
            index = child.nextIndex;
        } else {
            target[key] = parseScalar(value);
        }
    }

    return index;
}

function mergeNestedValue(container, key, value) {
    const current = container[key];
    if (isPlainObject(current) && isPlainObject(value)) {
        Object.assign(current, value);
        return;
    }
    if (Array.isArray(current) && Array.isArray(value)) {
        current.push(...value);
        return;
    }
    container[key] = value;
}

function splitKeyValue(text) {
    const separatorIndex = text.indexOf(':');
    if (separatorIndex === -1) {
        return { key: null, value: null };
    }
    const key = text.slice(0, separatorIndex).trim();
    const value = text.slice(separatorIndex + 1).trim();
    return { key, value };
}

function countIndent(line) {
    let count = 0;
    for (const char of line) {
        if (char === ' ') {
            count += 1;
        } else {
            break;
        }
    }
    return count;
}

function parseScalar(value) {
    if (value === 'null' || value === '~') {
        return null;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    if (value === '[]') {
        return [];
    }
    if (value === '{}') {
        return {};
    }
    if (!Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }
    if (value.startsWith('"') && value.endsWith('"')) {
        try {
            return JSON.parse(value);
        } catch (error) {
            return value.slice(1, -1);
        }
    }
    if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1).replace(/''/g, "'");
    }
    return value;
}

function isScalar(value) {
    return (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    );
}

function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}

function formatScalar(value) {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : 'null';
    }
    if (typeof value === 'string') {
        if (value === '') {
            return "''";
        }
        if (/[:#\-\n\r]/.test(value)) {
            return JSON.stringify(value);
        }
        return value;
    }
    return JSON.stringify(value);
}

function formatKey(key) {
    return /[:\s]/.test(key) ? JSON.stringify(key) : key;
}

function getExternalYamlParser() {
    if (typeof window !== 'undefined') {
        if (window.jsyaml && typeof window.jsyaml.load === 'function') {
            return text => window.jsyaml.load(text);
        }
        if (window.YAML && typeof window.YAML.parse === 'function') {
            return text => window.YAML.parse(text);
        }
    }
    return null;
}

export {
    FORMAT_JSON,
    FORMAT_YAML,
    normalizeFormat,
    detectFormatFromFilename,
    serializeTrackerData,
    parseTrackerData
};
