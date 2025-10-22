/**
 * API Client Module
 * Handles communication with AI APIs for tracker updates
 */

import { generateRaw, getRequestHeaders } from '../../../../../script.js';
import { extensionSettings, setIsGenerating, isGenerating } from '../../core/state.js';
import { generateTrackerPrompt, generateSeparateUpdatePrompt } from './promptBuilder.js';
import { parseTrackerResponse, updateTrackerData as applyTrackerUpdate } from './parser.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerUpdateResult} TrackerUpdateResult */

/**
 * Updates the story tracker data by calling the AI API
 * @param {Function} renderCallback - Callback to re-render the UI after update
 * @returns {Promise<TrackerUpdateResult>} Update result
 */
export async function updateTrackerData(renderCallback = null) {
    try {
        // Prevent concurrent updates
        if (isGenerating) {
            console.log('[Story Tracker] Update already in progress, skipping');
            return { success: false, errors: ['Update already in progress'] };
        }

        setIsGenerating(true);

        console.log('[Story Tracker] Starting tracker update...');

        let responseText = '';

        if (extensionSettings.generationMode === 'separate') {
            // Separate mode: Make a separate API call
            responseText = await generateSeparateTrackerUpdate();
        } else {
            // Together mode: Inject prompt into main generation
            // This would be handled by the injector module
            console.log('[Story Tracker] Together mode not yet implemented');
            return { success: false, errors: ['Together mode not implemented'] };
        }

        if (!responseText) {
            return { success: false, errors: ['No response from AI'] };
        }

        // Parse the response
        const parsedData = parseTrackerResponse(responseText);
        if (!parsedData) {
            return { success: false, errors: ['Failed to parse tracker data from response'] };
        }

        // Update the tracker data
        const updateSuccess = applyTrackerUpdate(parsedData);
        if (!updateSuccess) {
            return { success: false, errors: ['Failed to update tracker data'] };
        }

        // Re-render UI if callback provided
        if (renderCallback) {
            renderCallback();
        }

        console.log('[Story Tracker] Tracker update completed successfully');
        return {
            success: true,
            updatedData: extensionSettings.trackerData,
            errors: []
        };

    } catch (error) {
        console.error('[Story Tracker] Error updating tracker data:', error);
        return {
            success: false,
            errors: [error.message || 'Unknown error occurred']
        };
    } finally {
        setIsGenerating(false);
    }
}

/**
 * Generates tracker update in separate mode
 * @returns {Promise<string>} AI response text
 */
async function generateSeparateTrackerUpdate() {
    try {
        const messages = generateSeparateUpdatePrompt();

        console.log('[Story Tracker] Making separate API call for tracker update');

        const response = await generateRaw(
            messages,
            extensionSettings.useSeparatePreset,
            true, // streaming
            null, // quietToLoud
            null, // skipRepetitionCheck
            null, // customTokenCount
            false // doNotSaveToLogs
        );

        if (!response || !response[0]) {
            throw new Error('No response received from API');
        }

        return response[0].generated_text || response[0].text || '';

    } catch (error) {
        console.error('[Story Tracker] Error in separate generation:', error);
        throw error;
    }
}

/**
 * Generates tracker update in together mode (for future implementation)
 * @returns {Promise<string>} AI response text
 */
async function generateTogetherTrackerUpdate() {
    // This would inject the tracker prompt into the main chat generation
    // Implementation would depend on how SillyTavern handles prompt injection
    throw new Error('Together mode not yet implemented');
}

/**
 * Checks if tracker update should be triggered
 * @returns {boolean} Whether update should proceed
 */
export function shouldTriggerUpdate() {
    // Check if extension is enabled and has active fields
    if (!extensionSettings.enabled || !extensionSettings.showTracker) {
        return false;
    }

    // Check if there are any active fields to update
    const hasActiveFields = extensionSettings.trackerData.sections.some(section =>
        section.subsections.some(subsection =>
            subsection.fields.some(field => field.enabled)
        )
    );

    if (!hasActiveFields) {
        console.log('[Story Tracker] No active fields to update');
        return false;
    }

    return true;
}

/**
 * Gets the current generation status
 * @returns {boolean} Whether generation is in progress
 */
export function getGenerationStatus() {
    return isGenerating;
}
