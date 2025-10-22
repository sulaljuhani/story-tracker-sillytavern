/**
 * Events Module
 * Handles event registration and management
 */

import { eventSource, event_types } from '../../../../script.js';
import { extensionSettings } from './state.js';

/**
 * Register all extension events
 * @param {Object} eventHandlers - Object mapping event types to handler functions
 */
export function registerAllEvents(eventHandlers) {
    try {
        console.log('[Story Tracker] Registering events...');

        for (const [eventType, handler] of Object.entries(eventHandlers)) {
            if (Array.isArray(handler)) {
                // Multiple handlers for the same event
                handler.forEach(h => eventSource.on(eventType, h));
            } else {
                // Single handler
                eventSource.on(eventType, handler);
            }
        }

        console.log('[Story Tracker] Events registered successfully');
    } catch (error) {
        console.error('[Story Tracker] Error registering events:', error);
    }
}

/**
 * Unregister all extension events
 * @param {Object} eventHandlers - Object mapping event types to handler functions
 */
export function unregisterAllEvents(eventHandlers) {
    try {
        console.log('[Story Tracker] Unregistering events...');

        for (const [eventType, handler] of Object.entries(eventHandlers)) {
            if (Array.isArray(handler)) {
                // Multiple handlers for the same event
                handler.forEach(h => eventSource.off(eventType, h));
            } else {
                // Single handler
                eventSource.off(eventType, handler);
            }
        }

        console.log('[Story Tracker] Events unregistered successfully');
    } catch (error) {
        console.error('[Story Tracker] Error unregistering events:', error);
    }
}

/**
 * Check if extension should be active based on settings and context
 * @returns {boolean} Whether extension should be active
 */
export function shouldExtensionBeActive() {
    return extensionSettings.enabled && extensionSettings.showTracker;
}

/**
 * Check if auto-update should trigger
 * @returns {boolean} Whether auto-update should trigger
 */
export function shouldAutoUpdate() {
    return shouldExtensionBeActive() && extensionSettings.autoUpdate;
}

/**
 * Get event context information
 * @param {string} eventType - The event type
 * @param {any} eventData - Event-specific data
 * @returns {Object} Context information
 */
export function getEventContext(eventType, eventData = null) {
    return {
        eventType,
        eventData,
        timestamp: Date.now(),
        extensionActive: shouldExtensionBeActive(),
        autoUpdateEnabled: extensionSettings.autoUpdate
    };
}
