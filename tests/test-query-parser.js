'use strict';

/**
 * Tests for Task 9: QueryParser (query string → UI state)
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
function assertDeepEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a === b) { passed++; }
    else { failed++; console.error('FAIL:', msg, '\n  expected:', b, '\n  actual:  ', a); }
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
// Test 1: QueryParser is exported
// ============================================================
assert(FilterBuilder.QueryParser !== undefined,
    'FilterBuilder.QueryParser should be exported');
assert(typeof FilterBuilder.QueryParser === 'object',
    'FilterBuilder.QueryParser should be an object');

// Guard
if (!FilterBuilder.QueryParser || typeof FilterBuilder.QueryParser.parse !== 'function') {
    console.log('\n--- QueryParser Tests ---');
    console.log('Passed: ' + passed + '/' + (passed + failed));
    console.log('FAIL: QueryParser.parse not found');
    process.exit(1);
}

var QP = FilterBuilder.QueryParser;

// ============================================================
// Test 2: Empty input returns at least one group
// ============================================================
var r2 = QP.parse('');
assert(r2.groups.length >= 1, 'empty input returns at least one group');
assertEqual(r2.groups[0].conditions.length, 0, 'empty input group has no conditions');

// ============================================================
// Test 3: Flat AND - intitle:hello author:Alice -> 1 group, 2 conditions
// ============================================================
var r3 = QP.parse('intitle:hello author:Alice');
assertEqual(r3.groups.length, 1, 'flat AND: 1 group');
assertEqual(r3.groups[0].conditions.length, 2, 'flat AND: 2 conditions');
assertEqual(r3.groups[0].conditions[0].operator, 'intitle', 'flat AND: first op is intitle');
assertEqual(r3.groups[0].conditions[0].value, 'hello', 'flat AND: first value is hello');
assertEqual(r3.groups[0].conditions[1].operator, 'author', 'flat AND: second op is author');
assertEqual(r3.groups[0].conditions[1].value, 'Alice', 'flat AND: second value is Alice');

// ============================================================
// Test 4: OR groups - (intitle:hello) OR (author:Bob) -> 2 groups
// ============================================================
var r4 = QP.parse('(intitle:hello) OR (author:Bob)');
assertEqual(r4.groups.length, 2, 'OR groups: 2 groups');
assertEqual(r4.groups[0].conditions[0].operator, 'intitle', 'OR groups: g0 op');
assertEqual(r4.groups[0].conditions[0].value, 'hello', 'OR groups: g0 val');
assertEqual(r4.groups[1].conditions[0].operator, 'author', 'OR groups: g1 op');
assertEqual(r4.groups[1].conditions[0].value, 'Bob', 'OR groups: g1 val');

// ============================================================
// Test 5: Negated condition - !intitle:spam
// ============================================================
var r5 = QP.parse('!intitle:spam');
assertEqual(r5.groups[0].conditions[0].negate, true, 'negated condition: negate=true');
assertEqual(r5.groups[0].conditions[0].operator, 'intitle', 'negated condition: op=intitle');
assertEqual(r5.groups[0].conditions[0].value, 'spam', 'negated condition: value=spam');

// ============================================================
// Test 6: Regex - intitle:/^hello/i
// ============================================================
var r6 = QP.parse('intitle:/^hello/i');
assertEqual(r6.groups[0].conditions[0].regex, true, 'regex: regex=true');
assertEqual(r6.groups[0].conditions[0].value, '^hello', 'regex: value=^hello');
assertEqual(r6.groups[0].conditions[0].regexModifiers.i, true, 'regex: modifier i=true');
assertEqual(r6.groups[0].conditions[0].regexModifiers.m, false, 'regex: modifier m=false');

// ============================================================
// Test 7: Quoted values - author:'Alice Doe'
// ============================================================
var r7 = QP.parse("author:'Alice Doe'");
assertEqual(r7.groups[0].conditions[0].operator, 'author', 'quoted: op=author');
assertEqual(r7.groups[0].conditions[0].value, 'Alice Doe', 'quoted: value=Alice Doe');

// ============================================================
// Test 8: Multi IDs - f:1,2,3
// ============================================================
var r8 = QP.parse('f:1,2,3');
assertEqual(r8.groups[0].conditions[0].operator, 'f', 'multi IDs: op=f');
assertDeepEqual(r8.groups[0].conditions[0].values, ['1', '2', '3'], 'multi IDs: values=[1,2,3]');

// ============================================================
// Test 9: Relative date - date:P7D
// ============================================================
var r9 = QP.parse('date:P7D');
assertEqual(r9.groups[0].conditions[0].operator, 'date', 'rel date: op=date');
assertEqual(r9.groups[0].conditions[0].dateMode, 'relative', 'rel date: dateMode=relative');
assertEqual(r9.groups[0].conditions[0].value, 'P7D', 'rel date: value=P7D');

// ============================================================
// Test 10: Tag - #mytag
// ============================================================
var r10 = QP.parse('#mytag');
assertEqual(r10.groups[0].conditions[0].operator, 'tag', 'tag: op=tag');
assertEqual(r10.groups[0].conditions[0].value, 'mytag', 'tag: value=mytag');

// ============================================================
// Test 11: Unparseable tokens as free-text
// ============================================================
var r11 = QP.parse('randomword');
assertEqual(r11.groups[0].conditions[0].operator, 'free', 'free-text: op=free');
assertEqual(r11.groups[0].conditions[0].value, 'randomword', 'free-text: value=randomword');

// ============================================================
// Test 12: Mixed known and free-text
// ============================================================
var r12 = QP.parse('intitle:hello randomword');
assertEqual(r12.groups.length, 1, 'mixed: 1 group');
assertEqual(r12.groups[0].conditions.length, 2, 'mixed: 2 conditions');
assertEqual(r12.groups[0].conditions[0].operator, 'intitle', 'mixed: first op=intitle');
assertEqual(r12.groups[0].conditions[1].operator, 'free', 'mixed: second op=free');
assertEqual(r12.groups[0].conditions[1].value, 'randomword', 'mixed: second value=randomword');

// ============================================================
// Test 13: Regex with multiple modifiers - intext:/foo/im
// ============================================================
var r13 = QP.parse('intext:/foo/im');
assertEqual(r13.groups[0].conditions[0].regex, true, 'regex im: regex=true');
assertEqual(r13.groups[0].conditions[0].value, 'foo', 'regex im: value=foo');
assertEqual(r13.groups[0].conditions[0].regexModifiers.i, true, 'regex im: i=true');
assertEqual(r13.groups[0].conditions[0].regexModifiers.m, true, 'regex im: m=true');

// ============================================================
// Test 14: Regex no modifiers - intitle:/test/
// ============================================================
var r14 = QP.parse('intitle:/test/');
assertEqual(r14.groups[0].conditions[0].regex, true, 'regex no mod: regex=true');
assertEqual(r14.groups[0].conditions[0].value, 'test', 'regex no mod: value=test');
assertEqual(r14.groups[0].conditions[0].regexModifiers.i, false, 'regex no mod: i=false');
assertEqual(r14.groups[0].conditions[0].regexModifiers.m, false, 'regex no mod: m=false');

// ============================================================
// Test 15: Negated condition with spaces - !author:'Evil Bob'
// ============================================================
var r15 = QP.parse("!author:'Evil Bob'");
assertEqual(r15.groups[0].conditions[0].negate, true, 'neg+spaces: negate=true');
assertEqual(r15.groups[0].conditions[0].operator, 'author', 'neg+spaces: op=author');
assertEqual(r15.groups[0].conditions[0].value, 'Evil Bob', 'neg+spaces: value=Evil Bob');

// ============================================================
// Test 16: Category multi IDs - c:10,20
// ============================================================
var r16 = QP.parse('c:10,20');
assertEqual(r16.groups[0].conditions[0].operator, 'c', 'cat multi: op=c');
assertDeepEqual(r16.groups[0].conditions[0].values, ['10', '20'], 'cat multi: values=[10,20]');

// ============================================================
// Test 17: Label - L:100
// ============================================================
var r17 = QP.parse('L:100');
assertEqual(r17.groups[0].conditions[0].operator, 'L', 'label: op=L');
assertDeepEqual(r17.groups[0].conditions[0].values, ['100'], 'label: values=[100]');

// ============================================================
// Test 18: Saved query - S:q1
// ============================================================
var r18 = QP.parse('S:q1');
assertEqual(r18.groups[0].conditions[0].operator, 'S', 'saved query: op=S');
assertEqual(r18.groups[0].conditions[0].value, 'q1', 'saved query: value=q1');

// ============================================================
// Test 19: Date range - date:2024-01-01/2024-03-31
// ============================================================
var r19 = QP.parse('date:2024-01-01/2024-03-31');
assertEqual(r19.groups[0].conditions[0].operator, 'date', 'date range: op=date');
assertEqual(r19.groups[0].conditions[0].value, '2024-01-01/2024-03-31', 'date range: value');
assertEqual(r19.groups[0].conditions[0].dateMode, 'range', 'date range: dateMode=range');

// ============================================================
// Test 20: Date point - date:2024-01
// ============================================================
var r20 = QP.parse('date:2024-01');
assertEqual(r20.groups[0].conditions[0].operator, 'date', 'date point: op=date');
assertEqual(r20.groups[0].conditions[0].value, '2024-01', 'date point: value');
assertEqual(r20.groups[0].conditions[0].dateMode, 'point', 'date point: dateMode=point');

// ============================================================
// Test 21: Whitespace-only input returns at least one group
// ============================================================
var r21 = QP.parse('   ');
assert(r21.groups.length >= 1, 'whitespace-only: at least one group');
assertEqual(r21.groups[0].conditions.length, 0, 'whitespace-only: no conditions');

// ============================================================
// Test 22: Negated group - !(intitle:hello author:Alice)
// ============================================================
var r22 = QP.parse('!(intitle:hello author:Alice)');
assertEqual(r22.groups[0].negate, true, 'negated group: negate=true');
assertEqual(r22.groups[0].conditions.length, 2, 'negated group: 2 conditions');
assertEqual(r22.groups[0].conditions[0].operator, 'intitle', 'negated group: first op');
assertEqual(r22.groups[0].conditions[1].operator, 'author', 'negated group: second op');

// ============================================================
// Test 23: Tag with regex - #/^my/i
// ============================================================
var r23 = QP.parse('#/^my/i');
assertEqual(r23.groups[0].conditions[0].operator, 'tag', 'tag regex: op=tag');
assertEqual(r23.groups[0].conditions[0].regex, true, 'tag regex: regex=true');
assertEqual(r23.groups[0].conditions[0].value, '^my', 'tag regex: value=^my');
assertEqual(r23.groups[0].conditions[0].regexModifiers.i, true, 'tag regex: i=true');

// ============================================================
// Test 24: Free text with spaces quoted - 'hello world'
// ============================================================
var r24 = QP.parse("'hello world'");
assertEqual(r24.groups[0].conditions[0].operator, 'free', 'free quoted: op=free');
assertEqual(r24.groups[0].conditions[0].value, 'hello world', 'free quoted: value=hello world');

// ============================================================
// Test 25: Round-trip: parse(build(groups)) preserves structure
// ============================================================
var QB = FilterBuilder.QueryBuilder;
var originalGroups = [
    { negate: false, conditions: [
        { operator: 'intitle', value: 'hello', negate: false, regex: false, regexModifiers: { i: false, m: false } },
        { operator: 'author', value: 'Alice', negate: false, regex: false, regexModifiers: { i: false, m: false } },
    ] },
];
var built = QB.build(originalGroups);
var parsed = QP.parse(built);
assertEqual(parsed.groups.length, 1, 'round-trip: 1 group');
assertEqual(parsed.groups[0].conditions.length, 2, 'round-trip: 2 conditions');
assertEqual(parsed.groups[0].conditions[0].operator, 'intitle', 'round-trip: op0');
assertEqual(parsed.groups[0].conditions[0].value, 'hello', 'round-trip: val0');
assertEqual(parsed.groups[0].conditions[1].operator, 'author', 'round-trip: op1');
assertEqual(parsed.groups[0].conditions[1].value, 'Alice', 'round-trip: val1');

// ============================================================
// Test 26: label: alt prefix
// ============================================================
var r26 = QP.parse('label:100,200');
assertEqual(r26.groups[0].conditions[0].operator, 'label', 'label alt: op=label');
assertDeepEqual(r26.groups[0].conditions[0].values, ['100', '200'], 'label alt: values');

// ============================================================
// Test 27: Entry ID - e:abc123
// ============================================================
var r27 = QP.parse('e:abc123');
assertEqual(r27.groups[0].conditions[0].operator, 'e', 'entry id: op=e');
assertEqual(r27.groups[0].conditions[0].value, 'abc123', 'entry id: value');

// ============================================================
// Test 28: pubdate relative
// ============================================================
var r28 = QP.parse('pubdate:P30D');
assertEqual(r28.groups[0].conditions[0].operator, 'pubdate', 'pubdate: op');
assertEqual(r28.groups[0].conditions[0].dateMode, 'relative', 'pubdate: dateMode=relative');
assertEqual(r28.groups[0].conditions[0].value, 'P30D', 'pubdate: value');

// --- Summary ---
console.log('\n--- QueryParser Tests ---');
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) {
    console.log('FAIL: ' + failed + ' test(s) failed');
    process.exit(1);
} else {
    console.log('ALL PASS');
}
