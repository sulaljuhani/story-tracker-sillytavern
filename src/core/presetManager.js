import { extensionSettings, updateExtensionSettings, setLastGeneratedData, setCommittedTrackerData } from './state.js';
import { saveSettings, saveChatData, deepClone } from './persistence.js';
import { renderTracker as renderTrackerImplementation } from '../systems/rendering/tracker.js';

let renderTrackerHandler = renderTrackerImplementation;

export function setRenderTrackerHandler(handler) {
    renderTrackerHandler = typeof handler === 'function' ? handler : renderTrackerImplementation;
}

function notify(message, type = 'success') {
    if (typeof window !== 'undefined' && window.toastr) {
        const handler = type === 'error' ? window.toastr.error : window.toastr.success;
        handler.call(window.toastr, message, 'Story Tracker');
    } else {
        console[type === 'error' ? 'error' : 'log']('[Story Tracker]', message);
    }
}

function downloadPresetFile(content, filename = 'story-tracker-preset.json') {
    try {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('[Story Tracker] Failed to download preset file', error);
        notify(`Failed to download preset: ${error.message || error}`, 'error');
    }
}

function sanitizePresetName(name) {
    return typeof name === 'string' ? name.trim() : '';
}

function buildPresetFilename(name) {
    const sanitized = sanitizePresetName(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '');
    return `${sanitized || 'story-tracker-preset'}.json`;
}

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
        const clonedTrackerData = deepClone(presets[name].trackerData);
        updateExtensionSettings({
            systemPrompt: presets[name].systemPrompt,
            trackerData: clonedTrackerData,
            currentPreset: name,
        });
        setLastGeneratedData(clonedTrackerData);
        setCommittedTrackerData(clonedTrackerData);
        saveChatData();
        saveSettings();
        renderTrackerHandler();
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

export function syncPresetSelection(presetName = '') {
    const normalizedName = typeof presetName === 'string' ? presetName : '';
    updateExtensionSettings({ currentPreset: normalizedName });
    populatePresetDropdown();

    if (typeof globalThis.$ === 'function') {
        const $select = globalThis.$('#story-tracker-preset-select');
        if ($select && typeof $select.val === 'function') {
            $select.val(normalizedName);
        }
    }
}

export function setupPresetManager() {
    populatePresetDropdown();

    $('#story-tracker-preset-select')
        .off('change.story-tracker-presets')
        .on('change.story-tracker-presets', function() {
            const selectedPreset = $(this).val();
            if (selectedPreset) {
                loadPreset(selectedPreset);
                updateExtensionSettings({ currentPreset: selectedPreset });
                saveSettings();
            }
        });
}

export function initializePresetActions(modalBody = $('#story-tracker-settings-modal .story-tracker-modal-body')) {
    if (!modalBody || modalBody.length === 0) {
        return;
    }

    const dataButtons = modalBody.find('.story-tracker-data-buttons');
    if (!dataButtons.length) {
        return;
    }

    if (modalBody.find('#preset-actions').length === 0) {
        dataButtons.after(`
            <div id="preset-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem; align-items: center;">
                <input type="text" id="new-preset-name" placeholder="New preset name..." style="flex-grow: 1;"/>
                <button id="save-preset" class="story-tracker-btn">Save</button>
                <button id="delete-preset" class="story-tracker-btn story-tracker-btn-danger">Delete</button>
            </div>
        `);
    }

    const presetActions = modalBody.find('#preset-actions');
    const nameInput = presetActions.find('#new-preset-name');
    const saveButton = presetActions.find('#save-preset');
    const deleteButton = presetActions.find('#delete-preset');

    saveButton.off('click').on('click', () => {
        const newName = nameInput.val().trim();
        if (newName) {
            saveCurrentPreset(newName);
            nameInput.val('');
            syncPresetSelection(newName);
            saveSettings();
        }
    });

    deleteButton.off('click').on('click', () => {
        const selectedPreset = $('#story-tracker-preset-select').val();
        if (selectedPreset && confirm(`Are you sure you want to delete the "${selectedPreset}" preset?`)) {
            deletePreset(selectedPreset);
            syncPresetSelection('');
            saveSettings();
        }
    });
}

export function savePresetFromToolbar() {
    try {
        const currentPresetName = sanitizePresetName(extensionSettings.currentPreset);
        let targetName = currentPresetName;

        if (!targetName) {
            const input = typeof window !== 'undefined'
                ? window.prompt('Enter a name for this preset:')
                : null;
            targetName = sanitizePresetName(input);
        }

        if (!targetName) {
            notify('Preset name is required to save.', 'error');
            return;
        }

        saveCurrentPreset(targetName);
        syncPresetSelection(targetName);
        saveSettings();
        saveChatData();
        notify(`Preset "${targetName}" saved.`);
    } catch (error) {
        console.error('[Story Tracker] Failed to save preset from toolbar', error);
        notify(`Failed to save preset: ${error.message || error}`, 'error');
    }
}

export function exportPresetFromToolbar() {
    try {
        const currentPresetName = sanitizePresetName(extensionSettings.currentPreset);
        const presets = getPresets();
        let presetPayload = null;
        let filename = 'story-tracker-preset.json';

        if (currentPresetName && presets[currentPresetName]) {
            presetPayload = {
                name: currentPresetName,
                systemPrompt: presets[currentPresetName].systemPrompt || '',
                trackerData: presets[currentPresetName].trackerData || {},
            };
            filename = buildPresetFilename(currentPresetName);
        } else {
            presetPayload = {
                name: currentPresetName || '',
                systemPrompt: extensionSettings.systemPrompt || '',
                trackerData: deepClone(extensionSettings.trackerData),
            };
        }

        downloadPresetFile(JSON.stringify(presetPayload, null, 2), filename);
        notify('Preset exported.');
    } catch (error) {
        console.error('[Story Tracker] Failed to export preset from toolbar', error);
        notify(`Failed to export preset: ${error.message || error}`, 'error');
    }
}

export function importPresetFromText(rawText) {
    try {
        if (!rawText || typeof rawText !== 'string') {
            throw new Error('No preset data provided.');
        }

        const parsed = JSON.parse(rawText);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid preset format.');
        }

        if (!parsed.trackerData || typeof parsed.trackerData !== 'object') {
            throw new Error('Preset is missing tracker data.');
        }

        const importedName = sanitizePresetName(parsed.name) || sanitizePresetName(extensionSettings.currentPreset);
        let presetName = importedName;

        if (!presetName) {
            const input = typeof window !== 'undefined'
                ? window.prompt('Enter a name for the imported preset:')
                : null;
            presetName = sanitizePresetName(input);
        }

        if (!presetName) {
            throw new Error('Preset name is required to import.');
        }

        const presets = getPresets();
        presets[presetName] = {
            systemPrompt: typeof parsed.systemPrompt === 'string' ? parsed.systemPrompt : '',
            trackerData: deepClone(parsed.trackerData),
        };
        savePresets(presets);
        populatePresetDropdown();
        loadPreset(presetName);
        syncPresetSelection(presetName);
        saveSettings();
        notify(`Preset "${presetName}" imported.`);
    } catch (error) {
        console.error('[Story Tracker] Failed to import preset', error);
        notify(`Failed to import preset: ${error.message || error}`, 'error');
        throw error;
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
