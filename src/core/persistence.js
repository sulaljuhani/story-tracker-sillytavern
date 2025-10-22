/**
 * Core Persistence Module
 * Handles saving/loading extension settings and chat data
 */

import {
    extensionSettings,
    setExtensionSettings,
    updateExtensionSettings,
} from './state.js';

const extensionName = 'story-tracker';

/**
 * Loads the extension settings from the global settings object.
 */
export function loadSettings() {
    const st = SillyTavern.getContext();
    if (st.settings && st.settings[extensionName]) {
        const savedSettings = st.settings[extensionName];
        updateExtensionSettings(savedSettings);
    }
}

/**
 * Saves the extension settings to the global settings object.
 */
export function saveSettings() {
    const st = SillyTavern.getContext();
    st.settings[extensionName] = extensionSettings;
    st.saveSettingsDebounced();
}

/**
 * Saves tracker data to the current chat's metadata.
 */
export function saveChatData() {
    const st = SillyTavern.getContext();
    if (!st.chat) return;

    if (!st.chat.metadata) {
        st.chat.metadata = {};
    }
    st.chat.metadata.story_tracker = extensionSettings.trackerData;
}

/**
 * Loads tracker data from the current chat's metadata.
 */
export function loadChatData() {
    const st = SillyTavern.getContext();
    if (st.chat && st.chat.metadata && st.chat.metadata.story_tracker) {
        extensionSettings.trackerData = st.chat.metadata.story_tracker;
    }
}
