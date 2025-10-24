import { extensionSettings, updateExtensionSettings, setLastGeneratedData, setCommittedTrackerData } from './state.js';
import { saveSettings, saveChatData, deepClone } from './persistence.js';
import { parseTrackerData, serializeTrackerData } from './serialization.js';
import { renderTracker as renderTrackerImplementation } from '../systems/rendering/tracker.js';

let renderTrackerHandler = renderTrackerImplementation;

export function setRenderTrackerHandler(handler) {
    renderTrackerHandler = typeof handler === 'function' ? handler : renderTrackerImplementation;
}

const PRESET_STORAGE_KEY = 'story-tracker-presets';
const DEFAULT_PRESET_FILENAME = 'story-tracker-preset.json';

function notify(message, type = 'success') {
    if (typeof window !== 'undefined' && window.toastr) {
        const handler = type === 'error' ? window.toastr.error : window.toastr.success;
        handler.call(window.toastr, message, 'Story Tracker');
    } else {
        console[type === 'error' ? 'error' : 'log']('[Story Tracker]', message);
    }
}

function getUrlApi() {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        return URL;
    }

    const globalUrl = globalThis?.URL;
    if (globalUrl && typeof globalUrl.createObjectURL === 'function') {
        return globalUrl;
    }

    return null;
}

function downloadSerialized(text, filename = DEFAULT_PRESET_FILENAME) {
    const doc = typeof document !== 'undefined' ? document : null;
    if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('Preset export is only supported when a document is available.');
    }

    if (!doc.body || typeof doc.body.appendChild !== 'function' || typeof doc.body.removeChild !== 'function') {
        throw new Error('Preset export requires access to the document body.');
    }

    if (typeof Blob === 'undefined') {
        throw new Error('Preset export is not supported in this environment.');
    }

    const urlApi = getUrlApi();
    if (!urlApi || typeof urlApi.revokeObjectURL !== 'function') {
        throw new Error('Preset export requires the URL.createObjectURL API.');
    }

    const blob = new Blob([text], { type: 'application/json' });
    const url = urlApi.createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = filename;

    doc.body.appendChild(link);

    try {
        link.click();
    } finally {
        doc.body.removeChild(link);
        urlApi.revokeObjectURL(url);
    }
}

function sanitizeFilename(name) {
    if (!name) {
        return DEFAULT_PRESET_FILENAME;
    }

    const sanitized = name
        .replace(/[\s]+/g, '_')
        .replace(/[<>:"/\\|?*]+/g, '')
        .replace(/[\u0000-\u001F]+/g, '')
        .trim();

    return sanitized ? `${sanitized}.json` : DEFAULT_PRESET_FILENAME;
}

function normalizePresetName(name) {
    return typeof name === 'string' ? name.trim() : '';
}

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
        throw error;
    }
}

export function saveCurrentPreset(name, { silent = false } = {}) {
    const normalizedName = normalizePresetName(name);
    if (!normalizedName) {
        if (!silent) {
            notify('Preset name cannot be empty.', 'error');
        }
        return false;
    }

    const presets = getPresets();
    presets[normalizedName] = {
        systemPrompt: extensionSettings.systemPrompt || '',
        trackerData: deepClone(extensionSettings.trackerData),
    };
    try {
        savePresets(presets);
    } catch (error) {
        if (!silent) {
            const message = error?.message || 'Unexpected error while saving the preset.';
            notify(`Failed to save preset: ${message}`, 'error');
        }
        return false;
    }
    syncPresetSelection(normalizedName);

    if (!silent) {
        notify(`Saved preset "${normalizedName}".`);
    }

    return true;
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
    const $ = typeof globalThis.$ === 'function' ? globalThis.$ : null;
    if (!$) {
        return;
    }

    const $select = $('#story-tracker-preset-select');
    if (!$select || typeof $select.html !== 'function') {
        return;
    }

    const currentPresetName = extensionSettings.currentPreset || '';

    $select.html('');
    $select.append('<option value="">- Select a Preset -</option>');

    for (const name in presets) {
        if (!Object.prototype.hasOwnProperty.call(presets, name)) {
            continue;
        }
        $select.append(`<option value="${name}" ${name === currentPresetName ? 'selected' : ''}>${name}</option>`);
    }
}

export function syncPresetSelection(presetName = '') {
    const normalizedName = typeof presetName === 'string' ? presetName : '';
    updateExtensionSettings({ currentPreset: normalizedName });
    populatePresetDropdown();

    const $ = typeof globalThis.$ === 'function' ? globalThis.$ : null;
    if ($) {
        const $select = $('#story-tracker-preset-select');
        if ($select && typeof $select.val === 'function') {
            $select.val(normalizedName);
        }
    }
}

export function exportPresetToFile(presetName) {
    const normalizedName = normalizePresetName(presetName || extensionSettings.currentPreset);
    if (!normalizedName) {
        notify('Please select a preset to export.', 'error');
        return false;
    }

    const presets = getPresets();
    const preset = presets[normalizedName];
    if (!preset) {
        notify(`Preset "${normalizedName}" could not be found.`, 'error');
        return false;
    }

    const payload = {
        name: normalizedName,
        systemPrompt: typeof preset.systemPrompt === 'string' ? preset.systemPrompt : '',
        trackerData: preset.trackerData || null,
        exportedAt: new Date().toISOString(),
    };

    const serialized = serializeTrackerData(payload);

    try {
        downloadSerialized(serialized, sanitizeFilename(normalizedName));
        notify(`Exported preset "${normalizedName}".`);
        return true;
    } catch (error) {
        const message = error?.message || error;
        notify(`Failed to export preset: ${message}`, 'error');
        return false;
    }
}

function resolveImportedPresetName(parsed, file, explicitName) {
    const preferred = normalizePresetName(explicitName)
        || normalizePresetName(parsed?.name)
        || normalizePresetName(parsed?.presetName)
        || normalizePresetName(parsed?.meta?.name);

    if (preferred) {
        return preferred;
    }

    const fileName = typeof file?.name === 'string' ? file.name : '';
    if (fileName) {
        const base = fileName.replace(/\.[^.]+$/u, '');
        const normalized = normalizePresetName(base);
        if (normalized) {
            return normalized;
        }
    }

    return '';
}

function validateImportedPresetStructure(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Preset file must contain a JSON object.');
    }

    const trackerData = parsed.trackerData;
    if (!trackerData || typeof trackerData !== 'object') {
        throw new Error('Preset file is missing trackerData.');
    }

    if (!Array.isArray(trackerData.sections)) {
        throw new Error('Preset trackerData.sections must be an array.');
    }

    return {
        trackerData,
        systemPrompt: typeof parsed.systemPrompt === 'string' ? parsed.systemPrompt : '',
    };
}

export async function importPresetFile(file, { presetName } = {}) {
    if (!file) {
        const message = 'No file provided for preset import.';
        notify(message, 'error');
        throw new Error(message);
    }

    try {
        const text = await file.text();
        const parsed = parseTrackerData(text);
        const { trackerData, systemPrompt } = validateImportedPresetStructure(parsed);
        const normalizedName = resolveImportedPresetName(parsed, file, presetName);

        if (!normalizedName) {
            throw new Error('Imported preset does not specify a name.');
        }

        const presets = getPresets();
        presets[normalizedName] = {
            systemPrompt,
            trackerData: deepClone(trackerData),
        };
        savePresets(presets);
        loadPreset(normalizedName);
        syncPresetSelection(normalizedName);

        notify(`Imported preset "${normalizedName}".`);
        return normalizedName;
    } catch (error) {
        const message = error?.message || error;
        notify(`Failed to import preset: ${message}`, 'error');
        throw error;
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
