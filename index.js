import { extensionName, extensionDisplayName, defaultSettings } from './src/core/config.js';
import { extensionSettings, updateExtensionSettings } from './src/core/state.js';
import { loadSettings, saveSettings } from './src/core/persistence.js';
import { loadDefaultTrackerTemplate, getTrackerData, updateTrackerData } from './src/core/dataManager.js';
import { renderTracker } from './src/systems/rendering/tracker.js';
import { setupPresetManager, loadPreset, saveCurrentPreset, deletePreset, populatePresetDropdown } from './src/core/presetManager.js';
import { showSettingsModal } from './src/systems/ui/modals.js';

const base = new URL('.', import.meta.url);

async function init() {
    const st = SillyTavern.getContext();

    // 2. Load HTML and register panel
    const templateUrl = new URL('./template.html', base);
    const html = await (await fetch(templateUrl)).text();

    st.ui.registerExtension({
        id: 'story-tracker',
        name: 'Story Tracker',
        init: async ({ root }) => {
            // 1. Load settings
            Object.assign(extensionSettings, defaultSettings, st.settings[extensionName]);
            root.innerHTML = html;

            // 3. Load data
            if (!extensionSettings.trackerData || Object.keys(extensionSettings.trackerData).length === 0) {
                const preset = await loadDefaultTrackerTemplate();
                updateExtensionSettings({
                    systemPrompt: preset.systemPrompt,
                    trackerData: preset.trackerData,
                    currentPreset: 'Default',
                });
                saveCurrentPreset('Default');
            }

            // 4. Initial render
            renderTracker();
            populatePresetDropdown();

            // 5. Attach event listeners
            $(root).find('#story-tracker-settings').on('click', () => showSettingsModal());
            $(root).find('#edit-preset-prompt').on('click', () => {
                import('./src/core/presetManager.js').then(module => module.showEditPromptModal());
            });
            $(root).find('#story-tracker-preset-select').on('change', function() {
                const selectedPreset = $(this).val();
                if (selectedPreset) {
                    loadPreset(selectedPreset);
                }
            });
        },
    });
}

init();
