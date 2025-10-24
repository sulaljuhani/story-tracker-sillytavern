import { extensionName, extensionDisplayName, defaultSettings } from './src/core/config.js';
import { extensionSettings, updateExtensionSettings, setPanelContainer, setSectionsContainer } from './src/core/state.js';
import { loadDefaultTrackerTemplate, DEFAULT_PRESET_NAME } from './src/core/dataManager.js';
import { renderTracker } from './src/systems/rendering/tracker.js';
import { setupPresetManager, saveCurrentPreset } from './src/core/presetManager.js';
import { setupSettingsPopup, setupFieldPopup, showSettingsModal, showAddSectionModal } from './src/systems/ui/modals.js';
import { updateTrackerData } from './src/systems/generation/apiClient.js';
import { loadChatData } from './src/core/persistence.js';
import { registerAllEvents } from './src/core/events.js';
import { commitTrackerData, onMessageSent, onMessageReceived, onCharacterChanged, onMessageSwiped, updatePersonaAvatar } from './src/systems/integration/sillytavern.js';
import { onGenerationStarted } from './src/systems/generation/injector.js';
import { setupMobileToggle, setupMobileKeyboardHandling, setupContentEditableScrolling } from './src/systems/ui/mobile.js';
import { setupCollapseToggle, applyPanelPosition, updatePanelVisibility, updateGenerationModeUI } from './src/systems/ui/layout.js';

async function waitForElementConnection(element, label, timeout = 3000) {
    if (!element) {
        throw new Error(`[Story Tracker] Missing ${label} element during initialization`);
    }

    const start = performance.now ? performance.now() : Date.now();
    while (!element.isConnected) {
        const now = performance.now ? performance.now() : Date.now();
        if (now - start >= timeout) {
            console.warn(`[Story Tracker] ${label} element not connected after ${timeout}ms`);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 16));
    }
}

function resolveRegisterExtension(st) {
    const candidates = [
        { source: 'context.ui.registerExtension', fn: st?.ui?.registerExtension, thisArg: st?.ui },
        { source: 'SillyTavern.ui.registerExtension', fn: globalThis.SillyTavern?.ui?.registerExtension, thisArg: globalThis.SillyTavern?.ui },
        { source: 'context.extensions.registerExtension', fn: st?.extensions?.registerExtension, thisArg: st?.extensions },
        { source: 'SillyTavern.extensions.registerExtension', fn: globalThis.SillyTavern?.extensions?.registerExtension, thisArg: globalThis.SillyTavern?.extensions },
        { source: 'context.extensions.register', fn: st?.extensions?.register, thisArg: st?.extensions },
        { source: 'SillyTavern.extensions.register', fn: globalThis.SillyTavern?.extensions?.register, thisArg: globalThis.SillyTavern?.extensions },
        { source: 'context.registerExtension', fn: st?.registerExtension, thisArg: st },
        { source: 'context.registerThirdPartyExtension', fn: st?.registerThirdPartyExtension, thisArg: st },
        { source: 'context.extensions.registerThirdPartyExtension', fn: st?.extensions?.registerThirdPartyExtension, thisArg: st?.extensions },
        { source: 'SillyTavern.libs.extensions.registerExtension', fn: globalThis.SillyTavern?.libs?.extensions?.registerExtension, thisArg: globalThis.SillyTavern?.libs?.extensions },
        { source: 'SillyTavern.libs.extensions.registerThirdPartyExtension', fn: globalThis.SillyTavern?.libs?.extensions?.registerThirdPartyExtension, thisArg: globalThis.SillyTavern?.libs?.extensions },
        { source: 'SillyTavern.registerExtension', fn: globalThis.SillyTavern?.registerExtension, thisArg: globalThis.SillyTavern },
    ];

    for (const candidate of candidates) {
        if (typeof candidate.fn === 'function') {
            return candidate;
        }
    }

    return null;
}

async function waitForRegistrationFunction({ maxAttempts = 300, delayMs = 100 } = {}) {
    let attempts = 0;

    while (attempts < maxAttempts) {
        attempts += 1;
        const st = globalThis.SillyTavern?.getContext?.();

        if (st) {
            const registration = resolveRegisterExtension(st);
            if (registration) {
                return { st, registration, attempts };
            }

            if (attempts % 20 === 1) {
                try {
                    const contextKeys = Object.keys(st);
                    const uiKeys = st?.ui ? Object.keys(st.ui) : [];
                    const extensionsKeys = st?.extensions ? Object.keys(st.extensions) : [];
                    const registerLikeKeys = contextKeys.filter(key => key.toLowerCase().includes('register'));
                    const extensionLikeKeys = contextKeys.filter(key => key.toLowerCase().includes('extension'));
                    console.warn('[Story Tracker] Waiting for SillyTavern context', {
                        attempts,
                        hasContext: true,
                        contextKeys,
                        hasUi: Boolean(st?.ui),
                        uiKeys,
                        hasExtensions: Boolean(st?.extensions),
                        extensionsKeys,
                        registerLikeKeys,
                        extensionLikeKeys,
                    });
                    if (st?.extensions) {
                        console.log('[Story Tracker] st.extensions type', Object.prototype.toString.call(st.extensions));
                        try {
                            console.log('[Story Tracker] st.extensions keys', Object.keys(st.extensions));
                        } catch (extError) {
                            console.error('[Story Tracker] Failed to inspect st.extensions', extError);
                        }
                    } else {
                        console.log('[Story Tracker] st.extensions missing');
                    }
                    if (st?.extension_settings) {
                        console.log('[Story Tracker] st.extension_settings keys', Object.keys(st.extension_settings));
                    }
                    if (st?.extensionSettings) {
                        console.log('[Story Tracker] st.extensionSettings keys', Object.keys(st.extensionSettings));
                    }
                    if (typeof extensionName !== 'undefined') {
                        console.log('[Story Tracker] extension_settings entry', st?.extension_settings?.[extensionName]);
                        console.log('[Story Tracker] extensionSettings entry', st?.extensionSettings?.[extensionName]);
                    }
                    if (st?.eventTypes) {
                        const extensionEvents = Object.entries(st.eventTypes)
                            .filter(([key, value]) => String(key).toLowerCase().includes('extension')
                                || String(value).toLowerCase().includes('extension'));
                        if (extensionEvents.length > 0) {
                            console.log('[Story Tracker] extension-related events', extensionEvents);
                        }
                    }
                    console.log('[Story Tracker] context.extensionController type', typeof st?.extensionController);
                    console.log('[Story Tracker] context.extensionsManager type', typeof st?.extensionsManager);
                    console.log('[Story Tracker] context.modules?.extensions type', typeof st?.modules?.extensions);
                    if (st?.modules?.extensions) {
                        console.log('[Story Tracker] context.modules.extensions keys', Object.keys(st.modules.extensions));
                    }
                    if (typeof extensionName !== 'undefined') {
                        console.log('[Story Tracker] extension_settings entry', st?.extension_settings?.[extensionName]);
                        console.log('[Story Tracker] extensionSettings entry', st?.extensionSettings?.[extensionName]);
                    }
                    try {
                        console.table(registerLikeKeys.map(key => ({ key, type: typeof st[key] })));
                    } catch (tableError) {
                        console.error('[Story Tracker] Failed to table register-like keys', tableError);
                    }
                    console.dir(st);
                } catch (probeError) {
                    console.error('[Story Tracker] Error probing SillyTavern context', probeError);
                }
            }
        } else if (attempts % 20 === 1) {
            console.warn('[Story Tracker] SillyTavern context unavailable', { attempts });
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error(`[Story Tracker] registerExtension not available after ${maxAttempts} attempts`);
}

let eventsRegistered = false;

function registerEventHandlers() {
    if (eventsRegistered) {
        return;
    }

    const context = globalThis.SillyTavern?.getContext?.();
    const eventTypes = context?.event_types;
    const eventSource = context?.eventSource;

    if (!eventSource || !eventTypes) {
        console.warn('[Story Tracker] Event API unavailable; skipping event registration');
        return;
    }

    registerAllEvents({
        [eventTypes.MESSAGE_SENT]: onMessageSent,
        [eventTypes.MESSAGE_RECEIVED]: onMessageReceived,
        [eventTypes.GENERATION_STARTED]: onGenerationStarted,
        [eventTypes.CHAT_CHANGED]: [onCharacterChanged, updatePersonaAvatar],
        [eventTypes.MESSAGE_SWIPED]: onMessageSwiped
    });

    eventsRegistered = true;
}

const ADD_SECTION_EVENT_NAMESPACE = 'click.storyTrackerAddSection';

const handleAddSectionClick = () => {
    showAddSectionModal();
};

function bindAddSectionButton({ $root, root }) {
    if ($root?.length) {
        const $button = $root.find('#story-tracker-add-section');
        if ($button.length) {
            $button.off(ADD_SECTION_EVENT_NAMESPACE).on(ADD_SECTION_EVENT_NAMESPACE, handleAddSectionClick);
        }
        return;
    }

    if (root) {
        const button = root.querySelector('#story-tracker-add-section');
        if (button) {
            button.removeEventListener('click', handleAddSectionClick);
            button.addEventListener('click', handleAddSectionClick);
        }
    }
}

let isExtensionInitialized = false;

async function initializeExtension(root, html, base, { viaFallback = false } = {}) {
    if (isExtensionInitialized) {
        console.warn('[Story Tracker] initializeExtension called more than once – skipping duplicate init');
        return;
    }

    const st = globalThis.SillyTavern?.getContext?.();
    if (!st) {
        throw new Error('[Story Tracker] Cannot initialize – SillyTavern context unavailable');
    }

    const processedHtml = html.replace(/{{EXTENSION_ASSETS_BASE_PATH}}/g, base.href.replace(/\/$/, ''));
    root.innerHTML = processedHtml;
    const $root = $(root);

    const panelElement = root.querySelector('#story-tracker-panel');
    const sectionsElement = root.querySelector('#story-tracker-sections');
    await Promise.all([
        waitForElementConnection(panelElement, 'panel'),
        waitForElementConnection(sectionsElement, 'sections container')
    ]);

    const $panel = $(panelElement);
    const $sections = $(sectionsElement);
    setPanelContainer($panel);
    setSectionsContainer($sections);
    console.log('[Story Tracker] Extension root initialized', { viaFallback, panel: $panel.length, sections: $sections.length });

    setupSettingsPopup();
    setupFieldPopup();
    setupPresetManager();
    setupCollapseToggle();
    setupMobileToggle();
    setupMobileKeyboardHandling();
    setupContentEditableScrolling();
    applyPanelPosition();
    updatePanelVisibility();
    updateGenerationModeUI();

    loadChatData();

    const hasSections = Array.isArray(extensionSettings.trackerData?.sections) && extensionSettings.trackerData.sections.length > 0;
    if (!hasSections) {
        try {
            const preset = await loadDefaultTrackerTemplate();
            updateExtensionSettings({
                systemPrompt: preset.systemPrompt,
                trackerData: preset.trackerData,
                currentPreset: DEFAULT_PRESET_NAME,
            });
            saveCurrentPreset(DEFAULT_PRESET_NAME);
        } catch (error) {
            console.error('[Story Tracker] Failed to load default preset:', error);
        }
    }

    renderTracker();
    commitTrackerData();

    $root.find('#story-tracker-settings').on('click', () => showSettingsModal());
    $root.find('#story-tracker-manual-update').on('click', async () => {
        await updateTrackerData(renderTracker);
    });
    $root.find('#edit-preset-prompt').on('click', () => {
        import(new URL('./src/core/presetManager.js', base)).then(module => module.showEditPromptModal());
    });

    bindAddSectionButton({ $root, root });

    registerEventHandlers();

    isExtensionInitialized = true;
    console.log('[Story Tracker] initializeExtension completed', { viaFallback });
}

async function bootstrapFallback(html, base) {
    console.warn('[Story Tracker] Falling back to manual bootstrap. Extension toggling via UI may be unavailable.');
    const preferredParents = [
        '#extensionsRight',
        '#extensionsLeft',
        '#extensions-container',
        '#story-tracker-container',
        '#extensions-panel',
        'body',
    ];

    let parent = preferredParents
        .map(selector => document.querySelector(selector))
        .find(Boolean) || document.body;

    let root = document.getElementById('story-tracker-extension-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'story-tracker-extension-root';
        root.classList.add('story-tracker-extension-root');
        parent.appendChild(root);
    }

    await initializeExtension(root, html, base, { viaFallback: true });

    if (!globalThis.jQuery) {
        bindAddSectionButton({ root });
    }
}

console.log('[Story Tracker] Script loaded');

jQuery(async () => {
    console.log('[Story Tracker] jQuery ready');
    try {
        while (typeof SillyTavern === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('[Story Tracker] SillyTavern global keys', Object.keys(SillyTavern || {}));
        console.log('[Story Tracker] SillyTavern libs keys', Object.keys(SillyTavern?.libs || {}));

        let registrationInfo = null;
        try {
            registrationInfo = await waitForRegistrationFunction();
        } catch (waitError) {
            console.warn('[Story Tracker] Registration function unavailable, falling back to manual mounting', waitError);
        }

        const base = new URL('.', import.meta.url);
        const templateUrl = new URL('./template.html', base);
        const html = await (await fetch(templateUrl)).text();

        const st = globalThis.SillyTavern?.getContext?.();
        if (st?.settings) {
            Object.assign(extensionSettings, defaultSettings, st.settings?.[extensionName] || {});
        } else {
            Object.assign(extensionSettings, defaultSettings);
        }

        if (registrationInfo?.registration) {
            console.log('[Story Tracker] Context ready, registering extension via', registrationInfo.registration.source);
            console.log('[Story Tracker] Registering extension');
            const registerFn = registrationInfo.registration.fn;
            const registerThis = registrationInfo.registration.thisArg
                ?? registrationInfo.st?.ui
                ?? globalThis.SillyTavern?.ui
                ?? registrationInfo.st
                ?? globalThis.SillyTavern;
            console.log('[Story Tracker] Using register function', {
                source: registrationInfo.registration.source,
                arity: registerFn.length,
            });
            registerFn.call(registerThis, {
                id: extensionName,
                name: extensionDisplayName,
                init: async ({ root }) => {
                    await initializeExtension(root, html, base, { viaFallback: false });
                },
            });
        } else {
            await bootstrapFallback(html, base);
        }

        console.log('[Story Tracker] ✅ Extension bootstrap completed');
    } catch (error) {
        console.error('[Story Tracker] Initialization failed', error);
        try {
            const base = new URL('.', import.meta.url);
            const templateUrl = new URL('./template.html', base);
            const html = await (await fetch(templateUrl)).text();
            await bootstrapFallback(html, base);
        } catch (fallbackError) {
            console.error('[Story Tracker] Fallback bootstrap failed', fallbackError);
        }
    }
});
