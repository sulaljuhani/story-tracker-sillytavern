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
        let attempts = 0;
        while (!st?.ui?.registerExtension) {
            attempts += 1;
            if (attempts % 20 === 1) {
                try {
                    const context = SillyTavern?.getContext?.();
                    const contextKeys = context ? Object.keys(context) : [];
                    const uiKeys = context?.ui ? Object.keys(context.ui) : [];
                    const extensionsKeys = context?.extensions ? Object.keys(context.extensions) : [];
                    console.warn('[Story Tracker] Waiting for SillyTavern context', { attempts, hasContext: Boolean(context), contextKeys, hasUi: Boolean(context?.ui), uiKeys, hasExtensions: Boolean(context?.extensions), extensionsKeys });
                    console.dir(context);
                } catch (error) {
                    console.error('[Story Tracker] Error probing SillyTavern context', error);
                }
            }
            st = SillyTavern.getContext();
            if (attempts > 300) {
                throw new Error('[Story Tracker] registerExtension not available after 300 attempts');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('[Story Tracker] Context ready, registering extension');
        const base = new URL('.', import.meta.url);

        // 1. Load settings
        Object.assign(extensionSettings, defaultSettings, st.settings?.[extensionName] || {});

        // 2. Load HTML
        const templateUrl = new URL('./template.html', base);
        const html = await (await fetch(templateUrl)).text();

        // 3. Register the extension
        console.log('[Story Tracker] Registering extension');
        st.ui.registerExtension({
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

