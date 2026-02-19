'use strict';

/**
 * Tests for Task 7: GroupComponent (AND group with OR separator)
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
// Test 1: createGroup is exported
// ============================================================
assert(typeof FilterBuilder.createGroup === 'function',
    'FilterBuilder.createGroup should be a function');

// ============================================================
// Test 2: createOrDivider is exported
// ============================================================
assert(typeof FilterBuilder.createOrDivider === 'function',
    'FilterBuilder.createOrDivider should be a function');

// Guard: skip remaining tests if createGroup missing
if (typeof FilterBuilder.createGroup !== 'function') {
    console.log('\n--- Group Tests ---');
    console.log('Passed: ' + passed + '/' + (passed + failed));
    console.log('FAIL: ' + failed + ' test(s) failed');
    process.exit(1);
}

// ============================================================
// Test 3: createGroup returns div.fb-group
// ============================================================
var changeLogs = [];
function trackOnChange(updated) { changeLogs.push(updated); }
var removeLogs = [];
function trackOnRemove() { removeLogs.push(true); }

var group = {
    negate: false,
    conditions: [
        { operator: 'intitle', value: 'hello', negate: false },
    ],
};

var groupEl = FilterBuilder.createGroup(group, trackOnChange, trackOnRemove);

assert(groupEl && groupEl.tagName === 'DIV', 'createGroup should return a DIV');
assert(groupEl && groupEl.className.indexOf('fb-group') >= 0,
    'group element should have class fb-group');

// ============================================================
// Test 4: Group has header with label and remove button
// ============================================================
var groupHeader = null;
var groupRemoveBtn = null;
if (groupEl) {
    for (var i = 0; i < groupEl.children.length; i++) {
        if (groupEl.children[i].className &&
            groupEl.children[i].className.indexOf('fb-group-header') >= 0) {
            groupHeader = groupEl.children[i];
        }
    }
}
assert(groupHeader !== null, 'group should contain header (.fb-group-header)');

if (groupHeader) {
    var hasLabel = false;
    for (var hi = 0; hi < groupHeader.children.length; hi++) {
        var hChild = groupHeader.children[hi];
        if (hChild.className && hChild.className.indexOf('fb-group-label') >= 0) {
            hasLabel = true;
        }
        if (hChild.className && hChild.className.indexOf('fb-group-remove') >= 0) {
            groupRemoveBtn = hChild;
        }
    }
    assert(hasLabel, 'group header should contain label (.fb-group-label)');
    assert(groupRemoveBtn !== null, 'group header should contain remove button (.fb-group-remove)');
}

// ============================================================
// Test 5: Group remove button calls onRemove
// ============================================================
if (groupRemoveBtn) {
    removeLogs = [];
    groupRemoveBtn._fireEvent('click');
    assert(removeLogs.length > 0, 'clicking group remove should trigger onRemove');
}

// ============================================================
// Test 6: Group contains conditions container
// ============================================================
var conditionsContainer = null;
if (groupEl) {
    for (var ci = 0; ci < groupEl.children.length; ci++) {
        if (groupEl.children[ci].className &&
            groupEl.children[ci].className.indexOf('fb-group-conditions') >= 0) {
            conditionsContainer = groupEl.children[ci];
        }
    }
}
assert(conditionsContainer !== null,
    'group should contain conditions container (.fb-group-conditions)');

// ============================================================
// Test 7: Initial conditions are rendered as condition rows
// ============================================================
if (conditionsContainer) {
    var conditionRows = [];
    for (var cri = 0; cri < conditionsContainer.children.length; cri++) {
        if (conditionsContainer.children[cri].className &&
            conditionsContainer.children[cri].className.indexOf('fb-condition-row') >= 0) {
            conditionRows.push(conditionsContainer.children[cri]);
        }
    }
    assert(conditionRows.length === 1,
        'group with 1 condition should render 1 condition row, got ' + conditionRows.length);
}

// ============================================================
// Test 8: "Add condition" button exists and appends new row
// ============================================================
var addCondBtn = null;
if (groupEl) {
    for (var ai = 0; ai < groupEl.children.length; ai++) {
        if (groupEl.children[ai].className &&
            groupEl.children[ai].className.indexOf('fb-add-condition') >= 0) {
            addCondBtn = groupEl.children[ai];
        }
    }
}
assert(addCondBtn !== null, 'group should have "Add condition" button (.fb-add-condition)');

if (addCondBtn && conditionsContainer) {
    var beforeCount = conditionsContainer.children.length;
    changeLogs = [];
    addCondBtn._fireEvent('click');
    var afterCount = conditionsContainer.children.length;
    assert(afterCount === beforeCount + 1,
        'clicking "Add condition" should append a row, before=' + beforeCount + ' after=' + afterCount);
    assert(changeLogs.length > 0,
        'adding a condition should trigger onChange');
}

// ============================================================
// Test 9: Group negate toggle
// ============================================================
var negateToggle = null;
if (groupHeader) {
    for (var ni = 0; ni < groupHeader.children.length; ni++) {
        if (groupHeader.children[ni].className &&
            groupHeader.children[ni].className.indexOf('fb-group-negate') >= 0) {
            negateToggle = groupHeader.children[ni];
        }
    }
}
assert(negateToggle !== null, 'group header should contain negate toggle (.fb-group-negate)');

if (negateToggle) {
    changeLogs = [];
    negateToggle._fireEvent('click');
    assert(changeLogs.length > 0, 'clicking group negate should trigger onChange');
    if (changeLogs.length > 0) {
        assert(changeLogs[changeLogs.length - 1].negate === true,
            'after negate click, onChange should receive negate=true');
    }
}

// ============================================================
// Test 10: Condition row onChange propagates to group onChange
// ============================================================
var propGroup = {
    negate: false,
    conditions: [
        { operator: 'intitle', value: 'test', negate: false },
    ],
};
var propLogs = [];
var propEl = FilterBuilder.createGroup(propGroup, function(u) { propLogs.push(u); }, function(){});
if (propEl) {
    var propContainer = null;
    for (var pi = 0; pi < propEl.children.length; pi++) {
        if (propEl.children[pi].className &&
            propEl.children[pi].className.indexOf('fb-group-conditions') >= 0) {
            propContainer = propEl.children[pi];
        }
    }
    if (propContainer && propContainer.children.length > 0) {
        // Find the negate button in the first condition row and click it
        var firstRow = propContainer.children[0];
        var rowNegate = null;
        for (var rni = 0; rni < firstRow.children.length; rni++) {
            if (firstRow.children[rni].className &&
                firstRow.children[rni].className.indexOf('fb-negate') >= 0) {
                rowNegate = firstRow.children[rni];
            }
        }
        if (rowNegate) {
            propLogs = [];
            rowNegate._fireEvent('click');
            assert(propLogs.length > 0,
                'condition row change should propagate to group onChange');
        }
    }
}

// ============================================================
// Test 11: Removing a condition row removes it from container
// ============================================================
var rmGroup = {
    negate: false,
    conditions: [
        { operator: 'intitle', value: 'a', negate: false },
        { operator: 'intext', value: 'b', negate: false },
    ],
};
var rmLogs = [];
var rmEl = FilterBuilder.createGroup(rmGroup, function(u) { rmLogs.push(u); }, function(){});
if (rmEl) {
    var rmContainer = null;
    for (var rmi = 0; rmi < rmEl.children.length; rmi++) {
        if (rmEl.children[rmi].className &&
            rmEl.children[rmi].className.indexOf('fb-group-conditions') >= 0) {
            rmContainer = rmEl.children[rmi];
        }
    }
    if (rmContainer) {
        var rmBefore = rmContainer.children.length;
        // Find remove button on first row
        var firstRmRow = rmContainer.children[0];
        var rmBtn = null;
        if (firstRmRow) {
            for (var rbi = 0; rbi < firstRmRow.children.length; rbi++) {
                if (firstRmRow.children[rbi].className &&
                    firstRmRow.children[rbi].className.indexOf('fb-remove') >= 0) {
                    rmBtn = firstRmRow.children[rbi];
                }
            }
        }
        if (rmBtn) {
            rmLogs = [];
            rmBtn._fireEvent('click');
            assert(rmContainer.children.length === rmBefore - 1,
                'removing condition should decrease row count, before=' + rmBefore + ' after=' + rmContainer.children.length);
            assert(rmLogs.length > 0,
                'removing condition should trigger group onChange');
        }
    }
}

// ============================================================
// Test 12: createOrDivider returns div.fb-or-divider with "OR" text
// ============================================================
if (typeof FilterBuilder.createOrDivider === 'function') {
    var orDiv = FilterBuilder.createOrDivider();
    assert(orDiv && orDiv.tagName === 'DIV', 'createOrDivider should return a DIV');
    assert(orDiv && orDiv.className.indexOf('fb-or-divider') >= 0,
        'OR divider should have class fb-or-divider');
    assert(orDiv && orDiv.textContent === 'OR',
        'OR divider textContent should be "OR", got "' + (orDiv ? orDiv.textContent : '') + '"');
}

// ============================================================
// Test 13: Multiple conditions group (3 conditions)
// ============================================================
var multiGroup = {
    negate: false,
    conditions: [
        { operator: 'intitle', value: 'a', negate: false },
        { operator: 'intext', value: 'b', negate: false },
        { operator: 'author', value: 'c', negate: false },
    ],
};
var multiEl = FilterBuilder.createGroup(multiGroup, function(){}, function(){});
if (multiEl) {
    var multiContainer = null;
    for (var mci = 0; mci < multiEl.children.length; mci++) {
        if (multiEl.children[mci].className &&
            multiEl.children[mci].className.indexOf('fb-group-conditions') >= 0) {
            multiContainer = multiEl.children[mci];
        }
    }
    if (multiContainer) {
        var multiRows = 0;
        for (var mri = 0; mri < multiContainer.children.length; mri++) {
            if (multiContainer.children[mri].className &&
                multiContainer.children[mri].className.indexOf('fb-condition-row') >= 0) {
                multiRows++;
            }
        }
        assert(multiRows === 3,
            'group with 3 conditions should render 3 rows, got ' + multiRows);
    }
}

// --- Summary ---
console.log('\n--- Group Tests ---');
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) {
    console.log('FAIL: ' + failed + ' test(s) failed');
    process.exit(1);
} else {
    console.log('ALL PASS');
}
