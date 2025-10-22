/**
 * Parser Module
 * Handles parsing of AI responses to extract tracker data
 */

import { extensionSettings, updateExtensionSettings, setLastGeneratedData, setCommittedTrackerData } from '../../core/state.js';
import { saveSettings, saveChatData } from '../../core/persistence.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerData} TrackerData */
/** @typedef {import('../../types/tracker.js').TrackerSection} TrackerSection */
/** @typedef {import('../../types/tracker.js').TrackerSubsection} TrackerSubsection */
/** @typedef {import('../../types/tracker.js').TrackerField} TrackerField */

/**
 * Parses the AI response to extract updated tracker data
 * @param {string} responseText - The raw AI response text
 * @returns {TrackerData|null} Parsed tracker data or null if parsing failed
 */
export function parseTrackerResponse(responseText) {
    try {
        // Extract code blocks from response
        const codeBlocks = extractCodeBlocks(responseText);

        if (codeBlocks.length === 0) {
            console.warn('[Story Tracker] No code blocks found in response');
            return null;
        }

        // Find the tracker update block
        const trackerBlock = findTrackerBlock(codeBlocks);
        if (!trackerBlock) {
            console.warn('[Story Tracker] No tracker update block found');
            return null;
        }

        // Parse the tracker data
        const parsedData = parseTrackerBlock(trackerBlock);
        if (!parsedData) {
            console.warn('[Story Tracker] Failed to parse tracker block');
            return null;
        }

        console.log('[Story Tracker] Successfully parsed tracker data');
        return parsedData;

    } catch (error) {
        console.error('[Story Tracker] Error parsing tracker response:', error);
        return null;
    }
}

/**
 * Extracts code blocks from text
 * @param {string} text - Text containing markdown code blocks
 * @returns {string[]} Array of code block contents
 */
export function extractCodeBlocks(text) {
    const codeBlockRegex = /```([^`]+)```/g;
    const matches = [...text.matchAll(codeBlockRegex)];
    return matches.map(match => match[1].trim());
}

/**
 * Finds the tracker update block from code blocks
 * @param {string[]} codeBlocks - Array of code block contents
 * @returns {string|null} Tracker block content or null
 */
export function findTrackerBlock(codeBlocks) {
    for (const block of codeBlocks) {
        if (block.includes('Story Tracker Update') || block.includes('Section:')) {
            return block;
        }
    }
    return null;
}

/**
 * Parses a tracker block into structured data
 * @param {string} block - The tracker block content
 * @returns {TrackerData|null} Parsed tracker data
 */
export function parseTrackerBlock(block) {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line);

    const trackerData = {
        sections: []
    };

    let currentSection = null;
    let currentSubsection = null;

    for (const line of lines) {
        // Skip header lines
        if (line === 'Story Tracker Update' || line === '---') {
            continue;
        }

        // Parse section header
        const sectionMatch = line.match(/^Section:\s*(.+)$/);
        if (sectionMatch) {
            currentSection = {
                id: generateSectionId(sectionMatch[1]),
                name: sectionMatch[1],
                subsections: [],
                collapsed: false
            };
            trackerData.sections.push(currentSection);
            currentSubsection = null;
            continue;
        }

        // Parse subsection header
        const subsectionMatch = line.match(/^\s*Subsection:\s*(.+)$/);
        if (subsectionMatch && currentSection) {
            currentSubsection = {
                id: generateSubsectionId(subsectionMatch[1]),
                name: subsectionMatch[1],
                fields: [],
                collapsed: false
            };
            currentSection.subsections.push(currentSubsection);
            continue;
        }

        // Parse field
        const fieldMatch = line.match(/^\s{4}(.+?):\s*(.+)$/);
        if (fieldMatch && currentSubsection) {
            const fieldName = fieldMatch[1];
            const fieldValue = fieldMatch[2];

            // Find existing field or create new one
            let existingField = findFieldByName(currentSubsection.fields, fieldName);
            if (existingField) {
                existingField.value = fieldValue;
            } else {
                // Create new field (this shouldn't normally happen in updates)
                const newField = {
                    id: generateFieldId(fieldName),
                    name: fieldName,
                    value: fieldValue,
                    prompt: '', // Will be filled from existing data
                    type: 'text',
                    enabled: true
                };
                currentSubsection.fields.push(newField);
            }
        }
    }

    return trackerData.sections.length > 0 ? trackerData : null;
}

/**
 * Updates the tracker data with parsed results
 * @param {TrackerData} parsedData - The parsed tracker data from AI
 * @returns {boolean} Success status
 */
export function updateTrackerData(parsedData) {
    try {
        if (!parsedData || !parsedData.sections) {
            return false;
        }

        // Update existing tracker data with new values
        for (const newSection of parsedData.sections) {
            const existingSection = findSectionByName(extensionSettings.trackerData.sections, newSection.name);
            if (existingSection) {
                // Update existing section
                for (const newSubsection of newSection.subsections) {
                    const existingSubsection = findSubsectionByName(existingSection.subsections, newSubsection.name);
                    if (existingSubsection) {
                        // Update existing subsection fields
                        for (const newField of newSubsection.fields) {
                            const existingField = findFieldByName(existingSubsection.fields, newField.name);
                            if (existingField) {
                                existingField.value = newField.value;
                            }
                        }
                    }
                }
            }
        }

        // Update state
        setLastGeneratedData(parsedData);
        setCommittedTrackerData(extensionSettings.trackerData);

        // Save changes
        saveSettings();
        saveChatData();

        console.log('[Story Tracker] Tracker data updated successfully');
        return true;

    } catch (error) {
        console.error('[Story Tracker] Error updating tracker data:', error);
        return false;
    }
}

/**
 * Helper functions for finding existing elements
 */

/**
 * Finds a section by name
 * @param {TrackerSection[]} sections - Array of sections
 * @param {string} name - Section name to find
 * @returns {TrackerSection|null} Found section or null
 */
function findSectionByName(sections, name) {
    return sections.find(section => section.name === name) || null;
}

/**
 * Finds a subsection by name
 * @param {TrackerSubsection[]} subsections - Array of subsections
 * @param {string} name - Subsection name to find
 * @returns {TrackerSubsection|null} Found subsection or null
 */
function findSubsectionByName(subsections, name) {
    return subsections.find(subsection => subsection.name === name) || null;
}

/**
 * Finds a field by name
 * @param {TrackerField[]} fields - Array of fields
 * @param {string} name - Field name to find
 * @returns {TrackerField|null} Found field or null
 */
function findFieldByName(fields, name) {
    return fields.find(field => field.name === name) || null;
}

/**
 * ID generation helpers
 */

function generateSectionId(name) {
    return `section_${name.toLowerCase().replace(/\s+/g, '_')}`;
}

function generateSubsectionId(name) {
    return `subsection_${name.toLowerCase().replace(/\s+/g, '_')}`;
}

function generateFieldId(name) {
    return `field_${name.toLowerCase().replace(/\s+/g, '_')}`;
}
