/**
 * Prompt Builder Module
 * Handles AI prompt generation for story tracker data
 */

import { extensionSettings, committedTrackerData } from '../../core/state.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerData} TrackerData */
/** @typedef {import('../../types/tracker.js').TrackerField} TrackerField */

/**
 * Generates the general instruction prompt that explains how the tracker works
 * @returns {string} General instruction text
 */
export function generateGeneralInstructions() {
    return `You are managing a dynamic story tracker for the roleplay. The tracker contains various fields that track different aspects of the story and characters. Your task is to return a valid JSON object that represents the updated tracker data.`;
}

/**
 * Generates the complete prompt for tracker updates
 * @param {boolean} includeHistory - Whether to include chat history
 * @param {TrackerData} trackerData - Current tracker data
 * @returns {string} Complete prompt text
 */
function convertTrackerForLLM(trackerData) {
    if (!trackerData) return {};
    const converted = JSON.parse(JSON.stringify(trackerData));

    for (const section of converted.sections) {
        for (const subsection of section.subsections) {
            const fieldsObject = {};
            for (const field of subsection.fields) {
                fieldsObject[field.name] = {
                    prompt: field.prompt || '',
                    value: field.value || ''
                };
            }
            subsection.fields = fieldsObject;
        }
    }

    return converted;
}

export function generateTrackerPrompt(includeHistory = true, trackerData = null) {
    const data = trackerData || committedTrackerData;
    const trackerForLLM = convertTrackerForLLM(data);

    let prompt = generateGeneralInstructions();
    prompt += '\n\n';

    if (includeHistory) {
        prompt += 'Recent chat history for context:\n';
        const depth = extensionSettings.updateDepth;
        const st = SillyTavern.getContext();
        const recentMessages = st.chat.slice(-depth);

        for (const message of recentMessages) {
            const role = message.is_user ? 'User' : 'Assistant';
            prompt += `${role}: ${message.mes}\n`;
        }
        prompt += '\n';
    }

    prompt += 'Current tracker state:\n';
    prompt += '```json\n';
    prompt += JSON.stringify(trackerForLLM, null, 2);
    prompt += '\n```\n\n';

    prompt += 'Instructions:\n';
    prompt += '- Each field has a "prompt" (what to track) and a "value" (current state).\n';
    prompt += '- Update the "value" of each field based on the recent events, while respecting the "prompt".\n';
    prompt += '- Return the complete, updated tracker data as a single JSON object inside a ```json code block.\n';
    prompt += '- Ensure the returned JSON has the same structure as the one provided.';

    return prompt;
}

/**
 * Generates a separate mode prompt for tracker updates
 * @returns {Array<{role: string, content: string}>} Message array for API
 */
export function generateSeparateUpdatePrompt() {
    const messages = [];

    // System message
    let systemMessage = generateGeneralInstructions();
    messages.push({
        role: 'system',
        content: systemMessage
    });

    // Instruction message
    const instructionMessage = generateTrackerPrompt(true);

    messages.push({
        role: 'user',
        content: instructionMessage
    });

    return messages;
}
