/**
 * SillyTavern Integration Module
 * Handles integration with SillyTavern's event system and UI
 */

import {
    extensionSettings,
    committedTrackerData,
    lastGeneratedData,
    setCommittedTrackerData,
    setLastGeneratedData,
    lastActionWasSwipe,
    setLastActionWasSwipe
} from '../../core/state.js';
import { loadChatData, saveChatData } from '../../core/persistence.js';
import { updateTrackerData } from '../generation/apiClient.js';
import { renderTracker } from '../rendering/tracker.js';
import { parseResponse } from '../generation/parser.js';
import { onGenerationStarted } from '../generation/injector.js';

const SWIPE_STORAGE_KEY = 'story_tracker_swipes';

const FALLBACK_PROMPT_TYPES = Object.freeze({
    IN_CHAT: 'in_chat'
});

function getContext() {
    return globalThis.SillyTavern?.getContext?.();
}

function cloneData(data) {
    return data ? JSON.parse(JSON.stringify(data)) : null;
}

function getLastAssistantMessage(chat) {
    if (!Array.isArray(chat)) {
        return null;
    }

    for (let i = chat.length - 1; i >= 0; i -= 1) {
        const message = chat[i];
        if (!message || message.is_user || message.is_system) {
            continue;
        }
        return message;
    }

    return null;
}

const FALLBACK_PROMPT_TYPES = { IN_CHAT: 'in_chat' };

function resolvePromptApi() {
    const context = getContext();
    const setter = context?.setExtensionPrompt || globalThis.setExtensionPrompt;
    const rawTypes = context?.extension_prompt_types || globalThis.extension_prompt_types;
    const types = rawTypes?.IN_CHAT ? rawTypes : FALLBACK_PROMPT_TYPES;
    const usedFallback = !rawTypes?.IN_CHAT;
    return { setter, types, usedFallback };
}

function callSetExtensionPrompt(setter, id, value, type, priority = 0, shouldAppend = false) {
    if (typeof setter !== 'function') {
        return;
    }

    const argCount = setter.length;

    if (argCount >= 5) {
        setter(id, value, type, priority, shouldAppend);
    } else if (argCount === 4) {
        setter(id, value, type, priority);
    } else {
        setter(id, value, type);
    }
}

/**
 * Commits the tracker data from the most recent assistant message so that
 * subsequent generations operate on the same baseline data as the current swipe.
 */
export function commitTrackerData() {
    const context = getContext();
    const chat = context?.chat;

    const lastAssistant = getLastAssistantMessage(chat);
    if (!lastAssistant) {
        return;
    }

    const swipeId = lastAssistant.swipe_id || 0;
    const swipeData = lastAssistant.extra?.[SWIPE_STORAGE_KEY]?.[swipeId];
    if (swipeData?.trackerData) {
        const trackerClone = cloneData(swipeData.trackerData);
        setCommittedTrackerData(trackerClone);
        setLastGeneratedData(trackerClone);
    }
}

/**
 * Handles message sent events.
 */
export function onMessageSent() {
    setLastActionWasSwipe(false);
    commitTrackerData();

    if (extensionSettings.generationMode === 'together') {
        console.log('[Story Tracker DEBUG] Forcing prompt injection from onMessageSent');
        onGenerationStarted();
    }
}

/**
 * Handles message received events.
 * Parses tracker data in "together" mode or triggers a separate update.
 */
export async function onMessageReceived() {
    console.log('[Story Tracker DEBUG] onMessageReceived called', {
        enabled: extensionSettings.enabled,
        generationMode: extensionSettings.generationMode
    });

    if (!extensionSettings.enabled) {
        return;
    }

    const context = getContext();
    const chat = context?.chat;
    if (!Array.isArray(chat) || chat.length === 0) {
        console.log('[Story Tracker DEBUG] No chat messages');
        return;
    }

    const lastMessage = chat[chat.length - 1];
    console.log('[Story Tracker DEBUG] Last message:', {
        isUser: lastMessage?.is_user,
        messageLength: lastMessage?.mes?.length,
        messagePreview: lastMessage?.mes?.substring(0, 200)
    });

    if (!lastMessage || lastMessage.is_user) {
        return;
    }

    if (extensionSettings.generationMode === 'together') {
        const parsed = parseResponse(lastMessage.mes || '');

        console.log('[Story Tracker DEBUG] Parsed response:', {
            hasTrackerData: Boolean(parsed.trackerData),
            hasCleanedText: Boolean(parsed.cleanedText),
            trackerSections: parsed.trackerData?.sections?.length
        });

        if (parsed.trackerData) {
            const trackerClone = cloneData(parsed.trackerData);
            setLastGeneratedData(trackerClone);
            extensionSettings.trackerData = trackerClone;

            const hasCommittedSections = Array.isArray(committedTrackerData?.sections) && committedTrackerData.sections.length > 0;
            if (!hasCommittedSections) {
                setCommittedTrackerData(trackerClone);
            }

            if (!lastMessage.extra) {
                lastMessage.extra = {};
            }
            if (!lastMessage.extra[SWIPE_STORAGE_KEY]) {
                lastMessage.extra[SWIPE_STORAGE_KEY] = {};
            }

            const swipeId = lastMessage.swipe_id || 0;
            lastMessage.extra[SWIPE_STORAGE_KEY][swipeId] = {
                trackerData: trackerClone
            };

            if (typeof parsed.cleanedText === 'string') {
                lastMessage.mes = parsed.cleanedText;
                if (lastMessage.swipes && lastMessage.swipes[swipeId] !== undefined) {
                    lastMessage.swipes[swipeId] = parsed.cleanedText;
                }
            }

            renderTracker();
            saveChatData();
        } else {
            console.warn('[Story Tracker DEBUG] No tracker data found in response!');
        }
    } else if (extensionSettings.generationMode === 'separate' && extensionSettings.autoUpdate) {
        setTimeout(() => updateTrackerData(renderTracker), 500);
    }

    if (lastActionWasSwipe) {
        setLastActionWasSwipe(false);
    }
}

/**
 * Handles character change events.
 */
export function onCharacterChanged() {
    loadChatData();
    renderTracker();
    commitTrackerData();
}

/**
 * Handles message swipe events to load the tracker data for the selected swipe.
 * @param {number} messageIndex - Index of the message being swiped
 */
export function onMessageSwiped(messageIndex) {
    if (!extensionSettings.enabled) {
        return;
    }

    const context = getContext();
    const chat = context?.chat;
    if (!Array.isArray(chat) || !chat[messageIndex] || chat[messageIndex].is_user) {
        return;
    }

    const message = chat[messageIndex];
    const swipeId = message.swipe_id || 0;

    const hasExistingSwipe = Boolean(
        message.swipes &&
        message.swipes[swipeId] !== undefined &&
        message.swipes[swipeId] !== null &&
        String(message.swipes[swipeId]).length > 0
    );

    if (!hasExistingSwipe) {
        setLastActionWasSwipe(true);
    }

    const swipeData = message.extra?.[SWIPE_STORAGE_KEY]?.[swipeId];
    if (swipeData?.trackerData) {
        const trackerClone = cloneData(swipeData.trackerData);
        setLastGeneratedData(trackerClone);
        extensionSettings.trackerData = trackerClone;
        renderTracker();
    }
}

/**
 * Updates persona avatar display (not used for this extension).
 */
export function updatePersonaAvatar() {
    // Placeholder for compatibility with SillyTavern event system
}

/**
 * Clears extension prompts (used when the extension is disabled).
 */
export function clearExtensionPrompts() {
    const { setter, types } = resolvePromptApi();
    if (typeof setter !== 'function' || !types?.IN_CHAT) {
        return;
    }

    callSetExtensionPrompt(setter, 'story-tracker-inject', '', types.IN_CHAT, 0, false);
    callSetExtensionPrompt(setter, 'story-tracker-context', '', types.IN_CHAT, 1, false);
}
