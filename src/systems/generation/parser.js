/**
 * Parser Module
 * Handles parsing of AI responses to extract tracker data
 */

import { extensionSettings } from '../../core/state.js';

/**
 * Reconstructs tracker data returned by the LLM using the existing template
 * so that optional fields keep their previous values when omitted.
 */
function normalizeKey(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function coerceFieldRecord(candidate, fallbackName) {
    if (candidate && typeof candidate === 'object') {
        const base = { ...candidate };

        if (base.value === undefined) {
            if (base.text !== undefined) {
                base.value = base.text;
            } else if (base.content !== undefined) {
                base.value = base.content;
            }
        }

        if (!base.name && fallbackName) {
            base.name = fallbackName;
        }

        return base;
    }

    if (candidate !== undefined && candidate !== null) {
        return {
            name: fallbackName,
            value: candidate
        };
    }

    return null;
}

function findSectionCandidate(collection, templateSection) {
    if (!collection) {
        return null;
    }

    const targetName = normalizeKey(templateSection?.name);
    const targetId = normalizeKey(templateSection?.id);

    const evaluate = (candidate, fallbackName) => {
        if (!candidate || typeof candidate !== 'object') {
            return null;
        }

        const candidateId = normalizeKey(candidate.id);
        const candidateName = normalizeKey(candidate.name ?? fallbackName);

        if (targetId && candidateId === targetId) {
            return candidate;
        }

        if (targetName && candidateName === targetName) {
            return candidate;
        }

        return null;
    };

    if (Array.isArray(collection)) {
        for (const candidate of collection) {
            const match = evaluate(candidate);
            if (match) {
                return match;
            }
        }
        return null;
    }

    if (typeof collection === 'object') {
        for (const [key, value] of Object.entries(collection)) {
            const match = evaluate(value, key);
            if (match) {
                if (!match.name && value && typeof value === 'object') {
                    return {
                        ...value,
                        name: value.name ?? key
                    };
                }
                return match;
            }

            if (targetName && normalizeKey(key) === targetName && value && typeof value === 'object') {
                return {
                    ...value,
                    name: value.name ?? key
                };
            }
        }
    }

    return null;
}

function findFieldCandidate(collection, templateField) {
    if (!collection) {
        return null;
    }

    const targetName = normalizeKey(templateField?.name);
    const targetId = normalizeKey(templateField?.id);

    const considerCandidate = (candidate, fallbackName) => {
        const record = coerceFieldRecord(candidate, fallbackName);
        if (!record) {
            return null;
        }

        const candidateId = normalizeKey(record.id);
        const candidateName = normalizeKey(record.name);

        if (targetId && candidateId === targetId) {
            return record;
        }

        if (targetName && candidateName === targetName) {
            return record;
        }

        if (!targetName && !targetId && fallbackName) {
            return record;
        }

        return null;
    };

    if (Array.isArray(collection)) {
        for (const candidate of collection) {
            const match = considerCandidate(candidate);
            if (match) {
                return match;
            }
        }
        return null;
    }

    if (typeof collection === 'object') {
        if (templateField?.name && Object.prototype.hasOwnProperty.call(collection, templateField.name)) {
            const direct = considerCandidate(collection[templateField.name], templateField.name);
            if (direct) {
                return direct;
            }
        }

        if (templateField?.id && Object.prototype.hasOwnProperty.call(collection, templateField.id)) {
            const direct = considerCandidate(collection[templateField.id], templateField.id);
            if (direct) {
                return direct;
            }
        }

        for (const [key, value] of Object.entries(collection)) {
            const normalizedKey = normalizeKey(key);
            if (targetName && normalizedKey === targetName) {
                const match = considerCandidate(value, key);
                if (match) {
                    return match;
                }
            }

            const match = considerCandidate(value, key);
            if (match) {
                return match;
            }
        }
    }

    return null;
}

function findSectionsSource(candidate) {
    if (!candidate || typeof candidate !== 'object') {
        return null;
    }

    if (Object.prototype.hasOwnProperty.call(candidate, 'sections')) {
        return candidate.sections;
    }

    const values = Array.isArray(candidate) ? candidate : Object.values(candidate);
    for (const value of values) {
        if (!value || typeof value !== 'object') {
            continue;
        }

        const nested = findSectionsSource(value);
        if (nested) {
            return nested;
        }
    }

    return null;
}

function restoreTrackerFromLLM(parsedData) {
    if (!parsedData || typeof parsedData !== 'object') {
        return null;
    }

    const sectionsSource = findSectionsSource(parsedData);
    if (!sectionsSource) {
        return null;
    }
    const hasSections = Array.isArray(sectionsSource)
        ? sectionsSource.length > 0
        : typeof sectionsSource === 'object' && Object.keys(sectionsSource).length > 0;

    if (!hasSections) {
        return null;
    }

    const originalData = JSON.parse(JSON.stringify(extensionSettings.trackerData || { sections: [] }));
    if (!Array.isArray(originalData.sections)) {
        return null;
    }

    const restoredSections = [];
    let foundTrackerValues = false;

    for (const originalSection of originalData.sections) {
        const parsedSection = findSectionCandidate(sectionsSource, originalSection);
        if (!parsedSection) {
            restoredSections.push(originalSection);
            continue;
        }

        const restoredSectionFields = [];
        for (const originalField of originalSection.fields || []) {
            const parsedFieldData = findFieldCandidate(parsedSection.fields, originalField);
            if (parsedFieldData && Object.prototype.hasOwnProperty.call(parsedFieldData, 'value')) {
                originalField.value = parsedFieldData.value ?? originalField.value;
                foundTrackerValues = true;
            }
            restoredSectionFields.push(originalField);
        }

        const restoredSubsections = [];
        for (const originalSubsection of originalSection.subsections || []) {
            const parsedSubsection = findSectionCandidate(parsedSection.subsections, originalSubsection);
            if (!parsedSubsection) {
                restoredSubsections.push(originalSubsection);
                continue;
            }

            const restoredFields = [];
            for (const originalField of originalSubsection.fields || []) {
                const parsedFieldData = findFieldCandidate(parsedSubsection.fields, originalField);
                if (parsedFieldData && Object.prototype.hasOwnProperty.call(parsedFieldData, 'value')) {
                    originalField.value = parsedFieldData.value ?? originalField.value;
                    foundTrackerValues = true;
                }
                restoredFields.push(originalField);
            }

            originalSubsection.fields = restoredFields;
            restoredSubsections.push(originalSubsection);
        }

        if (restoredSectionFields.length > 0 || Array.isArray(originalSection.fields)) {
            originalSection.fields = restoredSectionFields;
        }

        originalSection.subsections = restoredSubsections;
        restoredSections.push(originalSection);
    }

    if (!foundTrackerValues) {
        return null;
    }

    return { sections: restoredSections };
}

const HTML_REGEX = /(<div[^>]*>[\s\S]*?<\/div>|<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>)/gi;
const CODE_BLOCK_REGEX = /```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)\s*```/gi;
const MULTI_NEWLINE_REGEX = /\n{3,}/g;

function tryParseTrackerJson(candidate) {
    if (!candidate) {
        return null;
    }

    try {
        const parsedData = JSON.parse(candidate);
        return restoreTrackerFromLLM(parsedData);
    } catch (_error) {
        return null;
    }
}

function findBalancedJsonCandidate(text) {
    if (!text) {
        return null;
    }

    for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
        let depth = 0;
        let inString = false;
        let escape = false;

        for (let index = start; index < text.length; index += 1) {
            const char = text[index];

            if (escape) {
                escape = false;
                continue;
            }

            if (char === '\\') {
                escape = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (inString) {
                continue;
            }

            if (char === '{') {
                depth += 1;
            } else if (char === '}') {
                depth -= 1;

                if (depth === 0) {
                    return {
                        start,
                        end: index + 1,
                        candidate: text.slice(start, index + 1)
                    };
                }
            }
        }
    }

    return null;
}

/**
 * Parses the model response to extract tracker data and cleaned narrative text.
 *
 * @param {string} responseText - The raw AI response text
 * @returns {{ trackerData: object|null, html: string|null, cleanedText: string }} Parsed data
 */
export function parseResponse(responseText) {
    const originalText = typeof responseText === 'string' ? responseText : '';
    let workingText = originalText;

    const result = {
        trackerData: null,
        html: null,
        cleanedText: originalText.trim()
    };

    const htmlMatches = workingText.match(HTML_REGEX);
    if (htmlMatches && htmlMatches.length > 0) {
        result.html = htmlMatches.join('\n');
        workingText = workingText.replace(HTML_REGEX, '');
    }

    const codeBlocks = [...workingText.matchAll(CODE_BLOCK_REGEX)];
    let removalBounds = null;

    for (const match of codeBlocks) {
        const [fullMatch, captured] = match;
        if (!captured) {
            continue;
        }

        const restored = tryParseTrackerJson(captured.trim());
        if (restored) {
            result.trackerData = restored;
            removalBounds = {
                start: match.index,
                end: match.index + fullMatch.length
            };
            break;
        }
    }

    if (!result.trackerData) {
        const fallbackCandidate = findBalancedJsonCandidate(workingText);
        if (fallbackCandidate) {
            const restored = tryParseTrackerJson(fallbackCandidate.candidate.trim());
            if (restored) {
                result.trackerData = restored;
                removalBounds = {
                    start: fallbackCandidate.start,
                    end: fallbackCandidate.end
                };
            }
        }
    }

    if (removalBounds) {
        workingText = workingText.slice(0, removalBounds.start) + workingText.slice(removalBounds.end);
    }

    result.cleanedText = workingText.replace(MULTI_NEWLINE_REGEX, '\n\n').trim();

    return result;
}
