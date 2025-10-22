/**
 * Core Configuration Module
 * Extension metadata and constants
 */

export const extensionName = 'third-party/story-tracker-sillytavern';

/**
 * Dynamically determine extension path based on current location
 * This supports both global (public/extensions) and user-specific (data/default-user/extensions) installations
 */
const currentScriptPath = import.meta.url;
const isUserExtension = currentScriptPath.includes('/data/') || currentScriptPath.includes('\\data\\');
export const extensionFolderPath = isUserExtension
    ? `data/default-user/extensions/${extensionName}`
    : `scripts/extensions/${extensionName}`;
export const extensionDisplayName = 'Story Tracker';
export const extensionVersion = '1.0.0';

// Default settings structure
export const defaultSettings = {
    enabled: true,
    autoUpdate: true,
    updateDepth: 4,
    generationMode: 'together', // 'together' or 'separate'
    useSeparatePreset: false,
    showTracker: true,
    panelPosition: 'right', // 'left', 'right'
    theme: 'default',
    customColors: {
        bg: '#1a1a2e',
        accent: '#16213e',
        text: '#eaeaea',
        highlight: '#e94560'
    },
    enableAnimations: true,
    mobileFabPosition: {
        top: 'calc(var(--topBarBlockSize) + 60px)',
        right: '12px'
    },
    // Tracker-specific settings
    trackerData: {
        sections: []
    }
};

// Field types
export const FIELD_TYPES = {
    TEXT: 'text',
    NUMBER: 'number',
    BOOLEAN: 'boolean'
};

// Generation modes
export const GENERATION_MODES = {
    TOGETHER: 'together',
    SEPARATE: 'separate'
};

// Panel positions
export const PANEL_POSITIONS = {
    LEFT: 'left',
    RIGHT: 'right'
};

// Themes
export const THEMES = {
    DEFAULT: 'default',
    DARK: 'dark',
    LIGHT: 'light',
    CUSTOM: 'custom'
};
