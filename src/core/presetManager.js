import { extensionSettings, updateExtensionSettings } from './state.js';
import { saveSettings, deepClone } from './persistence.js';
import { renderTracker } from '../systems/rendering/tracker.js';

const PRESET_STORAGE_KEY = 'story-tracker-presets';

function getPresets() {
    try {
        const presets = localStorage.getItem(PRESET_STORAGE_KEY);
        return presets ? JSON.parse(presets) : {};
    } catch (error) {
        console.error('[Story Tracker] Error loading presets:', error);
        return {};
    }
}

function savePresets(presets) {
    try {
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
        console.error('[Story Tracker] Error saving presets:', error);
    }
}

export function saveCurrentPreset(name) {
    if (!name) return;
    const presets = getPresets();
    presets[name] = {
        systemPrompt: extensionSettings.systemPrompt || '',
        trackerData: deepClone(extensionSettings.trackerData),
    };
    savePresets(presets);
    populatePresetDropdown();
}

export function loadPreset(name) {
    const presets = getPresets();
    if (presets[name]) {
        updateExtensionSettings({
            systemPrompt: presets[name].systemPrompt,
            trackerData: deepClone(presets[name].trackerData),
            currentPreset: name,
        });
        saveSettings();
        renderTracker();
    }
}

export function deletePreset(name) {
    const presets = getPresets();
    delete presets[name];
    savePresets(presets);
    populatePresetDropdown();
}

export function populatePresetDropdown() {
    const presets = getPresets();
    const $select = $('#story-tracker-preset-select');
    const currentPresetName = extensionSettings.currentPreset || '';

    $select.html('');
    $select.append('<option value="">- Select a Preset -</option>');

    for (const name in presets) {
        $select.append(`<option value="${name}" ${name === currentPresetName ? 'selected' : ''}>${name}</option>`);
    }
}

export function setupPresetManager() {
    populatePresetDropdown();

    $('#story-tracker-preset-select').on('change', function() {
        const selectedPreset = $(this).val();
        if (selectedPreset) {
            loadPreset(selectedPreset);
            updateExtensionSettings({ currentPreset: selectedPreset });
            saveSettings();
        }
    });

    const modalBody = $('#story-tracker-settings-modal .story-tracker-modal-body');
    if (modalBody.find('#preset-actions').length === 0) {
        modalBody.find('.story-tracker-data-buttons').after(`
            <div id="preset-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem; align-items: center;">
                <input type="text" id="new-preset-name" placeholder="New preset name..." style="flex-grow: 1;"/>
                <button id="save-preset" class="story-tracker-btn">Save</button>
                <button id="delete-preset" class="story-tracker-btn story-tracker-btn-danger">Delete</button>
            </div>
        `);

        $('#save-preset').on('click', () => {
            const newName = $('#new-preset-name').val().trim();
            if (newName) {
                saveCurrentPreset(newName);
                $('#new-preset-name').val('');
                populatePresetDropdown();
                $('#story-tracker-preset-select').val(newName);
            }
        });

        $('#delete-preset').on('click', () => {
            const selectedPreset = $('#story-tracker-preset-select').val();
            if (selectedPreset && confirm(`Are you sure you want to delete the "${selectedPreset}" preset?`)) {
                deletePreset(selectedPreset);
                $('#story-tracker-preset-select').val('');
            }
        });
    }
}

export function showEditPromptModal() {
    const modalBody = $('#story-tracker-field-modal .story-tracker-modal-body');
    modalBody.html(`
        <div style="padding: 0.75rem;">
            <h4>Edit System Prompt</h4>
            <div style="margin: 0.75rem 0;">
                <textarea id="system-prompt-editor" rows="10" style="width: 100%;">${extensionSettings.systemPrompt || ''}</textarea>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button id="cancel-edit-prompt" class="story-tracker-btn">Cancel</button>
                <button id="save-edit-prompt" class="story-tracker-btn story-tracker-btn-primary">Save</button>
            </div>
        </div>
    `);

    $('#cancel-edit-prompt').on('click', () => {
        import('../systems/ui/modals.js').then(module => module.closeFieldPopup());
    });

    $('#save-edit-prompt').on('click', () => {
        const newPrompt = $('#system-prompt-editor').val();
        updateExtensionSettings({ systemPrompt: newPrompt });
        saveSettings();
        import('../systems/ui/modals.js').then(module => module.closeFieldPopup());
    });

    import('../systems/ui/modals.js').then(module => module.openFieldPopup());
}
