/**
 * Layout UI Module
 * Handles panel positioning, visibility, and layout controls
 */

import { extensionSettings, updateExtensionSettings, $panelContainer } from '../../core/state.js';
import { saveSettings } from '../../core/persistence.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerSettings} TrackerSettings */

/**
 * Applies the panel position (left/right)
 */
export function applyPanelPosition() {
    if (!$panelContainer) return;

    const position = extensionSettings.panelPosition;

    // Remove existing position classes
    $panelContainer.removeClass('story-tracker-left story-tracker-right');

    // Add new position class
    $panelContainer.addClass(`story-tracker-${position}`);

    console.log(`[Story Tracker] Panel position set to: ${position}`);
}

/**
 * Updates panel visibility based on settings
 */
export function updatePanelVisibility() {
    if (!$panelContainer) return;

    const shouldShow = extensionSettings.enabled && extensionSettings.showTracker;

    if (shouldShow) {
        $panelContainer.show();
    } else {
        $panelContainer.hide();
    }

    console.log(`[Story Tracker] Panel visibility: ${shouldShow ? 'shown' : 'hidden'}`);
}

/**
 * Toggles panel collapse/expand
 */
export function togglePanelCollapse() {
    if (!$panelContainer) return;

    const $content = $panelContainer.find('.story-tracker-content');
    const $toggleBtn = $panelContainer.find('#story-tracker-collapse');
    const $toggleIcon = $toggleBtn.find('i');

    if ($content.is(':visible')) {
        $content.hide();
        $toggleIcon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
        $panelContainer.addClass('collapsed');
    } else {
        $content.show();
        $toggleIcon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
        $panelContainer.removeClass('collapsed');
    }
}

/**
 * Sets up panel collapse toggle button
 */
export function setupCollapseToggle() {
    $('#story-tracker-collapse').off('click').on('click', function() {
        togglePanelCollapse();
    });
}

/**
 * Sets up mobile toggle button
 */
export function setupMobileToggle() {
    const $mobileToggle = $('#story-tracker-mobile-toggle');

    if ($mobileToggle.length === 0) return;

    $mobileToggle.off('click').on('click', function() {
        const $panel = $('#story-tracker-panel');

        if ($panel.hasClass('mobile-visible')) {
            $panel.removeClass('mobile-visible');
            $(this).removeClass('active');
        } else {
            $panel.addClass('mobile-visible');
            $(this).addClass('active');
        }
    });

    // Close panel when clicking outside on mobile
    $(document).off('click.story-tracker-mobile').on('click.story-tracker-mobile', function(e) {
        const $panel = $('#story-tracker-panel');
        const $toggle = $('#story-tracker-mobile-toggle');

        if (!$panel.is(e.target) && !$panel.has(e.target).length &&
            !$toggle.is(e.target) && !$toggle.has(e.target).length &&
            $panel.hasClass('mobile-visible')) {
            $panel.removeClass('mobile-visible');
            $toggle.removeClass('active');
        }
    });
}

/**
 * Updates generation mode UI elements
 */
export function updateGenerationModeUI() {
    const mode = extensionSettings.generationMode;
    const $modeSelect = $('#story-tracker-generation-mode');
    const $separatePresetToggle = $('#story-tracker-use-separate-preset');

    if ($modeSelect.length > 0) {
        $modeSelect.val(mode);
    }

    // Show/hide separate preset option based on mode
    if (mode === 'separate') {
        $separatePresetToggle.closest('.setting-item').show();
    } else {
        $separatePresetToggle.closest('.setting-item').hide();
    }
}

/**
 * Sets up settings panel event listeners
 */
export function setupSettingsPanel() {
    // Auto-update toggle
    $('#story-tracker-auto-update').off('change').on('change', function() {
        const enabled = $(this).prop('checked');
        updateExtensionSettings({ autoUpdate: enabled });
        saveSettings();
    });

    // Update depth
    $('#story-tracker-update-depth').off('change').on('change', function() {
        const depth = parseInt($(this).val());
        updateExtensionSettings({ updateDepth: depth });
        saveSettings();
    });

    // Generation mode
    $('#story-tracker-generation-mode').off('change').on('change', function() {
        const mode = $(this).val();
        updateExtensionSettings({ generationMode: mode });
        saveSettings();
        updateGenerationModeUI();
    });

    // Use separate preset
    $('#story-tracker-use-separate-preset').off('change').on('change', function() {
        const useSeparate = $(this).prop('checked');
        updateExtensionSettings({ useSeparatePreset: useSeparate });
        saveSettings();
    });

    // Panel position
    $('#story-tracker-panel-position').off('change').on('change', function() {
        const position = $(this).val();
        updateExtensionSettings({ panelPosition: position });
        saveSettings();
        applyPanelPosition();
    });

    // Theme selection
    $('#story-tracker-theme').off('change').on('change', function() {
        const theme = $(this).val();
        updateExtensionSettings({ theme: theme });
        saveSettings();
        applyTheme();
    });

    // Initialize settings values
    initializeSettingsValues();
}

/**
 * Initializes settings panel with current values
 */
function initializeSettingsValues() {
    $('#story-tracker-auto-update').prop('checked', extensionSettings.autoUpdate);
    $('#story-tracker-update-depth').val(extensionSettings.updateDepth);
    $('#story-tracker-generation-mode').val(extensionSettings.generationMode);
    $('#story-tracker-use-separate-preset').prop('checked', extensionSettings.useSeparatePreset);
    $('#story-tracker-panel-position').val(extensionSettings.panelPosition);
    $('#story-tracker-theme').val(extensionSettings.theme);

    updateGenerationModeUI();
}

/**
 * Applies theme to the extension
 */
export function applyTheme() {
    if (!$panelContainer) return;

    const theme = extensionSettings.theme;

    // Remove existing theme classes
    $panelContainer.removeClass('theme-default theme-dark theme-light theme-custom');

    // Add new theme class
    $panelContainer.addClass(`theme-${theme}`);

    // Apply custom colors if custom theme is selected
    if (theme === 'custom') {
        applyCustomTheme();
    }

    console.log(`[Story Tracker] Theme applied: ${theme}`);
}

/**
 * Applies custom theme colors
 */
export function applyCustomTheme() {
    if (!$panelContainer) return;

    const colors = extensionSettings.customColors;

    $panelContainer.css({
        '--story-tracker-bg': colors.bg,
        '--story-tracker-accent': colors.accent,
        '--story-tracker-text': colors.text,
        '--story-tracker-highlight': colors.highlight
    });
}

/**
 * Sets up theme color pickers
 */
export function setupThemeColorPickers() {
    // Custom color pickers
    $('#story-tracker-custom-bg').off('change').on('change', function() {
        const color = $(this).val();
        updateExtensionSettings({
            customColors: { ...extensionSettings.customColors, bg: color }
        });
        saveSettings();

        if (extensionSettings.theme === 'custom') {
            applyCustomTheme();
        }
    });

    $('#story-tracker-custom-accent').off('change').on('change', function() {
        const color = $(this).val();
        updateExtensionSettings({
            customColors: { ...extensionSettings.customColors, accent: color }
        });
        saveSettings();

        if (extensionSettings.theme === 'custom') {
            applyCustomTheme();
        }
    });

    $('#story-tracker-custom-text').off('change').on('change', function() {
        const color = $(this).val();
        updateExtensionSettings({
            customColors: { ...extensionSettings.customColors, text: color }
        });
        saveSettings();

        if (extensionSettings.theme === 'custom') {
            applyCustomTheme();
        }
    });

    $('#story-tracker-custom-highlight').off('change').on('change', function() {
        const color = $(this).val();
        updateExtensionSettings({
            customColors: { ...extensionSettings.customColors, highlight: color }
        });
        saveSettings();

        if (extensionSettings.theme === 'custom') {
            applyCustomTheme();
        }
    });

    // Initialize color picker values
    $('#story-tracker-custom-bg').val(extensionSettings.customColors.bg);
    $('#story-tracker-custom-accent').val(extensionSettings.customColors.accent);
    $('#story-tracker-custom-text').val(extensionSettings.customColors.text);
    $('#story-tracker-custom-highlight').val(extensionSettings.customColors.highlight);
}

/**
 * Sets up add section button
 */
export function setupAddSectionButton() {
    $('#story-tracker-add-section').off('click').on('click', function() {
        showAddSectionModal();
    });
}

/**
 * Shows add section modal
 */
function showAddSectionModal() {
    import('../ui/modals.js').then(module => {
        module.showAddSectionModal();
    });
}

/**
 * Sets up manual update button
 */
export function setupManualUpdateButton(updateCallback) {
    $('#story-tracker-manual-update').off('click').on('click', async function() {
        if ($(this).prop('disabled')) return;

        $(this).prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Updating...');

        try {
            await updateCallback();
        } finally {
            $(this).prop('disabled', false).html('<i class="fa-solid fa-refresh"></i>');
        }
    });
}

/**
 * Shows settings modal
 */
export function showSettingsModal() {
    const $modal = $('#story-tracker-settings-modal');
    if ($modal.length > 0) {
        $modal.show();
    }
}

/**
 * Hides settings modal
 */
export function hideSettingsModal() {
    const $modal = $('#story-tracker-settings-modal');
    if ($modal.length > 0) {
        $modal.hide();
    }
}

/**
 * Sets up modal close buttons
 */
export function setupModalCloseButtons() {
    $('.story-tracker-modal-close').off('click').on('click', function() {
        $(this).closest('.story-tracker-modal').hide();
    });

    // Close modal when clicking outside
    $('.story-tracker-modal').off('click').on('click', function(e) {
        if (e.target === this) {
            $(this).hide();
        }
    });
}
