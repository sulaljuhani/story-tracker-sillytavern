/**
 * SillyTavern Integration Module
 * Handles integration with SillyTavern's event system and UI
 */

import { eventSource, event_types, chat_metadata } from '../../../../../script.js';
import { extensionSettings, setCommittedTrackerData, lastActionWasSwipe, setLastActionWasSwipe } from '../../core/state.js';
import { loadChatData, saveChatData, updateMessageSwipeData } from '../../core/persistence.js';
import { shouldAutoUpdate } from '../../core/events.js';
import { updateTrackerData, shouldTriggerUpdate } from '../generation/apiClient.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerData} TrackerData */

/**
 * Handles message sent events
 * @param {Object} eventData - Event data
 */
export async function onMessageSent(eventData) {
    try {
        console.log('[Story Tracker] Message sent event');

        // Reset swipe flag
        setLastActionWasSwipe(false);

        // Trigger auto-update if enabled
        if (shouldAutoUpdate()) {
            console.log('[Story Tracker] Triggering auto-update after message sent');
            await updateTrackerData();
        }
    } catch (error) {
        console.error('[Story Tracker] Error in onMessageSent:', error);
    }
}

/**
 * Handles message received events
 * @param {Object} eventData - Event data
 */
export async function onMessageReceived(eventData) {
    console.log('[Story Tracker] Message received event');

    // For "together" mode, the tracker data might be embedded in the response
    // This would be handled by the injector module if implemented
    if (extensionSettings.generationMode === 'together') {
        // Parse and update tracker data from the response
        // This is a placeholder for future implementation
        console.log('[Story Tracker] Together mode: checking for embedded tracker data');
    }
}

/**
 * Handles character change events
 * @param {Object} eventData - Event data
 */
export function onCharacterChanged(eventData) {
    console.log('[Story Tracker] Character changed, loading chat data');
    loadChatData();
}

/**
 * Handles message swipe events
 * @param {Object} eventData - Event data
 */
export function onMessageSwiped(eventData) {
    console.log('[Story Tracker] Message swiped');

    // Set swipe flag
    setLastActionWasSwipe(true);

    // Load tracker data for the swiped message if available
    // This would require integration with SillyTavern's message metadata
    const messageIndex = eventData?.messageIndex;
    if (messageIndex !== undefined) {
        updateMessageSwipeData(messageIndex);
    }
}

/**
 * Commits tracker data to be used for next generation
 */
export function commitTrackerData() {
    console.log('[Story Tracker] Committing tracker data');
    setCommittedTrackerData(extensionSettings.trackerData);
    saveChatData();
}

/**
 * Updates persona avatar display
 */
export function updatePersonaAvatar() {
    // This could be used to update avatar displays if needed
    console.log('[Story Tracker] Persona avatar updated');
}

/**
 * Clears extension prompts (for when extension is disabled)
 */
export function clearExtensionPrompts() {
    // Clear any extension prompts that might have been set
    console.log('[Story Tracker] Clearing extension prompts');
}

/**
 * Gets current chat metadata
 * @returns {Object|null} Chat metadata
 */
export function getCurrentChatMetadata() {
    try {
        return chat_metadata || null;
    } catch (error) {
        console.error('[Story Tracker] Error getting chat metadata:', error);
        return null;
    }
}

/**
 * Sets chat metadata
 * @param {Object} metadata - Metadata to set
 */
export function setChatMetadata(metadata) {
    try {
        if (chat_metadata) {
            Object.assign(chat_metadata, metadata);
        }
    } catch (error) {
        console.error('[Story Tracker] Error setting chat metadata:', error);
    }
}

/**
 * Gets tracker data from chat metadata
 * @returns {TrackerData|null} Tracker data from metadata
 */
export function getTrackerDataFromMetadata() {
    const metadata = getCurrentChatMetadata();
    if (metadata && metadata['story-tracker']) {
        return metadata['story-tracker'];
    }
    return null;
}

/**
 * Sets tracker data in chat metadata
 * @param {TrackerData} trackerData - Tracker data to store
 */
export function setTrackerDataInMetadata(trackerData) {
    const metadata = getCurrentChatMetadata();
    if (metadata) {
        metadata['story-tracker'] = trackerData;
        setChatMetadata(metadata);
    }
}

/**
 * Handles chat load events
 */
export function onChatLoaded() {
    console.log('[Story Tracker] Chat loaded, initializing tracker data');
    loadChatData();
}

/**
 * Handles chat save events
 */
export function onChatSaved() {
    console.log('[Story Tracker] Chat saved');
    saveChatData();
}

/**
 * Gets the current message count for context depth
 * @returns {number} Number of messages in current chat
 */
export function getCurrentMessageCount() {
    try {
        // This would need to be implemented based on SillyTavern's chat structure
        return 0; // Placeholder
    } catch (error) {
        console.error('[Story Tracker] Error getting message count:', error);
        return 0;
    }
}

/**
 * Checks if the current chat has any messages
 * @returns {boolean} Whether the chat has messages
 */
export function hasChatMessages() {
    return getCurrentMessageCount() > 0;
}

/**
 * Gets the last N messages for context
 * @param {number} count - Number of messages to get
 * @returns {Array} Array of message objects
 */
export function getLastMessages(count) {
    try {
        // This would need to be implemented based on SillyTavern's chat structure
        return []; // Placeholder
    } catch (error) {
        console.error('[Story Tracker] Error getting last messages:', error);
        return [];
    }
}
