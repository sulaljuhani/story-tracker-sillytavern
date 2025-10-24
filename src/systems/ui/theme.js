/**
 * Theme Management Module
 * Handles theme application, custom colors, and animations
 */

import { extensionSettings, $panelContainer } from '../../core/state.js';

/**
 * Applies the selected theme to the panel.
 */
export function applyTheme() {
    if (!$panelContainer) return;

    const theme = extensionSettings.theme;

    // Remove all theme attributes first
    $panelContainer.removeAttr('data-theme');

    // Clear any inline CSS variable overrides
    $panelContainer.css({
        '--st-bg': '',
        '--st-accent': '',
        '--st-text': '',
        '--st-highlight': '',
        '--st-border': '',
        '--st-shadow': ''
    });

    // Apply the selected theme
    if (theme === 'custom') {
        applyCustomTheme();
    } else if (theme !== 'default') {
        // For non-default themes, set the data-theme attribute
        // which will trigger the CSS theme rules
        $panelContainer.attr('data-theme', theme);
    }
    // For 'default', we do nothing - it will use the CSS variables from .rpg-panel class
    // which fall back to SillyTavern's theme variables
}

/**
 * Applies custom colors when custom theme is selected.
 */
export function applyCustomTheme() {
    if (!$panelContainer) return;

    const colors = extensionSettings.customColors;

    // Apply custom CSS variables as inline styles
    $panelContainer.css({
        '--st-bg': colors.bg,
        '--st-accent': colors.accent,
        '--st-text': colors.text,
        '--st-highlight': colors.highlight,
        '--st-border': colors.highlight,
        '--st-shadow': `${colors.highlight}80` // Add alpha for shadow
    });
}

/**
 * Toggles visibility of custom color pickers.
 */
export function toggleCustomColors() {
    const isCustom = extensionSettings.theme === 'custom';
    $('#rpg-custom-colors').toggle(isCustom);
}

/**
 * Toggles animations on/off by adding/removing a class to the panel.
 */
export function toggleAnimations() {
    if (extensionSettings.enableAnimations) {
        $panelContainer.addClass('rpg-animations-enabled');
    } else {
        $panelContainer.removeClass('rpg-animations-enabled');
    }
}

/**
 * Updates the settings popup theme in real-time.
 * Backwards compatible wrapper for SettingsModal class.
 * @param {Object} settingsModal - The SettingsModal instance (passed as parameter to avoid circular dependency)
 */
export function updateSettingsPopupTheme(settingsModal) {
    if (settingsModal) {
        settingsModal.updateTheme();
    }
}

/**
 * Applies custom theme colors to the settings popup.
 * Backwards compatible wrapper for SettingsModal class.
 * @deprecated Use settingsModal.updateTheme() instead
 * @param {Object} settingsModal - The SettingsModal instance (passed as parameter to avoid circular dependency)
 */
export function applyCustomThemeToSettingsPopup(settingsModal) {
    if (settingsModal) {
        settingsModal._applyCustomTheme();
    }
}
