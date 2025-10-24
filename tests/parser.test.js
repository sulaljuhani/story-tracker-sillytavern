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

test('parseResponse preserves falsy section-level values returned by the model', () => {
    const originalTracker = {
        sections: [
            {
                id: 'section-1',
                name: 'Overview',
                fields: [buildSectionField('Counter', 99, 'A running count of clues')],
                subsections: [],
                collapsed: false
            }
        ]
    };

    setExtensionSettings({
        ...defaultSettings,
        trackerData: JSON.parse(JSON.stringify(originalTracker))
    });

    const updatedSnippet = {
        sections: [
            {
                name: 'Overview',
                fields: {
                    Counter: {
                        prompt: 'A running count of clues',
                        value: 0
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
    assert.equal(trackerData.sections[0].fields[0].value, 0);
});

test('parseResponse preserves falsy subsection values returned by the model', () => {
    const originalTracker = {
        sections: [
            {
                id: 'section-1',
                name: 'Overview',
                fields: [],
                subsections: [
                    {
                        id: 'subsection-1',
                        name: 'Flags',
                        fields: [buildSectionField('HasKeyItem', true, 'Whether the party has the key item')],
                        collapsed: false
                    }
                ],
                collapsed: false
            }
        ]
    };

    setExtensionSettings({
        ...defaultSettings,
        trackerData: JSON.parse(JSON.stringify(originalTracker))
    });

    const updatedSnippet = {
        sections: [
            {
                name: 'Overview',
                subsections: [
                    {
                        name: 'Flags',
                        fields: {
                            HasKeyItem: {
                                prompt: 'Whether the party has the key item',
                                value: false
                            }
                        }
                    }
                ]
            }
        ]
    };

    const responseText = `Here is the tracker update.\n\n\`\`\`json\n${JSON.stringify(updatedSnippet, null, 2)}\n\`\`\`\n`;

    const { trackerData } = parseResponse(responseText);

    assert.ok(trackerData, 'Expected tracker data to be parsed');
    assert.equal(trackerData.sections.length, 1);
    assert.equal(trackerData.sections[0].subsections.length, 1);
    assert.equal(trackerData.sections[0].subsections[0].fields.length, 1);
    assert.equal(trackerData.sections[0].subsections[0].fields[0].value, false);
});

test('parseResponse retains sections and subsections omitted by the model', () => {
    const originalTracker = {
        sections: [
            {
                id: 'section-1',
                name: 'Overview',
                fields: [
                    buildSectionField('Summary', 'Old summary', 'Keep a short summary')
                ],
                subsections: [
                    {
                        id: 'subsection-1',
                        name: 'Flags',
                        fields: [buildSectionField('HasKeyItem', true, 'Whether the party has the key item')],
                        collapsed: false
                    }
                ],
                collapsed: false
            },
            {
                id: 'section-2',
                name: 'Allies',
                fields: [buildSectionField('Latest Ally', 'Ragnar', 'Who most recently joined the party')],
                subsections: [
                    {
                        id: 'subsection-2',
                        name: 'Notes',
                        fields: [buildSectionField('Reminder', 'Bring supplies', 'Outstanding to-dos for the group')],
                        collapsed: false
                    }
                ],
                collapsed: false
            }
        ]
    };

    setExtensionSettings({
        ...defaultSettings,
        trackerData: JSON.parse(JSON.stringify(originalTracker))
    });

    const updatedSnippet = {
        sections: [
            {
                name: 'Overview',
                fields: {
                    Summary: {
                        prompt: 'Keep a short summary',
                        value: 'Freshly updated summary'
                    }
                }
            }
        ]
    };

    const responseText = `Tracker update incoming.\n\n\`\`\`json\n${JSON.stringify(updatedSnippet, null, 2)}\n\`\`\`\n`;

    const { trackerData } = parseResponse(responseText);

    assert.ok(trackerData, 'Expected tracker data to be parsed');
    assert.equal(trackerData.sections.length, 2, 'Expected both original sections to remain');

    const overview = trackerData.sections.find(section => section.name === 'Overview');
    const allies = trackerData.sections.find(section => section.name === 'Allies');

    assert.ok(overview, 'Overview section should exist');
    assert.ok(allies, 'Allies section should exist');

    assert.equal(overview.fields[0].value, 'Freshly updated summary');
    assert.equal(overview.subsections[0].fields[0].value, true, 'Overview subsection field should remain unchanged');

    assert.equal(allies.fields[0].value, 'Ragnar', 'Allies section field should be preserved when omitted');
    assert.equal(allies.subsections[0].fields[0].value, 'Bring supplies', 'Allies subsection field should be preserved when omitted');
});

test('parseResponse accepts tracker sections returned as an object map with array fields', () => {
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

    const updatedValue = 'Map based summary';
    const updatedSnippet = {
        sections: {
            Overview: {
                fields: [
                    {
                        name: 'Summary',
                        value: updatedValue,
                        prompt: 'Keep a short summary'
                    }
                ]
            }
        }
    };

    const responseText = `Tracker update incoming.\n\n\`\`\`json\n${JSON.stringify(updatedSnippet, null, 2)}\n\`\`\`\n`;

    const { trackerData } = parseResponse(responseText);

    assert.ok(trackerData, 'Expected tracker data to be parsed');
    assert.equal(trackerData.sections[0].fields[0].value, updatedValue);
});

test('parseResponse accepts direct scalar field values from the model', () => {
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

    const updatedValue = 'Scalar summary value';
    const updatedSnippet = {
        sections: [
            {
                name: 'Overview',
                fields: {
                    Summary: updatedValue
                }
            }
        ]
    };

    const responseText = `Tracker update incoming.\n\n\`\`\`json\n${JSON.stringify(updatedSnippet, null, 2)}\n\`\`\`\n`;

    const { trackerData } = parseResponse(responseText);

    assert.ok(trackerData, 'Expected tracker data to be parsed');
    assert.equal(trackerData.sections[0].fields[0].value, updatedValue);
});

test('parseResponse extracts tracker data nested under tracker key', () => {
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

    const updatedValue = 'Nested tracker summary';
    const updatedSnippet = {
        tracker: {
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
        }
    };

    const responseText = `Tracker update incoming.\n\n\`\`\`json\n${JSON.stringify(updatedSnippet, null, 2)}\n\`\`\`\n`;

    const { trackerData } = parseResponse(responseText);

    assert.ok(trackerData, 'Expected tracker data to be parsed');
    assert.equal(trackerData.sections[0].fields[0].value, updatedValue);
});
