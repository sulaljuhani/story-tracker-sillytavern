import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolvePromptApi } from '../src/utils/promptApi.js';

function withSillyTavernContext(context, fn) {
    const originalContextGetter = globalThis.SillyTavern;
    const originalFallback = globalThis.__storyTrackerFallbackPromptTypes;

    globalThis.SillyTavern = {
        getContext: () => context,
    };

    try {
        fn();
    } finally {
        if (originalContextGetter === undefined) {
            delete globalThis.SillyTavern;
        } else {
            globalThis.SillyTavern = originalContextGetter;
        }

        if (originalFallback === undefined) {
            delete globalThis.__storyTrackerFallbackPromptTypes;
        } else {
            globalThis.__storyTrackerFallbackPromptTypes = originalFallback;
        }
    }
}

test('resolvePromptApi maps alternate prompt type keys to IN_CHAT', () => {
    const setter = () => {};
    const context = {
        setExtensionPrompt: setter,
        extension_prompt_types: {
            INJECT: 'injection',
            SUMMARY: 'summary',
        },
    };

    withSillyTavernContext(context, () => {
        const result = resolvePromptApi();

        assert.equal(result.setter, setter, 'Expected to receive the SillyTavern setExtensionPrompt function.');
        assert.equal(result.types.IN_CHAT, 'injection', 'Expected IN_CHAT to map to the INJECT prompt channel.');
        assert.equal(result.mappedFrom, 'INJECT', 'Expected resolvePromptApi to report the mapped key.');
        assert.equal(result.usedFallback, false, 'Expected to avoid using the static fallback types.');
    });
});

test('resolvePromptApi falls back when no usable prompt types are exposed', () => {
    const setter = () => {};
    const context = {
        setExtensionPrompt: setter,
    };

    withSillyTavernContext(context, () => {
        const result = resolvePromptApi();

        assert.equal(result.setter, setter, 'Expected to receive the SillyTavern setExtensionPrompt function.');
        assert.equal(result.types.IN_CHAT, 'in_chat', 'Expected fallback prompt type to be used when none are available.');
        assert.equal(result.usedFallback, true, 'Expected usedFallback to flag the fallback usage.');
    });
});
