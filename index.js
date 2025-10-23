import { extensionName, extensionDisplayName, defaultSettings } from './src/core/config.js';
import { extensionSettings, updateExtensionSettings } from './src/core/state.js';
import { saveSettings } from './src/core/persistence.js';
import { loadDefaultTrackerTemplate } from './src/core/dataManager.js';
import { renderTracker } from './src/systems/rendering/tracker.js';
import { setupPresetManager, loadPreset, saveCurrentPreset, populatePresetDropdown } from './src/core/presetManager.js';
import { showSettingsModal } from './src/systems/ui/modals.js';

jQuery(async () => {
    // Wait for SillyTavern to be available
    while (typeof SillyTavern === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const st = SillyTavern.getContext();

    // Wait for the UI system to be ready with registerExtension
    while (!st?.ui?.registerExtension) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const base = new URL('.', import.meta.url);

    // 1. Load settings
    Object.assign(extensionSettings, defaultSettings, st.settings?.[extensionName] || {});

    // 2. Load HTML
    const templateUrl = new URL('./template.html', base);
    const html = await (await fetch(templateUrl)).text();

    // 3. Register the extension
    st.ui.registerExtension({
        id: extensionName,
        name: 'Story Tracker',
        init: async ({ root }) => {
            root.innerHTML = html;

            // 4. Load data
            if (!extensionSettings.trackerData || Object.keys(extensionSettings.trackerData).length === 0) {
                try {
                    const preset = await loadDefaultTrackerTemplate();
                    updateExtensionSettings({
                        systemPrompt: preset.systemPrompt,
                        trackerData: preset.trackerData,
                        currentPreset: 'Default',
                    });
                    saveCurrentPreset('Default');
                } catch (error) {
                    console.error('[Story Tracker] Failed to load default preset:', error);
                }
            }

            // 5. Initial render
            renderTracker();
            populatePresetDropdown();

            // 6. Attach event listeners
            $(root).find('#story-tracker-settings').on('click', () => showSettingsModal());
            $(root).find('#edit-preset-prompt').on('click', () => {
                import(new URL('./src/core/presetManager.js', base)).then(module => module.showEditPromptModal());
            });
            $(root).find('#story-tracker-preset-select').on('change', function() {
                const selectedPreset = $(this).val();
                if (selectedPreset) {
                    loadPreset(selectedPreset);
                }
            });
        },
    });

    console.log('[Story Tracker] ✅ Extension loaded successfully');
});
