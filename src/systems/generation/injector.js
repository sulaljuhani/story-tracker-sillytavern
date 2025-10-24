/**
 * Prompt Injector Module
 * Manages prompt injection for story tracker integration
 */

import {
    extensionSettings,
    committedTrackerData,
    lastGeneratedData,
    isGenerating,
    lastActionWasSwipe,
    setCommittedTrackerData
} from '../../core/state.js';
import { generateTrackerPrompt } from './promptBuilder.js';

const PROMPT_IDS = {
    INSTRUCTIONS: 'story-tracker-inject',
    CONTEXT: 'story-tracker-context'
};

const FALLBACK_PROMPT_TYPES = Object.freeze({
    IN_CHAT: 'in_chat'
});

function getContext() {
    return globalThis.SillyTavern?.getContext?.();
}

function resolvePromptApi() {
    const context = getContext();
    const setter = context?.setExtensionPrompt || globalThis.setExtensionPrompt;
    const providedTypes = context?.extension_prompt_types || globalThis.extension_prompt_types;
    const types = providedTypes || FALLBACK_PROMPT_TYPES;
    return { setter, types, usingFallback: !providedTypes };
}

function callExtensionPrompt(setter, id, content, type, position = 0, shouldPersist = false) {
    if (typeof setter !== 'function') {
        return;
    }

    if (setter.length <= 3) {
        setter(id, content, type);
        return;
    }

    setter(id, content, type, position, shouldPersist);
}

function ensureCommittedBaseline() {
    if (lastActionWasSwipe) {
        return;
    }

    const baseline = lastGeneratedData || extensionSettings.trackerData;
    if (!baseline) {
        return;
    }

    setCommittedTrackerData(baseline);
}


function buildTrackerContext(data) {
    if (!data || !Array.isArray(data.sections) || data.sections.length === 0) {
        return '';
    }

    const summary = data.sections.map((section) => {
        const subsectionText = (section.subsections || []).map((subsection) => {
            const fields = (subsection.fields || []).map((field) => `- ${field.name}: ${field.value || '...'}`);
            return [`${subsection.name}:`, ...fields].join('\n');
        });

        return [`${section.name}:`, ...subsectionText].join('\n');
    }).join('\n\n');

    return `Current tracker state (for reference only):\n\n${summary}`;
}

/**
 * Injects tracker instructions or context when a generation starts.
 */
export function onGenerationStarted() {
    console.log('[Story Tracker DEBUG] onGenerationStarted called', {
        enabled: extensionSettings.enabled,
        isGenerating,
        generationMode: extensionSettings.generationMode,
        hasSections: Boolean(extensionSettings.trackerData?.sections?.length)
    });

    if (!extensionSettings.enabled) {
        console.log('[Story Tracker DEBUG] Extension disabled, skipping injection');
        return;
    }

    if (isGenerating) {
        // Skip injections for secondary tracker-generation calls
        console.log('[Story Tracker DEBUG] Already generating, skipping injection');
        return;
    }

    ensureCommittedBaseline();

    const { setter, types, usingFallback } = resolvePromptApi();
    console.log('[Story Tracker DEBUG] Prompt API resolved:', {
        hasSetter: typeof setter === 'function',
        hasTypes: Boolean(types),
        hasInChat: Boolean(types?.IN_CHAT),
        inChatValue: types?.IN_CHAT,
        usingFallback
    });
    if (typeof setter !== 'function' || !types?.IN_CHAT) {
        console.error('[Story Tracker DEBUG] Prompt API not available - injection failed!');
        return;
    }

    if (extensionSettings.generationMode === 'together') {
        const instructions = generateTrackerPrompt(false, committedTrackerData || extensionSettings.trackerData, {
            includeNarrative: true
        });

        console.log('[Story Tracker DEBUG] Injecting prompt:', {
            promptLength: instructions.length,
            promptPreview: instructions.substring(0, 200)
        });

        callExtensionPrompt(setter, PROMPT_IDS.INSTRUCTIONS, instructions, types.IN_CHAT, 0, false);
        callExtensionPrompt(setter, PROMPT_IDS.CONTEXT, '', types.IN_CHAT, 0, false);

        console.log('[Story Tracker DEBUG] Prompt injected successfully');
    } else if (extensionSettings.generationMode === 'separate') {
        const baseline = committedTrackerData || extensionSettings.trackerData;
        const contextSummary = buildTrackerContext(baseline);

        callExtensionPrompt(setter, PROMPT_IDS.INSTRUCTIONS, '', types.IN_CHAT, 0, false);
        if (contextSummary) {
            callExtensionPrompt(setter, PROMPT_IDS.CONTEXT, contextSummary, types.IN_CHAT, 1, false);
        } else {
            callExtensionPrompt(setter, PROMPT_IDS.CONTEXT, '', types.IN_CHAT, 1, false);
        }
    }
}
