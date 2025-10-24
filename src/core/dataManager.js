/**
 * Tracker data management utilities
 */

import { extensionSettings, updateExtensionSettings } from './state.js';
import { saveSettings, saveChatData } from './persistence.js';
import {
    FORMAT_JSON,
    parseTrackerData,
    serializeTrackerData
} from './serialization.js';

const base = new URL('.', import.meta.url);
const DEFAULT_PRESET_PATH = new URL('../../data/default-preset.json', base);

export const DEFAULT_PRESET_NAME = 'Default';

export async function loadDefaultTrackerTemplate() {
    const response = await fetch(DEFAULT_PRESET_PATH, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Failed to load default tracker preset.`);
    }
    const preset = await response.json();
    return preset;
}

export async function ensureTrackerDataInitialized() {
    console.log('[Story Tracker] Ensuring tracker data is initialized...');
    const hasSections = Array.isArray(extensionSettings?.trackerData?.sections)
        && extensionSettings.trackerData.sections.length > 0;

    if (hasSections) {
        console.log('[Story Tracker] Tracker data already exists. Skipping initialization.');
        return false;
    }

    try {
        console.log('[Story Tracker] No tracker data found. Loading default preset...');
        const preset = await loadDefaultTrackerTemplate();
        updateExtensionSettings({
            systemPrompt: preset.systemPrompt,
            trackerData: preset.trackerData,
            currentPreset: DEFAULT_PRESET_NAME,
        });
        saveSettings();
        saveChatData();
        console.log('[Story Tracker] Default preset loaded and applied.');
        return true;
    } catch (error) {
        console.error('[Story Tracker] Failed to load default tracker preset:', error);
        // Initialize with empty data to prevent further errors
        updateTrackerData({ sections: [] }, { skipPersist: true });
        saveSettings();
        saveChatData();
        return false;
    }
}

export function getTrackerData() {
    return cloneData(extensionSettings.trackerData || { sections: [] });
}

export function updateTrackerData(data, options = {}) {
    const cloned = cloneData(data);
    if (!cloned.sections) {
        cloned.sections = [];
    }
    extensionSettings.trackerData = cloned;

    if (!options.skipPersist) {
        saveSettings();
        saveChatData();
    }
}

export function setTrackerDataFormat(format) {
    extensionSettings.dataFormat = format;
    saveSettings();
}

export function exportTrackerData() {
    const data = getTrackerData();
    return serializeTrackerData(data, FORMAT_JSON);
}

function cloneData(data) {
    return data ? JSON.parse(JSON.stringify(data)) : { sections: [] };
}
