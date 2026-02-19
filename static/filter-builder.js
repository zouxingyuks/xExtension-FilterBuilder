'use strict';

/**
 * FreshRSS FilterBuilder Extension
 * Visual query builder for FreshRSS search syntax
 */
const FilterBuilder = (function () {

    let _context = { feeds: [], categories: [], labels: [], userQueries: [] };
    let _searchInput = null;
    let _toggleBtn = null;
    let _panel = null;
    let _observer = null;
    var _groups = [{ negate: false, conditions: [{ operator: 'intitle', value: '', negate: false }] }];
    var _previewEl = null;
    var _previewTimer = null;

    function mountToggleButton() {
        var existingBtn = document.querySelector('#fb-toggle');
        if (existingBtn) {
            _toggleBtn = existingBtn;
            _searchInput = document.querySelector('input[name="search"]') || document.querySelector('#search');
            return true;
        }

        _searchInput = document.querySelector('input[name="search"]');
        if (!_searchInput) {
            _searchInput = document.querySelector('#search');
        }
        if (!_searchInput) { return false; }
        if (!_searchInput.parentNode) { return false; }

        _toggleBtn = document.createElement('button');
        _toggleBtn.id = 'fb-toggle';
        _toggleBtn.className = 'btn fb-toggle-btn';
        _toggleBtn.type = 'button';
        _toggleBtn.textContent = 'Build query';
        _toggleBtn.addEventListener('click', togglePanel);
        _searchInput.parentNode.insertBefore(_toggleBtn, _searchInput.nextSibling);
        return true;
    }

    function mountPanel() {
        var existingPanel;
        if (_panel && _panel.isConnected) {
            return;
        }

        existingPanel = document.querySelector('#fb-panel');
        if (existingPanel) {
            _panel = existingPanel;
            _previewEl = _panel.querySelector('.fb-preview-text');
            return;
        }

        _panel = document.createElement('div');
        _panel.id = 'fb-panel';
        _panel.className = 'fb-panel fb-hidden';

        var header = document.createElement('div');
        header.className = 'fb-panel-header';
        var title = document.createElement('span');
        title.className = 'fb-panel-title';
        title.textContent = 'Query Builder';
        var closeBtn = document.createElement('button');
        closeBtn.className = 'btn fb-close-btn';
        closeBtn.type = 'button';
        closeBtn.textContent = '\u00d7';
        closeBtn.addEventListener('click', togglePanel);
        header.appendChild(title);
        header.appendChild(closeBtn);

        var conditions = document.createElement('div');
        conditions.className = 'fb-conditions';

        var orControls = document.createElement('div');
        orControls.className = 'fb-or-controls';

        var preview = document.createElement('div');
        preview.className = 'fb-preview';
        _previewEl = document.createElement('div');
        _previewEl.className = 'fb-preview-text';
        _previewEl.textContent = 'No conditions yet';
        preview.appendChild(_previewEl);

        var actions = document.createElement('div');
        actions.className = 'fb-actions';

        var fillBtn = document.createElement('button');
        fillBtn.type = 'button';
        fillBtn.className = 'btn fb-fill-search';
        fillBtn.textContent = 'Copy to search box';
        fillBtn.addEventListener('click', function () {
            if (_searchInput) {
                _searchInput.value = QueryBuilder.build(_groups);
            }
        });

        var searchBtn = document.createElement('button');
        searchBtn.type = 'button';
        searchBtn.className = 'btn fb-search-now';
        searchBtn.textContent = 'Run search';
        searchBtn.addEventListener('click', function () {
            var form;
            if (_searchInput) {
                _searchInput.value = QueryBuilder.build(_groups);
                form = _searchInput.form || _searchInput.closest('form');
                if (form && typeof form.submit === 'function') {
                    form.submit();
                }
            }
        });

        var loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'btn fb-load-search';
        loadBtn.textContent = 'Load current search';
        loadBtn.addEventListener('click', function () {
            loadFromSearchInput();
        });

        actions.appendChild(fillBtn);
        actions.appendChild(searchBtn);
        actions.appendChild(loadBtn);

        _panel.appendChild(header);
        _panel.appendChild(conditions);
        _panel.appendChild(orControls);
        _panel.appendChild(preview);
        _panel.appendChild(actions);

        document.body.appendChild(_panel);
    }

    function ensureMounted() {
        if (!mountToggleButton()) {
            return false;
        }
        mountPanel();
        return true;
    }

    function setupAutoMount() {
        var retryDelays;
        if (!_observer && typeof MutationObserver !== 'undefined' && document.body) {
            _observer = new MutationObserver(function () {
                if (!_toggleBtn || !_toggleBtn.isConnected || !_panel || !_panel.isConnected) {
                    ensureMounted();
                }
            });
            _observer.observe(document.body, { childList: true, subtree: true });
        }

        retryDelays = [0, 300, 1000, 2500];
        retryDelays.forEach(function (delay) {
            setTimeout(function () {
                ensureMounted();
            }, delay);
        });
    }

    function clearElement(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }

    function normalizeGroups(groups) {
        var safeGroups = Array.isArray(groups) ? groups : [];
        if (safeGroups.length === 0) {
            return [{ negate: false, conditions: [{ operator: 'intitle', value: '', negate: false }] }];
        }

        var i;
        for (i = 0; i < safeGroups.length; i++) {
            if (!Array.isArray(safeGroups[i].conditions)) {
                safeGroups[i].conditions = [];
            }
            if (safeGroups[i].conditions.length === 0) {
                safeGroups[i].conditions.push({ operator: 'intitle', value: '', negate: false });
            }
        }
        return safeGroups;
    }

    function positionPanel() {
        if (!_searchInput || !_panel) { return; }
        var rect = _searchInput.getBoundingClientRect();
        _panel.style.position = 'fixed';
        _panel.style.top = rect.bottom + 'px';
        _panel.style.left = rect.left + 'px';
    }

    function rebuildPreview() {
        var query = QueryBuilder.build(_groups);
        if (_previewEl) {
            _previewEl.textContent = query || 'No conditions yet';
        }
        return query;
    }

    function schedulePreview() {
        if (_previewTimer) { clearTimeout(_previewTimer); }
        _previewTimer = setTimeout(function () {
            _previewTimer = null;
            rebuildPreview();
        }, 16);
    }

    function loadFromSearchInput() {
        var query = (_searchInput && _searchInput.value) ? _searchInput.value : '';
        var parsed = QueryParser.parse(query);
        _groups = normalizeGroups(parsed.groups);
        renderGroups();
        rebuildPreview();
    }

    function renderGroups() {
        if (!_panel) { return; }
        var conditionsEl = _panel.querySelector('.fb-conditions');
        var orControlsEl = _panel.querySelector('.fb-or-controls');
        if (!conditionsEl || !orControlsEl) { return; }

        clearElement(conditionsEl);

        var i;
        for (i = 0; i < _groups.length; i++) {
            if (i > 0) {
                conditionsEl.appendChild(createOrDivider());
            }
            (function (idx) {
                var groupEl = createGroup(_groups[idx], function (updated) {
                    _groups[idx] = updated;
                    schedulePreview();
                }, function () {
                    _groups.splice(idx, 1);
                    if (_groups.length === 0) {
                        _groups.push({ negate: false, conditions: [{ operator: 'intitle', value: '', negate: false }] });
                    }
                    renderGroups();
                    schedulePreview();
                });
                conditionsEl.appendChild(groupEl);
            })(i);
        }

        clearElement(orControlsEl);

        var addGroupBtn = document.createElement('button');
        addGroupBtn.type = 'button';
        addGroupBtn.className = 'btn fb-add-group';
        addGroupBtn.textContent = '+ Add OR group';
        addGroupBtn.addEventListener('click', function () {
            _groups.push({ negate: false, conditions: [{ operator: 'intitle', value: '', negate: false }] });
            renderGroups();
            schedulePreview();
        });
        orControlsEl.appendChild(addGroupBtn);
    }

    function togglePanel() {
        if (!_panel) { return; }
        _panel.classList.toggle('fb-hidden');
        if (!_panel.classList.contains('fb-hidden')) {
            positionPanel();
            loadFromSearchInput();
        }
    }

    var OPERATOR_REGISTRY = [
        { key: 'intitle',   label: 'Title',           valueType: 'text',        prefix: 'intitle:',   supportsRegex: true },
        { key: 'intext',    label: 'Body text',       valueType: 'text',        prefix: 'intext:',    supportsRegex: true },
        { key: 'inurl',     label: 'URL',             valueType: 'text',        prefix: 'inurl:',     supportsRegex: true },
        { key: 'author',    label: 'Author',          valueType: 'text',        prefix: 'author:',    supportsRegex: true },
        { key: 'tag',       label: 'Tag',             valueType: 'text',        prefix: '#',          supportsRegex: true },
        { key: 'free',      label: 'Free text',       valueType: 'text',        prefix: '',           supportsRegex: true },
        { key: 'f',         label: 'Feed',            valueType: 'multiselect', prefix: 'f:',         dataKey: 'feeds' },
        { key: 'c',         label: 'Category',        valueType: 'multiselect', prefix: 'c:',         dataKey: 'categories' },
        { key: 'L',         label: 'Label',           valueType: 'multiselect', prefix: 'L:',         dataKey: 'labels' },
        { key: 'label',     label: 'Label (alt)',     valueType: 'multiselect', prefix: 'label:',     dataKey: 'labels' },
        { key: 'e',         label: 'Entry ID',        valueType: 'text',        prefix: 'e:',         supportsRegex: true },
        { key: 'date',      label: 'Date',            valueType: 'date',        prefix: 'date:',      dateModes: ['relative', 'range', 'point'] },
        { key: 'pubdate',   label: 'Publish date',    valueType: 'date',        prefix: 'pubdate:',   dateModes: ['relative', 'range', 'point'] },
        { key: 'userdate',  label: 'User date',       valueType: 'date',        prefix: 'userdate:',  dateModes: ['relative', 'range', 'point'] },
        { key: 'S',         label: 'Saved query',     valueType: 'savedquery',  prefix: 'S:' },
    ];

    function renderValueInput(op, condition, onChange) {
        var input, select, items, i, opt, container, modeSelect, modes, m, mOpt, valueArea, sqSelect, queries, q, qOpt;

        if (op.valueType === 'text') {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'fb-value-input';
            input.value = condition.value || '';
            input.addEventListener('input', function () { onChange({ value: input.value }); });
            return input;
        }

        if (op.valueType === 'multiselect') {
            select = document.createElement('select');
            select.multiple = true;
            select.className = 'fb-value-select';
            items = (_context[op.dataKey] || []);
            for (i = 0; i < items.length; i++) {
                opt = document.createElement('option');
                opt.value = items[i].id;
                opt.textContent = items[i].name;
                select.appendChild(opt);
            }
            select.addEventListener('change', function () {
                var vals = [];
                var j;
                for (j = 0; j < select.children.length; j++) {
                    if (select.children[j].selected) { vals.push(select.children[j].value); }
                }
                onChange({ values: vals });
            });
            return select;
        }

        if (op.valueType === 'date') {
            container = document.createElement('div');
            container.className = 'fb-date-container';
            modeSelect = document.createElement('select');
            modeSelect.className = 'fb-date-mode';
            modes = op.dateModes || ['relative', 'range', 'point'];
            for (m = 0; m < modes.length; m++) {
                mOpt = document.createElement('option');
                mOpt.value = modes[m];
                mOpt.textContent = modes[m];
                modeSelect.appendChild(mOpt);
            }
            modeSelect.value = condition.dateMode || 'relative';
            valueArea = document.createElement('div');
            valueArea.className = 'fb-date-value';
            modeSelect.addEventListener('change', function () {
                onChange({ dateMode: modeSelect.value });
            });
            container.appendChild(modeSelect);
            container.appendChild(valueArea);
            return container;
        }

        if (op.valueType === 'savedquery') {
            sqSelect = document.createElement('select');
            sqSelect.className = 'fb-value-select';
            queries = (_context.userQueries || []);
            for (q = 0; q < queries.length; q++) {
                qOpt = document.createElement('option');
                qOpt.value = queries[q].id;
                qOpt.textContent = queries[q].name;
                sqSelect.appendChild(qOpt);
            }
            sqSelect.addEventListener('change', function () {
                onChange({ value: sqSelect.value });
            });
            return sqSelect;
        }

        return document.createElement('span');
    }

    function getOperatorByKey(key) {
        var i;
        for (i = 0; i < OPERATOR_REGISTRY.length; i++) {
            if (OPERATOR_REGISTRY[i].key === key) { return OPERATOR_REGISTRY[i]; }
        }
        return undefined;
    }

    function createConditionRow(condition, onChange, onRemove) {
        var cond = {
            operator: condition.operator || 'intitle',
            value: condition.value || '',
            values: condition.values || [],
            negate: !!condition.negate,
            regex: !!condition.regex,
            regexModifiers: condition.regexModifiers || { i: false, m: false },
            dateMode: condition.dateMode || 'relative',
        };

        var row = document.createElement('div');
        row.className = 'fb-condition-row';

        var negateBtn = document.createElement('button');
        negateBtn.type = 'button';
        negateBtn.className = 'btn fb-negate' + (cond.negate ? ' fb-active' : '');
        negateBtn.textContent = '!';
        negateBtn.addEventListener('click', function () {
            cond.negate = !cond.negate;
            if (cond.negate) { negateBtn.className = 'btn fb-negate fb-active'; }
            else { negateBtn.className = 'btn fb-negate'; }
            onChange(Object.assign({}, cond));
        });

        var opSelect = document.createElement('select');
        opSelect.className = 'fb-operator-select';
        var oi, opt;
        for (oi = 0; oi < OPERATOR_REGISTRY.length; oi++) {
            opt = document.createElement('option');
            opt.value = OPERATOR_REGISTRY[oi].key;
            opt.textContent = OPERATOR_REGISTRY[oi].label;
            opSelect.appendChild(opt);
        }
        opSelect.value = cond.operator;

        var valueArea = document.createElement('div');
        valueArea.className = 'fb-value-area';

        function rebuildValueArea() {
            var op, valEl, regexBtn, modContainer, mods, mi;
            clearElement(valueArea);
            op = getOperatorByKey(cond.operator);
            if (!op) { return; }

            function onValueChange(patch) {
                if (patch.value !== undefined) { cond.value = patch.value; }
                if (patch.values !== undefined) { cond.values = patch.values; }
                if (patch.dateMode !== undefined) { cond.dateMode = patch.dateMode; }
                onChange(Object.assign({}, cond));
            }

            valEl = renderValueInput(op, cond, onValueChange);
            valueArea.appendChild(valEl);

            if (op.supportsRegex) {
                regexBtn = document.createElement('button');
                regexBtn.type = 'button';
                regexBtn.className = 'btn fb-regex-toggle' + (cond.regex ? ' fb-active' : '');
                regexBtn.textContent = '.*';
                regexBtn.addEventListener('click', function () {
                    cond.regex = !cond.regex;
                    if (cond.regex) { regexBtn.className = 'btn fb-regex-toggle fb-active'; }
                    else { regexBtn.className = 'btn fb-regex-toggle'; }
                    rebuildValueArea();
                    onChange(Object.assign({}, cond));
                });
                valueArea.appendChild(regexBtn);

                if (cond.regex) {
                    modContainer = document.createElement('span');
                    modContainer.className = 'fb-regex-modifiers';
                    mods = ['i', 'm'];
                    for (mi = 0; mi < mods.length; mi++) {
                        (function (mod) {
                            var lbl = document.createElement('label');
                            lbl.className = 'fb-modifier-label';
                            var cb = document.createElement('input');
                            cb.type = 'checkbox';
                            cb.checked = !!(cond.regexModifiers && cond.regexModifiers[mod]);
                            cb.setAttribute('data-modifier', mod);
                            cb.addEventListener('change', function () {
                                if (!cond.regexModifiers) { cond.regexModifiers = {}; }
                                cond.regexModifiers[mod] = cb.checked;
                                onChange(Object.assign({}, cond));
                            });
                            var txt = document.createElement('span');
                            txt.textContent = mod;
                            lbl.appendChild(cb);
                            lbl.appendChild(txt);
                            modContainer.appendChild(lbl);
                        })(mods[mi]);
                    }
                    valueArea.appendChild(modContainer);
                }
            }
        }

        opSelect.addEventListener('change', function () {
            cond.operator = opSelect.value;
            cond.value = '';
            cond.values = [];
            cond.regex = false;
            cond.regexModifiers = { i: false, m: false };
            rebuildValueArea();
            onChange(Object.assign({}, cond));
        });

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn fb-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', function () { onRemove(); });

        row.appendChild(negateBtn);
        row.appendChild(opSelect);
        row.appendChild(valueArea);
        row.appendChild(removeBtn);

        rebuildValueArea();

        return row;
    }

    function createOrDivider() {
        var div = document.createElement('div');
        div.className = 'fb-or-divider';
        div.textContent = 'OR';
        return div;
    }

    function createGroup(group, onChange, onRemove) {
        var grp = {
            negate: !!group.negate,
            conditions: (group.conditions || []).slice(),
        };

        var el = document.createElement('div');
        el.className = 'fb-group';

        var header = document.createElement('div');
        header.className = 'fb-group-header';

        var negateBtn = document.createElement('button');
        negateBtn.type = 'button';
        negateBtn.className = 'btn fb-group-negate' + (grp.negate ? ' fb-active' : '');
        negateBtn.textContent = '!';
        negateBtn.addEventListener('click', function () {
            grp.negate = !grp.negate;
            negateBtn.className = 'btn fb-group-negate' + (grp.negate ? ' fb-active' : '');
            onChange(Object.assign({}, grp));
        });

        var label = document.createElement('span');
        label.className = 'fb-group-label';
        label.textContent = 'AND (all must match)';

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn fb-group-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', function () { onRemove(); });

        header.appendChild(negateBtn);
        header.appendChild(label);
        header.appendChild(removeBtn);

        var container = document.createElement('div');
        container.className = 'fb-group-conditions';

        function notifyChange() {
            onChange(Object.assign({}, grp));
        }

        function addConditionToContainer(cond, index) {
            var rowEl = createConditionRow(cond, function (updated) {
                grp.conditions[index] = updated;
                notifyChange();
            }, function () {
                container.removeChild(rowEl);
                grp.conditions.splice(index, 1);
                notifyChange();
            });
            container.appendChild(rowEl);
        }

        var ci;
        for (ci = 0; ci < grp.conditions.length; ci++) {
            addConditionToContainer(grp.conditions[ci], ci);
        }

        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn fb-add-condition';
        addBtn.textContent = '+ Add condition';
        addBtn.addEventListener('click', function () {
            var newCond = { operator: 'intitle', value: '', negate: false };
            var idx = grp.conditions.length;
            grp.conditions.push(newCond);
            addConditionToContainer(newCond, idx);
            notifyChange();
        });

        el.appendChild(header);
        el.appendChild(container);
        el.appendChild(addBtn);

        return el;
    }

    var QueryBuilder = (function () {

        function quoteValue(val) {
            if (val.indexOf(' ') >= 0) { return "'" + val + "'"; }
            return val;
        }

        function formatValue(op, cond) {
            var mods;
            if (cond.regex && op.supportsRegex) {
                mods = '';
                if (cond.regexModifiers) {
                    if (cond.regexModifiers.i) { mods += 'i'; }
                    if (cond.regexModifiers.m) { mods += 'm'; }
                }
                return '/' + cond.value + '/' + mods;
            }
            if (op.valueType === 'multiselect') {
                if (!cond.values || cond.values.length === 0) { return ''; }
                return cond.values.join(',');
            }
            if (op.valueType === 'date' || op.valueType === 'savedquery') {
                return cond.value || '';
            }
            return quoteValue(cond.value || '');
        }

        function isConditionEmpty(op, cond) {
            if (op.valueType === 'multiselect') {
                return !cond.values || cond.values.length === 0;
            }
            return !cond.value && !cond.regex;
        }

        function buildCondition(cond) {
            var op = getOperatorByKey(cond.operator);
            if (!op) { return ''; }
            if (isConditionEmpty(op, cond)) { return ''; }
            var val = formatValue(op, cond);
            if (val === '') { return ''; }
            var token = op.prefix + val;
            if (cond.negate) { token = '!' + token; }
            return token;
        }

        function buildGroup(group) {
            var parts = [];
            var i, token;
            for (i = 0; i < group.conditions.length; i++) {
                token = buildCondition(group.conditions[i]);
                if (token !== '') { parts.push(token); }
            }
            return parts.join(' ');
        }

        function build(groups) {
            var built = [];
            var i, content;
            for (i = 0; i < groups.length; i++) {
                content = buildGroup(groups[i]);
                if (content === '') { continue; }
                if (groups[i].negate) {
                    built.push('!(' + content + ')');
                } else {
                    built.push(content);
                }
            }
            if (built.length === 0) { return ''; }
            if (built.length === 1) { return built[0]; }
            return '(' + built.join(') OR (') + ')';
        }

        return { build: build };
    })();

    var QueryParser = (function () {

        var MULTISELECT_OPS = { f: true, c: true, L: true, label: true };
        var DATE_OPS = { date: true, pubdate: true, userdate: true };

        function splitTopLevelOr(str) {
            var depth = 0, inQuote = false, quoteChar = '', inRegex = false;
            var segments = [];
            var start = 0;
            var i, ch;
            for (i = 0; i < str.length; i++) {
                ch = str[i];
                if (inQuote) {
                    if (ch === quoteChar) { inQuote = false; }
                    continue;
                }
                if (ch === "'" || ch === '"') { inQuote = true; quoteChar = ch; continue; }
                if (ch === '(') { depth++; continue; }
                if (ch === ')') { depth--; continue; }
                if (depth === 0 && str.substring(i, i + 4) === ' OR ') {
                    segments.push(str.substring(start, i));
                    start = i + 4;
                    i += 3;
                }
            }
            segments.push(str.substring(start));
            return segments;
        }

        function unwrapGroup(seg) {
            var s = seg.trim();
            var negate = false;
            if (s.charAt(0) === '!' && s.charAt(1) === '(') {
                negate = true;
                s = s.substring(2, s.length - 1);
            } else if (s.charAt(0) === '(' && s.charAt(s.length - 1) === ')') {
                s = s.substring(1, s.length - 1);
            }
            return { content: s, negate: negate };
        }

        function tokenize(str) {
            var tokens = [];
            var current = '';
            var inQuote = false, quoteChar = '';
            var i, ch;
            for (i = 0; i < str.length; i++) {
                ch = str[i];
                if (inQuote) {
                    if (ch === quoteChar) { inQuote = false; }
                    else { current += ch; }
                    continue;
                }
                if (ch === "'" || ch === '"') {
                    inQuote = true;
                    quoteChar = ch;
                    continue;
                }
                if (ch === ' ' || ch === '\t') {
                    if (current.length > 0) { tokens.push(current); current = ''; }
                    continue;
                }
                current += ch;
            }
            if (current.length > 0) { tokens.push(current); }
            return tokens;
        }

        function parseRegexValue(raw) {
            var match = raw.match(/^\/(.*)\/([im]*)$/);
            if (!match) { return null; }
            return {
                value: match[1],
                regex: true,
                regexModifiers: {
                    i: match[2].indexOf('i') >= 0,
                    m: match[2].indexOf('m') >= 0,
                }
            };
        }

        function parseDateMode(val) {
            if (/^P\d/.test(val)) { return 'relative'; }
            if (val.indexOf('/') >= 0) { return 'range'; }
            return 'point';
        }

        function makeCondition(operator, negate) {
            return {
                operator: operator,
                value: '',
                values: [],
                negate: negate,
                regex: false,
                regexModifiers: { i: false, m: false },
                dateMode: 'relative',
            };
        }

        function parseCondition(token) {
            var negate = false;
            var t = token;
            var tagVal, cond, regResult, colonIdx, key, rawVal, op, c, reg, fc;
            if (t.charAt(0) === '!') {
                negate = true;
                t = t.substring(1);
            }

            if (t.charAt(0) === '#') {
                tagVal = t.substring(1);
                cond = makeCondition('tag', negate);
                regResult = parseRegexValue(tagVal);
                if (regResult) {
                    cond.value = regResult.value;
                    cond.regex = true;
                    cond.regexModifiers = regResult.regexModifiers;
                } else {
                    cond.value = tagVal;
                }
                return cond;
            }

            colonIdx = t.indexOf(':');
            if (colonIdx > 0) {
                key = t.substring(0, colonIdx);
                rawVal = t.substring(colonIdx + 1);
                op = getOperatorByKey(key);
                if (op) {
                    c = makeCondition(key, negate);
                    if (MULTISELECT_OPS[key]) {
                        c.values = rawVal.split(',');
                        return c;
                    }
                    if (DATE_OPS[key]) {
                        c.value = rawVal;
                        c.dateMode = parseDateMode(rawVal);
                        return c;
                    }
                    reg = parseRegexValue(rawVal);
                    if (reg) {
                        c.value = reg.value;
                        c.regex = true;
                        c.regexModifiers = reg.regexModifiers;
                    } else {
                        c.value = rawVal;
                    }
                    return c;
                }
            }

            fc = makeCondition('free', negate);
            fc.value = t;
            return fc;
        }

        function parse(queryString) {
            var str = (queryString || '').trim();
            if (str === '') {
                return { groups: [{ negate: false, conditions: [] }] };
            }

            var segments = splitTopLevelOr(str);
            var groups = [];
            var i, seg, unwrapped, tokens, conditions, j;

            if (segments.length === 1 && str.charAt(0) !== '(') {
                unwrapped = unwrapGroup(str);
                tokens = tokenize(unwrapped.content);
                conditions = [];
                for (j = 0; j < tokens.length; j++) {
                    conditions.push(parseCondition(tokens[j]));
                }
                groups.push({ negate: unwrapped.negate, conditions: conditions });
            } else {
                for (i = 0; i < segments.length; i++) {
                    seg = segments[i].trim();
                    if (seg === '') { continue; }
                    unwrapped = unwrapGroup(seg);
                    tokens = tokenize(unwrapped.content);
                    conditions = [];
                    for (j = 0; j < tokens.length; j++) {
                        conditions.push(parseCondition(tokens[j]));
                    }
                    groups.push({ negate: unwrapped.negate, conditions: conditions });
                }
            }

            if (groups.length === 0) {
                groups.push({ negate: false, conditions: [] });
            }
            return { groups: groups };
        }

        return { parse: parse };
    })();

    function init() {
        var ctx = (window.context && window.context.filterBuilder) ? window.context.filterBuilder : {};
        _context = {
            feeds: ctx.feeds || [],
            categories: ctx.categories || [],
            labels: ctx.labels || [],
            userQueries: ctx.userQueries || [],
        };
        ensureMounted();
        setupAutoMount();
    }

    function bootstrap() {
        init();
    }

    document.addEventListener('freshrss:globalContextLoaded', bootstrap, false);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, false);
    } else {
        setTimeout(bootstrap, 0);
    }

    return {
        getContext: function () { return _context; },
        getOperatorRegistry: function () { return OPERATOR_REGISTRY; },
        renderValueInput: renderValueInput,
        getOperatorByKey: getOperatorByKey,
        createConditionRow: createConditionRow,
        createGroup: createGroup,
        createOrDivider: createOrDivider,
        QueryBuilder: QueryBuilder,
        QueryParser: QueryParser,
        rebuildPreview: rebuildPreview,
        loadFromSearchInput: loadFromSearchInput,
        getGroups: function () { return _groups; },
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = FilterBuilder; }
