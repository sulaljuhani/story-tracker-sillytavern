/**
 * Prompt Builder Module
 * Handles AI prompt generation for story tracker data
 */

import { getContext, chat } from '../../../../script.js';
import { extensionSettings, committedTrackerData } from '../../core/state.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerData} TrackerData */
/** @typedef {import('../../types/tracker.js').TrackerField} TrackerField */

/**
 * Generates the general instruction prompt that explains how the tracker works
 * @returns {string} General instruction text
 */
export function generateGeneralInstructions() {
    const userName = getContext().name1;

    return `You are managing a dynamic story tracker for the roleplay. The tracker contains various fields that track different aspects of the story and characters.

Each field has a specific prompt that tells you how to update that field's value based on the current events in the roleplay. You should update field values to reflect changes in the story, character states, world events, etc.

Guidelines:
- Update field values based on their individual prompts and recent story events
- Only update fields when relevant changes occur
- Keep values concise but descriptive
- Use the previous values as context for what has changed
- Maintain consistency with the established story and character traits

The tracker is organized in sections and subsections for better organization.`;
}

/**
 * Generates the instruction portion for a specific field
 * @param {TrackerField} field - The field to generate instructions for
 * @param {string} previousValue - The previous value of the field
 * @returns {string} Field-specific instruction
 */
export function generateFieldInstruction(field, previousValue = '') {
    const userName = getContext().name1;

    return `Field: ${field.name}
Previous Value: "${previousValue}"
Update Prompt: ${field.prompt}
Current Value:`;
}

/**
 * Generates example tracker output format
 * @param {TrackerData} trackerData - Current tracker data to use as example
 * @returns {string} Formatted example text
 */
export function generateTrackerExample(trackerData = null) {
    const data = trackerData || committedTrackerData;
    if (!data || !data.sections) return '';

    let example = '```\nStory Tracker Update\n---\n';

    for (const section of data.sections) {
        example += `Section: ${section.name}\n`;

        for (const subsection of section.subsections) {
            example += `  Subsection: ${subsection.name}\n`;

            for (const field of subsection.fields) {
                if (field.enabled) {
                    example += `    ${field.name}: ${field.value || 'Not set'}\n`;
                }
            }
        }
        example += '\n';
    }

    example += '```\n\n';
    return example.trim();
}

/**
 * Generates the complete prompt for tracker updates
 * @param {boolean} includeHistory - Whether to include chat history
 * @param {TrackerData} trackerData - Current tracker data
 * @returns {string} Complete prompt text
 */
export function generateTrackerPrompt(includeHistory = true, trackerData = null) {
    const data = trackerData || committedTrackerData;
    const userName = getContext().name1;

    let prompt = generateGeneralInstructions();
    prompt += '\n\n';

    if (includeHistory) {
        prompt += 'Recent chat history for context:\n';
        const depth = extensionSettings.updateDepth;
        const recentMessages = chat.slice(-depth);

        for (const message of recentMessages) {
            const role = message.is_user ? 'User' : 'Assistant';
            prompt += `${role}: ${message.mes}\n`;
        }
        prompt += '\n';
    }

    prompt += 'Current tracker state:\n';
    prompt += generateTrackerExample(data);
    prompt += '\n\n';

    // Generate field-specific instructions
    prompt += 'Please update the following fields based on the recent events:\n\n';

    let fieldCount = 0;
    for (const section of data.sections) {
        for (const subsection of section.subsections) {
            for (const field of subsection.fields) {
                if (field.enabled) {
                    prompt += generateFieldInstruction(field, field.value);
                    prompt += '\n\n';
                    fieldCount++;
                }
            }
        }
    }

    if (fieldCount === 0) {
        prompt += 'No active fields to update.\n\n';
    }

    prompt += 'Provide the updated tracker in the same format as the example above. Only include fields that have changed or need updating.';

    return prompt;
}

/**
 * Generates a separate mode prompt for tracker updates
 * @param {TrackerData} trackerData - Current tracker data
 * @returns {Array<{role: string, content: string}>} Message array for API
 */
export function generateSeparateUpdatePrompt(trackerData = null) {
    const data = trackerData || committedTrackerData;
    const depth = extensionSettings.updateDepth;

    const messages = [];

    // System message
    let systemMessage = `You are a Story Tracker assistant. Your role is to update story tracking fields based on recent roleplay events.\n\n`;
    systemMessage += generateGeneralInstructions();

    messages.push({
        role: 'system',
        content: systemMessage
    });

    // Add recent chat history
    const recentMessages = chat.slice(-depth);
    for (const message of recentMessages) {
        messages.push({
            role: message.is_user ? 'user' : 'assistant',
            content: message.mes
        });
    }

    // Instruction message
    const instructionMessage = `Based on the recent conversation, update the story tracker fields according to their individual prompts.\n\n${generateTrackerPrompt(false, data)}`;

    messages.push({
        role: 'user',
        content: instructionMessage
    });

    return messages;
}

/**
 * Generates a contextual summary for injection into main chat
 * @param {TrackerData} trackerData - Current tracker data
 * @returns {string} Formatted summary
 */
export function generateContextualSummary(trackerData = null) {
    const data = trackerData || committedTrackerData;
    if (!data || !data.sections) return '';

    let summary = 'Current Story State:\n';

    for (const section of data.sections) {
        summary += `${section.name}:\n`;

        for (const subsection of section.subsections) {
            summary += `  ${subsection.name}:\n`;

            for (const field of subsection.fields) {
                if (field.enabled && field.value) {
                    summary += `    ${field.name}: ${field.value}\n`;
                }
            }
        }
        summary += '\n';
    }

    return summary.trim();
}
