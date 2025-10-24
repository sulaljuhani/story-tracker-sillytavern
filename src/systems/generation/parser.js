/**
 * Parser Module
 * Handles parsing of AI responses to extract tracker data
 */

import { extensionSettings } from '../../core/state.js';

/**
 * Reconstructs tracker data returned by the LLM using the existing template
 * so that optional fields keep their previous values when omitted.
 */
function restoreTrackerFromLLM(parsedData) {
    if (!parsedData || !Array.isArray(parsedData.sections)) {
        return null;
    }

    const originalData = JSON.parse(JSON.stringify(extensionSettings.trackerData || { sections: [] }));
    if (!Array.isArray(originalData.sections)) {
        return null;
    }

    const restoredSections = [];

    for (const originalSection of originalData.sections) {
        const parsedSection = parsedData.sections.find((section) => section.name === originalSection.name);
        if (!parsedSection) {
            continue;
        }

        const restoredSectionFields = [];
        for (const originalField of originalSection.fields || []) {
            const parsedFieldData = parsedSection.fields?.[originalField.name];
            if (parsedFieldData) {
                originalField.value = parsedFieldData.value ?? originalField.value;
            }
            restoredSectionFields.push(originalField);
        }

        const restoredSubsections = [];
        for (const originalSubsection of originalSection.subsections || []) {
            const parsedSubsection = parsedSection.subsections?.find((subsection) => subsection.name === originalSubsection.name);
            if (!parsedSubsection) {
                continue;
            }

            const restoredFields = [];
            for (const originalField of originalSubsection.fields || []) {
                const parsedFieldData = parsedSubsection.fields?.[originalField.name];
                if (parsedFieldData) {
                    originalField.value = parsedFieldData.value ?? originalField.value;
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

    return { sections: restoredSections };
}

const HTML_REGEX = /(<div[^>]*>[\s\S]*?<\/div>|<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>)/gi;
const CODE_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
const MULTI_NEWLINE_REGEX = /\n{3,}/g;

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

        const trimmed = captured.trim();
        try {
            const parsedData = JSON.parse(trimmed);
            const restored = restoreTrackerFromLLM(parsedData);
            if (restored) {
                result.trackerData = restored;
                removalBounds = {
                    start: match.index,
                    end: match.index + fullMatch.length
                };
                break;
            }
        } catch (error) {
            // Ignore parsing errors for non-JSON code blocks; try next block
            continue;
        }
    }

    if (removalBounds) {
        workingText = workingText.slice(0, removalBounds.start) + workingText.slice(removalBounds.end);
    }

    result.cleanedText = workingText.replace(MULTI_NEWLINE_REGEX, '\n\n').trim();

    return result;
}
