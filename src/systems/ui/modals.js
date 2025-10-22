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
            // Import and call the add section function
            import('../rendering/tracker.js').then(module => {
                if (module.addSection) {
                    module.addSection(sectionName);
                    closeSettingsPopup();
                }
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
                <button class="story-tracker-btn story-tracker-btn-primary" onclick="addNewField('${subsectionId}')">Add Field</button>
            </div>
        </div>
    `);

    // Make functions available globally for onclick handlers
    window.closeFieldPopup = closeFieldPopup;
    window.addNewField = (subsectionId) => {
        const fieldName = $('#field-name').val().trim();
        const fieldType = $('#field-type').val();
        if (fieldName) {
            // Import and call the add field function
            import('../rendering/tracker.js').then(module => {
                if (module.addField) {
                    module.addField(subsectionId, fieldName, fieldType);
                    closeFieldPopup();
                }
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
                    const newValue = $('#edit-field-value').val().trim();
                    if (newName) {
                        // Import and call the update field function
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
    const modalBody = $('#story-tracker-settings-modal .story-tracker-modal-body');
    modalBody.html(`
        <div style="padding: 1rem;">
            <h4>Story Tracker Settings</h4>
            <div style="margin: 1rem 0;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Update Depth:</label>
                <input type="number" id="update-depth" value="${extensionSettings.updateDepth || 4}" min="1" max="20" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                <small style="display: block; margin-top: 0.25rem; color: #666;">Number of recent messages to include in AI updates (1-20)</small>
            </div>
            <div style="margin: 1rem 0;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Generation Mode:</label>
                <select id="generation-mode" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="together" ${extensionSettings.generationMode === 'together' ? 'selected' : ''}>Together (with chat)</option>
                    <option value="separate" ${extensionSettings.generationMode === 'separate' ? 'selected' : ''}>Separate (dedicated calls)</option>
                </select>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="story-tracker-btn" onclick="closeSettingsPopup()">Cancel</button>
                <button class="story-tracker-btn story-tracker-btn-primary" onclick="saveSettingsModal()">Save Settings</button>
            </div>
        </div>
    `);

    // Make functions available globally for onclick handlers
    window.closeSettingsPopup = closeSettingsPopup;
    window.saveSettingsModal = () => {
        const updateDepth = parseInt($('#update-depth').val());
        const generationMode = $('#generation-mode').val();

        if (updateDepth >= 1 && updateDepth <= 20) {
            extensionSettings.updateDepth = updateDepth;
            extensionSettings.generationMode = generationMode;
            saveSettings();
            closeSettingsPopup();
        }
    };

    openSettingsPopup();
}
