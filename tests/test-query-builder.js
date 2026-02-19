'use strict';

/**
 * Tests for Task 8: QueryBuilder (UI state → query string)
 * Runs in Node.js with minimal DOM shim.
 */

function makeFakeWindow() {
    const doc = {
        readyState: 'complete',
        createElement(tag) {
            const el = {
                tagName: tag.toUpperCase(),
                type: '', className: '', textContent: '', value: '', id: '',
                multiple: false, checked: false, disabled: false,
                children: [], childNodes: [], style: {},
                _listeners: {}, _attributes: {},
                appendChild(child) { child.parentNode = this; this.children.push(child); this.childNodes.push(child); return child; },
                removeChild(child) { this.children = this.children.filter(c => c !== child); this.childNodes = this.childNodes.filter(c => c !== child); return child; },
                insertBefore(newNode, ref) { this.children.push(newNode); this.childNodes.push(newNode); return newNode; },
                addEventListener(evt, fn) { this._listeners[evt] = this._listeners[evt] || []; this._listeners[evt].push(fn); },
                removeEventListener(evt, fn) { if (this._listeners[evt]) this._listeners[evt] = this._listeners[evt].filter(f => f !== fn); },
                setAttribute(k, v) { this._attributes[k] = v; },
                getAttribute(k) { return this._attributes[k] || null; },
                classList: (() => {
                    const classes = [];
                    return {
                        _classes: classes,
                        add(c) { if (!classes.includes(c)) classes.push(c); },
                        remove(c) { const i = classes.indexOf(c); if (i >= 0) classes.splice(i, 1); },
                        toggle(c) { if (classes.includes(c)) this.remove(c); else this.add(c); return classes.includes(c); },
                        contains(c) { return classes.includes(c); },
                    };
                })(),
                querySelectorAll() { return []; },
                querySelector() { return null; },
                parentNode: null, nextSibling: null,
                _fireEvent(evt) { if (this._listeners[evt]) this._listeners[evt].forEach(fn => fn({ target: this })); },
            };
            return el;
        },
        querySelector(sel) {
            if (sel === 'input[name="search"]') {
                const inp = doc.createElement('input');
                inp.getBoundingClientRect = () => ({ bottom: 50, left: 10 });
                inp.parentNode = { insertBefore() {} };
                return inp;
            }
            return null;
        },
        addEventListener() {},
        body: { appendChild() {} },
    };
    return {
        context: {
            extensions: {},
            filterBuilder: {
                feeds: [{ id: 1, name: 'Feed A' }, { id: 2, name: 'Feed B' }],
                categories: [{ id: 10, name: 'Cat X' }],
                labels: [{ id: 100, name: 'Label 1' }],
                userQueries: [{ id: 'q1', name: 'My Query' }],
            },
        },
        document: doc, scrollY: 0, scrollX: 0,
    };
}

// --- Test runner ---
let passed = 0;
let failed = 0;
function assert(cond, msg) {
    if (cond) { passed++; }
    else { failed++; console.error('FAIL:', msg); }
}
function assertEqual(actual, expected, msg) {
    if (actual === expected) { passed++; }
    else { failed++; console.error('FAIL:', msg, '\n  expected:', JSON.stringify(expected), '\n  actual:  ', JSON.stringify(actual)); }
}

// --- Load FilterBuilder ---
const fakeWin = makeFakeWindow();
global.document = fakeWin.document;
global.window = fakeWin;
global.window.document = fakeWin.document;

let FilterBuilder;
try {
    FilterBuilder = require('../static/filter-builder.js');
} catch (e) {
    console.error('Error loading filter-builder.js:', e.message);
    process.exit(1);
}

// ============================================================
// Test 1: QueryBuilder is exported
// ============================================================
assert(FilterBuilder.QueryBuilder !== undefined,
    'FilterBuilder.QueryBuilder should be exported');
assert(typeof FilterBuilder.QueryBuilder === 'object',
    'FilterBuilder.QueryBuilder should be an object');

// Guard
if (!FilterBuilder.QueryBuilder || typeof FilterBuilder.QueryBuilder.build !== 'function') {
    console.log('\n--- QueryBuilder Tests ---');
    console.log('Passed: ' + passed + '/' + (passed + failed));
    console.log('FAIL: QueryBuilder.build not found');
    process.exit(1);
}

var QB = FilterBuilder.QueryBuilder;

// ============================================================
// Test 2: Single group, single condition -> intitle:hello
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'intitle', value: 'hello', negate: false }] }]),
    'intitle:hello',
    'single group single condition'
);

// ============================================================
// Test 3: Single group, multi-condition -> intitle:hello author:Alice
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [
        { operator: 'intitle', value: 'hello', negate: false },
        { operator: 'author', value: 'Alice', negate: false },
    ] }]),
    'intitle:hello author:Alice',
    'single group multi-condition'
);

// ============================================================
// Test 4: Multi-groups -> (group1) OR (group2)
// ============================================================
assertEqual(
    QB.build([
        { negate: false, conditions: [{ operator: 'intitle', value: 'hello', negate: false }] },
        { negate: false, conditions: [{ operator: 'author', value: 'Bob', negate: false }] },
    ]),
    '(intitle:hello) OR (author:Bob)',
    'multi-groups with OR'
);

// ============================================================
// Test 5: Negated condition -> !intitle:spam
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'intitle', value: 'spam', negate: true }] }]),
    '!intitle:spam',
    'negated condition'
);

// ============================================================
// Test 6: Negated group -> !(intitle:hello author:Alice)
// ============================================================
assertEqual(
    QB.build([{ negate: true, conditions: [
        { operator: 'intitle', value: 'hello', negate: false },
        { operator: 'author', value: 'Alice', negate: false },
    ] }]),
    '!(intitle:hello author:Alice)',
    'negated group'
);

// ============================================================
// Test 7: Text with spaces quoted -> author:'Alice Doe'
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'author', value: 'Alice Doe', negate: false }] }]),
    "author:'Alice Doe'",
    'text with spaces quoted'
);

// ============================================================
// Test 8: Regex -> intitle:/^hello/i
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [
        { operator: 'intitle', value: '^hello', negate: false, regex: true, regexModifiers: { i: true, m: false } },
    ] }]),
    'intitle:/^hello/i',
    'regex with i modifier'
);

// ============================================================
// Test 9: Regex with multiple modifiers -> intext:/foo/im
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [
        { operator: 'intext', value: 'foo', negate: false, regex: true, regexModifiers: { i: true, m: true } },
    ] }]),
    'intext:/foo/im',
    'regex with im modifiers'
);

// ============================================================
// Test 10: Regex no modifiers -> intitle:/test/
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [
        { operator: 'intitle', value: 'test', negate: false, regex: true, regexModifiers: { i: false, m: false } },
    ] }]),
    'intitle:/test/',
    'regex no modifiers'
);

// ============================================================
// Test 11: Multi IDs -> f:1,2,3
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'f', values: ['1', '2', '3'], negate: false }] }]),
    'f:1,2,3',
    'multi IDs comma-separated'
);

// ============================================================
// Test 12: Date relative -> date:P7D
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'date', value: 'P7D', negate: false, dateMode: 'relative' }] }]),
    'date:P7D',
    'date relative'
);

// ============================================================
// Test 13: Date range -> date:2024-01-01/2024-03-31
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'date', value: '2024-01-01/2024-03-31', negate: false, dateMode: 'range' }] }]),
    'date:2024-01-01/2024-03-31',
    'date range'
);

// ============================================================
// Test 14: Date point -> date:2024-01
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'date', value: '2024-01', negate: false, dateMode: 'point' }] }]),
    'date:2024-01',
    'date point'
);

// ============================================================
// Test 15: Tag -> #mytag
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'tag', value: 'mytag', negate: false }] }]),
    '#mytag',
    'tag'
);

// ============================================================
// Test 16: Free text -> hello
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'free', value: 'hello', negate: false }] }]),
    'hello',
    'free text'
);

// ============================================================
// Test 17: Empty groups skipped
// ============================================================
assertEqual(
    QB.build([
        { negate: false, conditions: [] },
        { negate: false, conditions: [{ operator: 'intitle', value: 'hello', negate: false }] },
    ]),
    'intitle:hello',
    'empty group skipped'
);

// ============================================================
// Test 18: Empty conditions skipped
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [
        { operator: 'intitle', value: '', negate: false },
        { operator: 'author', value: 'Alice', negate: false },
    ] }]),
    'author:Alice',
    'empty condition skipped'
);

// ============================================================
// Test 19: All empty -> empty string
// ============================================================
assertEqual(
    QB.build([]),
    '',
    'no groups returns empty string'
);

assertEqual(
    QB.build([{ negate: false, conditions: [] }]),
    '',
    'single empty group returns empty string'
);

// ============================================================
// Test 20: Empty multiselect skipped
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [
        { operator: 'f', values: [], negate: false },
        { operator: 'intitle', value: 'hi', negate: false },
    ] }]),
    'intitle:hi',
    'empty multiselect skipped'
);

// ============================================================
// Test 21: Negated condition + spaces -> !author:'Evil Bob'
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'author', value: 'Evil Bob', negate: true }] }]),
    "!author:'Evil Bob'",
    'negated condition with spaces'
);

// ============================================================
// Test 22: Multi-group with negated group
// ============================================================
assertEqual(
    QB.build([
        { negate: false, conditions: [{ operator: 'intitle', value: 'good', negate: false }] },
        { negate: true, conditions: [{ operator: 'intitle', value: 'bad', negate: false }] },
    ]),
    '(intitle:good) OR (!(intitle:bad))',
    'multi-group with one negated'
);

// ============================================================
// Test 23: Saved query -> S:q1
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'S', value: 'q1', negate: false }] }]),
    'S:q1',
    'saved query'
);

// ============================================================
// Test 24: Free text with spaces quoted
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [{ operator: 'free', value: 'hello world', negate: false }] }]),
    "'hello world'",
    'free text with spaces quoted'
);

// ============================================================
// Test 25: Tag with regex -> #/^my/i
// ============================================================
assertEqual(
    QB.build([{ negate: false, conditions: [
        { operator: 'tag', value: '^my', negate: false, regex: true, regexModifiers: { i: true, m: false } },
    ] }]),
    '#/^my/i',
    'tag with regex'
);

// --- Summary ---
console.log('\n--- QueryBuilder Tests ---');
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) {
    console.log('FAIL: ' + failed + ' test(s) failed');
    process.exit(1);
} else {
    console.log('ALL PASS');
}
