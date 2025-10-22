/**
 * SillyTavern Integration Module
 * Handles integration with SillyTavern's event system and UI
 */

import { extensionSettings, setCommittedTrackerData, lastActionWasSwipe, setLastActionWasSwipe } from '../../core/state.js';
import { loadChatData, saveChatData } from '../../core/persistence.js';
import { updateTrackerData } from '../generation/apiClient.js';
import { renderTracker } from '../rendering/tracker.js';

/**
 * Handles message sent events
 */
export async function onMessageSent() {
    setLastActionWasSwipe(false);

    if (extensionSettings.autoUpdate) {
        await updateTrackerData(renderTracker);
    }
}

/**
 * Handles message received events
 */
export async function onMessageReceived() {
    // Nothing to do here for now
}

/**
 * Handles character change events
 */
export function onCharacterChanged() {
    loadChatData();
    renderTracker();
}

/**
 * Handles message swipe events
 */
export function onMessageSwiped() {
    setLastActionWasSwipe(true);
    // In a more complex implementation, we might load swipe-specific data here
}

/**
 * Updates persona avatar display
 */
export function updatePersonaAvatar() {
    // Not used by this extension, but good practice to have the handler
}

/**
 * Clears extension prompts (for when extension is disabled)
 */
export function clearExtensionPrompts() {
    // Not used by this extension, but good practice to have the handler
}
