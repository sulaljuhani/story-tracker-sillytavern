import test from 'node:test';
import assert from 'node:assert/strict';
import * as trackerModule from '../src/systems/rendering/tracker.js';
import * as stateModule from '../src/core/state.js';

const { moveFieldWithinContainer } = trackerModule.__testables;

function buildField(id, name) {
    return { id, name };
}

test('moveFieldWithinContainer reorders fields within a section', () => {
    stateModule.extensionSettings.trackerData = {
        sections: [
            {
                id: 'section-1',
                name: 'Section 1',
                fields: [
                    buildField('field-1', 'First'),
                    buildField('field-2', 'Second'),
                    buildField('field-3', 'Third'),
                ],
                subsections: [],
            },
        ],
    };

    moveFieldWithinContainer('section-1', null, 'field-1', 2);

    const reorderedIds = stateModule.extensionSettings.trackerData.sections[0].fields.map(field => field.id);
    assert.deepStrictEqual(reorderedIds, ['field-2', 'field-3', 'field-1']);
});

test('moveFieldWithinContainer reorders fields within a subsection', () => {
    stateModule.extensionSettings.trackerData = {
        sections: [
            {
                id: 'section-1',
                name: 'Section 1',
                fields: [],
                subsections: [
                    {
                        id: 'sub-1',
                        name: 'Subsection',
                        fields: [
                            buildField('sub-field-1', 'Alpha'),
                            buildField('sub-field-2', 'Beta'),
                            buildField('sub-field-3', 'Gamma'),
                        ],
                    },
                ],
            },
        ],
    };

    moveFieldWithinContainer('section-1', 'sub-1', 'sub-field-3', 0);

    const subsection = stateModule.extensionSettings.trackerData.sections[0].subsections[0];
    const reorderedIds = subsection.fields.map(field => field.id);
    assert.deepStrictEqual(reorderedIds, ['sub-field-3', 'sub-field-1', 'sub-field-2']);
});
