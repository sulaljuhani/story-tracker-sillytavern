/**
 * Tracker Rendering Module
 * Handles rendering of the story tracker UI
 */

import { extensionSettings, $sectionsContainer, createSection, createSubsection, createField, syncTrackerBaselines } from '../../core/state.js';
import { escapeHtml } from '../../core/sanitize.js';
import { saveSettings, saveChatData } from '../../core/persistence.js';

// Type imports
/** @typedef {import('../../types/tracker.js').TrackerSection} TrackerSection */
/** @typedef {import('../../types/tracker.js').TrackerSubsection} TrackerSubsection */
/** @typedef {import('../../types/tracker.js').TrackerField} TrackerField */

const dragState = {
    type: null,
    sectionId: null,
    fieldId: null,
    sourceSectionId: null,
    sourceSubsectionId: null,
};

let sectionDragContainer = null;
const ACTIVE_ELEMENT_SELECTOR = '.story-tracker-section-header, .story-tracker-subsection-header, .story-tracker-field';
const supportsPointerEvents = typeof window !== 'undefined' && typeof window.PointerEvent !== 'undefined';
let activeInteractiveElement = null;
let activeStateDocumentHandlerRegistered = false;
let cachedHoverSupport = null;

function resetDragState() {
    dragState.type = null;
    dragState.sectionId = null;
    dragState.fieldId = null;
    dragState.sourceSectionId = null;
    dragState.sourceSubsectionId = null;
}

function isInteractiveElement(target) {
    if (!target) {
        return false;
    }
    return Boolean(target.closest('button, a, input, textarea, select'));
}

function isTrackerToggleElement(target) {
    if (!target) {
        return false;
    }
    return Boolean(target.closest('.story-tracker-section-toggle, .story-tracker-subsection-toggle'));
}

function deviceSupportsHover() {
    if (cachedHoverSupport !== null) {
        return cachedHoverSupport;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        cachedHoverSupport = false;
        return cachedHoverSupport;
    }

    try {
        if (window.matchMedia('(any-hover: hover)').matches) {
            cachedHoverSupport = true;
            return cachedHoverSupport;
        }
        if (window.matchMedia('(hover: hover)').matches && !window.matchMedia('(any-pointer: coarse)').matches) {
            cachedHoverSupport = true;
            return cachedHoverSupport;
        }
    } catch (error) {
        // Some browsers may throw for unsupported media queries; treat as no hover support.
    }

    cachedHoverSupport = false;
    return cachedHoverSupport;
}

function shouldActivateForInputType(inputType) {
    if (!inputType || inputType === 'touch' || inputType === 'pen') {
        return true;
    }
    if (inputType === 'mouse') {
        return !deviceSupportsHover();
    }
    return false;
}

function focusInteractiveContainer(element) {
    if (typeof element.focus !== 'function' || element.tabIndex < 0) {
        return;
    }

    if (element.matches(':focus')) {
        return;
    }

    try {
        element.focus({ preventScroll: true });
    } catch (error) {
        element.focus();
    }
}

function clearActiveInteractiveElement() {
    if (activeInteractiveElement) {
        activeInteractiveElement.classList.remove('is-active');
        delete activeInteractiveElement.dataset.skipNextToggle;
        activeInteractiveElement = null;
    }
}

function setActiveInteractiveElement(element) {
    if (!element || activeInteractiveElement === element) {
        return;
    }

    clearActiveInteractiveElement();
    activeInteractiveElement = element;
    activeInteractiveElement.classList.add('is-active');
}

function handleDocumentInteraction(event) {
    if (!activeInteractiveElement) {
        return;
    }

    const target = event.target;
    if (!target) {
        clearActiveInteractiveElement();
        return;
    }

    if (activeInteractiveElement.contains(target)) {
        return;
    }

    if (target.closest(ACTIVE_ELEMENT_SELECTOR)) {
        return;
    }

    clearActiveInteractiveElement();
}

function registerActiveStateDocumentHandlers() {
    if (activeStateDocumentHandlerRegistered || typeof document === 'undefined') {
        return;
    }

    if (supportsPointerEvents) {
        document.addEventListener('pointerdown', handleDocumentInteraction);
    } else {
        document.addEventListener('mousedown', handleDocumentInteraction);
        document.addEventListener('touchstart', handleDocumentInteraction);
    }

    activeStateDocumentHandlerRegistered = true;
}

function handleActiveStateActivation(event, inputType) {
    const element = event.currentTarget;
    if (!element) {
        return;
    }

    if (inputType === 'mouse' && 'button' in event && event.button !== 0) {
        return;
    }

    if (inputType === 'touch' && 'touches' in event && event.touches.length > 1) {
        return;
    }

    if (isInteractiveElement(event.target) || isTrackerToggleElement(event.target)) {
        return;
    }

    if (!shouldActivateForInputType(inputType)) {
        return;
    }

    if (activeInteractiveElement === element) {
        clearActiveInteractiveElement();
        return;
    }

    setActiveInteractiveElement(element);
    focusInteractiveContainer(element);

    if (element.classList.contains('story-tracker-subsection-header')) {
        element.dataset.skipNextToggle = '1';
    }
}

function handleActiveStatePointerDown(event) {
    const pointerType = (event.pointerType || '').toLowerCase();
    handleActiveStateActivation(event, pointerType);
}

function handleActiveStateMouseDown(event) {
    handleActiveStateActivation(event, 'mouse');
}

function handleActiveStateTouchStart(event) {
    handleActiveStateActivation(event, 'touch');
}

function handleActiveStateFocusIn(event) {
    const element = event.currentTarget;
    if (!element) {
        return;
    }
    setActiveInteractiveElement(element);
}

function handleActiveStateFocusOut(event) {
    const element = event.currentTarget;
    if (!element) {
        return;
    }

    const nextFocused = event.relatedTarget;
    if (nextFocused && element.contains(nextFocused)) {
        return;
    }

    if (activeInteractiveElement === element) {
        clearActiveInteractiveElement();
    }
}

function bindActiveStateHandlers(element) {
    if (!element || element.dataset.activeStateBound) {
        return;
    }

    element.dataset.activeStateBound = '1';

    if (supportsPointerEvents) {
        element.addEventListener('pointerdown', handleActiveStatePointerDown);
    } else {
        element.addEventListener('mousedown', handleActiveStateMouseDown);
        element.addEventListener('touchstart', handleActiveStateTouchStart);
    }

    element.addEventListener('focusin', handleActiveStateFocusIn);
    element.addEventListener('focusout', handleActiveStateFocusOut);
}

function initializeActiveStateInteractions() {
    if (typeof document === 'undefined') {
        return;
    }

    const container = document.getElementById('story-tracker-sections');
    if (!container) {
        return;
    }

    const interactiveElements = Array.from(container.querySelectorAll(ACTIVE_ELEMENT_SELECTOR));
    interactiveElements.forEach(bindActiveStateHandlers);
    registerActiveStateDocumentHandlers();
}

/**
 * Renders the complete tracker UI
 */
export function renderTracker() {
    if (!$sectionsContainer) {
        console.warn('[Story Tracker] Sections container not initialized');
        return;
    }

    if ($sectionsContainer.length === 0) {
        console.warn('[Story Tracker] Sections container not mounted in DOM');
        return;
    }

    const trackerData = extensionSettings.trackerData;

    if (!trackerData || !trackerData.sections || trackerData.sections.length === 0) {
        clearActiveInteractiveElement();
        $sectionsContainer.html('<div class="story-tracker-empty">No tracker data. Add a section or load a template to get started.</div>');
        return;
    }

    clearActiveInteractiveElement();

    let html = '';

    for (const section of trackerData.sections) {
        html += renderSection(section);
    }

    $sectionsContainer.html(html);
    console.log('[Story Tracker] Rendered sections', { count: trackerData.sections.length });

    // Attach event listeners
    attachSectionEventListeners();
    attachSubsectionEventListeners();
    attachFieldEventListeners();
    initializeDragAndDrop();
    initializeActiveStateInteractions();
}

/**
 * Renders a single section
 * @param {TrackerSection} section - Section to render
 * @returns {string} HTML string
 */
export function renderSection(section) {
    const collapsedClass = section.collapsed ? 'collapsed' : '';
    const fieldsHtml = (section.fields || []).map(field => renderField(field)).join('');
    const subsectionsHtml = (section.subsections || []).map(subsection => renderSubsection(subsection)).join('');
    const contentHtml = (fieldsHtml || subsectionsHtml) ? (fieldsHtml + subsectionsHtml) : '<div class="story-tracker-empty">No story elements yet. Click the plus button to add one.</div>';

    return `
        <div class="story-tracker-section" data-section-id="${section.id}">
            <div class="story-tracker-section-header ${collapsedClass}" draggable="true" data-section-id="${section.id}" tabindex="0">
                <div class="story-tracker-section-toggle">
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="story-tracker-section-title" contenteditable="true" data-section-id="${section.id}">${escapeHtml(section.name)}</div>
                <div class="story-tracker-section-actions">
                    <button class="story-tracker-btn story-tracker-btn-small" data-action="add-subsection" data-section-id="${section.id}" title="Add Subsection">
                        <i class="fa-solid fa-folder-plus"></i>
                    </button>
                    <button class="story-tracker-btn story-tracker-btn-small" data-action="add-field" data-section-id="${section.id}" title="Add Story Element">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button class="story-tracker-btn story-tracker-btn-small story-tracker-btn-danger" data-action="delete-section" data-section-id="${section.id}" title="Delete Section">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="story-tracker-section-content" data-section-id="${section.id}" style="display: ${section.collapsed ? 'none' : 'block'}">
                ${contentHtml}
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
            <div class="story-tracker-subsection-header ${collapsedClass}" tabindex="0">
                <div class="story-tracker-subsection-toggle">
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
                <div class="story-tracker-subsection-title" contenteditable="true" data-subsection-id="${subsection.id}">${escapeHtml(subsection.name)}</div>
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
    const value = field.value ?? '...';
    const displayValue = value === '' ? '...' : value;

    return `
        <div class="story-tracker-field ${enabledClass}" data-field-id="${field.id}" draggable="true" tabindex="0">
            <div class="story-tracker-field-name">${escapeHtml(field.name)}:</div>
            <div class="story-tracker-field-value">${escapeHtml(displayValue)}</div>
            <div class="story-tracker-field-actions">
                <button class="story-tracker-btn story-tracker-btn-small" data-action="edit-field" data-field-id="${field.id}" title="Edit Story Element">
                    <i class="fa-solid fa-edit"></i>
                </button>
                <button class="story-tracker-btn story-tracker-btn-small story-tracker-btn-danger" data-action="delete-field" data-field-id="${field.id}" title="Delete Story Element">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Gets the icon class for a field type
 * @param {string} type - Field type
 * @returns {string} Icon class
 */
function getFieldTypeIcon(type) {
    return 'fa-solid fa-font';
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
    $('.story-tracker-subsection-header').off('click').on('click', function(event) {
        const headerEl = this;
        if (headerEl.dataset.skipNextToggle === '1') {
            delete headerEl.dataset.skipNextToggle;
            return;
        }
        if (isInteractiveElement(event.target)) {
            return;
        }
        delete headerEl.dataset.skipNextToggle;
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

    // Add field button for subsections
    $('[data-action="add-field"][data-subsection-id]').off('click').on('click', function() {
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
    // Add field button for sections only (avoid rebinding subsection handlers)
    const $sectionAddButtons = $('[data-action="add-field"][data-section-id]:not([data-subsection-id])');
    $sectionAddButtons
        .off('click.story-tracker-section-add-field')
        .on('click.story-tracker-section-add-field', function() {
            const sectionId = $(this).data('section-id');
            showAddFieldModal(sectionId);
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
 * Initializes drag-and-drop functionality for sections and fields.
 */
function initializeDragAndDrop() {
    const sectionsContainerEl = document.getElementById('story-tracker-sections');
    if (!sectionsContainerEl || sectionsContainerEl.children.length === 0) {
        return;
    }

    setupSectionDragAndDrop(sectionsContainerEl);
    setupFieldDragAndDrop(sectionsContainerEl);
}

function setupSectionDragAndDrop(container) {
    sectionDragContainer = container;

    if (!container.dataset.sectionDragHandlers) {
        container.addEventListener('dragover', handleSectionContainerDragOver);
        container.addEventListener('drop', handleSectionContainerDrop);
        container.addEventListener('dragleave', handleSectionContainerDragLeave);
        container.dataset.sectionDragHandlers = '1';
    }

    const headers = Array.from(container.querySelectorAll('.story-tracker-section-header'));
    headers.forEach(header => {
        header.setAttribute('draggable', 'true');
        header.addEventListener('dragstart', handleSectionDragStart);
        header.addEventListener('dragend', handleSectionDragEnd);
    });
}

function handleSectionDragStart(event) {
    if (isInteractiveElement(event.target)) {
        event.preventDefault();
        return;
    }

    const headerEl = event.currentTarget;
    const sectionEl = headerEl.closest('.story-tracker-section');
    if (!sectionEl) {
        return;
    }

    clearActiveInteractiveElement();

    dragState.type = 'section';
    dragState.sectionId = sectionEl.getAttribute('data-section-id');

    try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', dragState.sectionId || '');
    } catch (error) {
        // Some browsers may throw when setting dataTransfer in certain contexts.
    }

    headerEl.classList.add('story-tracker-dragging');
    sectionEl.classList.add('story-tracker-dragging');
}

function handleSectionDragEnd(event) {
    const headerEl = event.currentTarget;
    const sectionEl = headerEl.closest('.story-tracker-section');
    if (sectionEl) {
        sectionEl.classList.remove('story-tracker-dragging');
    }
    headerEl.classList.remove('story-tracker-dragging');

    if (sectionDragContainer) {
        clearSectionDropIndicators(sectionDragContainer);
    }

    resetDragState();
}

function handleSectionContainerDragOver(event) {
    if (dragState.type !== 'section') {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget;
    const position = computeSectionInsertPosition(container, event.clientY, dragState.sectionId);
    updateSectionDropIndicators(container, position.reference);
}

function handleSectionContainerDrop(event) {
    if (dragState.type !== 'section') {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget;
    const position = computeSectionInsertPosition(container, event.clientY, dragState.sectionId);
    moveSectionInTracker(dragState.sectionId, position.insertIndex);
    clearSectionDropIndicators(container);
    resetDragState();
}

function handleSectionContainerDragLeave(event) {
    if (dragState.type !== 'section') {
        return;
    }

    const container = event.currentTarget;
    if (!container.contains(event.relatedTarget)) {
        clearSectionDropIndicators(container);
    }
}

function computeSectionInsertPosition(container, pointerY, excludeSectionId) {
    const sections = Array.from(container.querySelectorAll('.story-tracker-section'));
    const filtered = sections.filter(section => section.getAttribute('data-section-id') !== excludeSectionId);

    let insertIndex = filtered.length;
    let reference = null;

    for (let index = 0; index < filtered.length; index += 1) {
        const candidate = filtered[index];
        const rect = candidate.getBoundingClientRect();
        if (pointerY < rect.top + rect.height / 2) {
            insertIndex = index;
            reference = candidate;
            break;
        }
    }

    return { insertIndex, reference };
}

function updateSectionDropIndicators(container, referenceElement) {
    const sections = Array.from(container.querySelectorAll('.story-tracker-section'));
    sections.forEach(section => {
        section.classList.toggle('story-tracker-drop-before', section === referenceElement);
    });

    container.classList.toggle('story-tracker-drop-at-end', !referenceElement && dragState.type === 'section');
}

function clearSectionDropIndicators(container) {
    container.classList.remove('story-tracker-drop-at-end');
    Array.from(container.querySelectorAll('.story-tracker-section')).forEach(section => {
        section.classList.remove('story-tracker-drop-before', 'story-tracker-dragging');
        const header = section.querySelector('.story-tracker-section-header');
        if (header) {
            header.classList.remove('story-tracker-dragging');
        }
    });
}

function moveSectionInTracker(sectionId, insertIndex) {
    ensureTrackerData();
    const sections = extensionSettings.trackerData.sections || [];
    const currentIndex = sections.findIndex(section => section.id === sectionId);

    if (currentIndex === -1) {
        return;
    }

    const [movedSection] = sections.splice(currentIndex, 1);
    const clampedIndex = Math.max(0, Math.min(insertIndex, sections.length));
    sections.splice(clampedIndex, 0, movedSection);
    saveSettings();
    syncTrackerBaselines();
    saveChatData();
    renderTracker();
}

function setupFieldDragAndDrop(container) {
    const sectionElements = Array.from(container.querySelectorAll('.story-tracker-section'));

    sectionElements.forEach(sectionEl => {
        const sectionId = sectionEl.getAttribute('data-section-id');
        const sectionContentEl = sectionEl.querySelector('.story-tracker-section-content');
        if (!sectionId || !sectionContentEl) {
            return;
        }

        sectionContentEl.dataset.sectionId = sectionId;
        initializeFieldDragContainer(sectionContentEl);

        const subsectionContents = Array.from(sectionEl.querySelectorAll('.story-tracker-subsection-content'));
        subsectionContents.forEach(subsectionContentEl => {
            const subsectionEl = subsectionContentEl.closest('.story-tracker-subsection');
            const subsectionId = subsectionEl ? subsectionEl.getAttribute('data-subsection-id') : null;
            if (!subsectionId) {
                return;
            }

            subsectionContentEl.dataset.sectionId = sectionId;
            subsectionContentEl.dataset.subsectionId = subsectionId;
            initializeFieldDragContainer(subsectionContentEl);
        });
    });
}

function initializeFieldDragContainer(contentEl) {
    if (!contentEl.dataset.fieldDragHandlers) {
        contentEl.addEventListener('dragover', handleFieldContainerDragOver);
        contentEl.addEventListener('drop', handleFieldContainerDrop);
        contentEl.addEventListener('dragleave', handleFieldContainerDragLeave);
        contentEl.dataset.fieldDragHandlers = '1';
    }

    const fields = getFieldsForContainer(contentEl);
    fields.forEach(fieldEl => {
        fieldEl.setAttribute('draggable', 'true');
        fieldEl.addEventListener('dragstart', handleFieldDragStart);
        fieldEl.addEventListener('dragend', handleFieldDragEnd);
    });
}

function handleFieldDragStart(event) {
    if (isInteractiveElement(event.target)) {
        event.preventDefault();
        return;
    }

    const fieldEl = event.currentTarget;
    const sectionEl = fieldEl.closest('.story-tracker-section');
    if (!sectionEl) {
        return;
    }

    clearActiveInteractiveElement();

    dragState.type = 'field';
    dragState.fieldId = fieldEl.getAttribute('data-field-id');
    dragState.sourceSectionId = sectionEl.getAttribute('data-section-id');
    const subsectionEl = fieldEl.closest('.story-tracker-subsection');
    dragState.sourceSubsectionId = subsectionEl ? subsectionEl.getAttribute('data-subsection-id') : null;

    try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', dragState.fieldId || '');
    } catch (error) {
        // Ignore browsers that disallow setting dataTransfer in certain contexts.
    }

    fieldEl.classList.add('story-tracker-dragging');
    event.stopPropagation();
}

function handleFieldDragEnd(event) {
    const fieldEl = event.currentTarget;
    fieldEl.classList.remove('story-tracker-dragging');
    const subsectionContainer = fieldEl.closest('.story-tracker-subsection-content');
    if (subsectionContainer) {
        clearFieldDropIndicators(subsectionContainer);
    } else {
        const sectionContainer = fieldEl.closest('.story-tracker-section-content');
        if (sectionContainer) {
            clearFieldDropIndicators(sectionContainer);
        }
    }
    resetDragState();
}

function handleFieldContainerDragOver(event) {
    if (dragState.type !== 'field') {
        return;
    }

    const container = event.currentTarget;
    const containerSectionId = container.dataset.sectionId;
    const containerSubsectionId = container.dataset.subsectionId || null;
    if (containerSectionId !== dragState.sourceSectionId) {
        return;
    }

    if ((dragState.sourceSubsectionId || null) !== containerSubsectionId) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const position = computeFieldInsertPosition(container, event.clientY, dragState.fieldId);
    updateFieldDropIndicators(container, position.reference);
}

function handleFieldContainerDrop(event) {
    if (dragState.type !== 'field') {
        return;
    }

    const container = event.currentTarget;
    const containerSectionId = container.dataset.sectionId;
    const containerSubsectionId = container.dataset.subsectionId || null;
    if (containerSectionId !== dragState.sourceSectionId) {
        return;
    }

    if ((dragState.sourceSubsectionId || null) !== containerSubsectionId) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const position = computeFieldInsertPosition(container, event.clientY, dragState.fieldId);
    moveFieldWithinContainer(dragState.sourceSectionId, dragState.sourceSubsectionId, dragState.fieldId, position.insertIndex);
    clearFieldDropIndicators(container);
    resetDragState();
}

function handleFieldContainerDragLeave(event) {
    if (dragState.type !== 'field') {
        return;
    }

    const container = event.currentTarget;
    const containerSectionId = container.dataset.sectionId;
    const containerSubsectionId = container.dataset.subsectionId || null;
    if (containerSectionId !== dragState.sourceSectionId) {
        return;
    }

    if ((dragState.sourceSubsectionId || null) !== containerSubsectionId) {
        return;
    }

    if (!container.contains(event.relatedTarget)) {
        clearFieldDropIndicators(container);
    }
}

function computeFieldInsertPosition(container, pointerY, excludeFieldId) {
    const filtered = getFieldsForContainer(container).filter(field => field.getAttribute('data-field-id') !== excludeFieldId);

    let insertIndex = filtered.length;
    let reference = null;

    for (let index = 0; index < filtered.length; index += 1) {
        const candidate = filtered[index];
        const rect = candidate.getBoundingClientRect();
        if (pointerY < rect.top + rect.height / 2) {
            insertIndex = index;
            reference = candidate;
            break;
        }
    }

    return { insertIndex, reference };
}

function updateFieldDropIndicators(container, referenceElement) {
    const fields = getFieldsForContainer(container);
    fields.forEach(field => {
        field.classList.toggle('story-tracker-drop-before', field === referenceElement);
    });

    container.classList.toggle('story-tracker-drop-at-end', !referenceElement && dragState.type === 'field');
}

function clearFieldDropIndicators(container) {
    container.classList.remove('story-tracker-drop-at-end');
    getFieldsForContainer(container).forEach(field => {
        field.classList.remove('story-tracker-drop-before', 'story-tracker-dragging');
    });
}

function getFieldsForContainer(container) {
    const fields = Array.from(container.querySelectorAll('.story-tracker-field'));
    const containerSubsection = container.closest('.story-tracker-subsection-content');

    return fields.filter(field => {
        const fieldSubsection = field.closest('.story-tracker-subsection-content');

        if (container.dataset.subsectionId) {
            return fieldSubsection === container;
        }

        return !fieldSubsection || fieldSubsection === containerSubsection;
    });
}

function moveFieldWithinContainer(sectionId, subsectionId, fieldId, insertIndex) {
    if (subsectionId) {
        const subsection = findSubsectionById(subsectionId);
        if (!subsection || !Array.isArray(subsection.fields)) {
            return;
        }

        const currentIndex = subsection.fields.findIndex(field => field.id === fieldId);
        if (currentIndex === -1) {
            return;
        }

        const [movedField] = subsection.fields.splice(currentIndex, 1);
        const clampedIndex = Math.max(0, Math.min(insertIndex, subsection.fields.length));
        subsection.fields.splice(clampedIndex, 0, movedField);
    } else {
        const section = findSectionById(sectionId);
        if (!section || !Array.isArray(section.fields)) {
            return;
        }

        const currentIndex = section.fields.findIndex(field => field.id === fieldId);
        if (currentIndex === -1) {
            return;
        }

        const [movedField] = section.fields.splice(currentIndex, 1);
        const clampedIndex = Math.max(0, Math.min(insertIndex, section.fields.length));
        section.fields.splice(clampedIndex, 0, movedField);
    }

    saveSettings();
    syncTrackerBaselines();
    saveChatData();
    renderTracker();
}

export const __testables = {
    moveFieldWithinContainer,
    getFieldsForContainer,
    computeFieldInsertPosition,
};

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
        syncTrackerBaselines();
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
    syncTrackerBaselines();
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
        syncTrackerBaselines();
        saveChatData();
    }
}

function deleteSubsection(subsectionId) {
    if (!confirm('Are you sure you want to delete this subsection and all its contents?')) {
        return;
    }

    for (const section of extensionSettings.trackerData.sections) {
        section.subsections = (section.subsections || []).filter(
            subsection => subsection.id !== subsectionId
        );
    }
    saveSettings();
    syncTrackerBaselines();
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
        syncTrackerBaselines();
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
        syncTrackerBaselines();
        saveChatData();
    }
}

function updateFieldValue(fieldId, newValue) {
    const field = findFieldById(fieldId);
    if (field) {
        field.value = newValue;
        saveSettings();
        syncTrackerBaselines();
        saveChatData();
    }
}

export function updateField(fieldId, newName, newValue, newPrompt) {
    const field = findFieldById(fieldId);
    if (field) {
        if (newName) field.name = newName;
        if (newValue !== undefined) field.value = newValue;
        if (newPrompt !== undefined) field.prompt = newPrompt;
        saveSettings();
        syncTrackerBaselines();
        saveChatData();
        renderTracker();
    }
}

function deleteField(fieldId) {
    if (!confirm('Are you sure you want to delete this story element?')) {
        return;
    }

    // Iterate through sections to find and delete the field
    for (const section of extensionSettings.trackerData.sections) {
        // Check fields directly in the section
        const initialSectionFieldCount = section.fields ? section.fields.length : 0;
        section.fields = (section.fields || []).filter(field => field.id !== fieldId);
        if (section.fields.length < initialSectionFieldCount) {
            // Field found and deleted from section
            saveSettings();
            syncTrackerBaselines();
            saveChatData();
            renderTracker();
            return;
        }

        // Check fields within subsections of the current section
        if (section.subsections) {
            for (const subsection of section.subsections) {
                const initialSubsectionFieldCount = subsection.fields ? subsection.fields.length : 0;
                subsection.fields = (subsection.fields || []).filter(field => field.id !== fieldId);
                if (subsection.fields.length < initialSubsectionFieldCount) {
                    // Field found and deleted from subsection
                    saveSettings();
                    syncTrackerBaselines();
                    saveChatData();
                    renderTracker();
                    return;
                }
            }
        }
    }
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
    syncTrackerBaselines();
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
    syncTrackerBaselines();
    saveChatData();
    renderTracker();
    return subsection.id;
}

export function addField(parentId, name, type = 'text', prompt = '') {
    ensureTrackerData();
    let parent = findSectionById(parentId);
    let isSubsection = false;

    if (!parent) {
        parent = findSubsectionById(parentId);
        isSubsection = true;
    }

    if (!parent) {
        console.warn('[Story Tracker] addField: Parent (section or subsection) not found', parentId);
        return null;
    }

    if (!Array.isArray(parent.fields)) {
        parent.fields = [];
    }

    const fieldName = (typeof name === 'string' && name.trim()) ? name.trim() : 'New Story Element';
    const fieldType = type || 'text';
    const field = createField(fieldName, prompt, fieldType);
    parent.fields.push(field);
    saveSettings();
    syncTrackerBaselines();
    saveChatData();
    renderTracker();
    return field.id;
}

/**
 * Modal functions (placeholders - will be implemented in UI module)
 */

export function showAddSubsectionModal(sectionId) {
    import('../ui/modals.js').then(module => {
        module.showAddSubsectionModal(sectionId);
    });
}

export function showAddFieldModal(parentId) {
    import('../ui/modals.js').then(module => {
        module.showAddFieldModal(parentId);
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
        const field = (section.fields || []).find(f => f.id === fieldId);
        if (field) return field;

        if (section.subsections) {
            for (const subsection of section.subsections) {
                const field = (subsection.fields || []).find(f => f.id === fieldId);
                if (field) return field;
            }
        }
    }
    return null;
}

export function getFieldById(fieldId) {
    return findFieldById(fieldId);
}
