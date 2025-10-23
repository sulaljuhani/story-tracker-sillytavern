/**
 * Modal Management Module
 * Handles SettingsModal and FieldModal for Story Tracker
 */

import {
    extensionSettings,
    lastGeneratedData,
    committedTrackerData
} from '../../core/state.js';
import { saveSettings, saveChatData } from '../../core/persistence.js';
import { loadDefaultTrackerTemplate, updateTrackerData, getTrackerData, setTrackerDataFormat } from '../../core/dataManager.js';
import { serializeTrackerData, parseTrackerData, detectFormatFromFilename, normalizeFormat, FORMAT_JSON, FORMAT_YAML } from '../../core/serialization.js';

/**
 * SettingsModal - Manages the settings popup modal
 * Handles opening, closing, theming, and animations
 */
export class SettingsModal {
    constructor() {
        this.modal = document.getElementById('story-tracker-settings-modal');
        this.content = this.modal?.querySelector('.story-tracker-modal-content');
        this.isAnimating = false;
    }

    /**
     * Opens the modal with proper animation
     */
    open() {
        if (this.isAnimating || !this.modal) return;

        // Open modal with CSS class
        this.modal.classList.add('is-open');
        this.modal.classList.remove('is-closing');

        // Focus management
        this.modal.querySelector('.story-tracker-modal-close')?.focus();
    }

    /**
     * Closes the modal with animation
     */
    close() {
        if (this.isAnimating || !this.modal) return;

        this.isAnimating = true;
        this.modal.classList.add('is-closing');
        this.modal.classList.remove('is-open');

        // Wait for animation to complete
        setTimeout(() => {
            this.modal.classList.remove('is-closing');
            this.isAnimating = false;
        }, 200);
    }
}

/**
 * FieldModal - Manages the field editor popup modal
 */
export class FieldModal {
    constructor() {
        this.modal = document.getElementById('story-tracker-field-modal');
        this.content = this.modal?.querySelector('.story-tracker-modal-content');
        this.isAnimating = false;
    }

    /**
     * Opens the modal with proper animation
     */
    open() {
        if (this.isAnimating || !this.modal) return;

        // Open modal with CSS class
        this.modal.classList.add('is-open');
        this.modal.classList.remove('is-closing');

        // Focus management
        this.modal.querySelector('.story-tracker-modal-close')?.focus();
    }

    /**
     * Closes the modal with animation
     */
    close() {
        if (this.isAnimating || !this.modal) return;

        this.isAnimating = true;
        this.modal.classList.add('is-closing');
        this.modal.classList.remove('is-open');

        // Wait for animation to complete
        setTimeout(() => {
            this.modal.classList.remove('is-closing');
            this.isAnimating = false;
        }, 200);
    }
}

// Global instances
let settingsModal = null;
let fieldModal = null;

/**
 * Sets up the settings popup functionality.
 * @returns {SettingsModal} The initialized SettingsModal instance
 */
export function setupSettingsPopup() {
    // Initialize SettingsModal instance
    settingsModal = new SettingsModal();

    // Close settings popup - close button
    $('#story-tracker-settings-modal .story-tracker-modal-close').on('click', function() {
        closeSettingsPopup();
    });

    // Close on backdrop click (clicking outside content)
    $('#story-tracker-settings-modal').on('click', function(e) {
        if (e.target === this) {
            closeSettingsPopup();
        }
    });

    return settingsModal;
}

/**
 * Sets up the field editor popup functionality.
 * @returns {FieldModal} The initialized FieldModal instance
 */
export function setupFieldPopup() {
    // Initialize FieldModal instance
    fieldModal = new FieldModal();

    // Close field popup - close button
    $('#story-tracker-field-modal .story-tracker-modal-close').on('click', function() {
        closeFieldPopup();
    });

    // Close on backdrop click (clicking outside content)
    $('#story-tracker-field-modal').on('click', function(e) {
        if (e.target === this) {
            closeFieldPopup();
        }
    });

    return fieldModal;
}

/**
 * Opens the settings popup.
 * Backwards compatible wrapper for SettingsModal class.
 */
export function openSettingsPopup() {
    if (settingsModal) {
        settingsModal.open();
    }
}

/**
 * Closes the settings popup.
 * Backwards compatible wrapper for SettingsModal class.
 */
export function closeSettingsPopup() {
    if (settingsModal) {
        settingsModal.close();
    }
}

/**
 * Opens the field editor popup.
 * Backwards compatible wrapper for FieldModal class.
 */
export function openFieldPopup() {
    if (fieldModal) {
        fieldModal.open();
    }
}

/**
 * Closes the field editor popup.
 * Backwards compatible wrapper for FieldModal class.
 */
export function closeFieldPopup() {
    if (fieldModal) {
        fieldModal.close();
    }
}


function initializeSettingsTabs(modalBody) {
    const buttons = modalBody.find('.story-tracker-settings-tab-btn');
    const panels = modalBody.find('.story-tracker-tab-panel');

    buttons.off('click').on('click', function() {
        const targetTab = $(this).data('tab');
        buttons.removeClass('active');
        $(this).addClass('active');
        panels.removeClass('active');
        panels.filter(`[data-tab="${targetTab}"]`).addClass('active');
    });
}

function initializeGeneralSettings(modalBody) {
    const depthInput = modalBody.find('#story-tracker-setting-update-depth');
    const modeSelect = modalBody.find('#story-tracker-setting-generation-mode');

    depthInput.val(extensionSettings.updateDepth ?? 4);
    modeSelect.val(extensionSettings.generationMode || 'together');

    modalBody.find('#story-tracker-general-save').off('click').on('click', () => {
        const depth = Number(depthInput.val());
        if (!Number.isInteger(depth) || depth < 1 || depth > 20) {
            notify('Update depth must be between 1 and 20.', 'error');
            return;
        }

        extensionSettings.updateDepth = depth;
        extensionSettings.generationMode = modeSelect.val();
        saveSettings();
        notify('General settings saved.');

        import('../ui/layout.js').then(module => {
            if (typeof module.updateGenerationModeUI === 'function') {
                module.updateGenerationModeUI();
            }
        }).catch(() => {});
    });
}

function initializeDataManager(modalBody, initialFormat) {
    const formatSelect = modalBody.find('#tracker-data-format');
    const editor = modalBody.find('#tracker-data-editor');
    const errorBox = modalBody.find('#tracker-data-error');
    const fileInput = modalBody.find('#tracker-data-file-input');

    let currentFormat = normalizeFormat(initialFormat);
    formatSelect.val(currentFormat);

    const hideDataError = () => {
        errorBox.hide().text('');
    };

    const showDataError = message => {
        errorBox.text(message).show();
    };

    const refreshEditor = () => {
        try {
            const data = getTrackerData();
            editor.val(serializeTrackerData(data, currentFormat));
            hideDataError();
        } catch (error) {
            showDataError(`Failed to serialize tracker data: ${error.message || error}`);
        }
    };

    const applyData = async (data, successMessage) => {
        try {
            updateTrackerData(data);
            setTrackerDataFormat(currentFormat);
            await import('../rendering/tracker.js').then(module => {
                if (typeof module.renderTracker === 'function') {
                    module.renderTracker();
                }
            });
            hideDataError();
            if (successMessage) {
                notify(successMessage);
            }
        } catch (error) {
            showDataError(`Failed to apply tracker data: ${error.message || error}`);
        }
    };

    refreshEditor();

    formatSelect.off('change').on('change', () => {
        const requestedFormat = normalizeFormat(formatSelect.val());
        if (requestedFormat === currentFormat) {
            return;
        }

        try {
            const textContent = editor.val();
            const sourceData = textContent.trim() ? parseTrackerData(textContent, currentFormat) : getTrackerData();
            currentFormat = requestedFormat;
            editor.val(serializeTrackerData(sourceData, currentFormat));
            setTrackerDataFormat(currentFormat);
            hideDataError();
        } catch (error) {
            showDataError(`Unable to convert data: ${error.message || error}`);
            formatSelect.val(currentFormat);
        }
    });

    modalBody.find('#tracker-data-refresh').off('click').on('click', () => {
        refreshEditor();
        notify('Reloaded tracker data from memory.');
    });

    modalBody.find('#tracker-data-load-default').off('click').on('click', () => {
        loadDefaultTrackerTemplate(currentFormat)
            .then(async template => {
                editor.val(serializeTrackerData(template, currentFormat));
                await applyData(template, 'Loaded default tracker template.');
            })
            .catch(error => {
                showDataError(`Failed to load default template: ${error.message || error}`);
            });
    });

    modalBody.find('#tracker-data-apply').off('click').on('click', async () => {
        try {
            const raw = editor.val();
            if (!raw.trim()) {
                showDataError('Tracker data cannot be empty.');
                return;
            }
            const parsed = parseTrackerData(raw, currentFormat);
            await applyData(parsed, 'Tracker data updated.');
        } catch (error) {
            showDataError(`Failed to parse tracker data: ${error.message || error}`);
        }
    });

    modalBody.find('#tracker-data-import').off('click').on('click', () => {
        fileInput.trigger('click');
    });

    modalBody.find('#tracker-data-export').off('click').on('click', () => {
        try {
            const raw = editor.val();
            const parsed = parseTrackerData(raw, currentFormat);
            const serialized = serializeTrackerData(parsed, currentFormat);
            downloadSerialized(serialized, currentFormat);
            notify('Tracker data exported.');
        } catch (error) {
            showDataError(`Unable to export data: ${error.message || error}`);
        }
    });

    fileInput.off('change').on('change', event => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async loadEvent => {
            try {
                const textContent = String(loadEvent.target?.result || '');
                const detectedFormat = detectFormatFromFilename(file.name);
                const parsed = parseTrackerData(textContent, detectedFormat);
                currentFormat = normalizeFormat(detectedFormat);
                formatSelect.val(currentFormat);
                editor.val(serializeTrackerData(parsed, currentFormat));
                await applyData(parsed, 'Imported tracker data file.');
                hideDataError();
            } catch (error) {
                showDataError(`Failed to import file: ${error.message || error}`);
            } finally {
                fileInput.val('');
            }
        };
        reader.readAsText(file);
    });
}

function downloadSerialized(text, format) {
    const blob = new Blob([text], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = format === FORMAT_YAML ? 'story-tracker.yaml' : 'story-tracker.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function notify(message, type = 'success') {
    if (typeof window !== 'undefined' && window.toastr) {
        const handler = type === 'error' ? window.toastr.error : window.toastr.success;
        handler.call(window.toastr, message, 'Story Tracker');
    } else {
        console[type === 'error' ? 'error' : 'log']('[Story Tracker]', message);
    }
}


/**
 * Shows the add section modal
 */
export function showAddSectionModal() {
    // Populate modal content for adding a section
    const modalBody = $('#story-tracker-settings-modal .story-tracker-modal-body');
    modalBody.html(`
        <div style="padding: 1rem;">
            <h4>Add New Section</h4>
            <div style="margin: 1rem 0;">
                <label for="section-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Section Name:</label>
                <input type="text" id="section-name" placeholder="Enter section name" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="story-tracker-btn" onclick="closeSettingsPopup()">Cancel</button>
                <button class="story-tracker-btn story-tracker-btn-primary" onclick="addNewSection()">Add Section</button>
            </div>
        </div>
    `);

    // Make functions available globally for onclick handlers
    window.closeSettingsPopup = closeSettingsPopup;
    window.addNewSection = () => {
        const sectionName = $('#section-name').val().trim();
        if (sectionName) {
            import('../rendering/tracker.js').then(module => {
                if (typeof module.addSection === 'function') {
                    module.addSection(sectionName);
                }
                closeSettingsPopup();
            }).catch(error => {
                console.error('[Story Tracker] Failed to add section:', error);
            });
        }
    };

    openSettingsPopup();
}


/**
 * Shows the add subsection modal
 */
export function showAddSubsectionModal(sectionId) {
    const modalBody = $('#story-tracker-settings-modal .story-tracker-modal-body');
    modalBody.html(`
        <div style="padding: 1rem;">
            <h4>Add New Subsection</h4>
            <div style="margin: 1rem 0;">
                <label for="subsection-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Subsection Name:</label>
                <input type="text" id="subsection-name" placeholder="Enter subsection name" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="story-tracker-btn" onclick="closeSettingsPopup()">Cancel</button>
                <button class="story-tracker-btn story-tracker-btn-primary" onclick="addNewSubsection()">Add Subsection</button>
            </div>
        </div>
    `);

    window.closeSettingsPopup = closeSettingsPopup;
    window.addNewSubsection = () => {
        const subsectionName = $('#subsection-name').val().trim();
        if (subsectionName) {
            import('../rendering/tracker.js').then(module => {
                if (typeof module.addSubsection === 'function') {
                    module.addSubsection(sectionId, subsectionName);
                }
                closeSettingsPopup();
            }).catch(error => {
                console.error('[Story Tracker] Failed to add subsection:', error);
            });
        }
    };

    openSettingsPopup();
}

/**
 * Shows the add field modal
 */
export function showAddFieldModal(subsectionId) {
    // Populate modal content for adding a field
    const modalBody = $('#story-tracker-field-modal .story-tracker-modal-body');
    modalBody.html(`
        <div style="padding: 1rem;">
            <h4>Add New Field</h4>
            <div style="margin: 1rem 0;">
                <label for="field-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Field Name:</label>
                <input type="text" id="field-name" placeholder="Enter field name" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="margin: 1rem 0;">
                <label for="field-type" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Field Type:</label>
                <select id="field-type" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                </select>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="story-tracker-btn" onclick="closeFieldPopup()">Cancel</button>
                <button class="story-tracker-btn story-tracker-btn-primary" onclick="addNewField()">Add Field</button>
            </div>
        </div>
    `);

    // Make functions available globally for onclick handlers
    window.closeFieldPopup = closeFieldPopup;
    window.addNewField = () => {
        const fieldName = $('#field-name').val().trim();
        const fieldType = $('#field-type').val();
        if (fieldName) {
            import('../rendering/tracker.js').then(module => {
                if (typeof module.addField === 'function') {
                    module.addField(subsectionId, fieldName, fieldType);
                }
                closeFieldPopup();
            }).catch(error => {
                console.error('[Story Tracker] Failed to add field:', error);
            });
        }
    };

    openFieldPopup();
}

/**
 * Shows the edit field modal
 */
export function showEditFieldModal(fieldId) {
    // Import tracker module to get field data
    import('../rendering/tracker.js').then(module => {
        if (module.getFieldById) {
            const field = module.getFieldById(fieldId);
            if (field) {
                const modalBody = $('#story-tracker-field-modal .story-tracker-modal-body');
                modalBody.html(`
                    <div style="padding: 1rem;">
                        <h4>Edit Field: ${field.name}</h4>
                        <div style="margin: 1rem 0;">
                            <label for="edit-field-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Field Name:</label>
                            <input type="text" id="edit-field-name" value="${field.name}" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                        </div>
                        <div style="margin: 1rem 0;">
                            <label for="edit-field-value" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Field Value:</label>
                            <input type="text" id="edit-field-value" value="${field.value || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                        </div>
                        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                            <button class="story-tracker-btn" onclick="closeFieldPopup()">Cancel</button>
                            <button class="story-tracker-btn story-tracker-btn-primary" onclick="updateField('${fieldId}')">Update Field</button>
                        </div>
                    </div>
                `);

                // Make functions available globally for onclick handlers
                window.closeFieldPopup = closeFieldPopup;
                window.updateField = (fieldId) => {
                    const newName = $('#edit-field-name').val().trim();
                    const newValue = $('#edit-field-value').val(); // Don't trim value, as it might be intentional whitespace
                    if (newName) {
                        import('../rendering/tracker.js').then(module => {
                            if (module.updateField) {
                                module.updateField(fieldId, newName, newValue);
                                closeFieldPopup();
                            }
                        });
                    }
                };

                openFieldPopup();
            }
        }
    });
}

/**
 * Shows the settings modal
 */
export function showSettingsModal() {
    if (!settingsModal) {
        return;
    }

    const modalBody = $('#story-tracker-settings-modal .story-tracker-modal-body');
    const activeFormat = extensionSettings.dataFormat || FORMAT_JSON;

    modalBody.html(`
        <div class="story-tracker-settings">
            <div class="story-tracker-settings-tabs">
                <button class="story-tracker-settings-tab-btn active" data-tab="general">General</button>
                <button class="story-tracker-settings-tab-btn" data-tab="data">Data Manager</button>
            </div>
            <div class="story-tracker-tab-panel active" data-tab="general">
                <div class="story-tracker-settings-group">
                    <label for="story-tracker-setting-update-depth">Update Depth</label>
                    <input type="number" id="story-tracker-setting-update-depth" min="1" max="20" step="1" />
                    <small>Number of recent messages to include when requesting tracker updates (1-20).</small>
                </div>
                <div class="story-tracker-settings-group">
                    <label for="story-tracker-setting-generation-mode">Generation Mode</label>
                    <select id="story-tracker-setting-generation-mode">
                        <option value="together">Together (with chat)</option>
                        <option value="separate">Separate (dedicated calls)</option>
                    </select>
                </div>
                <div class="story-tracker-settings-actions">
                    <button id="story-tracker-general-save" class="story-tracker-btn story-tracker-btn-primary">Save General Settings</button>
                </div>
            </div>
            <div class="story-tracker-tab-panel" data-tab="data">
                <div class="story-tracker-settings-group story-tracker-data-controls">
                    <label for="tracker-data-format">Format</label>
                    <select id="tracker-data-format">
                        <option value="json">JSON</option>
                        <option value="yaml">YAML</option>
                    </select>
                    <div class="story-tracker-data-buttons">
                        <button id="tracker-data-refresh" class="story-tracker-btn">Reload Current</button>
                        <button id="tracker-data-load-default" class="story-tracker-btn">Load Default</button>
                        <button id="tracker-data-import" class="story-tracker-btn">Import File</button>
                        <button id="tracker-data-export" class="story-tracker-btn">Download</button>
                    </div>
                </div>
                <textarea id="tracker-data-editor" class="story-tracker-data-editor" rows="18" spellcheck="false"></textarea>
                <div id="tracker-data-error" class="story-tracker-error" style="display:none;"></div>
                <div class="story-tracker-settings-actions">
                    <button id="tracker-data-apply" class="story-tracker-btn story-tracker-btn-primary">Apply Changes</button>
                </div>
                <input type="file" id="tracker-data-file-input" accept=".json,.yaml,.yml" style="display:none;" />
            </div>
        </div>
    `);

    initializeSettingsTabs(modalBody);
    initializeGeneralSettings(modalBody);
    initializeDataManager(modalBody, activeFormat);

    openSettingsPopup();
}
