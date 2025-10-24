import { strict as assert } from 'node:assert';
import { renderField } from '../src/systems/rendering/tracker.js';

function stripWhitespace(value) {
    return value.replace(/\s+/g, ' ');
}

const baseField = {
    id: 'field-id',
    name: 'Field',
    enabled: true,
};

const numberFieldHtml = renderField({ ...baseField, id: 'number', value: 0 });
assert.ok(stripWhitespace(numberFieldHtml).includes('>0<'), 'Numeric zero should be displayed as 0');

const booleanFieldHtml = renderField({ ...baseField, id: 'boolean', value: false });
assert.ok(stripWhitespace(booleanFieldHtml).includes('>false<'), 'Boolean false should be displayed as false');

const nullFieldHtml = renderField({ ...baseField, id: 'null', value: null });
assert.ok(stripWhitespace(nullFieldHtml).includes('>...<'), 'Null value should fall back to ellipsis');

const emptyStringFieldHtml = renderField({ ...baseField, id: 'empty', value: '' });
assert.ok(stripWhitespace(emptyStringFieldHtml).includes('>...<'), 'Empty string should fall back to ellipsis');
