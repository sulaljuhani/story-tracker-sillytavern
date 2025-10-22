/**
 * API Client Module
 * Handles API calls for RPG tracker generation
 */

import {
    extensionSettings,
    lastGeneratedData,
    committedTrackerData,
    isGenerating,
    lastActionWasSwipe,
    setIsGenerating,
    setLastActionWasSwipe
} from '../../core/state.js';
import { saveChatData } from '../../core/persistence.js';
import { generateSeparateUpdatePrompt } from './promptBuilder.js';
import { parseResponse, parseUserStats } from './parser.js';

// Store the original preset name to restore after tracker generation
let originalPresetName = null;

/**
 * Gets the current preset name using the /preset command
 * @returns {Promise<string|null>} Current preset name or null if unavailable
 */
async function getCurrentPresetName() {
    try {
        const st = SillyTavern.getContext();
        // Use /preset without arguments to get the current preset name
        const result = await st.executeSlashCommandsOnChatInput('/preset', { quiet: true });

        // console.log('[RPG Companion] /preset result:', result);

        // The result should be an object with a 'pipe' property containing the preset name
        if (result && typeof result === 'object' && result.pipe) {
            const presetName = String(result.pipe).trim();
            // console.log('[RPG Companion] Extracted preset name:', presetName);
            return presetName || null;
        }

        // Fallback if result is a string
        if (typeof result === 'string') {
            return result.trim() || null;
        }

        return null;
    } catch (error) {
        console.error('[RPG Companion] Error getting current preset:', error);
        return null;
    }
}/**
 * Switches to a specific preset by name using the /preset slash command
 * @param {string} presetName - Name of the preset to switch to
 * @returns {Promise<boolean>} True if switching succeeded, false otherwise
 */
async function switchToPreset(presetName) {
    try {
        const st = SillyTavern.getContext();
        // Use the /preset slash command to switch presets
        // This is the proper way to change presets in SillyTavern
        await st.executeSlashCommandsOnChatInput(`/preset ${presetName}`, { quiet: true });

        // console.log(`[RPG Companion] Switched to preset "${presetName}"`);
        return true;
    } catch (error) {
        console.error('[RPG Companion] Error switching preset:', error);
        return false;
    }
}


/**
 * Updates RPG tracker data using separate API call (separate mode only).
 * Makes a dedicated API call to generate tracker data, then stores it
 * in the last assistant message's swipe data.
 *
 * @param {Function} renderUserStats - UI function to render user stats
 * @param {Function} renderInfoBox - UI function to render info box
 * @param {Function} renderThoughts - UI function to render character thoughts
 * @param {Function} renderInventory - UI function to render inventory
 */
export async function updateTrackerData(renderCallback) {
    if (isGenerating) {
        return;
    }

    if (!extensionSettings.enabled) {
        return;
    }

    if (extensionSettings.generationMode !== 'separate') {
        return;
    }

    try {
        setIsGenerating(true);

        const $updateBtn = $('#story-tracker-manual-update');
        $updateBtn.html('<i class="fa-solid fa-spinner fa-spin"></i> Updating...').prop('disabled', true);

        const prompt = generateSeparateUpdatePrompt();

        const st = SillyTavern.getContext();
        const response = await st.generateRaw({
            prompt: prompt,
            quietToLoud: false
        });

        if (response) {
            const parsedData = parseResponse(response);

            if (parsedData.trackerData) {
                extensionSettings.trackerData = parsedData.trackerData;
                saveSettings();
                saveChatData();
                renderCallback();
            }
        }

    } catch (error) {
        console.error('[Story Tracker] Error updating tracker data:', error);
    } finally {
        setIsGenerating(false);
        const $updateBtn = $('#story-tracker-manual-update');
        $updateBtn.html('<i class="fa-solid fa-refresh"></i>').prop('disabled', false);
    }
}
