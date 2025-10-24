// Shared prompt API helpers used by the injector and SillyTavern integration

var storyTrackerPromptApi = globalThis.storyTrackerPromptApi || (globalThis.storyTrackerPromptApi = (() => {
    function getSillyTavernContext() {
        return globalThis.SillyTavern?.getContext?.();
    }

    function resolvePromptApi() {
        const context = getSillyTavernContext();
        const setter = context?.setExtensionPrompt || globalThis.setExtensionPrompt;
        const rawTypes = context?.extension_prompt_types || globalThis.extension_prompt_types;

        let types = rawTypes;
        let usedFallback = false;

        if (!types?.IN_CHAT) {
            if (!globalThis.__storyTrackerFallbackPromptTypes) {
                globalThis.__storyTrackerFallbackPromptTypes = { IN_CHAT: 'in_chat' };
            }
            types = globalThis.__storyTrackerFallbackPromptTypes;
            usedFallback = true;
        }

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
