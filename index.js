import { extensionName, extensionDisplayName, defaultSettings } from './src/core/config.js';
import { extensionSettings, updateExtensionSettings, setPanelContainer, setSectionsContainer } from './src/core/state.js';
import { loadDefaultTrackerTemplate } from './src/core/dataManager.js';
import { renderTracker } from './src/systems/rendering/tracker.js';
import { setupPresetManager, saveCurrentPreset } from './src/core/presetManager.js';
import { setupSettingsPopup, setupFieldPopup, showSettingsModal } from './src/systems/ui/modals.js';
import { updateTrackerData } from './src/systems/generation/apiClient.js';
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
        { source: 'SillyTavern.registerExtension', fn: globalThis.SillyTavern?.registerExtension, thisArg: globalThis.SillyTavern },
    ];

    for (const candidate of candidates) {
        if (typeof candidate.fn === 'function') {
            return candidate;
        }
    }

    return null;
}

console.log('[Story Tracker] Script loaded');

jQuery(async () => {
    console.log('[Story Tracker] jQuery ready');
    try {
        // Wait for SillyTavern to be available
        while (typeof SillyTavern === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('[Story Tracker] SillyTavern global keys', Object.keys(SillyTavern || {}));

        // Wait for the UI system to be ready - re-fetch context each iteration
        let st;
        let registration = null;
        let attempts = 0;
        while (!registration) {
            attempts += 1;
            st = SillyTavern?.getContext?.();

            if (attempts % 20 === 1) {
                try {
                    const contextKeys = st ? Object.keys(st) : [];
                    const uiKeys = st?.ui ? Object.keys(st.ui) : [];
                    const extensionsKeys = st?.extensions ? Object.keys(st.extensions) : [];
                    console.warn('[Story Tracker] Waiting for SillyTavern context', { attempts, hasContext: Boolean(st), contextKeys, hasUi: Boolean(st?.ui), uiKeys, hasExtensions: Boolean(st?.extensions), extensionsKeys });
                    console.dir(st);
                } catch (error) {
                    console.error('[Story Tracker] Error probing SillyTavern context', error);
                }
            }

            registration = resolveRegisterExtension(st);
            if (registration) {
                break;
            }

            if (attempts > 300) {
                throw new Error('[Story Tracker] registerExtension not available after 300 attempts');
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('[Story Tracker] Context ready, registering extension via', registration.source);
        const base = new URL('.', import.meta.url);

        // 1. Load settings
        Object.assign(extensionSettings, defaultSettings, st.settings?.[extensionName] || {});

        // 2. Load HTML
        const templateUrl = new URL('./template.html', base);
        const html = await (await fetch(templateUrl)).text();

        // 3. Register the extension
        console.log('[Story Tracker] Registering extension');
        const registerFn = registration.fn;
        const registerThis = registration.thisArg ?? st?.ui ?? globalThis.SillyTavern?.ui ?? st ?? globalThis.SillyTavern;
        console.log('[Story Tracker] Using register function', { source: registration.source, arity: registerFn.length });
        registerFn.call(registerThis, {
            id: extensionName,
            name: extensionDisplayName,
            init: async ({ root }) => {
                root.innerHTML = html;
                const $root = $(root);

                // Cache commonly used elements for other modules
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
                console.log('[Story Tracker] Extension root initialized', { panel: $panel.length, sections: $sections.length });

                // Wire up UI helpers
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

                // 4. Load data
                const hasSections = Array.isArray(extensionSettings.trackerData?.sections) && extensionSettings.trackerData.sections.length > 0;
                if (!hasSections) {
                    try {
                        const preset = await loadDefaultTrackerTemplate();
                        updateExtensionSettings({
                            systemPrompt: preset.systemPrompt,
                            trackerData: preset.trackerData,
                            currentPreset: 'Default',
                        });
                        saveCurrentPreset('Default');
                    } catch (error) {
                        console.error('[Story Tracker] Failed to load default preset:', error);
                    }
                }

                // 5. Initial render
                renderTracker();

                // 6. Attach event listeners
                $root.find('#story-tracker-settings').on('click', () => showSettingsModal());
                $root.find('#story-tracker-manual-update').on('click', async () => {
                    await updateTrackerData(renderTracker);
                });
                $root.find('#edit-preset-prompt').on('click', () => {
                    import(new URL('./src/core/presetManager.js', base)).then(module => module.showEditPromptModal());
                });
            },
        });

        console.log('[Story Tracker] ✅ Extension loaded successfully');
    } catch (error) {
        console.error('[Story Tracker] Initialization failed', error);
    }
});

