/**
 * Story Tracker Extension for SillyTavern
 * Main entry point that initializes all modules and handles the extension lifecycle
 */

import { getContext, renderExtensionTemplateAsync, extension_settings as st_extension_settings } from '../../../extensions.js';
import { eventSource, event_types } from '../../../../script.js';

// Core modules
import { extensionName, extensionDisplayName } from './src/core/config.js';
import {
    extensionSettings,
    setExtensionSettings,
    $panelContainer,
    setPanelContainer,
    $sectionsContainer,
    setSectionsContainer
} from './src/core/state.js';
import { loadSettings, saveSettings, loadChatData } from './src/core/persistence.js';
import { registerAllEvents } from './src/core/events.js';

// Rendering modules
import { renderTracker } from './src/systems/rendering/tracker.js';

// UI modules
import {
    applyPanelPosition,
    updatePanelVisibility,
    setupCollapseToggle,
    setupMobileToggle,
    setupSettingsPanel,
    setupThemeColorPickers,
    setupAddSectionButton,
    setupManualUpdateButton,
    applyTheme,
    setupModalCloseButtons
} from './src/systems/ui/layout.js';
import { showAddSectionModal } from './src/systems/ui/modals.js';

// Integration modules
import {
    onMessageSent,
    onMessageReceived,
    onCharacterChanged,
    onMessageSwiped,
    updatePersonaAvatar,
    clearExtensionPrompts
} from './src/systems/integration/sillytavern.js';

// Generation modules
import { updateTrackerData } from './src/systems/generation/apiClient.js';

/**
 * Adds the extension settings to the Extensions tab.
 */
function addExtensionSettings() {
    const settingsHtml = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b><i class="fa-solid fa-book"></i> ${extensionDisplayName}</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label" for="story-tracker-enabled">
                    <input type="checkbox" id="story-tracker-enabled" />
                    <span>Enable Story Tracker</span>
                </label>
                <small class="notes">Toggle to enable/disable the Story Tracker extension. Configure additional settings within the panel itself.</small>

                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="menu_button" id="story-tracker-open-settings" style="flex: 1;">
                        <i class="fa-solid fa-cog"></i> Open Settings
                    </button>
                </div>
            </div>
        </div>
    `;

    $('#extensions_settings2').append(settingsHtml);

    // Set up the enable/disable toggle
    $('#story-tracker-enabled').prop('checked', extensionSettings.enabled).on('change', function() {
        extensionSettings.enabled = $(this).prop('checked');
        saveSettings();
        updatePanelVisibility();

        if (!extensionSettings.enabled) {
            clearExtensionPrompts();
        } else {
            // Re-initialize if re-enabled
            initializeTracker();
        }
    });

    // Open settings button
    $('#story-tracker-open-settings').on('click', function() {
        showSettingsModal();
    });
}

/**
 * Initializes the UI for the extension.
 */
async function initUI() {
    try {
        console.log('[Story Tracker] Initializing UI...');

        // Load the HTML template using SillyTavern's template system
        const templateHtml = await renderExtensionTemplateAsync(extensionName, 'template');

        // Append panel to body - positioning handled by CSS
        $('body').append(templateHtml);

        // Cache UI elements
        setPanelContainer($('#story-tracker-panel'));
        setSectionsContainer($('#story-tracker-sections'));

        // Set up event listeners
        setupCollapseToggle();
        setupMobileToggle();
        setupSettingsPanel();
        setupThemeColorPickers();
        setupAddSectionButton();
        setupManualUpdateButton(() => updateTrackerData(renderTracker));
        setupModalCloseButtons();

        // Settings button in panel header
        $('#story-tracker-settings').on('click', function() {
            showSettingsModal();
        });

        // Initialize UI state
        updatePanelVisibility();
        applyPanelPosition();
        applyTheme();

        console.log('[Story Tracker] UI initialized successfully');
    } catch (error) {
        console.error('[Story Tracker] UI initialization failed:', error);
        throw error;
    }
}

/**
 * Initializes the tracker functionality
 */
function initializeTracker() {
    try {
        console.log('[Story Tracker] Initializing tracker...');

        // Load chat-specific data
        loadChatData();

        // Render initial tracker state
        renderTracker();

        console.log('[Story Tracker] Tracker initialized successfully');
    } catch (error) {
        console.error('[Story Tracker] Tracker initialization failed:', error);
    }
}

/**
 * Shows the settings modal with current configuration
 */
function showSettingsModal() {
    const $modal = $('#story-tracker-settings-modal');
    const $body = $modal.find('.story-tracker-modal-body');

    // Build settings HTML
    const settingsHtml = `
        <div class="story-tracker-settings">
            <div class="setting-group">
                <h4>General Settings</h4>
                <div class="setting-item">
                    <label for="story-tracker-auto-update">Auto-update after messages:</label>
                    <input type="checkbox" id="story-tracker-auto-update" />
                </div>
                <div class="setting-item">
                    <label for="story-tracker-update-depth">Context messages:</label>
                    <select id="story-tracker-update-depth">
                        <option value="2">2</option>
                        <option value="4">4</option>
                        <option value="6">6</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                    </select>
                </div>
            </div>

            <div class="setting-group">
                <h4>Generation Mode</h4>
                <div class="setting-item">
                    <label for="story-tracker-generation-mode">Mode:</label>
                    <select id="story-tracker-generation-mode">
                        <option value="separate">Separate</option>
                        <option value="together">Together (Not implemented)</option>
                    </select>
                </div>
                <div class="setting-item" id="separate-preset-container">
                    <label for="story-tracker-use-separate-preset">Use separate preset:</label>
                    <input type="checkbox" id="story-tracker-use-separate-preset" />
                </div>
            </div>

            <div class="setting-group">
                <h4>Appearance</h4>
                <div class="setting-item">
                    <label for="story-tracker-panel-position">Panel position:</label>
                    <select id="story-tracker-panel-position">
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label for="story-tracker-theme">Theme:</label>
                    <select id="story-tracker-theme">
                        <option value="default">Default</option>
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
            </div>

            <div class="setting-group" id="custom-colors-group" style="display: none;">
                <h4>Custom Colors</h4>
                <div class="setting-item">
                    <label for="story-tracker-custom-bg">Background:</label>
                    <input type="color" id="story-tracker-custom-bg" />
                </div>
                <div class="setting-item">
                    <label for="story-tracker-custom-accent">Accent:</label>
                    <input type="color" id="story-tracker-custom-accent" />
                </div>
                <div class="setting-item">
                    <label for="story-tracker-custom-text">Text:</label>
                    <input type="color" id="story-tracker-custom-text" />
                </div>
                <div class="setting-item">
                    <label for="story-tracker-custom-highlight">Highlight:</label>
                    <input type="color" id="story-tracker-custom-highlight" />
                </div>
            </div>

            <div class="setting-group">
                <h4>Data Management</h4>
                <div class="setting-actions">
                    <button class="story-tracker-btn" id="story-tracker-export-data">
                        <i class="fa-solid fa-download"></i> Export Data
                    </button>
                    <button class="story-tracker-btn" id="story-tracker-import-data">
                        <i class="fa-solid fa-upload"></i> Import Data
                    </button>
                    <button class="story-tracker-btn story-tracker-btn-danger" id="story-tracker-reset-data">
                        <i class="fa-solid fa-trash"></i> Reset Data
                    </button>
                </div>
            </div>
        </div>
    `;

    $body.html(settingsHtml);
    $modal.show();

    // Set up settings event listeners
    setupSettingsModalEvents();
}

/**
 * Sets up event listeners for the settings modal
 */
function setupSettingsModalEvents() {
    // Theme change to show/hide custom colors
    $('#story-tracker-theme').off('change.settings').on('change.settings', function() {
        const theme = $(this).val();
        const $customColors = $('#custom-colors-group');
        $customColors.toggle(theme === 'custom');
    });

    // Export data
    $('#story-tracker-export-data').off('click').on('click', function() {
        import('./src/core/persistence.js').then(module => {
            const data = module.exportTrackerData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'story-tracker-data.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    });

    // Import data
    $('#story-tracker-import-data').off('click').on('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = e.target.result;
                        import('./src/core/persistence.js').then(module => {
                            const success = module.importTrackerData(data);
                            if (success) {
                                renderTracker();
                                toastr.success('Data imported successfully', 'Story Tracker');
                            } else {
                                toastr.error('Failed to import data', 'Story Tracker');
                            }
                        });
                    } catch (error) {
                        toastr.error('Invalid file format', 'Story Tracker');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    });

    // Reset data
    $('#story-tracker-reset-data').off('click').on('click', function() {
        if (confirm('Are you sure you want to reset all tracker data? This cannot be undone.')) {
            import('./src/core/persistence.js').then(module => {
                module.resetTrackerData();
                renderTracker();
                toastr.success('Data reset successfully', 'Story Tracker');
            });
        }
    });

    // Initialize settings values
    $('#story-tracker-auto-update').prop('checked', extensionSettings.autoUpdate);
    $('#story-tracker-update-depth').val(extensionSettings.updateDepth);
    $('#story-tracker-generation-mode').val(extensionSettings.generationMode);
    $('#story-tracker-use-separate-preset').prop('checked', extensionSettings.useSeparatePreset);
    $('#story-tracker-panel-position').val(extensionSettings.panelPosition);
    $('#story-tracker-theme').val(extensionSettings.theme);

    // Show custom colors if custom theme is selected
    if (extensionSettings.theme === 'custom') {
        $('#custom-colors-group').show();
    }
}

/**
 * Main initialization function.
 */
jQuery(async () => {
    try {
        console.log('[Story Tracker] Starting initialization...');

        // Load settings with validation
        try {
            loadSettings();
        } catch (error) {
            console.error('[Story Tracker] Settings load failed, continuing with defaults:', error);
        }

        // Add extension settings to Extensions tab
        try {
            addExtensionSettings();
        } catch (error) {
            console.error('[Story Tracker] Failed to add extension settings tab:', error);
        }

        // Initialize UI
        try {
            await initUI();
        } catch (error) {
            console.error('[Story Tracker] UI initialization failed:', error);
            throw error;
        }

        // Initialize tracker functionality
        try {
            initializeTracker();
        } catch (error) {
            console.error('[Story Tracker] Tracker initialization failed:', error);
        }

        // Register all event listeners
        try {
            registerAllEvents({
                [event_types.MESSAGE_SENT]: onMessageSent,
                [event_types.MESSAGE_RECEIVED]: onMessageReceived,
                [event_types.CHAT_CHANGED]: onCharacterChanged,
                [event_types.MESSAGE_SWIPED]: onMessageSwiped,
                [event_types.USER_MESSAGE_RENDERED]: updatePersonaAvatar,
                [event_types.SETTINGS_UPDATED]: updatePersonaAvatar
            });
        } catch (error) {
            console.error('[Story Tracker] Event registration failed:', error);
            throw error;
        }

        console.log('[Story Tracker] ✅ Extension loaded successfully');
    } catch (error) {
        console.error('[Story Tracker] ❌ Critical initialization failure:', error);
        console.error('[Story Tracker] Error details:', error.message, error.stack);

        // Show user-friendly error message
        toastr.error(
            'Story Tracker failed to initialize. Check console for details. Please try refreshing the page or resetting extension settings.',
            'Story Tracker Error',
            { timeOut: 10000 }
        );
    }
});
