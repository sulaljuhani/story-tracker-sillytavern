/**
 * Core Persistence Module
 * Handles saving/loading extension settings and chat data
 */

import { extension_settings as st_extension_settings, saveSettingsDebounced } from '../../../../script.js';
import { getContext } from '../../../../extensions.js';
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
    if (st_extension_settings[extensionName]) {
        const savedSettings = st_extension_settings[extensionName];
        updateExtensionSettings(savedSettings);
    }
}

/**
 * Saves the extension settings to the global settings object.
 */
export function saveSettings() {
    st_extension_settings[extensionName] = extensionSettings;
    saveSettingsDebounced();
}

/**
 * Saves tracker data to the current chat's metadata.
 */
export function saveChatData() {
    const context = getContext();
    if (!context.chat) return;

    if (!context.chat.metadata) {
        context.chat.metadata = {};
    }
    context.chat.metadata.story_tracker = extensionSettings.trackerData;
}

/**
 * Loads tracker data from the current chat's metadata.
 */
export function loadChatData() {
    const context = getContext();
    if (context.chat && context.chat.metadata && context.chat.metadata.story_tracker) {
        extensionSettings.trackerData = context.chat.metadata.story_tracker;
    }
}
