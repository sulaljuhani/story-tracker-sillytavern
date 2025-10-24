/**
 * Serialization helpers for Story Tracker data structures.
 * Only JSON is supported.
 */

const JSON_INDENT = 2;
const FORMAT_JSON = 'json';

function serializeTrackerData(data) {
    return JSON.stringify(data, null, JSON_INDENT);
}

function parseTrackerData(text) {
    return JSON.parse(text);
}

export {
    FORMAT_JSON,
    serializeTrackerData,
    parseTrackerData
};
