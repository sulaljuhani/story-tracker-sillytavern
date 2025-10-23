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
import { loadSettings, saveSettings, saveChatData, loadChatData } from './src/core/persistence.js';
import { registerAllEvents } from './src/core/events.js';

// Generation & Parsing modules
import { updateTrackerData } from './src/systems/generation/apiClient.js';

// Rendering modules
import { renderTracker } from './src/systems/rendering/tracker.js';
import { ensureTrackerDataInitialized } from './src/core/dataManager.js';

// UI Systems modules
import {
    setupCollapseToggle,
    updatePanelVisibility,
    applyPanelPosition,
} from './src/systems/ui/layout.js';
import { setupPresetManager } from './src/core/presetManager.js';
import {
    setupMobileToggle,
} from './src/systems/ui/mobile.js';

// Integration modules
import {
    onMessageSent,
    onMessageReceived,
    onCharacterChanged,
    onMessageSwiped,
    updatePersonaAvatar,
    clearExtensionPrompts
} from './src/systems/integration/sillytavern.js';


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
                <small class="notes">Toggle to enable/disable the Story Tracker extension.</small>
            </div>
        </div>
    `;

    $('#extensions_settings').append(settingsHtml);

    // Set up the enable/disable toggle
    $('#story-tracker-enabled').prop('checked', extensionSettings.enabled).on('change', function() {
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
    const base = new URL('.', import.meta.url);
    const templateUrl = new URL('./template.html', base);
    const templateHtml = await (await fetch(templateUrl, { cache: 'no-cache' })).text();

    const st = SillyTavern.getContext();
    st.ui.registerExtension({
        id: 'story-tracker',
        name: 'Story Tracker',
        init: async ({ root }) => {
            root.innerHTML = templateHtml;
        },
    });

    // Cache UI elements using state setters
    setPanelContainer($('#story-tracker-panel'));
    setSectionsContainer($('#story-tracker-sections'));

    // Show loading indicator
    $sectionsContainer.html('<div class="story-tracker-loader">Loading...</div>');

    const wasInitialized = await ensureTrackerDataInitialized();

    applyPanelPosition();
    updatePanelVisibility();

    // Re-render if we just loaded the default template
    if (wasInitialized) {
        renderTracker();
    }

    // Set up event listeners
    $('#story-tracker-add-section').on('click', function() {
        import('./src/systems/ui/modals.js').then(module => {
            module.showAddSectionModal();
        });
    });

    $('#story-tracker-settings').on('click', function() {
        import('./src/systems/ui/modals.js').then(module => {
            module.showSettingsModal();
        });
    });

    $('#edit-preset-prompt').on('click', function() {
        import('./src/core/presetManager.js').then(module => {
            module.showEditPromptModal();
        });
    });

    $('#story-tracker-manual-update').on('click', async function() {
        if (!extensionSettings.enabled) {
            return;
        }
        await updateTrackerData(renderTracker);
    });

    setupCollapseToggle();

    // Setup mobile toggle button
    setupMobileToggle();

    // Setup modal functionality
    import('./src/systems/ui/modals.js').then(module => {
        module.setupSettingsPopup();
        module.setupFieldPopup();
    });

    // Setup preset manager
    setupPresetManager();

    // Render initial data if available
    renderTracker();

    // Initialize SortableJS
    const { default: Sortable } = await import(new URL('./src/lib/sortable.min.js', base));
    const sectionsContainer = document.getElementById('story-tracker-sections');
    new Sortable(sectionsContainer, {
        animation: 150,
        handle: '.story-tracker-section-header',
        onEnd: function (evt) {
            const sectionId = evt.item.dataset.sectionId;
            const newIndex = evt.newIndex;
            const oldIndex = evt.oldIndex;

            const section = extensionSettings.trackerData.sections.find(s => s.id === sectionId);
            extensionSettings.trackerData.sections.splice(oldIndex, 1);
            extensionSettings.trackerData.sections.splice(newIndex, 0, section);

            saveSettings();
        }
    });
}


/**
 * Main initialization function.
 */
jQuery(async () => {
    try {
        console.log('[Story Tracker] Starting initialization...');

        // Get SillyTavern context
        const st = SillyTavern.getContext();

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
                [st.eventTypes.MESSAGE_SENT]: onMessageSent,
                [st.eventTypes.MESSAGE_RECEIVED]: onMessageReceived,
                [st.eventTypes.CHAT_CHANGED]: onCharacterChanged,
                [st.eventTypes.MESSAGE_SWIPED]: onMessageSwiped,
                [st.eventTypes.USER_MESSAGE_RENDERED]: updatePersonaAvatar,
                [st.eventTypes.SETTINGS_UPDATED]: updatePersonaAvatar
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
