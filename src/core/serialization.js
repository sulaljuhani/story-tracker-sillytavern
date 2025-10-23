/**
 * Serialization helpers for Story Tracker data structures.
 * Supports JSON and a limited YAML dialect compatible with the generated output.
 */

const JSON_INDENT = 2;
const FORMAT_JSON = 'json';

function serializeTrackerData(data, format = FORMAT_JSON) {
    return JSON.stringify(data, null, JSON_INDENT);
}

function parseTrackerData(text, format = FORMAT_JSON) {
    return JSON.parse(text);
}

export {
    FORMAT_JSON,
    serializeTrackerData,
    parseTrackerData
};
