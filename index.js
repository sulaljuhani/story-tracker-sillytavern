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
import { loadSettings, saveSettings, saveChatData, loadChatData, updateMessageSwipeData } from './src/core/persistence.js';
import { registerAllEvents } from './src/core/events.js';

// Generation & Parsing modules
import {
    generateTrackerExample,
    generateTrackerInstructions,
    generateContextualSummary,
    generateSeparateUpdatePrompt
} from './src/systems/generation/promptBuilder.js';
import { parseResponse } from './src/systems/generation/parser.js';
import { updateTrackerData } from './src/systems/generation/apiClient.js';
import { onGenerationStarted } from './src/systems/generation/injector.js';

// Rendering modules
import { renderTracker } from './src/systems/rendering/tracker.js';

// UI Systems modules
import {
    applyTheme,
    applyCustomTheme,
} from './src/systems/ui/theme.js';
import {
    setupSettingsPopup,
} from './src/systems/ui/modals.js';
import {
    setupCollapseToggle,
    updatePanelVisibility,
    applyPanelPosition,
} from './src/systems/ui/layout.js';
import {
    setupMobileToggle,
} from './src/systems/ui/mobile.js';

// Integration modules
import {
    commitTrackerData,
    onMessageSent,
    onMessageReceived,
    onCharacterChanged,
    onMessageSwiped,
    updatePersonaAvatar,
    clearExtensionPrompts
} from './src/systems/integration/sillytavern.js';

// Old state variable declarations removed - now imported from core modules
// (extensionSettings, lastGeneratedData, committedTrackerData, etc. are now in src/core/state.js)

// Utility functions removed - now imported from src/utils/avatars.js
// (getSafeThumbnailUrl)

// Persistence functions removed - now imported from src/core/persistence.js
// (loadSettings, saveSettings, saveChatData, loadChatData, updateMessageSwipeData)

// Theme functions removed - now imported from src/systems/ui/theme.js
// (applyTheme, applyCustomTheme, toggleCustomColors, toggleAnimations,
//  updateSettingsPopupTheme, applyCustomThemeToSettingsPopup)

// Layout functions removed - now imported from src/systems/ui/layout.js
// (togglePlotButtons, updateCollapseToggleIcon, setupCollapseToggle,
//  updatePanelVisibility, updateSectionVisibility, applyPanelPosition)
// Note: closeMobilePanelWithAnimation is only used internally by mobile.js

// Mobile UI functions removed - now imported from src/systems/ui/mobile.js
// (setupMobileToggle, constrainFabToViewport, setupMobileTabs, removeMobileTabs,
//  setupMobileKeyboardHandling, setupContentEditableScrolling)

/**
 * Adds the extension settings to the Extensions tab.
 */
function addExtensionSettings() {
    const settingsHtml = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b><i class="fa-solid fa-book"></i> Story Tracker</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label" for="rpg-extension-enabled">
                    <input type="checkbox" id="rpg-extension-enabled" />
                    <span>Enable Story Tracker</span>
                </label>
                <small class="notes">Toggle to enable/disable the Story Tracker extension. Configure additional settings within the panel itself.</small>
            </div>
        </div>
    `;

    $('#extensions_settings2').append(settingsHtml);

    // Set up the enable/disable toggle
    $('#rpg-extension-enabled').prop('checked', extensionSettings.enabled).on('change', function() {
        extensionSettings.enabled = $(this).prop('checked');
        saveSettings();
        updatePanelVisibility();

        if (!extensionSettings.enabled) {
            clearExtensionPrompts();
        }
    });
}

/**
 * Initializes the UI for the extension.
 */
async function initUI() {
    // Load the HTML template using SillyTavern's template system
    const templateHtml = await renderExtensionTemplateAsync(extensionName, 'template');

    // Append panel to body - positioning handled by CSS
    $('body').append(templateHtml);

    // Cache UI elements using state setters
    setPanelContainer($('#story-tracker-panel'));
    setSectionsContainer($('#story-tracker-sections'));

    // Set up event listeners (enable/disable is handled in Extensions tab)
    $('#story-tracker-add-section').on('click', function() {
        // Import and call modal function
        import('./src/systems/ui/modals.js').then(module => {
            module.showAddSectionModal();
        });
    });

    $('#story-tracker-settings').on('click', function() {
        // Import and call modal function
        import('./src/systems/ui/modals.js').then(module => {
            module.showSettingsModal();
        });
    });

    $('#story-tracker-manual-update').on('click', async function() {
        if (!extensionSettings.enabled) {
            return;
        }
        await updateTrackerData(renderTracker);
    });

    // Setup mobile toggle button
    setupMobileToggle();

    // Setup collapse/expand toggle button
    setupCollapseToggle();

    // Render initial data if available
    renderTracker();
    setupSettingsPopup();
}





// Rendering functions removed - now imported from src/systems/rendering/*
// (renderUserStats, renderInfoBox, renderThoughts, updateInfoBoxField,
//  updateCharacterField, updateChatThoughts, createThoughtPanel)

// Event handlers removed - now imported from src/systems/integration/sillytavern.js
// (commitTrackerData, onMessageSent, onMessageReceived, onCharacterChanged,
//  onMessageSwiped, updatePersonaAvatar, clearExtensionPrompts)

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

        // Load chat-specific data for current chat
        try {
            loadChatData();
        } catch (error) {
            console.error('[Story Tracker] Chat data load failed, using defaults:', error);
        }

        // Register all event listeners
        try {
            registerAllEvents({
                [event_types.MESSAGE_SENT]: onMessageSent,
                [event_types.GENERATION_STARTED]: onGenerationStarted,
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

        toastr.error(
            'Story Tracker failed to initialize. Check console for details.',
            'Story Tracker Error',
            { timeOut: 10000 }
        );
    }
});
