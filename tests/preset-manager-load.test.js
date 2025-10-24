import { test } from 'node:test';
import assert from 'node:assert/strict';

const PRESET_NAME = 'Test Preset';

test('loading a preset updates global settings and chat metadata', async t => {
    const originalLocalStorage = globalThis.localStorage;
    const originalSillyTavern = globalThis.SillyTavern;

    const storage = {
        'story-tracker-presets': JSON.stringify({
            [PRESET_NAME]: {
                systemPrompt: 'Preset prompt',
                trackerData: {
                    sections: [
                        {
                            id: 'section_1',
                            name: 'Section',
                            fields: [],
                            subsections: [],
                            collapsed: false,
                        },
                    ],
                },
            },
        }),
    };

    globalThis.localStorage = {
        getItem: key => (key in storage ? storage[key] : null),
        setItem: (key, value) => {
            storage[key] = String(value);
        },
        removeItem: key => {
            delete storage[key];
        },
        clear: () => {
            for (const key of Object.keys(storage)) {
                delete storage[key];
            }
        },
    };

    const context = {
        settings: {},
        chat: {
            metadata: {},
        },
        saveSettingsDebounced: () => {
            context.settingsSaved = true;
        },
        saveChatDebounced: () => {
            context.chatSaved = true;
        },
    };

    globalThis.SillyTavern = {
        getContext: () => context,
    };

    const configModule = await import('../src/core/config.js');
    const stateModule = await import('../src/core/state.js');

    const { defaultSettings } = configModule;
    const { setExtensionSettings } = stateModule;

    setExtensionSettings({
        ...defaultSettings,
        trackerData: { sections: [] },
        currentPreset: '',
    });

    const {
        loadPreset,
        setRenderTrackerHandler,
    } = await import('../src/core/presetManager.js');

    let renderTrackerCalled = false;
    setRenderTrackerHandler(() => {
        renderTrackerCalled = true;
    });

    t.after(() => {
        setRenderTrackerHandler();
        globalThis.localStorage = originalLocalStorage;
        globalThis.SillyTavern = originalSillyTavern;
    });

    loadPreset(PRESET_NAME);

    assert.equal(stateModule.extensionSettings.currentPreset, PRESET_NAME);
    assert.deepEqual(stateModule.extensionSettings.trackerData, {
        sections: [
            {
                id: 'section_1',
                name: 'Section',
                fields: [],
                subsections: [],
                collapsed: false,
            },
        ],
    });

    assert.ok(context.settingsSaved, 'Expected saveSettings to persist data to SillyTavern settings.');
    assert.ok(context.chatSaved, 'Expected saveChatData to persist data to the active chat.');
    assert.ok(renderTrackerCalled, 'Expected the tracker to re-render after loading a preset.');

    assert.deepEqual(
        context.chat.metadata.story_tracker.trackerData,
        stateModule.extensionSettings.trackerData,
        'Expected chat metadata to mirror the preset tracker data.'
    );
    assert.equal(
        context.settings['story-tracker-sillytavern'],
        stateModule.extensionSettings,
        'Expected global settings to contain the updated extension settings.'
    );
});
