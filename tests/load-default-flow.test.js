import { test } from 'node:test';
import assert from 'node:assert/strict';

import { defaultSettings } from '../src/core/config.js';
import { setExtensionSettings } from '../src/core/state.js';
import { populatePresetDropdown, syncPresetSelection } from '../src/core/presetManager.js';
import { DEFAULT_PRESET_NAME } from '../src/core/dataManager.js';

class FakeSelect {
    constructor() {
        this.options = [];
        this.selectedValue = '';
    }

    html(content) {
        if (content === '') {
            this.options = [];
            this.selectedValue = '';
        }
        return this;
    }

    append(htmlString) {
        const valueMatch = htmlString.match(/value="([^"]*)"/);
        const value = valueMatch ? valueMatch[1] : '';
        const isSelected = /\bselected\b/.test(htmlString);
        this.options.push({ value, html: htmlString, selected: isSelected });
        if (isSelected) {
            this.selectedValue = value;
        }
        return this;
    }

    val(newValue) {
        if (typeof newValue === 'undefined') {
            return this.selectedValue;
        }
        this.selectedValue = newValue;
        this.options = this.options.map(option => ({
            ...option,
            selected: option.value === newValue,
        }));
        return this;
    }
}

test('loading the default preset syncs the preset dropdown selection', t => {
    const original$ = globalThis.$;
    const originalLocalStorage = globalThis.localStorage;

    const storage = {};
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

    const select = new FakeSelect();
    globalThis.$ = selector => {
        if (selector === '#story-tracker-preset-select') {
            return select;
        }
        throw new Error(`Unexpected selector: ${selector}`);
    };

    t.after(() => {
        globalThis.$ = original$;
        globalThis.localStorage = originalLocalStorage;
    });

    setExtensionSettings({
        ...defaultSettings,
        currentPreset: '',
        trackerData: { sections: [] },
    });

    localStorage.setItem('story-tracker-presets', JSON.stringify({
        [DEFAULT_PRESET_NAME]: {
            systemPrompt: 'Prompt',
            trackerData: { sections: [] },
        },
    }));

    populatePresetDropdown();
    assert.equal(select.val(), '', 'Expected the preset dropdown to start with no selection.');

    syncPresetSelection(DEFAULT_PRESET_NAME);

    assert.equal(select.val(), DEFAULT_PRESET_NAME, 'Expected the preset dropdown to select the default preset.');
    const defaultOption = select.options.find(option => option.value === DEFAULT_PRESET_NAME);
    assert.ok(defaultOption?.selected, 'Expected the default option to be flagged as selected.');
});
