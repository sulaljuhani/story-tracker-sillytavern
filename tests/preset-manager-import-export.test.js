import { test } from 'node:test';
import assert from 'node:assert/strict';

const PRESET_STORAGE_KEY = 'story-tracker-presets';

function createLocalStorageStub(storage = {}) {
    return {
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
        _storage: storage,
    };
}

function createContext() {
    return {
        settings: {},
        chat: {
            metadata: {},
        },
        saveSettingsDebounced() {
            this.settingsSaved = true;
        },
        saveChatDebounced() {
            this.chatSaved = true;
        },
    };
}

test('importPresetFile persists uploaded preset data and updates selection', async t => {
    const originalLocalStorage = globalThis.localStorage;
    const originalSillyTavern = globalThis.SillyTavern;

    const localStorageStub = createLocalStorageStub();
    const context = createContext();

    globalThis.localStorage = localStorageStub;
    globalThis.SillyTavern = {
        getContext: () => context,
    };

    const configModule = await import('../src/core/config.js');
    const stateModule = await import('../src/core/state.js');
    const presetManager = await import('../src/core/presetManager.js');

    const { defaultSettings } = configModule;
    const { setExtensionSettings } = stateModule;

    setExtensionSettings({
        ...defaultSettings,
        trackerData: { sections: [] },
        systemPrompt: '',
        currentPreset: '',
    });

    let renderCalled = false;
    presetManager.setRenderTrackerHandler(() => {
        renderCalled = true;
    });

    const file = {
        name: 'uploaded-preset.json',
        async text() {
            return JSON.stringify({
                name: 'Uploaded Preset',
                systemPrompt: 'Preset prompt from file',
                trackerData: {
                    sections: [
                        {
                            id: 'section_1',
                            name: 'Uploaded Section',
                            fields: [],
                            subsections: [],
                            collapsed: false,
                        },
                    ],
                },
            });
        },
    };

    t.after(() => {
        presetManager.setRenderTrackerHandler();
        globalThis.localStorage = originalLocalStorage;
        globalThis.SillyTavern = originalSillyTavern;
    });

    const importedName = await presetManager.importPresetFile(file);

    assert.equal(importedName, 'Uploaded Preset');
    assert.equal(stateModule.extensionSettings.currentPreset, 'Uploaded Preset');
    assert.deepEqual(stateModule.extensionSettings.trackerData, {
        sections: [
            {
                id: 'section_1',
                name: 'Uploaded Section',
                fields: [],
                subsections: [],
                collapsed: false,
            },
        ],
    });

    assert.ok(renderCalled, 'Expected tracker to re-render after importing a preset.');
    assert.ok(context.settingsSaved, 'Expected preset import to persist extension settings.');
    assert.ok(context.chatSaved, 'Expected preset import to persist chat metadata.');

    const storedPresets = JSON.parse(localStorageStub._storage[PRESET_STORAGE_KEY]);
    assert.ok(storedPresets['Uploaded Preset'], 'Expected imported preset to be saved to localStorage.');
});

test('importPresetFile derives the preset name from the filename when missing', async t => {
    const originalLocalStorage = globalThis.localStorage;
    const originalSillyTavern = globalThis.SillyTavern;

    const localStorageStub = createLocalStorageStub();
    const context = createContext();

    globalThis.localStorage = localStorageStub;
    globalThis.SillyTavern = {
        getContext: () => context,
    };

    const configModule = await import('../src/core/config.js');
    const stateModule = await import('../src/core/state.js');
    const presetManager = await import('../src/core/presetManager.js');

    const { defaultSettings } = configModule;
    const { setExtensionSettings } = stateModule;

    setExtensionSettings({
        ...defaultSettings,
        trackerData: { sections: [] },
        systemPrompt: '',
        currentPreset: '',
    });

    presetManager.setRenderTrackerHandler(() => {});

    const file = {
        name: 'My Fancy Preset.json',
        async text() {
            return JSON.stringify({
                systemPrompt: 'Prompt',
                trackerData: {
                    sections: [],
                },
            });
        },
    };

    t.after(() => {
        presetManager.setRenderTrackerHandler();
        globalThis.localStorage = originalLocalStorage;
        globalThis.SillyTavern = originalSillyTavern;
    });

    const importedName = await presetManager.importPresetFile(file);

    assert.equal(importedName, 'My Fancy Preset');
    assert.equal(stateModule.extensionSettings.currentPreset, 'My Fancy Preset');
    assert.deepEqual(stateModule.extensionSettings.trackerData, { sections: [] });

    const storedPresets = JSON.parse(localStorageStub._storage[PRESET_STORAGE_KEY]);
    assert.ok(storedPresets['My Fancy Preset']);
});

test('exportPresetToFile serializes the selected preset and triggers a download', async t => {
    const originalLocalStorage = globalThis.localStorage;
    const originalDocument = globalThis.document;
    const originalURL = globalThis.URL;
    const originalBlob = globalThis.Blob;

    const storage = {
        [PRESET_STORAGE_KEY]: JSON.stringify({
            'Test Preset': {
                systemPrompt: 'Stored prompt',
                trackerData: { sections: [] },
            },
        }),
    };

    const localStorageStub = createLocalStorageStub(storage);
    globalThis.localStorage = localStorageStub;

    class BlobStub {
        constructor(parts, options) {
            this.parts = parts;
            this.type = options?.type || null;
            BlobStub.instances.push(this);
        }
    }
    BlobStub.instances = [];

    let lastLink = null;
    let appendCalls = 0;
    let removeCalls = 0;
    let clickCalls = 0;
    let revokedUrl = null;

    globalThis.Blob = BlobStub;
    globalThis.document = {
        createElement: tag => {
            if (tag !== 'a') {
                throw new Error('Expected anchor element');
            }
            lastLink = {
                href: '',
                download: '',
                click() {
                    clickCalls += 1;
                },
            };
            return lastLink;
        },
        body: {
            appendChild: element => {
                if (element !== lastLink) {
                    throw new Error('Unexpected element appended');
                }
                appendCalls += 1;
            },
            removeChild: element => {
                if (element !== lastLink) {
                    throw new Error('Unexpected element removed');
                }
                removeCalls += 1;
            },
        },
    };

    globalThis.URL = {
        createObjectURL: blob => {
            assert.ok(blob instanceof BlobStub, 'Expected BlobStub instance.');
            return 'blob:stub';
        },
        revokeObjectURL: url => {
            revokedUrl = url;
        },
    };

    const configModule = await import('../src/core/config.js');
    const stateModule = await import('../src/core/state.js');
    const presetManager = await import('../src/core/presetManager.js');

    const { defaultSettings } = configModule;
    const { setExtensionSettings } = stateModule;

    setExtensionSettings({
        ...defaultSettings,
        trackerData: { sections: [] },
        systemPrompt: '',
        currentPreset: 'Test Preset',
    });

    t.after(() => {
        globalThis.localStorage = originalLocalStorage;
        globalThis.document = originalDocument;
        globalThis.URL = originalURL;
        globalThis.Blob = originalBlob;
    });

    const result = presetManager.exportPresetToFile();

    assert.equal(result, true);
    assert.equal(appendCalls, 1, 'Expected the link to be appended for download.');
    assert.equal(removeCalls, 1, 'Expected the link to be removed after download.');
    assert.equal(clickCalls, 1, 'Expected the download link to be triggered once.');
    assert.equal(revokedUrl, 'blob:stub', 'Expected the object URL to be revoked.');

    assert.ok(lastLink, 'Expected a download link to be created.');
    assert.equal(lastLink.download, 'Test_Preset.json');

    const [blob] = BlobStub.instances;
    assert.ok(blob, 'Expected a blob to be created for export.');
    assert.equal(blob.type, 'application/json');

    const exportedPayload = JSON.parse(blob.parts[0]);
    assert.equal(exportedPayload.name, 'Test Preset');
    assert.equal(exportedPayload.systemPrompt, 'Stored prompt');
    assert.deepEqual(exportedPayload.trackerData, { sections: [] });
    assert.ok(typeof exportedPayload.exportedAt === 'string');
});
