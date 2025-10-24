/**
 * API Client Module
 * Handles API calls for story tracker generation
 */

import {
    extensionSettings,
    isGenerating,
    setIsGenerating,
    setLastActionWasSwipe,
    setLastGeneratedData,
    syncTrackerBaselines
} from '../../core/state.js';
import { saveSettings, saveChatData } from '../../core/persistence.js';
import { generateSeparateUpdatePrompt } from './promptBuilder.js';
import { parseResponse } from './parser.js';

const SWIPE_STORAGE_KEY = 'story_tracker_swipes';


/**
 * Updates tracker data using a separate API call (separate mode only).
 * Makes a dedicated API call to generate tracker data, then stores it
 * on the most recent assistant message for swipe-aware history.
 *
 * @param {Function} renderCallback - UI renderer for tracker updates
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

    const context = SillyTavern.getContext();

    try {
        setIsGenerating(true);

        const $updateBtn = $('#story-tracker-manual-update');
        $updateBtn.html('<i class="fa-solid fa-spinner fa-spin"></i> Updating...').prop('disabled', true);

        const prompt = generateSeparateUpdatePrompt();
        const response = await context.generateRaw({
            prompt,
            quietToLoud: false
        });

        if (!response) {
            return;
        }

        const parsedData = parseResponse(response);
        if (!parsedData.trackerData) {
            console.warn('[Story Tracker] Separate generation did not return tracker data.');
            return;
        }

        const trackerClone = JSON.parse(JSON.stringify(parsedData.trackerData));
        setLastGeneratedData(trackerClone);
        extensionSettings.trackerData = trackerClone;
        syncTrackerBaselines();

        // Attach tracker data to the last assistant message for swipe awareness
        const chat = context.chat || [];
        const lastMessage = chat.length > 0 ? chat[chat.length - 1] : null;
        if (lastMessage && !lastMessage.is_user) {
            if (!lastMessage.extra) {
                lastMessage.extra = {};
            }
            if (!lastMessage.extra[SWIPE_STORAGE_KEY]) {
                lastMessage.extra[SWIPE_STORAGE_KEY] = {};
            }

            const swipeId = lastMessage.swipe_id || 0;
            lastMessage.extra[SWIPE_STORAGE_KEY][swipeId] = {
                trackerData: trackerClone
            };
        }

        if (typeof renderCallback === 'function') {
            renderCallback();
        }

        saveSettings();
        saveChatData();
    } catch (error) {
        console.error('[Story Tracker] Error updating tracker data:', error);
    } finally {
        setIsGenerating(false);
        setLastActionWasSwipe(false);

        const $updateBtn = $('#story-tracker-manual-update');
        $updateBtn.html('<i class="fa-solid fa-refresh"></i>').prop('disabled', false);
    }
}
