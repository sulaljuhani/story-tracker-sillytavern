/**
 * Story Tracker Type Definitions
 * JSDoc types for the story tracker system
 */

/**
 * Represents a single field in the tracker
 * @typedef {Object} TrackerField
 * @property {string} id - Unique identifier for the field
 * @property {string} name - Display name of the field
 * @property {string} value - Current value (string)
 * @property {string} prompt - Prompt for LLM to update this field
 * @property {string} type - Field type ('text', 'number', 'boolean')
 * @property {boolean} enabled - Whether this field is active
 */

/**
 * Represents a subsection containing multiple fields
 * @typedef {Object} TrackerSubsection
 * @property {string} id - Unique identifier for the subsection
 * @property {string} name - Display name of the subsection
 * @property {TrackerField[]} fields - Array of fields in this subsection
 * @property {boolean} collapsed - Whether this subsection is collapsed in UI
 */

/**
 * Represents a top-level section containing subsections
 * @typedef {Object} TrackerSection
 * @property {string} id - Unique identifier for the section
 * @property {string} name - Display name of the section
 * @property {TrackerSubsection[]} subsections - Array of subsections in this section
 * @property {boolean} collapsed - Whether this section is collapsed in UI
 */

/**
 * Complete tracker data structure
 * @typedef {Object} TrackerData
 * @property {TrackerSection[]} sections - Array of all sections
 */

/**
 * Extension settings for the story tracker
 * @typedef {Object} TrackerSettings
 * @property {boolean} enabled - Whether the extension is enabled
 * @property {boolean} autoUpdate - Whether to auto-update after messages
 * @property {number} updateDepth - Number of messages to include in context
 * @property {string} generationMode - 'together' or 'separate'
 * @property {boolean} useSeparatePreset - Use separate preset for generation
 * @property {boolean} showTracker - Whether to show the tracker panel
 * @property {string} panelPosition - 'left' or 'right'
 * @property {string} theme - Theme name
 * @property {Object} customColors - Custom theme colors
 * @property {boolean} enableAnimations - Enable UI animations
 * @property {Object} mobileFabPosition - Mobile FAB position
 * @property {TrackerData} trackerData - The actual tracker data
 */

/**
 * Result of tracker generation/update
 * @typedef {Object} TrackerUpdateResult
 * @property {boolean} success - Whether the update was successful
 * @property {TrackerData} updatedData - The updated tracker data
 * @property {string[]} errors - Any errors that occurred
 */

/**
 * Context for LLM generation
 * @typedef {Object} GenerationContext
 * @property {string} userName - Name of the user character
 * @property {string} chatHistory - Recent chat messages
 * @property {TrackerData} currentData - Current tracker state
 * @property {string} mode - 'together' or 'separate'
 */

// Export types for JSDoc consumption (this file has no runtime exports)
export {};
