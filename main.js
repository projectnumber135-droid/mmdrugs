// ─────────────────────────────────────────────────────────────────────────────
// main.js — Remedy Search, Detail Sections, and Combine
//
// Uses the existing HTML structure:
//   #searchInput, #search-results, #alphabet-container, #remedy-name
//   #content-allens, #content-gems, #content-boericke  (section checkboxes)
//   #check-allens, #check-gems, #check-boericke         (master header checkboxes)
//   #combineBtn  (calls combineData())
//   #resultText  (combine output textarea)
// ─────────────────────────────────────────────────────────────────────────────

let remedyData = [];   // [{name, sources:{A,G,B}}]
let allensBook = null; // Map: normalisedName → remedyObj
let gemsBook = null;
let boerickeBook = null;
let currentSources = {}; // sources for currently selected remedy

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(r => r.json())
        .then(data => {
            allensBook = buildLookup(data.allens_data.remedies, 'name');
            gemsBook = buildLookup(data.gems_data.remedies, 'name');
            boerickeBook = buildLookup(data.boericke_data.remedies, 'name');

            remedyData = data.index.map(entry => {
                const [name, sources] = Object.entries(entry)[0];
                return { name, sources };
            }).filter(r => typeof r.name === 'string');

            initAlphabetButtons();
            initSearch();
        })
        .catch(err => console.error('Boot error:', err));
});

// Build a case-insensitive lookup map
function buildLookup(arr, key) {
    const map = new Map();
    if (!Array.isArray(arr)) return map;
    arr.forEach(r => { if (r[key]) map.set(r[key].toLowerCase().trim(), r); });
    return map;
}
function lookupRemedy(map, name) {
    if (!name || !map) return null;
    return map.get(name.toLowerCase().trim()) || null;
}

// ── Alphabet buttons ──────────────────────────────────────────────────────────
function initAlphabetButtons() {
    const container = document.getElementById('alphabet-container');
    container.innerHTML = '';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        const btn = document.createElement('div');
        btn.className = 'alpha-btn';
        btn.textContent = letter;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('searchInput').value = '';
            hideResults();
            filterByLetter(letter);
        });
        container.appendChild(btn);
    });
}

function filterByLetter(letter) {
    const results = remedyData.filter(r => r.name.toLowerCase().startsWith(letter.toLowerCase()));
    displayResults(results, '');
}

// ── Search ────────────────────────────────────────────────────────────────────
function initSearch() {
    const input = document.getElementById('searchInput');
    input.addEventListener('input', e => {
        const q = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
        if (!q) { hideResults(); return; }
        const results = remedyData
            .filter(r => r.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q));
        displayResults(results, q);
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-container')) hideResults();
    });
    input.addEventListener('focus', () => {
        const q = input.value.trim().toLowerCase();
        if (!q) return;
        const results = remedyData
            .filter(r => r.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q));
        displayResults(results, q);
    });

    const imgFilterBtn = document.getElementById('imageFilterBtn');
    if (imgFilterBtn) {
        imgFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
            input.value = ''; // Clear search input when showing images
            const results = remedyData.filter(r => r.sources && r.sources.I);
            displayResults(results, '');
        });
    }
}

// ── Highlight helper ──────────────────────────────────────────────────────────
function highlightMatch(text, query) {
    if (!query) return document.createTextNode(text);
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return document.createTextNode(text);
    const wrap = document.createElement('span');
    wrap.appendChild(document.createTextNode(text.slice(0, idx)));
    const mark = document.createElement('mark');
    mark.style.cssText = 'background:#4CAF50;color:#fff;border-radius:2px;padding:0 2px;';
    mark.textContent = text.slice(idx, idx + query.length);
    wrap.appendChild(mark);
    wrap.appendChild(document.createTextNode(text.slice(idx + query.length)));
    return wrap;
}

// ── Source badges ─────────────────────────────────────────────────────────────
const SOURCE_COLORS = { A: '#2196F3', G: '#9C27B0', B: '#FF9800' };

function buildBadges(sources) {
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:flex;gap:4px;margin-left:10px;flex-shrink:0;align-items:center;';
    ['A', 'G', 'B'].forEach(key => {
        if (!sources[key]) return;
        const badge = document.createElement('span');
        badge.textContent = key;
        badge.style.cssText = `background:${SOURCE_COLORS[key]};color:#fff;border-radius:3px;padding:1px 5px;font-size:11px;font-weight:700;letter-spacing:0.5px;line-height:1.6;`;
        wrap.appendChild(badge);
    });
    if (sources['I']) {
        const icon = document.createElement('span');
        icon.textContent = '🖼️'; // Picture icon
        icon.style.cssText = 'font-size:14px; margin-left:4px;';
        wrap.appendChild(icon);
    }
    return wrap;
}

// ── Display result dropdown ───────────────────────────────────────────────────
function displayResults(results, query) {
    const container = document.getElementById('search-results');
    container.innerHTML = '';
    if (results.length === 0) {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.textContent = 'No remedies found.';
        container.appendChild(div);
    } else {
        results.forEach(({ name, sources }) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            if (sources['I']) {
                div.classList.add('has-image');
            }
            div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;cursor:pointer;';
            const nameSpan = document.createElement('span');
            nameSpan.appendChild(highlightMatch(name, query));
            div.appendChild(nameSpan);
            div.appendChild(buildBadges(sources || {}));
            div.addEventListener('click', () => {
                document.getElementById('searchInput').value = name;
                hideResults();
                selectRemedy(name, sources || {});
            });
            container.appendChild(div);
        });
    }
    container.style.display = 'block';
}

function hideResults() {
    const el = document.getElementById('search-results');
    if (el) el.style.display = 'none';
}

// ── Select a remedy → populate section accordions ────────────────────────────
function selectRemedy(name, sources) {
    currentSources = sources;

    // Update heading
    const heading = document.getElementById('remedy-name');
    if (heading) heading.textContent = name.toUpperCase();

    // Clear output
    const resultText = document.getElementById('resultText');
    if (resultText) resultText.value = '';

    // ── Image display ──────────────────────────────────────────────────────
    const imgArea = document.getElementById('remedy-image-area');
    const imgEl = document.getElementById('remedy-image');
    const imgLoad = document.getElementById('image-loading');

    if (sources['I'] && imgArea && imgEl) {
        // Use GitHub raw URL to correctly render the image
        const imgSrc = 'images/' + sources['I'];
        imgArea.style.display = 'block';
        imgEl.style.display = 'none';
        if (imgLoad) imgLoad.style.display = 'block';

        imgEl.onload = () => {
            if (imgLoad) imgLoad.style.display = 'none';
            // Show as block and center it horizontally with margin
            imgEl.style.display = 'block';
            imgEl.style.margin = '0 auto';
        };
        imgEl.onerror = () => { if (imgLoad) imgLoad.style.display = 'none'; imgArea.style.display = 'none'; };
        imgEl.src = imgSrc;
    } else if (imgArea) {
        imgArea.style.display = 'none';
        if (imgEl) { imgEl.src = ''; imgEl.style.display = 'none'; }
    }

    // Populate each source content container
    populateSourcePanel('A', sources['A'], 'content-allens', 'check-allens', getSectionsFromAllens);
    populateSourcePanel('G', sources['G'], 'content-gems', 'check-gems', getSectionsFromGems);
    populateSourcePanel('B', sources['B'], 'content-boericke', 'check-boericke', getSectionsFromBoericke);

    // Show each source-box that has data, hide ones that don't
    // CSS: .source-box { display:none } by default; needs display:block + .expanded to open
    showSourceBox('box-allens', !!sources['A']);
    showSourceBox('box-gems', !!sources['G']);
    showSourceBox('box-boericke', !!sources['B']);

    // Auto-expand the first available source
    const firstSrc = sources['A'] ? 'allens' : (sources['G'] ? 'gems' : 'boericke');
    ['allens', 'gems', 'boericke'].forEach(s => {
        const box = document.getElementById('box-' + s);
        if (box) box.classList.toggle('expanded', s === firstSrc);
    });

    // Show request map area
    const rma = document.getElementById('request-map-area');
    if (rma) rma.style.display = 'block';
}

function showSourceBox(boxId, show) {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.style.display = show ? 'block' : 'none';
}

function populateSourcePanel(sourceKey, remedyNameInSource, contentId, headerCheckId, getSecFn) {
    const content = document.getElementById(contentId);
    const headerCheck = document.getElementById(headerCheckId);
    if (!content) return;

    content.innerHTML = '';
    if (headerCheck) { headerCheck.checked = false; headerCheck.indeterminate = false; }

    if (!remedyNameInSource) {
        content.innerHTML = '<p style="color:#666;font-style:italic;font-size:13px;padding:8px 12px;">Not available in this source.</p>';
        return;
    }

    const sections = getSecFn(remedyNameInSource);
    if (!sections || Object.keys(sections).length === 0) {
        content.innerHTML = `<p style="color:#666;font-style:italic;font-size:13px;padding:8px 12px;">No sections found for "${remedyNameInSource}".</p>`;
        return;
    }

    const color = SOURCE_COLORS[sourceKey];

    Object.entries(sections).forEach(([sectionKey, lines]) => {
        if (!lines || lines.length === 0) return;

        const label = document.createElement('label');
        label.className = 'section-checkbox-row';
        label.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.15s;
            margin: 2px 0;
        `;
        label.addEventListener('mouseenter', () => label.style.background = '#2e2e2e');
        label.addEventListener('mouseleave', () => label.style.background = 'transparent');

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.source = sourceKey;
        cb.dataset.section = sectionKey;
        cb.style.cssText = `width:15px;height:15px;accent-color:${color};cursor:pointer;flex-shrink:0;`;
        cb.addEventListener('change', () => syncHeaderCheckbox(contentId, headerCheckId));

        const sectionName = document.createElement('span');
        sectionName.textContent = formatSectionKey(sectionKey);
        sectionName.style.cssText = 'color:#ddd;font-size:13px;';

        label.appendChild(cb);
        label.appendChild(sectionName);
        content.appendChild(label);
    });
}

function syncHeaderCheckbox(contentId, headerCheckId) {
    const content = document.getElementById(contentId);
    const hc = document.getElementById(headerCheckId);
    if (!content || !hc) return;
    const all = content.querySelectorAll('input[type="checkbox"]');
    const checked = content.querySelectorAll('input[type="checkbox"]:checked');
    hc.indeterminate = checked.length > 0 && checked.length < all.length;
    hc.checked = all.length > 0 && checked.length === all.length;
}

// ── HTML-wired functions (called from onclick attributes in HTML) ─────────────
function toggleSource(src) {
    const box = document.getElementById('box-' + src);
    if (box) box.classList.toggle('expanded');
}

function toggleAllSections(src, checked) {
    const content = document.getElementById('content-' + src);
    if (!content) return;
    content.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = checked);
    syncHeaderCheckbox('content-' + src, 'check-' + src);
}

// ── Section data helpers ──────────────────────────────────────────────────────
function formatSectionKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function extractLines(value) {
    if (!value) return [];
    if (typeof value === 'string') return value.trim() ? [value] : [];
    if (Array.isArray(value)) return value.flatMap(v => extractLines(v));
    if (typeof value === 'object') {
        return Object.entries(value).map(([k, v]) => {
            const label = formatSectionKey(k);
            const text = typeof v === 'string' ? v : (Array.isArray(v) ? v.join(' ') : '');
            return text ? `${label}: ${text}` : null;
        }).filter(Boolean);
    }
    return [String(value)];
}

function getSectionsFromAllens(remedyName) {
    const r = lookupRemedy(allensBook, remedyName);
    if (!r || !r.sections) return null;
    const result = {};
    Object.entries(r.sections).forEach(([k, v]) => {
        const lines = extractLines(v);
        if (lines.length) result[k] = lines;
    });
    return result;
}

function getSectionsFromGems(remedyName) {
    const r = lookupRemedy(gemsBook, remedyName);
    if (!r || !r.sections) return null;
    const result = {};
    if (r.keynotes && r.keynotes.length) result['keynotes'] = r.keynotes;
    Object.entries(r.sections).forEach(([k, v]) => {
        const lines = extractLines(v);
        if (lines.length) result[k] = lines;
    });
    return result;
}

function getSectionsFromBoericke(remedyName) {
    const r = lookupRemedy(boerickeBook, remedyName);
    if (!r) return null;
    const result = {};
    if (r.overview) result['overview'] = [r.overview];
    if (r.sections) {
        Object.entries(r.sections).forEach(([k, v]) => {
            const lines = extractLines(v);
            if (lines.length) result[k] = lines;
        });
    }
    return result;
}

// ── Combine (called from onclick on #combineBtn) ──────────────────────────────
function combineData() {
    const resultText = document.getElementById('resultText');
    if (!resultText) return;

    const canonicalName = document.getElementById('remedy-name')?.textContent || '';
    if (!canonicalName || canonicalName === 'SELECT A REMEDY') {
        resultText.value = 'Please select a remedy first.';
        return;
    }

    // Collect checked sections per source
    const grouped = { A: [], G: [], B: [] };
    document.querySelectorAll('#sources-container input[type="checkbox"][data-section]:checked').forEach(cb => {
        const src = cb.dataset.source;
        if (grouped[src]) grouped[src].push(cb.dataset.section);
    });

    const hasAny = Object.values(grouped).some(arr => arr.length > 0);
    if (!hasAny) {
        resultText.value = 'Please select at least one section.';
        return;
    }

    const LABELS = { A: 'ALLENS', G: 'GEMS', B: 'BOERICKE' };
    const SEP_MAIN = '═'.repeat(60);
    const SEP_SRC = '─'.repeat(50);

    let output = '';
    output += SEP_MAIN + '\n';
    output += centerText(canonicalName.toUpperCase(), 60) + '\n';
    output += SEP_MAIN + '\n\n';

    ['A', 'G', 'B'].forEach(srcKey => {
        const sectionKeys = grouped[srcKey];
        if (!sectionKeys || sectionKeys.length === 0) return;

        const srcName = currentSources[srcKey];
        let sections = null;
        if (srcKey === 'A') sections = getSectionsFromAllens(srcName);
        else if (srcKey === 'G') sections = getSectionsFromGems(srcName);
        else if (srcKey === 'B') sections = getSectionsFromBoericke(srcName);
        if (!sections) return;

        output += `◆ ${LABELS[srcKey]}\n`;
        output += SEP_SRC + '\n\n';

        sectionKeys.forEach(sectionKey => {
            const lines = sections[sectionKey];
            if (!lines || lines.length === 0) return;

            const sectionTitle = formatSectionKey(sectionKey).toUpperCase();
            output += `  ▸ ${sectionTitle}\n`;
            output += '  ' + '·'.repeat(40) + '\n';

            lines.forEach((line, i) => {
                const num = String(i + 1).padStart(2, ' ');
                // Word-wrap at ~80 chars
                const wrapped = wrapText(`${num}. ${line}`, 76, '      ');
                output += '    ' + wrapped + '\n';
            });
            output += '\n';
        });

        output += '\n';
    });

    resultText.value = output;
    resultText.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Text helpers ─────────────────────────────────────────────────────────────
function centerText(text, width) {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
}

function wrapText(text, maxWidth, indent) {
    const words = text.split(' ');
    let lines = [], line = '';
    words.forEach(word => {
        if ((line + word).length > maxWidth) {
            lines.push(line.trimEnd());
            line = indent + word + ' ';
        } else {
            line += word + ' ';
        }
    });
    if (line.trim()) lines.push(line.trimEnd());
    return lines.join('\n    ');
}

// ── Fullscreen image modal ────────────────────────────────────────────────────
function openFullscreenImage() {
    const imgEl = document.getElementById('remedy-image');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    if (!imgEl || !modal || !modalImg) return;
    modalImg.src = imgEl.src;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeFullscreenImage() {
    const modal = document.getElementById('imageModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeFullscreenImage();
});
