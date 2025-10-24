import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateTrackerPrompt } from '../src/systems/generation/promptBuilder.js';
import { setExtensionSettings, setCommittedTrackerData } from '../src/core/state.js';
import { defaultSettings } from '../src/core/config.js';

const sampleTracker = {
    sections: [
        {
            id: 'section_1',
            name: 'Crew Status',
            fields: [
                {
                    id: 'field_1',
                    name: 'Morale',
                    value: 'Hopeful',
                    prompt: 'Overall morale of the crew.'
                }
            ],
            subsections: [
                {
                    id: 'subsection_1',
                    name: 'Health',
                    fields: [
                        {
                            id: 'field_2',
                            name: 'Injuries',
                            value: 'None',
                            prompt: 'Notable wounds or medical concerns.'
                        }
                    ]
                }
            ]
        }
    ]
};

test('generateTrackerPrompt emphasises mandatory tracker JSON block', t => {
    t.after(() => {
        setExtensionSettings({ ...defaultSettings });
        setCommittedTrackerData(null);
    });

    setExtensionSettings({
        ...defaultSettings,
        trackerData: sampleTracker,
        generationMode: 'together'
    });
    setCommittedTrackerData(sampleTracker);

    const prompt = generateTrackerPrompt(false, null, { includeNarrative: true });

    assert.match(
        prompt,
        /Your reply MUST begin with a single ```json code block that contains the entire tracker data\./,
        'Prompt should explicitly require the assistant to begin with a tracker JSON code block.'
    );
    assert.match(
        prompt,
        /Even if no values change, repeat the tracker exactly as provided inside that code block/,
        'Prompt should require repeating the tracker data even when unchanged.'
    );
    assert.match(
        prompt,
        /After closing the code block, continue the narrative in a new paragraph/,
        'Prompt should explain how the narrative must follow the code block.'
    );
    assert.match(
        prompt,
        /"Morale": \{\s+"prompt": "Overall morale of the crew.",\s+"value": "Hopeful"/,
        'Prompt should embed the current tracker state so the model can update it.'
    );
});
