'use strict';

/**
 * Tests for Task 5: OperatorRegistry
 * Runs in Node.js with jsdom-like minimal DOM shim.
 */

// Minimal DOM shim for Node.js
const { JSDOM } = (() => {
    try { return require('jsdom'); } catch (_) {
        // Inline minimal shim if jsdom not available
        return {
            JSDOM: class {
                constructor(html) {
                    this._html = html;
                }
                get window() {
                    return makeFakeWindow();
                }
            }
        };
    }
})();

function makeFakeWindow() {
    const elements = {};
    const listeners = {};

    const doc = {
        readyState: 'complete',
        createElement(tag) {
            const el = {
                tagName: tag.toUpperCase(),
                type: '',
                className: '',
                textContent: '',
                value: '',
                id: '',
                multiple: false,
                children: [],
                childNodes: [],
                style: {},
                _listeners: {},
                _attributes: {},
                appendChild(child) { this.children.push(child); this.childNodes.push(child); return child; },
                insertBefore(newNode, ref) { this.children.push(newNode); return newNode; },
                addEventListener(evt, fn) { this._listeners[evt] = this._listeners[evt] || []; this._listeners[evt].push(fn); },
                setAttribute(k, v) { this._attributes[k] = v; },
                getAttribute(k) { return this._attributes[k] || null; },
                classList: {
                    _classes: [],
                    add(c) { this._classes.push(c); },
                    remove(c) { this._classes = this._classes.filter(x => x !== c); },
                    toggle(c) { if (this._classes.includes(c)) this.remove(c); else this.add(c); },
                    contains(c) { return this._classes.includes(c); },
                },
                querySelectorAll() { return []; },
                querySelector() { return null; },
                parentNode: null,
                nextSibling: null,
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
        addEventListener(evt, fn) { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
        body: {
            appendChild(child) {},
        },
    };

    const win = {
        context: {
            extensions: {},
            filterBuilder: {
                feeds: [{ id: 1, name: 'Feed A' }, { id: 2, name: 'Feed B' }],
                categories: [{ id: 10, name: 'Cat X' }],
                labels: [{ id: 100, name: 'Label 1' }],
                userQueries: [{ id: 'q1', name: 'My Query' }],
            },
        },
        document: doc,
        scrollY: 0,
        scrollX: 0,
    };

    return win;
}

// --- Test runner ---
let passed = 0;
let failed = 0;
function assert(cond, msg) {
    if (cond) { passed++; }
    else { failed++; console.error('FAIL:', msg); }
}

// --- Load FilterBuilder in fake DOM ---
const fakeWin = makeFakeWindow();
const origGlobal = {};
['document', 'window', 'context'].forEach(k => { origGlobal[k] = global[k]; });

global.document = fakeWin.document;
global.window = fakeWin;
global.window.document = fakeWin.document;

let FilterBuilder;
try {
    FilterBuilder = require('../static/filter-builder.js');
    if (typeof FilterBuilder === 'object' && FilterBuilder.default) {
        FilterBuilder = FilterBuilder.default;
    }
} catch (e) {
    console.error('Error loading filter-builder.js:', e.message);
    process.exit(1);
}

// --- Tests ---

// Test 1: FilterBuilder exposes getOperatorRegistry
assert(typeof FilterBuilder === 'object', 'FilterBuilder should be an object');
assert(typeof FilterBuilder.getOperatorRegistry === 'function', 'FilterBuilder.getOperatorRegistry should be a function');

const registry = FilterBuilder.getOperatorRegistry ? FilterBuilder.getOperatorRegistry() : null;

// Test 2: Registry is an array with 15 entries
assert(Array.isArray(registry), 'registry should be an array');
assert(registry && registry.length === 15, 'registry should have 15 entries, got ' + (registry ? registry.length : 0));

// Test 3: Required keys on every entry
const requiredOperators = ['intitle', 'intext', 'inurl', 'author', 'tag', 'free', 'f', 'c', 'L', 'label', 'e', 'date', 'pubdate', 'userdate', 'S'];
if (registry) {
    const registryKeys = registry.map(op => op.key);
    requiredOperators.forEach(k => {
        assert(registryKeys.includes(k), 'registry should contain operator: ' + k);
    });

    // Test 4: Each entry has key, label, valueType, prefix
    registry.forEach(op => {
        assert(typeof op.key === 'string' && op.key.length > 0, op.key + ' should have key');
        assert(typeof op.label === 'string' && op.label.length > 0, op.key + ' should have label');
        assert(typeof op.i18nKey === 'string' && op.i18nKey.indexOf('operator_') === 0, op.key + ' should have i18nKey');
        assert(['text', 'multiselect', 'date', 'savedquery'].includes(op.valueType), op.key + ' valueType should be text|multiselect|date|savedquery, got ' + op.valueType);
        assert(typeof op.prefix === 'string', op.key + ' should have prefix (string)');
    });

    // Test 5: Text-type operators have supportsRegex: true
    const textOps = registry.filter(op => op.valueType === 'text');
    textOps.forEach(op => {
        assert(op.supportsRegex === true, op.key + ' (text) should have supportsRegex: true');
    });

    // Test 6: Multiselect operators have dataKey
    const multiselectOps = registry.filter(op => op.valueType === 'multiselect');
    const expectedMultiselect = ['f', 'c', 'L', 'label'];
    expectedMultiselect.forEach(k => {
        const op = registry.find(o => o.key === k);
        assert(op && op.valueType === 'multiselect', k + ' should be multiselect');
        assert(op && typeof op.dataKey === 'string', k + ' should have dataKey');
    });

    // Test 7: Date operators have dateModes
    const dateOps = registry.filter(op => op.valueType === 'date');
    dateOps.forEach(op => {
        assert(Array.isArray(op.dateModes), op.key + ' should have dateModes array');
        assert(op.dateModes && op.dateModes.includes('relative'), op.key + ' dateModes should include relative');
        assert(op.dateModes && op.dateModes.includes('range'), op.key + ' dateModes should include range');
        assert(op.dateModes && op.dateModes.includes('point'), op.key + ' dateModes should include point');
    });

    // Test 8: savedquery operator (S)
    const savedOp = registry.find(op => op.key === 'S');
    assert(savedOp && savedOp.valueType === 'savedquery', 'S should be savedquery type');
}

// Test 9: renderValueInput exists and returns DOM elements
assert(typeof FilterBuilder.renderValueInput === 'function', 'FilterBuilder.renderValueInput should be a function');

if (typeof FilterBuilder.renderValueInput === 'function' && registry) {
    // Test text input
    const textOp = registry.find(op => op.valueType === 'text');
    if (textOp) {
        const textEl = FilterBuilder.renderValueInput(textOp, { value: '' }, function() {});
        assert(textEl && textEl.tagName === 'INPUT', 'text renderValueInput should return INPUT, got ' + (textEl ? textEl.tagName : 'null'));
    }

    // Test multiselect input
    const msOp = registry.find(op => op.valueType === 'multiselect');
    if (msOp) {
        const msEl = FilterBuilder.renderValueInput(msOp, { values: [] }, function() {});
        assert(msEl && msEl.tagName === 'SELECT', 'multiselect renderValueInput should return SELECT, got ' + (msEl ? msEl.tagName : 'null'));
        assert(msEl && msEl.multiple === true, 'multiselect SELECT should have multiple=true');
    }

    // Test date input
    const dateOp = registry.find(op => op.valueType === 'date');
    if (dateOp) {
        const dateEl = FilterBuilder.renderValueInput(dateOp, { dateMode: 'relative' }, function() {});
        assert(dateEl && dateEl.tagName === 'DIV', 'date renderValueInput should return DIV container, got ' + (dateEl ? dateEl.tagName : 'null'));
    }

    // Test savedquery input
    const sqOp = registry.find(op => op.valueType === 'savedquery');
    if (sqOp) {
        const sqEl = FilterBuilder.renderValueInput(sqOp, { value: '' }, function() {});
        assert(sqEl && sqEl.tagName === 'SELECT', 'savedquery renderValueInput should return SELECT, got ' + (sqEl ? sqEl.tagName : 'null'));
        assert(!sqEl || sqEl.multiple !== true, 'savedquery SELECT should NOT be multiple');
    }
}

// --- Summary ---
console.log('\n--- OperatorRegistry Tests ---');
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) {
    console.log('FAIL: ' + failed + ' test(s) failed');
    process.exit(1);
} else {
    console.log('ALL PASS');
}
