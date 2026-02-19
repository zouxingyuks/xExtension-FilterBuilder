'use strict';

/**
 * Tests for Task 6: ConditionRowComponent
 * Runs in Node.js with minimal DOM shim.
 */

function makeFakeWindow() {
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
                checked: false,
                disabled: false,
                children: [],
                childNodes: [],
                style: {},
                _listeners: {},
                _attributes: {},
                appendChild(child) {
                    child.parentNode = this;
                    this.children.push(child);
                    this.childNodes.push(child);
                    return child;
                },
                removeChild(child) {
                    this.children = this.children.filter(c => c !== child);
                    this.childNodes = this.childNodes.filter(c => c !== child);
                    return child;
                },
                insertBefore(newNode, ref) {
                    this.children.push(newNode);
                    this.childNodes.push(newNode);
                    return newNode;
                },
                addEventListener(evt, fn) {
                    this._listeners[evt] = this._listeners[evt] || [];
                    this._listeners[evt].push(fn);
                },
                removeEventListener(evt, fn) {
                    if (this._listeners[evt]) {
                        this._listeners[evt] = this._listeners[evt].filter(f => f !== fn);
                    }
                },
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
                querySelectorAll(sel) {
                    // Simple recursive search
                    const results = [];
                    function walk(node) {
                        if (!node.children) return;
                        for (const child of node.children) {
                            if (sel.startsWith('.') && child.className && child.className.indexOf(sel.slice(1)) >= 0) {
                                results.push(child);
                            }
                            walk(child);
                        }
                    }
                    walk(this);
                    return results;
                },
                querySelector(sel) {
                    const all = this.querySelectorAll(sel);
                    return all.length > 0 ? all[0] : null;
                },
                parentNode: null,
                nextSibling: null,
                // Helper to fire events in tests
                _fireEvent(evt) {
                    if (this._listeners[evt]) {
                        this._listeners[evt].forEach(fn => fn({ target: this }));
                    }
                },
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
        document: doc,
        scrollY: 0,
        scrollX: 0,
    };
}

// --- Test runner ---
let passed = 0;
let failed = 0;
function assert(cond, msg) {
    if (cond) { passed++; }
    else { failed++; console.error('FAIL:', msg); }
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
// Test 1: createConditionRow is exported
// ============================================================
assert(typeof FilterBuilder.createConditionRow === 'function',
    'FilterBuilder.createConditionRow should be a function');

// ============================================================
// Test 2: getOperatorByKey is exported
// ============================================================
assert(typeof FilterBuilder.getOperatorByKey === 'function',
    'FilterBuilder.getOperatorByKey should be a function');

if (typeof FilterBuilder.getOperatorByKey === 'function') {
    const op = FilterBuilder.getOperatorByKey('intitle');
    assert(op && op.key === 'intitle', 'getOperatorByKey("intitle") should return intitle operator');
    assert(FilterBuilder.getOperatorByKey('nonexistent') === undefined,
        'getOperatorByKey("nonexistent") should return undefined');
}

// Guard: skip remaining tests if createConditionRow missing
if (typeof FilterBuilder.createConditionRow !== 'function') {
    console.log('\n--- ConditionRow Tests ---');
    console.log('Passed: ' + passed + '/' + (passed + failed));
    console.log('FAIL: ' + failed + ' test(s) failed');
    process.exit(1);
}

// ============================================================
// Test 3: createConditionRow returns div.fb-condition-row
// ============================================================
var changeLog = [];
function trackOnChange(updated) { changeLog.push(updated); }
var removeLog = [];
function trackOnRemove() { removeLog.push(true); }

var textCondition = { operator: 'intitle', value: 'hello', negate: false };
var row = FilterBuilder.createConditionRow(textCondition, trackOnChange, trackOnRemove);

assert(row && row.tagName === 'DIV', 'createConditionRow should return a DIV');
assert(row && row.className.indexOf('fb-condition-row') >= 0,
    'row should have class fb-condition-row');

// ============================================================
// Test 4: Row contains negate toggle button
// ============================================================
var negateBtn = null;
var operatorSelect = null;
var removeBtn = null;
if (row) {
    for (var ci = 0; ci < row.children.length; ci++) {
        var child = row.children[ci];
        if (child.className && child.className.indexOf('fb-negate') >= 0) negateBtn = child;
        if (child.tagName === 'SELECT' && child.className.indexOf('fb-operator-select') >= 0) operatorSelect = child;
        if (child.className && child.className.indexOf('fb-remove') >= 0) removeBtn = child;
    }
}

assert(negateBtn !== null, 'row should contain negate toggle (.fb-negate)');
assert(operatorSelect !== null, 'row should contain operator select (.fb-operator-select)');
assert(removeBtn !== null, 'row should contain remove button (.fb-remove)');

// ============================================================
// Test 5: Negate toggle updates condition and calls onChange
// ============================================================
if (negateBtn) {
    changeLog = [];
    negateBtn._fireEvent('click');
    assert(changeLog.length > 0, 'clicking negate should trigger onChange');
    if (changeLog.length > 0) {
        assert(changeLog[changeLog.length - 1].negate === true,
            'after click, onChange should receive negate=true');
    }
}

// ============================================================
// Test 6: Remove button calls onRemove
// ============================================================
if (removeBtn) {
    removeLog = [];
    removeBtn._fireEvent('click');
    assert(removeLog.length > 0, 'clicking remove should trigger onRemove');
}

// ============================================================
// Test 7: Operator select has options from OPERATOR_REGISTRY
// ============================================================
if (operatorSelect) {
    assert(operatorSelect.children.length > 0,
        'operator select should have options');
    // Current operator should be selected
    assert(operatorSelect.value === 'intitle',
        'operator select value should be "intitle", got "' + operatorSelect.value + '"');
}

// ============================================================
// Test 8: Text operator shows text input in value area
// ============================================================
var valueArea = null;
if (row) {
    for (var vi = 0; vi < row.children.length; vi++) {
        if (row.children[vi].className && row.children[vi].className.indexOf('fb-value-area') >= 0) {
            valueArea = row.children[vi];
        }
    }
}
assert(valueArea !== null, 'row should contain value area (.fb-value-area)');

if (valueArea) {
    var hasTextInput = false;
    for (var ti = 0; ti < valueArea.children.length; ti++) {
        if (valueArea.children[ti].tagName === 'INPUT' && valueArea.children[ti].type === 'text') {
            hasTextInput = true;
        }
    }
    assert(hasTextInput, 'text operator should render text input in value area');
}

// ============================================================
// Test 9: Text operator shows regex toggle button
// ============================================================
if (valueArea) {
    var regexToggle = null;
    for (var ri = 0; ri < valueArea.children.length; ri++) {
        if (valueArea.children[ri].className &&
            valueArea.children[ri].className.indexOf('fb-regex-toggle') >= 0) {
            regexToggle = valueArea.children[ri];
        }
    }
    assert(regexToggle !== null, 'text operator should have regex toggle button (.fb-regex-toggle)');
}

// ============================================================
// Test 10: Regex enabled shows i and m modifier checkboxes
// ============================================================
var regexCondition = { operator: 'intitle', value: 'test', negate: false, regex: true };
var regexRow = FilterBuilder.createConditionRow(regexCondition, function(){}, function(){});
if (regexRow) {
    var regexValueArea = null;
    for (var rvi = 0; rvi < regexRow.children.length; rvi++) {
        if (regexRow.children[rvi].className &&
            regexRow.children[rvi].className.indexOf('fb-value-area') >= 0) {
            regexValueArea = regexRow.children[rvi];
        }
    }
    if (regexValueArea) {
        var hasModI = false, hasModM = false;
        function findCheckboxes(node) {
            if (!node || !node.children) return;
            for (var fi = 0; fi < node.children.length; fi++) {
                var ch = node.children[fi];
                if (ch.tagName === 'INPUT' && ch.type === 'checkbox') {
                    if (ch._attributes && ch._attributes['data-modifier'] === 'i') hasModI = true;
                    if (ch._attributes && ch._attributes['data-modifier'] === 'm') hasModM = true;
                }
                findCheckboxes(ch);
            }
        }
        findCheckboxes(regexValueArea);
        assert(hasModI, 'regex enabled should show "i" modifier checkbox');
        assert(hasModM, 'regex enabled should show "m" modifier checkbox');
    }
}

// ============================================================
// Test 11: Multiselect operator renders select multiple
// ============================================================
var msCondition = { operator: 'f', values: [], negate: false };
var msRow = FilterBuilder.createConditionRow(msCondition, function(){}, function(){});
if (msRow) {
    var msValueArea = null;
    for (var mi = 0; mi < msRow.children.length; mi++) {
        if (msRow.children[mi].className &&
            msRow.children[mi].className.indexOf('fb-value-area') >= 0) {
            msValueArea = msRow.children[mi];
        }
    }
    if (msValueArea) {
        var hasMultiSelect = false;
        for (var msi = 0; msi < msValueArea.children.length; msi++) {
            if (msValueArea.children[msi].tagName === 'SELECT' && msValueArea.children[msi].multiple) {
                hasMultiSelect = true;
            }
        }
        assert(hasMultiSelect, 'multiselect operator should render <select multiple>');
    }
}

// ============================================================
// Test 12: Date operator renders mode selector + controls
// ============================================================
var dateCondition = { operator: 'date', dateMode: 'relative', negate: false };
var dateRow = FilterBuilder.createConditionRow(dateCondition, function(){}, function(){});
if (dateRow) {
    var dateValueArea = null;
    for (var di = 0; di < dateRow.children.length; di++) {
        if (dateRow.children[di].className &&
            dateRow.children[di].className.indexOf('fb-value-area') >= 0) {
            dateValueArea = dateRow.children[di];
        }
    }
    if (dateValueArea) {
        var hasDateContainer = false;
        for (var dci = 0; dci < dateValueArea.children.length; dci++) {
            if (dateValueArea.children[dci].className &&
                dateValueArea.children[dci].className.indexOf('fb-date-container') >= 0) {
                hasDateContainer = true;
            }
        }
        assert(hasDateContainer, 'date operator should render date container');
    }
}

// ============================================================
// Test 13: Saved query operator uses dropdown
// ============================================================
var sqCondition = { operator: 'S', value: '', negate: false };
var sqRow = FilterBuilder.createConditionRow(sqCondition, function(){}, function(){});
if (sqRow) {
    var sqValueArea = null;
    for (var si = 0; si < sqRow.children.length; si++) {
        if (sqRow.children[si].className &&
            sqRow.children[si].className.indexOf('fb-value-area') >= 0) {
            sqValueArea = sqRow.children[si];
        }
    }
    if (sqValueArea) {
        var hasSqSelect = false;
        for (var sqi = 0; sqi < sqValueArea.children.length; sqi++) {
            if (sqValueArea.children[sqi].tagName === 'SELECT' && !sqValueArea.children[sqi].multiple) {
                hasSqSelect = true;
            }
        }
        assert(hasSqSelect, 'saved query operator should render dropdown (non-multiple select)');
    }
}

// ============================================================
// Test 14: Changing operator re-renders value input area
// ============================================================
var changeCondition = { operator: 'intitle', value: 'test', negate: false };
var changeLogs = [];
var changeRow = FilterBuilder.createConditionRow(changeCondition, function(u) { changeLogs.push(u); }, function(){});
if (changeRow) {
    var chOpSelect = null;
    for (var oi = 0; oi < changeRow.children.length; oi++) {
        if (changeRow.children[oi].tagName === 'SELECT' &&
            changeRow.children[oi].className.indexOf('fb-operator-select') >= 0) {
            chOpSelect = changeRow.children[oi];
        }
    }
    if (chOpSelect) {
        chOpSelect.value = 'f';
        changeLogs = [];
        chOpSelect._fireEvent('change');
        assert(changeLogs.length > 0, 'changing operator should trigger onChange');
        if (changeLogs.length > 0) {
            assert(changeLogs[changeLogs.length - 1].operator === 'f',
                'onChange should receive updated operator "f"');
        }
    }
}

// ============================================================
// Test 15: Value input onChange triggers condition onChange
// ============================================================
var valCondition = { operator: 'intitle', value: '', negate: false };
var valLogs = [];
var valRow = FilterBuilder.createConditionRow(valCondition, function(u) { valLogs.push(u); }, function(){});
if (valRow) {
    var valArea = null;
    for (var vai = 0; vai < valRow.children.length; vai++) {
        if (valRow.children[vai].className &&
            valRow.children[vai].className.indexOf('fb-value-area') >= 0) {
            valArea = valRow.children[vai];
        }
    }
    if (valArea) {
        var textInput = null;
        for (var tii = 0; tii < valArea.children.length; tii++) {
            if (valArea.children[tii].tagName === 'INPUT' && valArea.children[tii].type === 'text') {
                textInput = valArea.children[tii];
            }
        }
        if (textInput) {
            textInput.value = 'new value';
            valLogs = [];
            textInput._fireEvent('input');
            assert(valLogs.length > 0, 'typing in value input should trigger onChange');
            if (valLogs.length > 0) {
                assert(valLogs[valLogs.length - 1].value === 'new value',
                    'onChange should receive updated value');
            }
        }
    }
}

// --- Summary ---
console.log('\n--- ConditionRow Tests ---');
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) {
    console.log('FAIL: ' + failed + ' test(s) failed');
    process.exit(1);
} else {
    console.log('ALL PASS');
}
