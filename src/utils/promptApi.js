// Shared prompt API helpers used by the injector and SillyTavern integration

var storyTrackerPromptApi = globalThis.storyTrackerPromptApi || (globalThis.storyTrackerPromptApi = (() => {
    function getSillyTavernContext() {
        return globalThis.SillyTavern?.getContext?.();
    }

    function coercePromptTypes(rawTypes) {
        if (!rawTypes || typeof rawTypes !== 'object') {
            return { types: null, mappedFrom: null };
        }

        const candidates = [
            'IN_CHAT',
            'INJECT',
            'INJECTION',
            'INSTRUCT',
            'INSTRUCTION',
            'CHAT',
            'PROMPT',
            'DEFAULT',
        ];

        let effectiveKey = null;

        for (const key of candidates) {
            if (typeof rawTypes[key] === 'string' && rawTypes[key].length > 0) {
                effectiveKey = key;
                break;
            }
        }

        if (!effectiveKey) {
            for (const [key, value] of Object.entries(rawTypes)) {
                if (typeof value === 'string' && value.length > 0) {
                    effectiveKey = key;
                    break;
                }
            }
        }

        if (!effectiveKey) {
            return { types: null, mappedFrom: null };
        }

        if (effectiveKey === 'IN_CHAT') {
            return { types: rawTypes, mappedFrom: effectiveKey };
        }

        return {
            types: { ...rawTypes, IN_CHAT: rawTypes[effectiveKey] },
            mappedFrom: effectiveKey,
        };
    }

    function resolvePromptApi() {
        const context = getSillyTavernContext();
        const setter = context?.setExtensionPrompt
            || context?.modules?.extensions?.setExtensionPrompt
            || globalThis.setExtensionPrompt;

        const rawTypes = context?.extension_prompt_types
            || context?.extensionPromptTypes
            || context?.modules?.extensions?.extension_prompt_types
            || context?.modules?.extensions?.extensionPromptTypes
            || globalThis.extension_prompt_types
            || globalThis.extensionPromptTypes;

        let usedFallback = false;
        let mappedFrom = null;

        const { types: coercedTypes, mappedFrom: mappedKey } = coercePromptTypes(rawTypes);

        let types = coercedTypes;
        mappedFrom = mappedKey;

        if (!types?.IN_CHAT) {
            if (!globalThis.__storyTrackerFallbackPromptTypes) {
                globalThis.__storyTrackerFallbackPromptTypes = { IN_CHAT: 'in_chat' };
            }
            types = globalThis.__storyTrackerFallbackPromptTypes;
            usedFallback = true;
        }

        return { setter, types, usedFallback, mappedFrom };
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

    return {
        getSillyTavernContext,
        resolvePromptApi,
        callSetExtensionPrompt
    };
})());

export function getSillyTavernContext() {
    return storyTrackerPromptApi.getSillyTavernContext();
}

export function resolvePromptApi() {
    return storyTrackerPromptApi.resolvePromptApi();
}

export function callSetExtensionPrompt(setter, id, value, type, priority = 0, shouldAppend = false) {
    return storyTrackerPromptApi.callSetExtensionPrompt(setter, id, value, type, priority, shouldAppend);
}
