/**
 * Core Persistence Module
 * Handles saving/loading extension settings and chat data
 */

import {
    extensionSettings,
    updateExtensionSettings,
    lastGeneratedData,
    committedTrackerData,
    setLastGeneratedData,
    setCommittedTrackerData
} from './state.js';

const extensionName = 'story-tracker-sillytavern';
const CHAT_METADATA_KEY = 'story_tracker';
const SWIPE_STORAGE_KEY = 'story_tracker_swipes';

function getContext() {
    return globalThis.SillyTavern?.getContext?.();
}

function ensureChatMetadata(context) {
    if (!context.chat) {
        return null;
    }

    if (!context.chat.metadata) {
        context.chat.metadata = {};
    }

    return context.chat.metadata;
}

export function deepClone(value) {
    return value == null ? null : JSON.parse(JSON.stringify(value));
}

/**
 * Loads the extension settings from the global settings object.
 */
export function loadSettings() {
    const st = getContext();
    if (!st?.settings || !st.settings[extensionName]) {
        return;
    }

    const savedSettings = st.settings[extensionName];
    updateExtensionSettings(savedSettings);
}

/**
 * Saves the extension settings to the global settings object.
 */
export function saveSettings() {
    const st = getContext();
    if (!st?.settings) {
        return;
    }

    st.settings[extensionName] = extensionSettings;
    if (typeof st.saveSettingsDebounced === 'function') {
        st.saveSettingsDebounced();
    }
}

/**
 * Updates the last assistant message's swipe data with current tracker state.
 * Ensures user edits persist across swipes and future generations.
 *
 * @param {import('../types/tracker.js').TrackerData|null} dataOverride - Optional tracker data override
 */
export function updateMessageSwipeData(dataOverride = null) {
    const st = getContext();
    const chat = st?.chat;

    if (!Array.isArray(chat) || chat.length === 0) {
        return;
    }

    const trackerPayload = dataOverride ? deepClone(dataOverride) : deepClone(extensionSettings.trackerData);
    if (!trackerPayload || !Array.isArray(trackerPayload.sections)) {
        return;
    }

    for (let i = chat.length - 1; i >= 0; i -= 1) {
        const message = chat[i];
        if (!message || message.is_user || message.is_system) {
            continue;
        }

        if (!message.extra) {
            message.extra = {};
        }
        if (!message.extra[SWIPE_STORAGE_KEY]) {
            message.extra[SWIPE_STORAGE_KEY] = {};
        }

        const swipeId = message.swipe_id || 0;
        message.extra[SWIPE_STORAGE_KEY][swipeId] = {
            trackerData: trackerPayload
        };
        break;
    }
}

/**
 * Saves tracker data to the current chat's metadata.
 */
export function saveChatData() {
    const st = getContext();
    if (!st?.chat) {
        return;
    }

    const metadata = ensureChatMetadata(st);
    if (!metadata) {
        return;
    }

    metadata[CHAT_METADATA_KEY] = {
        version: 1,
        trackerData: deepClone(extensionSettings.trackerData),
        lastGeneratedData: deepClone(lastGeneratedData),
        committedTrackerData: deepClone(committedTrackerData)
    };

    if (typeof st.saveChatDebounced === 'function') {
        st.saveChatDebounced();
    }

    updateMessageSwipeData(extensionSettings.trackerData);
}

/**
 * Loads tracker data from the current chat's metadata.
 */
export function loadChatData() {
    const st = getContext();
    const metadata = st?.chat?.metadata?.[CHAT_METADATA_KEY];

    if (!metadata) {
        // No saved data; ensure committed/last data mirror current tracker template
        setLastGeneratedData(extensionSettings.trackerData);
        setCommittedTrackerData(extensionSettings.trackerData);
        return;
    }

    let trackerData = null;
    let lastData = null;
    let committedData = null;

    if (Array.isArray(metadata.sections)) {
        // Legacy format (tracker data directly stored)
        trackerData = metadata;
    } else if (metadata && typeof metadata === 'object') {
        trackerData = metadata.trackerData || null;
        lastData = metadata.lastGeneratedData || null;
        committedData = metadata.committedTrackerData || null;
    }

    if (trackerData && Array.isArray(trackerData.sections) && trackerData.sections.length > 0) {
        extensionSettings.trackerData = deepClone(trackerData);
    }

    const fallbackTracker = trackerData && Array.isArray(trackerData.sections) && trackerData.sections.length > 0
        ? trackerData
        : extensionSettings.trackerData;

    setLastGeneratedData(lastData || fallbackTracker || null);
    setCommittedTrackerData(committedData || fallbackTracker || null);
}
