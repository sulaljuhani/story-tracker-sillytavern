/**
 * Persistence Module
 * Handles saving and loading extension data
 */

import { extensionSettings, setExtensionSettings, setCommittedTrackerData } from './state.js';
import { defaultSettings } from './config.js';

/**
 * Load extension settings from SillyTavern settings
 */
export function loadSettings() {
    try {
        // Load from SillyTavern's extension settings
        const savedSettings = JSON.parse(localStorage.getItem('story-tracker-settings') || '{}');

        // Merge with defaults to ensure all properties exist
        const mergedSettings = { ...defaultSettings, ...savedSettings };

        // Ensure trackerData has the correct structure
        if (!mergedSettings.trackerData) {
            mergedSettings.trackerData = { sections: [] };
        }
        if (!mergedSettings.trackerData.sections) {
            mergedSettings.trackerData.sections = [];
        }

        setExtensionSettings(mergedSettings);

        console.log('[Story Tracker] Settings loaded successfully');
    } catch (error) {
        console.error('[Story Tracker] Error loading settings:', error);
        // Use defaults if loading fails
        setExtensionSettings({ ...defaultSettings });
    }
}

/**
 * Save extension settings to SillyTavern settings
 */
export function saveSettings() {
    try {
        localStorage.setItem('story-tracker-settings', JSON.stringify(extensionSettings));
        console.log('[Story Tracker] Settings saved');
    } catch (error) {
        console.error('[Story Tracker] Error saving settings:', error);
    }
}

/**
 * Save chat-specific tracker data
 */
export function saveChatData() {
    try {
        // This would integrate with SillyTavern's chat metadata system
        // For now, we'll use a simplified approach
        const chatId = getCurrentChatId();
        if (chatId) {
            const chatData = {
                trackerData: extensionSettings.trackerData,
                lastGeneratedData: null, // Could be stored separately if needed
                committedTrackerData: null
            };
            localStorage.setItem(`story-tracker-chat-${chatId}`, JSON.stringify(chatData));
        }
    } catch (error) {
        console.error('[Story Tracker] Error saving chat data:', error);
    }
}

/**
 * Load chat-specific tracker data
 */
export function loadChatData() {
    try {
        const chatId = getCurrentChatId();
        if (chatId) {
            const savedData = JSON.parse(localStorage.getItem(`story-tracker-chat-${chatId}`) || '{}');

            if (savedData.trackerData) {
                extensionSettings.trackerData = savedData.trackerData;
                setCommittedTrackerData(savedData.trackerData);
                console.log('[Story Tracker] Chat data loaded');
            }
        }
    } catch (error) {
        console.error('[Story Tracker] Error loading chat data:', error);
        // Initialize with empty data if loading fails
        extensionSettings.trackerData = { sections: [] };
        setCommittedTrackerData({ sections: [] });
    }
}

/**
 * Update message swipe data (for handling swipes properly)
 * @param {number} messageIndex - Index of the message being swiped
 */
export function updateMessageSwipeData(messageIndex) {
    // This would integrate with SillyTavern's message metadata system
    // For now, we'll implement a basic version
    try {
        const chatId = getCurrentChatId();
        if (chatId) {
            const swipeData = {
                messageIndex: messageIndex,
                trackerData: extensionSettings.trackerData,
                timestamp: Date.now()
            };
            localStorage.setItem(`story-tracker-swipe-${chatId}-${messageIndex}`, JSON.stringify(swipeData));
        }
    } catch (error) {
        console.error('[Story Tracker] Error updating swipe data:', error);
    }
}

/**
 * Get current chat ID (placeholder - would integrate with SillyTavern)
 * @returns {string|null} Current chat ID
 */
function getCurrentChatId() {
    // This is a placeholder - in actual SillyTavern integration,
    // this would get the current chat ID from SillyTavern's state
    try {
        // Try to get from URL or SillyTavern's global state
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('char') || 'default';
    } catch (error) {
        return 'default';
    }
}

/**
 * Export tracker data as JSON
 * @returns {string} JSON string of tracker data
 */
export function exportTrackerData() {
    return JSON.stringify(extensionSettings.trackerData, null, 2);
}

/**
 * Import tracker data from JSON
 * @param {string} jsonData - JSON string of tracker data
 * @returns {boolean} Success status
 */
export function importTrackerData(jsonData) {
    try {
        const importedData = JSON.parse(jsonData);

        // Validate structure
        if (!importedData.sections || !Array.isArray(importedData.sections)) {
            throw new Error('Invalid tracker data structure');
        }

        extensionSettings.trackerData = importedData;
        setCommittedTrackerData(importedData);
        saveSettings();
        saveChatData();

        console.log('[Story Tracker] Data imported successfully');
        return true;
    } catch (error) {
        console.error('[Story Tracker] Error importing data:', error);
        return false;
    }
}

/**
 * Reset tracker data to empty state
 */
export function resetTrackerData() {
    extensionSettings.trackerData = { sections: [] };
    setCommittedTrackerData({ sections: [] });
    saveSettings();
    saveChatData();
    console.log('[Story Tracker] Tracker data reset');
}
