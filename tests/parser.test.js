import { test } from 'node:test';
import assert from 'node:assert/strict';

import { defaultSettings } from '../src/core/config.js';
import { setExtensionSettings } from '../src/core/state.js';
import { parseResponse } from '../src/systems/generation/parser.js';

function buildSectionField(name, value, prompt = '') {
    return {
        id: `${name}-id`,
        name,
        value,
        prompt,
        type: 'text',
        enabled: true
    };
}

test('parseResponse updates section-level field values from JSON snippet', () => {
    const originalTracker = {
        sections: [
            {
                id: 'section-1',
                name: 'Overview',
                fields: [buildSectionField('Summary', 'Old summary', 'Keep a short summary')],
                subsections: [],
                collapsed: false
            }
        ]
    };

    setExtensionSettings({
        ...defaultSettings,
        trackerData: JSON.parse(JSON.stringify(originalTracker))
    });

    const updatedValue = 'Freshly updated summary';
    const updatedSnippet = {
        sections: [
            {
                name: 'Overview',
                fields: {
                    Summary: {
                        prompt: 'Keep a short summary',
                        value: updatedValue
                    }
                }
            }
        ]
    };

    const responseText = `Here is the tracker update.\n\n\`\`\`json\n${JSON.stringify(updatedSnippet, null, 2)}\n\`\`\`\n`;

    const { trackerData } = parseResponse(responseText);

    assert.ok(trackerData, 'Expected tracker data to be parsed');
    assert.equal(trackerData.sections.length, 1);
    assert.equal(trackerData.sections[0].fields.length, 1);
    assert.equal(trackerData.sections[0].fields[0].value, updatedValue);
});
