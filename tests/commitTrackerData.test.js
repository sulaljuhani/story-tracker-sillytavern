import { test } from 'node:test';
import assert from 'node:assert/strict';

import { commitTrackerData } from '../src/systems/integration/sillytavern.js';
import {
    setCommittedTrackerData,
    setLastGeneratedData,
    committedTrackerData,
    lastGeneratedData,
} from '../src/core/state.js';

test('commitTrackerData ignores trailing system messages', t => {
    const originalSillyTavern = globalThis.SillyTavern;

    t.after(() => {
        globalThis.SillyTavern = originalSillyTavern;
        setCommittedTrackerData(null);
        setLastGeneratedData(null);
    });

    setCommittedTrackerData(null);
    setLastGeneratedData(null);

    const trackerData = {
        sections: [
            {
                id: 'section_1',
                name: 'Section',
                fields: [],
                subsections: [],
                collapsed: false,
            },
        ],
    };

    const chat = [
        {
            is_user: false,
            is_system: false,
            swipe_id: 2,
            extra: {
                story_tracker_swipes: {
                    2: {
                        trackerData,
                    },
                },
            },
        },
        {
            is_user: false,
            is_system: true,
            swipe_id: 3,
        },
    ];

    const context = { chat };
    globalThis.SillyTavern = {
        getContext: () => context,
    };

    commitTrackerData();

    assert.deepEqual(
        committedTrackerData,
        trackerData,
        'Expected committed tracker data to come from the last assistant message.',
    );
    assert.deepEqual(
        lastGeneratedData,
        trackerData,
        'Expected last generated tracker data to sync with committed tracker data.',
    );
    assert.notStrictEqual(
        committedTrackerData,
        trackerData,
        'Expected committed data to be cloned instead of reusing the swipe payload reference.',
    );
});
