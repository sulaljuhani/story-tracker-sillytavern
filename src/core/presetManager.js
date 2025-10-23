import { extensionSettings, updateExtensionSettings } from './state.js';
import { saveSettings } from './persistence.js';
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
    presets[name] = extensionSettings.trackerData;
    savePresets(presets);
    populatePresetDropdown();
}

export function loadPreset(name) {
    const presets = getPresets();
    if (presets[name]) {
        updateExtensionSettings({ trackerData: presets[name] });
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

    // Add save/delete buttons to the settings modal
    const modalBody = $('#story-tracker-settings-modal .story-tracker-modal-body');
    // This is a bit of a hack, but it's the easiest way to add the buttons
    // without re-writing the whole modal logic.
    if (modalBody.find('#preset-actions').length === 0) {
        modalBody.find('.story-tracker-data-buttons').after(`
            <div id="preset-actions" style="margin-top: 1rem;">
                <input type="text" id="new-preset-name" placeholder="New preset name..." />
                <button id="save-preset" class="story-tracker-btn">Save Current as Preset</button>
                <button id="delete-preset" class="story-tracker-btn story-tracker-btn-danger">Delete Selected Preset</button>
            </div>
        `);

        $('#save-preset').on('click', () => {
            const newName = $('#new-preset-name').val().trim();
            if (newName) {
                saveCurrentPreset(newName);
                $('#new-preset-name').val('');
            }
        });

        $('#delete-preset').on('click', () => {
            const selectedPreset = $('#story-tracker-preset-select').val();
            if (selectedPreset && confirm(`Are you sure you want to delete the "${selectedPreset}" preset?`)) {
                deletePreset(selectedPreset);
            }
        });
    }
}
