/**
 * Tracker Rendering Module
 * Handles rendering of the story tracker UI
 */

import { extensionSettings, $sectionsContainer, createSection, createSubsection, createField } from '../../core/state.js';
import { saveSettings, saveChatData } from '../../core/persistence.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerSection} TrackerSection */
/** @typedef {import('../../types/tracker.js').TrackerSubsection} TrackerSubsection */
/** @typedef {import('../../types/tracker.js').TrackerField} TrackerField */

/**
 * Renders the complete tracker UI
 */
export function renderTracker() {
    if (!$sectionsContainer) {
        console.warn('[Story Tracker] Sections container not found');
        return;
    }

    const trackerData = extensionSettings.trackerData;

    if (!trackerData || !trackerData.sections) {
        $sectionsContainer.html('<div class="story-tracker-empty">No tracker data. Add a section to get started.</div>');
        return;
    }

    let html = '';

    for (const section of trackerData.sections) {
        html += renderSection(section);
    }

    $sectionsContainer.html(html);

    // Attach event listeners
    attachSectionEventListeners();
    attachSubsectionEventListeners();
    attachFieldEventListeners();
}

/**
 * Renders a single section
 * @param {TrackerSection} section - Section to render
 * @returns {string} HTML string
 */
export function renderSection(section) {
    const collapsedClass = section.collapsed ? 'collapsed' : '';
    const subsectionsHtml = section.subsections.map(subsection => renderSubsection(subsection)).join('');

    return `
        <div class="story-tracker-section" data-section-id="${section.id}">
            <div class="story-tracker-section-header ${collapsedClass}">
                <div class="story-tracker-section-toggle">
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="story-tracker-section-title" contenteditable="true" data-section-id="${section.id}">${section.name}</div>
                <div class="story-tracker-section-actions">
                    <button class="story-tracker-btn story-tracker-btn-small" data-action="add-subsection" data-section-id="${section.id}" title="Add Subsection">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button class="story-tracker-btn story-tracker-btn-small story-tracker-btn-danger" data-action="delete-section" data-section-id="${section.id}" title="Delete Section">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="story-tracker-section-content" style="display: ${section.collapsed ? 'none' : 'block'}">
                ${subsectionsHtml}
            </div>
        </div>
    `;
}

/**
 * Renders a single subsection
 * @param {TrackerSubsection} subsection - Subsection to render
 * @returns {string} HTML string
 */
export function renderSubsection(subsection) {
    const collapsedClass = subsection.collapsed ? 'collapsed' : '';
    const fieldsHtml = (subsection.fields || []).map(field => renderField(field)).join('');
    const contentHtml = fieldsHtml || '<div class="story-tracker-empty">No fields yet. Click the plus button to add one.</div>';

    return `
        <div class="story-tracker-subsection" data-subsection-id="${subsection.id}">
            <div class="story-tracker-subsection-header ${collapsedClass}">
                <div class="story-tracker-subsection-toggle">
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
                <div class="story-tracker-subsection-title" contenteditable="true" data-subsection-id="${subsection.id}">${subsection.name}</div>
                <div class="story-tracker-subsection-actions">
                    <button class="story-tracker-btn story-tracker-btn-small" data-action="add-field" data-subsection-id="${subsection.id}" title="Add Field">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button class="story-tracker-btn story-tracker-btn-small story-tracker-btn-danger" data-action="delete-subsection" data-subsection-id="${subsection.id}" title="Delete Subsection">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="story-tracker-subsection-content" style="display: ${subsection.collapsed ? 'none' : 'block'}">
                ${contentHtml}
            </div>
        </div>
    `;
}

/**
 * Renders a single field
 * @param {TrackerField} field - Field to render
 * @returns {string} HTML string
 */
export function renderField(field) {
    const enabledClass = field.enabled ? 'enabled' : 'disabled';
    const fieldTypeIcon = getFieldTypeIcon(field.type);

    return `
        <div class="story-tracker-field ${enabledClass}" data-field-id="${field.id}">
            <div class="story-tracker-field-header">
                <div class="story-tracker-field-toggle">
                    <input type="checkbox" ${field.enabled ? 'checked' : ''} data-field-id="${field.id}" title="Enable/Disable Field">
                </div>
                <div class="story-tracker-field-icon">
                    <i class="${fieldTypeIcon}"></i>
                </div>
                <div class="story-tracker-field-name" contenteditable="true" data-field-id="${field.id}">${field.name}</div>
                <div class="story-tracker-field-actions">
                    <button class="story-tracker-btn story-tracker-btn-small" data-action="edit-field" data-field-id="${field.id}" title="Edit Field">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="story-tracker-btn story-tracker-btn-small story-tracker-btn-danger" data-action="delete-field" data-field-id="${field.id}" title="Delete Field">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="story-tracker-field-value" contenteditable="true" data-field-id="${field.id}" title="Click to edit value">${field.value || 'Not set'}</div>
        </div>
    `;
}

/**
 * Gets the icon class for a field type
 * @param {string} type - Field type
 * @returns {string} Icon class
 */
function getFieldTypeIcon(type) {
    switch (type) {
        case 'number':
            return 'fa-solid fa-hashtag';
        case 'boolean':
            return 'fa-solid fa-toggle-on';
        default:
            return 'fa-solid fa-font';
    }
}

/**
 * Attaches event listeners for section interactions
 */
function attachSectionEventListeners() {
    // Section toggle collapse/expand
    $('.story-tracker-section-toggle').off('click').on('click', function() {
        const $section = $(this).closest('.story-tracker-section');
        const sectionId = $section.data('section-id');
        toggleSectionCollapse(sectionId);
    });

    // Section title editing
    $('.story-tracker-section-title').off('blur').on('blur', function() {
        const sectionId = $(this).data('section-id');
        const newName = $(this).text().trim();
        updateSectionName(sectionId, newName);
    });

    // Add subsection button
    $('[data-action="add-subsection"]').off('click').on('click', function() {
        const sectionId = $(this).data('section-id');
        showAddSubsectionModal(sectionId);
    });

    // Delete section button
    $('[data-action="delete-section"]').off('click').on('click', function() {
        const sectionId = $(this).data('section-id');
        deleteSection(sectionId);
    });
}

/**
 * Attaches event listeners for subsection interactions
 */
function attachSubsectionEventListeners() {
    // Subsection toggle collapse/expand
    $('.story-tracker-subsection-toggle').off('click').on('click', function() {
        const $subsection = $(this).closest('.story-tracker-subsection');
        const subsectionId = $subsection.data('subsection-id');
        toggleSubsectionCollapse(subsectionId);
    });

    // Subsection title editing
    $('.story-tracker-subsection-title').off('blur').on('blur', function() {
        const subsectionId = $(this).data('subsection-id');
        const newName = $(this).text().trim();
        updateSubsectionName(subsectionId, newName);
    });

    // Add field button
    $('[data-action="add-field"]').off('click').on('click', function() {
        const subsectionId = $(this).data('subsection-id');
        showAddFieldModal(subsectionId);
    });

    // Delete subsection button
    $('[data-action="delete-subsection"]').off('click').on('click', function() {
        const subsectionId = $(this).data('subsection-id');
        deleteSubsection(subsectionId);
    });
}

/**
 * Attaches event listeners for field interactions
 */
function attachFieldEventListeners() {
    // Field enable/disable toggle
    $('.story-tracker-field-toggle input').off('change').on('change', function() {
        const fieldId = $(this).data('field-id');
        const enabled = $(this).prop('checked');
        toggleFieldEnabled(fieldId, enabled);
    });

    // Field name editing
    $('.story-tracker-field-name').off('blur').on('blur', function() {
        const fieldId = $(this).data('field-id');
        const newName = $(this).text().trim();
        updateFieldName(fieldId, newName);
    });

    // Field value editing
    $('.story-tracker-field-value').off('blur').on('blur', function() {
        const fieldId = $(this).data('field-id');
        const newValue = $(this).text().trim();
        updateFieldValue(fieldId, newValue);
    });

    // Edit field button
    $('[data-action="edit-field"]').off('click').on('click', function() {
        const fieldId = $(this).data('field-id');
        showEditFieldModal(fieldId);
    });

    // Delete field button
    $('[data-action="delete-field"]').off('click').on('click', function() {
        const fieldId = $(this).data('field-id');
        deleteField(fieldId);
    });
}

/**
 * Section action functions
 */

function toggleSectionCollapse(sectionId) {
    const section = findSectionById(sectionId);
    if (section) {
        section.collapsed = !section.collapsed;
        saveSettings();
        renderTracker();
    }
}

function updateSectionName(sectionId, newName) {
    if (!newName) return;

    const section = findSectionById(sectionId);
    if (section) {
        section.name = newName;
        saveSettings();
        saveChatData();
    }
}

function deleteSection(sectionId) {
    if (!confirm('Are you sure you want to delete this section and all its contents?')) {
        return;
    }

    extensionSettings.trackerData.sections = extensionSettings.trackerData.sections.filter(
        section => section.id !== sectionId
    );
    saveSettings();
    saveChatData();
    renderTracker();
}

/**
 * Subsection action functions
 */

function toggleSubsectionCollapse(subsectionId) {
    const subsection = findSubsectionById(subsectionId);
    if (subsection) {
        subsection.collapsed = !subsection.collapsed;
        saveSettings();
        renderTracker();
    }
}

function updateSubsectionName(subsectionId, newName) {
    if (!newName) return;

    const subsection = findSubsectionById(subsectionId);
    if (subsection) {
        subsection.name = newName;
        saveSettings();
        saveChatData();
    }
}

function deleteSubsection(subsectionId) {
    if (!confirm('Are you sure you want to delete this subsection and all its fields?')) {
        return;
    }

    for (const section of extensionSettings.trackerData.sections) {
        section.subsections = section.subsections.filter(
            subsection => subsection.id !== subsectionId
        );
    }
    saveSettings();
    saveChatData();
    renderTracker();
}

/**
 * Field action functions
 */

function toggleFieldEnabled(fieldId, enabled) {
    const field = findFieldById(fieldId);
    if (field) {
        field.enabled = enabled;
        saveSettings();
        saveChatData();
        renderTracker();
    }
}

function updateFieldName(fieldId, newName) {
    if (!newName) return;

    const field = findFieldById(fieldId);
    if (field) {
        field.name = newName;
        saveSettings();
        saveChatData();
    }
}

function updateFieldValue(fieldId, newValue) {
    const field = findFieldById(fieldId);
    if (field) {
        field.value = newValue;
        saveSettings();
        saveChatData();
    }
}

function deleteField(fieldId) {
    if (!confirm('Are you sure you want to delete this field?')) {
        return;
    }

    for (const section of extensionSettings.trackerData.sections) {
        for (const subsection of section.subsections) {
            subsection.fields = subsection.fields.filter(
                field => field.id !== fieldId
            );
        }
    }
    saveSettings();
    saveChatData();
    renderTracker();
}


function ensureTrackerData() {
    if (!extensionSettings.trackerData) {
        extensionSettings.trackerData = { sections: [] };
    }
    if (!Array.isArray(extensionSettings.trackerData.sections)) {
        extensionSettings.trackerData.sections = [];
    }

    for (const section of extensionSettings.trackerData.sections) {
        if (!Array.isArray(section.subsections)) {
            section.subsections = [];
        }
        for (const subsection of section.subsections) {
            if (!Array.isArray(subsection.fields)) {
                subsection.fields = [];
            }
        }
    }
}

export function addSection(name) {
    ensureTrackerData();
    const sectionName = (typeof name === 'string' && name.trim()) ? name.trim() : 'New Section';
    const section = createSection(sectionName);

    if (!Array.isArray(section.subsections)) {
        section.subsections = [];
    }

    // Provide an initial subsection so users can add fields immediately
    if (section.subsections.length === 0) {
        const defaultSubsection = createSubsection('Story Elements');
        section.subsections.push(defaultSubsection);
    }

    extensionSettings.trackerData.sections.push(section);
    saveSettings();
    saveChatData();
    renderTracker();
    return section.id;
}

export function addSubsection(sectionId, name) {
    ensureTrackerData();
    const section = findSectionById(sectionId);
    if (!section) {
        console.warn('[Story Tracker] addSubsection: Section not found', sectionId);
        return null;
    }

    if (!Array.isArray(section.subsections)) {
        section.subsections = [];
    }

    const subsectionName = (typeof name === 'string' && name.trim()) ? name.trim() : 'New Subsection';
    const subsection = createSubsection(subsectionName);
    section.subsections.push(subsection);
    saveSettings();
    saveChatData();
    renderTracker();
    return subsection.id;
}

export function addField(subsectionId, name, type = 'text') {
    ensureTrackerData();
    const subsection = findSubsectionById(subsectionId);
    if (!subsection) {
        console.warn('[Story Tracker] addField: Subsection not found', subsectionId);
        return null;
    }

    if (!Array.isArray(subsection.fields)) {
        subsection.fields = [];
    }

    const fieldName = (typeof name === 'string' && name.trim()) ? name.trim() : 'New Field';
    const fieldType = type || 'text';
    const field = createField(fieldName, '', fieldType);
    subsection.fields.push(field);
    saveSettings();
    saveChatData();
    renderTracker();
    return field.id;
}

/**
 * Modal functions (placeholders - will be implemented in UI module)
 */

function showAddSubsectionModal(sectionId) {
    import('../ui/modals.js').then(module => {
        module.showAddSubsectionModal(sectionId);
    });
}

function showAddFieldModal(subsectionId) {
    import('../ui/modals.js').then(module => {
        module.showAddFieldModal(subsectionId);
    });
}

function showEditFieldModal(fieldId) {
    import('../ui/modals.js').then(module => {
        module.showEditFieldModal(fieldId);
    });
}

/**
 * Helper functions for finding elements
 */

function findSectionById(sectionId) {
    ensureTrackerData();
    return extensionSettings.trackerData.sections.find(section => section.id === sectionId);
}

function findSubsectionById(subsectionId) {
    ensureTrackerData();
    for (const section of extensionSettings.trackerData.sections) {
        const subsection = (section.subsections || []).find(sub => sub.id === subsectionId);
        if (subsection) return subsection;
    }
    return null;
}

function findFieldById(fieldId) {
    ensureTrackerData();
    for (const section of extensionSettings.trackerData.sections) {
        for (const subsection of section.subsections || []) {
            const field = (subsection.fields || []).find(f => f.id === fieldId);
            if (field) return field;
        }
    }
    return null;
}

export function getFieldById(fieldId) {
    return findFieldById(fieldId);
}
