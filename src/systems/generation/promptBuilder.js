/**
 * Prompt Builder Module
 * Handles AI prompt generation for story tracker data
 */

import { extensionSettings, committedTrackerData } from '../../core/state.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerData} TrackerData */
/** @typedef {import('../../types/tracker.js').TrackerField} TrackerField */

/**
 * Generates the general instruction prompt that explains how the tracker works.
 * @param {'together'|'separate'} mode - Generation mode to tailor instructions for
 * @returns {string} General instruction text
 */
export function generateGeneralInstructions(mode = 'separate') {
    const basePrompt = extensionSettings.systemPrompt?.trim();
    const defaultPrompt = 'You are managing a dynamic story tracker for the roleplay. The tracker contains various fields that track different aspects of the story and characters.';

    let instructions = basePrompt || defaultPrompt;

    if (mode === 'together') {
        instructions += '\n\nAlways begin your reply with an updated tracker JSON block enclosed in ```json fences before continuing the narrative response. Maintain immersive storytelling after the code block.';
    } else {
        instructions += '\n\nReturn only the updated tracker data as a ```json code block with no additional narration. Ensure the block is valid JSON.';
    }

    return instructions.trim();
}

function convertTrackerForLLM(trackerData) {
    if (!trackerData) return {};
    const converted = JSON.parse(JSON.stringify(trackerData));

    for (const section of converted.sections || []) {
        if (Array.isArray(section.fields)) {
            const sectionFieldsObject = {};
            for (const field of section.fields) {
                sectionFieldsObject[field.name] = {
                    prompt: field.prompt ?? '',
                    value: field.value ?? ''
                };
            }
            section.fields = sectionFieldsObject;
        }

        for (const subsection of section.subsections || []) {
            const fieldsObject = {};
            for (const field of subsection.fields || []) {
                fieldsObject[field.name] = {
                    prompt: field.prompt ?? '',
                    value: field.value ?? ''
                };
            }
            subsection.fields = fieldsObject;
        }
    }

    return converted;
}

export function createTrackerPayloadForLLM(trackerData) {
    return convertTrackerForLLM(trackerData);
}

/**
 * Generates the complete prompt for tracker updates.
 *
 * @param {boolean} includeHistory - Whether to include chat history
 * @param {TrackerData|null} trackerData - Current tracker data override
 * @param {{ includeNarrative?: boolean }} [options] - Additional prompt options
 * @returns {string} Complete prompt text
 */
export function generateTrackerPrompt(includeHistory = true, trackerData = null, options = {}) {
    const { includeNarrative = false } = options;
    const data = trackerData || committedTrackerData;
    const trackerForLLM = createTrackerPayloadForLLM(data);

    let prompt = generateGeneralInstructions(includeNarrative ? 'together' : 'separate');
    prompt += '\n\n';

    if (includeHistory) {
        prompt += 'Recent chat history for context:\n';
        const depth = extensionSettings.updateDepth;
        const st = SillyTavern.getContext();
        if (st?.chat) {
            const recentMessages = st.chat.slice(-depth);

            for (const message of recentMessages) {
                const role = message.is_user ? 'User' : 'Assistant';
                prompt += `${role}: ${message.mes}\n`;
            }
            prompt += '\n';
        } else {
            console.warn('[Story Tracker] SillyTavern chat context not available for prompt building.');
        }
    }

    prompt += 'Current tracker state:\n';
    prompt += '```json\n';
    prompt += JSON.stringify(trackerForLLM, null, 2);
    prompt += '\n```\n\n';

    prompt += 'Instructions:\n';
    prompt += '- Each field has a "prompt" (what to track) and a "value" (current state).\n';
    prompt += '- Update the "value" of each field based on the recent events while respecting the "prompt".\n';
    prompt += '- Your reply MUST begin with a single ```json code block that contains the entire tracker data.\n';
    prompt += '- Even if no values change, repeat the tracker exactly as provided inside that code block so the data is always returned.\n';

    if (includeNarrative) {
        prompt += '- Begin your reply with the updated tracker data inside a ```json code block before any narrative text.\n';
        prompt += '- After closing the code block, continue the narrative in a new paragraph so that it reflects the tracker changes.\n';
    } else {
        prompt += '- Return only the updated tracker data as a ```json code block with no additional prose.\n';
    }

    prompt += '- Ensure the returned JSON has the same structure as the one provided (same sections, subsections, and field keys).';

    if (includeNarrative) {
        prompt += '\n- Example format:\n';
        prompt += '```json\n{ ... tracker data ... }\n```\nNarrative continues here.';
    }

    return prompt;
}

/**
 * Generates a separate mode prompt for tracker updates
 * @returns {Array<{role: string, content: string}>} Message array for API
 */
export function generateSeparateUpdatePrompt() {
    const messages = [];

    messages.push({
        role: 'system',
        content: generateGeneralInstructions('separate')
    });

    messages.push({
        role: 'user',
        content: generateTrackerPrompt(true, null, { includeNarrative: false })
    });

    return messages;
}
