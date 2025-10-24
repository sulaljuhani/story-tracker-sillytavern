// Shared prompt API helpers used by the injector and SillyTavern integration

var storyTrackerPromptApi = globalThis.storyTrackerPromptApi || (globalThis.storyTrackerPromptApi = (() => {
    function getSillyTavernContext() {
        return globalThis.SillyTavern?.getContext?.();
    }

    function coercePromptTypes(rawTypes) {
        if (rawTypes === null || rawTypes === undefined) {
            return { types: null, mappedFrom: null };
        }

        const candidateKeys = [
            'IN_CHAT',
            'INJECT',
            'INJECTION',
            'INSTRUCT',
            'INSTRUCTION',
            'CHAT',
            'PROMPT',
            'DEFAULT',
        ];

        const extractedEntries = [];

        const registerEntry = (keyCandidate, valueCandidate, mappedFrom) => {
            if (typeof valueCandidate !== 'string' || valueCandidate.length === 0) {
                return;
            }

            const normalizedKey = typeof keyCandidate === 'string' && keyCandidate.length > 0
                ? keyCandidate.toUpperCase()
                : null;

            extractedEntries.push({
                key: normalizedKey,
                value: valueCandidate,
                mappedFrom: mappedFrom ?? keyCandidate ?? normalizedKey,
            });
        };

        const extractObjectValue = (candidate) => {
            if (!candidate || typeof candidate !== 'object') {
                return null;
            }

            const valueKeys = ['value', 'id', 'type', 'channel', 'prompt', 'name', 'key'];
            for (const key of valueKeys) {
                const maybeValue = candidate[key];
                if (typeof maybeValue === 'string' && maybeValue.length > 0) {
                    return maybeValue;
                }
            }

            return null;
        };

        const extractObjectKey = (candidate, fallback) => {
            if (typeof fallback === 'string' && fallback.length > 0) {
                return fallback;
            }

            if (!candidate || typeof candidate !== 'object') {
                return null;
            }

            const keyCandidates = ['key', 'name', 'id', 'type', 'channel', 'prompt'];
            for (const key of keyCandidates) {
                const maybeKey = candidate[key];
                if (typeof maybeKey === 'string' && maybeKey.length > 0) {
                    return maybeKey;
                }
            }

            return null;
        };

        if (Array.isArray(rawTypes)) {
            for (const entry of rawTypes) {
                if (typeof entry === 'string') {
                    registerEntry(entry, entry, entry);
                    continue;
                }

                if (!entry || typeof entry !== 'object') {
                    continue;
                }

                const value = extractObjectValue(entry);
                if (!value) {
                    continue;
                }

                const key = extractObjectKey(entry, entry.key ?? entry.id ?? entry.name);
                registerEntry(key ?? value, value, key ?? entry.key ?? entry.id ?? entry.name);
            }
        } else if (typeof rawTypes === 'object') {
            for (const [key, value] of Object.entries(rawTypes)) {
                if (typeof value === 'string') {
                    registerEntry(key, value, key);
                    continue;
                }

                const extracted = extractObjectValue(value);
                if (!extracted) {
                    continue;
                }

                registerEntry(key, extracted, key);
            }
        } else if (typeof rawTypes === 'string') {
            registerEntry(rawTypes, rawTypes, rawTypes);
        }

        if (extractedEntries.length === 0) {
            return { types: null, mappedFrom: null };
        }

        const normalizedTypes = {};
        for (const entry of extractedEntries) {
            if (typeof entry.mappedFrom === 'string' && entry.mappedFrom.length > 0) {
                normalizedTypes[entry.mappedFrom] = entry.value;
            }

            if (entry.key && entry.key !== entry.mappedFrom) {
                normalizedTypes[entry.key] = entry.value;
            }
        }

        let selectedEntry = null;
        for (const candidate of candidateKeys) {
            selectedEntry = extractedEntries.find((entry) => entry.key === candidate);
            if (selectedEntry) {
                break;
            }
        }

        if (!selectedEntry) {
            selectedEntry = extractedEntries[0];
        }

        if (!selectedEntry || typeof selectedEntry.value !== 'string') {
            return { types: null, mappedFrom: null };
        }

        normalizedTypes.IN_CHAT = selectedEntry.value;

        return {
            types: normalizedTypes,
            mappedFrom: selectedEntry.mappedFrom ?? selectedEntry.key ?? null,
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
