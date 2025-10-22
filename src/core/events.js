/**
 * Core Events Module
 * Wrapper for SillyTavern event system
 */

/**
 * Register an event handler
 * @param {string} eventType - Event type from event_types
 * @param {Function} handler - Event handler function
 */
export function on(eventType, handler) {
    const st = SillyTavern.getContext();
    st.eventSource.on(eventType, handler);
}

/**
 * Register a one-time event handler
 * @param {string} eventType - Event type from event_types
 * @param {Function} handler - Event handler function
 */
export function once(eventType, handler) {
    const st = SillyTavern.getContext();
    st.eventSource.once(eventType, handler);
}

/**
 * Remove an event handler
 * @param {string} eventType - Event type from event_types
 * @param {Function} handler - Event handler function to remove
 */
export function off(eventType, handler) {
    const st = SillyTavern.getContext();
    st.eventSource.off(eventType, handler);
}

/**
 * Emit an event
 * @param {string} eventType - Event type to emit
 * @param {...*} args - Arguments to pass to handlers
 */
export function emit(eventType, ...args) {
    const st = SillyTavern.getContext();
    st.eventSource.emit(eventType, ...args);
}

// Store registered handlers for cleanup
const registeredHandlers = new Map();

/**
 * Registers all extension event handlers
 * @param {Object} handlers - Map of event types to handler functions or arrays of handler functions
 * @example
 * registerAllEvents({
 *     [event_types.MESSAGE_SENT]: onMessageSent,
 *     [event_types.CHAT_CHANGED]: [onCharacterChanged, updatePersonaAvatar]
 * });
 */
export function registerAllEvents(handlers) {
    const st = SillyTavern.getContext();
    for (const [eventType, handler] of Object.entries(handlers)) {
        // Handler can be a single function or an array of functions
        const handlerArray = Array.isArray(handler) ? handler : [handler];

        for (const handlerFn of handlerArray) {
            st.eventSource.on(eventType, handlerFn);

            // Store for later cleanup
            if (!registeredHandlers.has(eventType)) {
                registeredHandlers.set(eventType, []);
            }
            registeredHandlers.get(eventType).push(handlerFn);
        }
    }
}

/**
 * Unregisters all extension event handlers (for cleanup/reload)
 */
export function unregisterAllEvents() {
    const st = SillyTavern.getContext();
    for (const [eventType, handlers] of registeredHandlers.entries()) {
        for (const handler of handlers) {
            st.eventSource.off(eventType, handler);
        }
    }
    registeredHandlers.clear();
}
