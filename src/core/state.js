/**
 * Core State Management Module
 * Centralizes all extension state variables
 */

import { defaultSettings } from './config.js';

// Type imports
/** @typedef {import('../types/tracker.js').TrackerSettings} TrackerSettings */
/** @typedef {import('../types/tracker.js').TrackerData} TrackerData */
/** @typedef {import('../types/tracker.js').TrackerUpdateResult} TrackerUpdateResult */

/**
 * Extension settings - persisted to SillyTavern settings
 * @type {TrackerSettings}
 */
export let extensionSettings = { ...defaultSettings };

/**
 * Last generated tracker data from AI response
 * @type {TrackerData}
 */
export let lastGeneratedData = null;

/**
 * Committed tracker data that should be used as source for next generation
 * This gets updated when user sends a new message or first time generation
 * @type {TrackerData}
 */
export let committedTrackerData = null;

/**
 * Tracks whether the last action was a swipe (for separate mode)
 * Used to determine whether to commit lastGeneratedData to committedTrackerData
 */
export let lastActionWasSwipe = false;

/**
 * Flag indicating if generation is in progress
 */
export let isGenerating = false;

/**
 * UI Element References (jQuery objects)
 */
export let $panelContainer = null;
export let $sectionsContainer = null;

/**
 * State setters - provide controlled mutation of state variables
 */
export function setExtensionSettings(newSettings) {
    extensionSettings = { ...newSettings };
}

export function updateExtensionSettings(updates) {
    extensionSettings = { ...extensionSettings, ...updates };
}

export function setLastGeneratedData(data) {
    lastGeneratedData = data ? JSON.parse(JSON.stringify(data)) : null;
}

export function updateLastGeneratedData(updates) {
    if (lastGeneratedData) {
        const merged = { ...lastGeneratedData, ...updates };
        lastGeneratedData = JSON.parse(JSON.stringify(merged));
    } else {
        lastGeneratedData = JSON.parse(JSON.stringify(updates));
    }
}

export function setCommittedTrackerData(data) {
    committedTrackerData = data ? JSON.parse(JSON.stringify(data)) : null;
}

export function updateCommittedTrackerData(updates) {
    if (committedTrackerData) {
        const merged = { ...committedTrackerData, ...updates };
        committedTrackerData = JSON.parse(JSON.stringify(merged));
    } else {
        committedTrackerData = JSON.parse(JSON.stringify(updates));
    }
}

export function setLastActionWasSwipe(value) {
    lastActionWasSwipe = Boolean(value);
}

export function setIsGenerating(value) {
    isGenerating = Boolean(value);
}

export function setPanelContainer($element) {
    $panelContainer = $element;
    const length = $panelContainer ? $panelContainer.length : 0;
    console.log('[Story Tracker] Panel container registered', { length });
}

export function setSectionsContainer($element) {
    $sectionsContainer = $element;
    const length = $sectionsContainer ? $sectionsContainer.length : 0;
    console.log('[Story Tracker] Sections container registered', { length });
}

/**
 * Helper functions for tracker data management
 */

/**
 * Generate a unique ID for tracker elements
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new empty section
 * @param {string} name - Section name
 * @returns {import('../types/tracker.js').TrackerSection} New section object
 */
export function createSection(name = 'New Section') {
    return {
        id: generateId('section'),
        name: name,
        subsections: [],
        collapsed: false
    };
}

/**
 * Create a new empty subsection
 * @param {string} name - Subsection name
 * @returns {import('../types/tracker.js').TrackerSubsection} New subsection object
 */
export function createSubsection(name = 'New Subsection') {
    return {
        id: generateId('subsection'),
        name: name,
        fields: [],
        collapsed: false
    };
}

/**
 * Create a new field
 * @param {string} name - Field name
 * @param {string} prompt - Field prompt
 * @param {string} type - Field type
 * @returns {import('../types/tracker.js').TrackerField} New field object
 */
export function createField(name = 'New Field', prompt = '', type = 'text', value = '') {
    return {
        id: generateId('field'),
        name: name,
        value: value,
        prompt: prompt,
        type: type,
        enabled: true
    };
}

/**
 * Deep clone tracker data
 * @param {TrackerData} data - Data to clone
 * @returns {TrackerData} Cloned data
 */
export function cloneTrackerData(data) {
    if (!data) return null;
    return JSON.parse(JSON.stringify(data));
}
