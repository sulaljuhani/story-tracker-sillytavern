/**
 * Tracker data management utilities
 */

import { extensionAssetsBasePath } from './config.js';
import { extensionSettings } from './state.js';
import { saveSettings, saveChatData } from './persistence.js';
import {
    FORMAT_JSON,
    FORMAT_YAML,
    normalizeFormat,
    parseTrackerData,
    serializeTrackerData
} from './serialization.js';

const DATA_FOLDER = `${extensionAssetsBasePath}/data`;
const DEFAULT_JSON_PATH = `${DATA_FOLDER}/default-tracker.json`;
const DEFAULT_YAML_PATH = `${DATA_FOLDER}/default-tracker.yaml`;

export async function loadDefaultTrackerTemplate(format = FORMAT_JSON) {
    const normalized = normalizeFormat(format);
    const url = normalized === FORMAT_YAML ? DEFAULT_YAML_PATH : DEFAULT_JSON_PATH;
    const response = await fetch(`/${url}`, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Failed to load default tracker template (${normalized.toUpperCase()}).`);
    }
    const text = await response.text();
    return normalized === FORMAT_YAML ? parseTrackerData(text, FORMAT_YAML) : JSON.parse(text);
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
        console.log('[Story Tracker] No tracker data found. Loading default template...');
        const template = await loadDefaultTrackerTemplate(FORMAT_JSON);
        updateTrackerData(template, { skipPersist: true });
        extensionSettings.dataFormat = FORMAT_JSON;
        saveSettings();
        saveChatData();
        console.log('[Story Tracker] Default template loaded and applied.');
        return true;
    } catch (error) {
        console.error('[Story Tracker] Failed to load default tracker template:', error);
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
    extensionSettings.dataFormat = normalizeFormat(format);
    saveSettings();
}

export function exportTrackerData(format = FORMAT_JSON) {
    const data = getTrackerData();
    return serializeTrackerData(data, format);
}

function cloneData(data) {
    return data ? JSON.parse(JSON.stringify(data)) : { sections: [] };
}
