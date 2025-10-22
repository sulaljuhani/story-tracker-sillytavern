/**
 * Modals UI Module
 * Handles modal dialogs for adding/editing tracker elements
 */

import { extensionSettings } from '../../core/state.js';
import { saveSettings, saveChatData } from '../../core/persistence.js';
import { createSection, createSubsection, createField, generateId } from '../../core/state.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerSection} TrackerSection */
/** @typedef {import('../../types/tracker.js').TrackerSubsection} TrackerSubsection */
/** @typedef {import('../../types/tracker.js').TrackerField} TrackerField */

/**
 * Shows modal for adding a new section
 */
export function showAddSectionModal() {
    const modalHtml = `
        <div class="story-tracker-modal-body">
            <div class="form-group">
                <label for="section-name">Section Name:</label>
                <input type="text" id="section-name" placeholder="e.g., World, Characters, Plot" required>
            </div>
            <div class="form-actions">
                <button class="story-tracker-btn" id="cancel-add-section">Cancel</button>
                <button class="story-tracker-btn story-tracker-btn-primary" id="confirm-add-section">Add Section</button>
            </div>
        </div>
    `;

    showModal('Add Section', modalHtml, () => {
        setupAddSectionModalEvents();
    });
}

/**
 * Shows modal for adding a new subsection
 * @param {string} sectionId - ID of the parent section
 */
export function showAddSubsectionModal(sectionId) {
    const modalHtml = `
        <div class="story-tracker-modal-body">
            <div class="form-group">
                <label for="subsection-name">Subsection Name:</label>
                <input type="text" id="subsection-name" placeholder="e.g., {{user}}, Environment, NPCs" required>
            </div>
            <div class="form-actions">
                <button class="story-tracker-btn" id="cancel-add-subsection">Cancel</button>
                <button class="story-tracker-btn story-tracker-btn-primary" id="confirm-add-subsection" data-section-id="${sectionId}">Add Subsection</button>
            </div>
        </div>
    `;

    showModal('Add Subsection', modalHtml, () => {
        setupAddSubsectionModalEvents();
    });
}

/**
 * Shows modal for adding a new field
 * @param {string} subsectionId - ID of the parent subsection
 */
export function showAddFieldModal(subsectionId) {
    const modalHtml = `
        <div class="story-tracker-modal-body">
            <div class="form-group">
                <label for="field-name">Field Name:</label>
                <input type="text" id="field-name" placeholder="e.g., Location, Emotional State, Health" required>
            </div>
            <div class="form-group">
                <label for="field-prompt">Update Prompt:</label>
                <textarea id="field-prompt" placeholder="Describe how the AI should update this field based on story events..." required rows="3"></textarea>
            </div>
            <div class="form-group">
                <label for="field-type">Field Type:</label>
                <select id="field-type">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                </select>
            </div>
            <div class="form-actions">
                <button class="story-tracker-btn" id="cancel-add-field">Cancel</button>
                <button class="story-tracker-btn story-tracker-btn-primary" id="confirm-add-field" data-subsection-id="${subsectionId}">Add Field</button>
            </div>
        </div>
    `;

    showModal('Add Field', modalHtml, () => {
        setupAddFieldModalEvents();
    });
}

/**
 * Shows modal for editing a field
 * @param {string} fieldId - ID of the field to edit
 */
export function showEditFieldModal(fieldId) {
    const field = findFieldById(fieldId);
    if (!field) return;

    const modalHtml = `
        <div class="story-tracker-modal-body">
            <div class="form-group">
                <label for="edit-field-name">Field Name:</label>
                <input type="text" id="edit-field-name" value="${field.name}" required>
            </div>
            <div class="form-group">
                <label for="edit-field-prompt">Update Prompt:</label>
                <textarea id="edit-field-prompt" required rows="3">${field.prompt}</textarea>
            </div>
            <div class="form-group">
                <label for="edit-field-type">Field Type:</label>
                <select id="edit-field-type">
                    <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
                    <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                    <option value="boolean" ${field.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                </select>
            </div>
            <div class="form-group">
                <label for="edit-field-value">Current Value:</label>
                <input type="text" id="edit-field-value" value="${field.value || ''}" placeholder="Current field value">
            </div>
            <div class="form-actions">
                <button class="story-tracker-btn" id="cancel-edit-field">Cancel</button>
                <button class="story-tracker-btn story-tracker-btn-primary" id="confirm-edit-field" data-field-id="${fieldId}">Save Changes</button>
            </div>
        </div>
    `;

    showModal('Edit Field', modalHtml, () => {
        setupEditFieldModalEvents();
    });
}

/**
 * Shows a modal dialog
 * @param {string} title - Modal title
 * @param {string} bodyHtml - Modal body HTML
 * @param {Function} setupCallback - Callback to set up event listeners
 */
function showModal(title, bodyHtml, setupCallback) {
    const $modal = $('#story-tracker-field-modal');
    const $title = $modal.find('#field-modal-title');
    const $body = $modal.find('.story-tracker-modal-body');

    $title.text(title);
    $body.html(bodyHtml);
    $modal.show();

    if (setupCallback) {
        setupCallback();
    }
}

/**
 * Sets up event listeners for add section modal
 */
function setupAddSectionModalEvents() {
    $('#confirm-add-section').off('click').on('click', function() {
        const name = $('#section-name').val().trim();
        if (name) {
            addSection(name);
            $('#story-tracker-field-modal').hide();
        }
    });

    $('#cancel-add-section').off('click').on('click', function() {
        $('#story-tracker-field-modal').hide();
    });
}

/**
 * Sets up event listeners for add subsection modal
 */
function setupAddSubsectionModalEvents() {
    $('#confirm-add-subsection').off('click').on('click', function() {
        const sectionId = $(this).data('section-id');
        const name = $('#subsection-name').val().trim();
        if (name && sectionId) {
            addSubsection(sectionId, name);
            $('#story-tracker-field-modal').hide();
        }
    });

    $('#cancel-add-subsection').off('click').on('click', function() {
        $('#story-tracker-field-modal').hide();
    });
}

/**
 * Sets up event listeners for add field modal
 */
function setupAddFieldModalEvents() {
    $('#confirm-add-field').off('click').on('click', function() {
        const subsectionId = $(this).data('subsection-id');
        const name = $('#field-name').val().trim();
        const prompt = $('#field-prompt').val().trim();
        const type = $('#field-type').val();

        if (name && prompt && subsectionId) {
            addField(subsectionId, name, prompt, type);
            $('#story-tracker-field-modal').hide();
        }
    });

    $('#cancel-add-field').off('click').on('click', function() {
        $('#story-tracker-field-modal').hide();
    });
}

/**
 * Sets up event listeners for edit field modal
 */
function setupEditFieldModalEvents() {
    $('#confirm-edit-field').off('click').on('click', function() {
        const fieldId = $(this).data('field-id');
        const name = $('#edit-field-name').val().trim();
        const prompt = $('#edit-field-prompt').val().trim();
        const type = $('#edit-field-type').val();
        const value = $('#edit-field-value').val().trim();

        if (name && prompt && fieldId) {
            updateField(fieldId, name, prompt, type, value);
            $('#story-tracker-field-modal').hide();
        }
    });

    $('#cancel-edit-field').off('click').on('click', function() {
        $('#story-tracker-field-modal').hide();
    });
}

/**
 * Adds a new section
 * @param {string} name - Section name
 */
function addSection(name) {
    const section = createSection(name);
    extensionSettings.trackerData.sections.push(section);
    saveSettings();
    saveChatData();

    // Re-render the tracker
    import('../rendering/tracker.js').then(module => {
        module.renderTracker();
    });
}

/**
 * Adds a new subsection to a section
 * @param {string} sectionId - Parent section ID
 * @param {string} name - Subsection name
 */
function addSubsection(sectionId, name) {
    const section = findSectionById(sectionId);
    if (section) {
        const subsection = createSubsection(name);
        section.subsections.push(subsection);
        saveSettings();
        saveChatData();

        // Re-render the tracker
        import('../rendering/tracker.js').then(module => {
            module.renderTracker();
        });
    }
}

/**
 * Adds a new field to a subsection
 * @param {string} subsectionId - Parent subsection ID
 * @param {string} name - Field name
 * @param {string} prompt - Field prompt
 * @param {string} type - Field type
 */
function addField(subsectionId, name, prompt, type) {
    const subsection = findSubsectionById(subsectionId);
    if (subsection) {
        const field = createField(name, prompt, type);
        subsection.fields.push(field);
        saveSettings();
        saveChatData();

        // Re-render the tracker
        import('../rendering/tracker.js').then(module => {
            module.renderTracker();
        });
    }
}

/**
 * Updates an existing field
 * @param {string} fieldId - Field ID
 * @param {string} name - New name
 * @param {string} prompt - New prompt
 * @param {string} type - New type
 * @param {string} value - New value
 */
function updateField(fieldId, name, prompt, type, value) {
    const field = findFieldById(fieldId);
    if (field) {
        field.name = name;
        field.prompt = prompt;
        field.type = type;
        field.value = value;
        saveSettings();
        saveChatData();

        // Re-render the tracker
        import('../rendering/tracker.js').then(module => {
            module.renderTracker();
        });
    }
}

/**
 * Helper functions for finding elements
 */

function findSectionById(sectionId) {
    return extensionSettings.trackerData.sections.find(section => section.id === sectionId);
}

function findSubsectionById(subsectionId) {
    for (const section of extensionSettings.trackerData.sections) {
        const subsection = section.subsections.find(sub => sub.id === subsectionId);
        if (subsection) return subsection;
    }
    return null;
}

function findFieldById(fieldId) {
    for (const section of extensionSettings.trackerData.sections) {
        for (const subsection of section.subsections) {
            const field = subsection.fields.find(f => f.id === fieldId);
            if (field) return field;
        }
    }
    return null;
}
