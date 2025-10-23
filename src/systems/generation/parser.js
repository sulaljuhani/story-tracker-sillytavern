/**
 * Parser Module
 * Handles parsing of AI responses to extract tracker data
 */

import { extensionSettings } from '../../core/state.js';
import { saveSettings } from '../../core/persistence.js';

/**
 * Parses the model response to extract the different data sections.
 * Extracts tracker data from markdown code blocks in the AI response.
 *
 * @param {string} responseText - The raw AI response text
 * @returns {{trackerData: object|null, html: string|null}} Parsed data
 */
function restoreTrackerFromLLM(parsedData) {
    if (!parsedData || !Array.isArray(parsedData.sections)) {
        return null;
    }

    const originalData = JSON.parse(JSON.stringify(extensionSettings.trackerData));

    const restoredSections = [];

    for (const originalSection of originalData.sections) {
        const parsedSection = parsedData.sections.find(s => s.name === originalSection.name);
        if (!parsedSection) continue;

        const restoredSubsections = [];
        for (const originalSubsection of originalSection.subsections) {
            const parsedSubsection = parsedSection.subsections.find(ss => ss.name === originalSubsection.name);
            if (!parsedSubsection) continue;

            const restoredFields = [];
            for (const originalField of originalSubsection.fields) {
                const parsedFieldData = parsedSubsection.fields[originalField.name];
                if (parsedFieldData) {
                    originalField.value = parsedFieldData.value || originalField.value;
                }
                restoredFields.push(originalField);
            }
            originalSubsection.fields = restoredFields;
            restoredSubsections.push(originalSubsection);
        }
        originalSection.subsections = restoredSubsections;
        restoredSections.push(originalSection);
    }

    return { sections: restoredSections };
}

export function parseResponse(responseText) {
    const result = {
        trackerData: null,
        html: null
    };

    const htmlRegex = /(<div[^>]*>[\s\S]*?<\/div>|<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>)/gi;
    const htmlMatches = responseText.match(htmlRegex);
    if (htmlMatches) {
        result.html = htmlMatches.join('\n');
        responseText = responseText.replace(htmlRegex, '');
    }

    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    let match;
    const matches = [];
    while ((match = codeBlockRegex.exec(responseText)) !== null) {
        matches.push(match[1]);
    }

    if (matches.length > 0) {
        try {
            const parsedData = JSON.parse(matches[0]);
            result.trackerData = restoreTrackerFromLLM(parsedData);
        } catch (error) {
            console.error('[Story Tracker] Error parsing tracker data from code block:', error);
        }
    }

    return result;
}
