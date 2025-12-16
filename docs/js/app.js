import { loadConllu } from './conllu.js';
import { buildIndex } from './indexer.js';

const state = {
  sentences: [],
  index: null,
  searchResults: [],
  page: 1,
  pageSize: 20,
  selectedSentence: null,
};

const dataFiles = {
  train: './data/qpm_philotis-ud-train.conllu',
  dev: './data/qpm_philotis-ud-dev.conllu',
  test: './data/qpm_philotis-ud-test.conllu',
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function init() {
  cacheElements();
  bindTabs();
  bindEvents();
  setStatus(els.loadStatus, 'Not loaded');
  setStatus(els.searchStatus, '');
}

function cacheElements() {
  els.loadBtn = $('load-btn');
  els.loadStatus = $('load-status');
  els.searchBtn = $('search-btn');
  els.resetBtn = $('reset-btn');
  els.searchInput = $('search-input');
  els.matchType = document.querySelectorAll('input[name="match-type"]');
  els.caseSensitive = $('case-sensitive');
  els.substringMode = $('substring');
  els.uposFilter = $('upos-filter');
  els.deprelFilter = $('deprel-filter');
  els.featKey = $('feat-key');
  els.featVal = $('feat-val');
  els.lenMin = $('len-min');
  els.lenMax = $('len-max');
  els.searchStatus = $('search-status');
  els.resultCount = $('result-count');
  els.results = $('results');
  els.pageInfo = $('page-info');
  els.prevPage = $('prev-page');
  els.nextPage = $('next-page');
  els.ngramBtn = $('ngram-btn');
  els.ngramN = $('ngram-n');
  els.ngramTop = $('ngram-top');
  els.ngramScope = document.querySelectorAll('input[name="ngram-scope"]');
  els.ngramOutput = $('ngrams-output');
  els.collocationBtn = $('collocation-btn');
  els.collocationTarget = $('collocation-target');
  els.collocationWindow = $('collocation-window');
  els.collocationTop = $('collocation-top');
  els.collocationMeasure = $('collocation-measure');
  els.collocationOutput = $('collocations-output');
  els.chartPosBtn = $('chart-pos-btn');
  els.chartLemmaBtn = $('chart-lemma-btn');
  els.chartFormBtn = $('chart-form-btn');
  els.chartCanvas = $('chart-canvas');
  els.chartCaption = $('chart-caption');
  els.depSvg = $('dep-svg');
  els.depText = $('dep-text');
}

function bindTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const id = tab.dataset.tab;
      const panel = document.getElementById(`tab-${id}`);
      if (panel) panel.classList.add('active');
    });
  });
}

function bindEvents() {
  els.loadBtn.addEventListener('click', loadCorpus);
  els.searchBtn.addEventListener('click', runSearch);
  els.resetBtn.addEventListener('click', resetFilters);
  els.prevPage.addEventListener('click', () => changePage(-1));
  els.nextPage.addEventListener('click', () => changePage(1));
  els.ngramBtn.addEventListener('click', computeNgrams);
  els.collocationBtn.addEventListener('click', computeCollocations);
  els.chartPosBtn.addEventListener('click', () => drawChart('upos'));
  els.chartLemmaBtn.addEventListener('click', () => drawChart('lemma'));
  els.chartFormBtn.addEventListener('click', () => drawChart('form'));
  
  // Akkordeon-Toggle
  document.querySelectorAll('.controls h2').forEach((h2) => {
    h2.addEventListener('click', () => {
      h2.classList.toggle('collapsed');
      const content = h2.nextElementSibling;
      if (content && content.classList.contains('section-content')) {
        content.classList.toggle('collapsed');
      }
    });
  });
}

async function loadCorpus() {
  const selectedSplits = ['train', 'dev', 'test'].filter((name) => $(
    `split-${name}`,
  ).checked);
  if (!selectedSplits.length) {
    setStatus(els.loadStatus, 'Select at least one split');
    return;
  }
  setStatus(els.loadStatus, 'Loading...');
  state.sentences = [];
  for (const split of selectedSplits) {
    const url = dataFiles[split];
    try {
      const sentences = await loadConllu(url, split, (p) => updateLoadProgress(split, p));
      console.log(`${split}: parsed ${sentences.length} sentences`);
      state.sentences.push(...sentences);
      setStatus(els.loadStatus, `Loaded ${split}: ${sentences.length} sentences`);
    } catch (err) {
      setStatus(els.loadStatus, `Failed ${split}: ${err.message}`);
      return;
    }
  }
  state.index = buildIndex(state.sentences);
  console.log('Index built:', {
    formCounts: state.index.formCounts.size,
    lemmaCounts: state.index.lemmaCounts.size,
    uposCounts: state.index.uposCounts.size,
    totalTokens: Array.from(state.index.formCounts.values()).reduce((a, b) => a + b, 0),
  });
  populateFilters();
  setStatus(els.loadStatus, `Loaded ${state.sentences.length} sentences across ${selectedSplits.length} splits`);
  setStatus(els.searchStatus, 'Corpus ready. Run a search.');
}

function updateLoadProgress(split, fraction) {
  const pct = Math.floor(fraction * 100);
  setStatus(els.loadStatus, `Loading ${split}: ${pct}%`);
}

function populateFilters() {
  const { uposSet, deprelSet } = state.index || {};
  fillSelect(els.uposFilter, Array.from(uposSet || []).sort());
  fillSelect(els.deprelFilter, Array.from(deprelSet || []).sort());
}

function fillSelect(sel, items) {
  sel.innerHTML = '';
  items.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    sel.appendChild(opt);
  });
}

function resetFilters() {
  els.searchInput.value = '';
  els.caseSensitive.checked = false;
  els.substringMode.checked = false;
  els.featKey.value = '';
  els.featVal.value = '';
  els.lenMin.value = 1;
  els.lenMax.value = 100;
  els.uposFilter.selectedIndex = -1;
  els.deprelFilter.selectedIndex = -1;
  state.searchResults = [];
  state.page = 1;
  renderResults();
  setStatus(els.searchStatus, 'Filters reset.');
}

function getSelectedRadio(nodeList) {
  const found = Array.from(nodeList).find((n) => n.checked);
  return found ? found.value : '';
}

function getSelectedOptions(select) {
  return Array.from(select.selectedOptions).map((o) => o.value);
}

function buildRegex(pattern, { caseSensitive, substring }) {
  if (!pattern) return null;
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wildcarded = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
  const body = substring ? wildcarded : `^${wildcarded}$`;
  try {
    return new RegExp(body, caseSensitive ? '' : 'i');
  } catch (err) {
    return null;
  }
}

function runSearch() {
  if (!state.sentences.length) {
    setStatus(els.searchStatus, 'Load corpus first.');
    return;
  }
  const query = els.searchInput.value.trim();
  const matchType = getSelectedRadio(els.matchType) || 'form';
  const caseSensitive = els.caseSensitive.checked;
  const substringMode = els.substringMode.checked;
  const uposList = getSelectedOptions(els.uposFilter);
  const deprelList = getSelectedOptions(els.deprelFilter);
  const featKey = els.featKey.value.trim();
  const featVal = els.featVal.value.trim();
  const lenMin = parseInt(els.lenMin.value, 10) || 1;
  const lenMax = parseInt(els.lenMax.value, 10) || 9999;
  const regex = buildRegex(query, { caseSensitive, substring: substringMode });
  const results = [];

  state.sentences.forEach((sent) => {
    if (sent.tokens.length < lenMin || sent.tokens.length > lenMax) return;
    const matches = [];
    sent.tokens.forEach((tok, idx) => {
      if (uposList.length && !uposList.includes(tok.upos)) return;
      if (deprelList.length && !deprelList.includes(tok.deprel)) return;
      if (featKey) {
        const val = tok.feats ? tok.feats[featKey] : undefined;
        if (!val) return;
        if (featVal && !val.toLowerCase().includes(featVal.toLowerCase())) return;
      }
      const valueRaw = matchType === 'lemma' ? (tok.lemma || tok.form) : tok.form;
      const value = caseSensitive ? valueRaw : valueRaw.toLowerCase();
      if (!regex) {
        matches.push(idx);
        return;
      }
      if (regex.test(value)) matches.push(idx);
    });
    if (matches.length) results.push({ sid: sent.uid, matches });
  });

  state.searchResults = results;
  state.page = 1;
  renderResults();
  setStatus(els.searchStatus, `${results.length} sentence(s) matched.`);
}

function renderResults() {
  const total = state.searchResults.length;
  const start = (state.page - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, total);
  els.resultCount.textContent = total ? `${total} sentences` : 'No results';
  els.pageInfo.textContent = total ? `${state.page} / ${Math.max(1, Math.ceil(total / state.pageSize))}` : '';
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = end >= total;
  els.results.innerHTML = '';
  if (!total) return;
  const slice = state.searchResults.slice(start, end);
  slice.forEach((hit) => {
    const sent = state.sentences[hit.sid];
    const div = document.createElement('div');
    div.className = 'result-sentence';
    div.dataset.sid = hit.sid;
    
    // Render tokens with tags
    const tokensDiv = document.createElement('div');
    tokensDiv.className = 'tokens-view';
    sent.tokens.forEach((tok, idx) => {
      const tokenSpan = document.createElement('span');
      tokenSpan.className = `token-group ${hit.matches.includes(idx) ? 'match' : ''}`;
      
      const form = document.createElement('span');
      form.className = 'token-form';
      form.textContent = tok.form;
      tokenSpan.appendChild(form);
      
      // Add POS tag
      if (tok.upos) {
        const posSpan = document.createElement('span');
        posSpan.className = 'token-tag upos';
        posSpan.textContent = tok.upos;
        tokenSpan.appendChild(posSpan);
      }
      
      tokensDiv.appendChild(tokenSpan);
    });
    div.appendChild(tokensDiv);
    
    // Add metadata
    const metaDiv = document.createElement('div');
    metaDiv.className = 'meta';
    metaDiv.textContent = `${sent.id} • ${sent.split} • ${sent.tokens.length} tokens`;
    div.appendChild(metaDiv);
    
    div.addEventListener('click', () => renderDependencies(sent));
    els.results.appendChild(div);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch] || ch));
}

function changePage(delta) {
  const maxPage = Math.max(1, Math.ceil(state.searchResults.length / state.pageSize));
  state.page = Math.min(maxPage, Math.max(1, state.page + delta));
  renderResults();
}

function computeNgrams() {
  if (!state.sentences.length) return;
  const n = Math.min(5, Math.max(1, parseInt(els.ngramN.value, 10) || 2));
  const top = Math.max(1, parseInt(els.ngramTop.value, 10) || 30);
  const scope = getSelectedRadio(els.ngramScope) || 'all';
  const freq = new Map();
  const sentences = scope === 'results' && state.searchResults.length
    ? state.searchResults.map((hit) => state.sentences[hit.sid])
    : state.sentences;
  sentences.forEach((sent) => {
    for (let i = 0; i <= sent.tokens.length - n; i += 1) {
      const gram = sent.tokens.slice(i, i + n).map((t) => t.form.toLowerCase()).join(' ');
      freq.set(gram, (freq.get(gram) || 0) + 1);
    }
  });
  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, top);
  renderTable(els.ngramOutput, ['ngram', 'count'], sorted);
}

function computeCollocations() {
  if (!state.sentences.length) return;
  const targetRaw = els.collocationTarget.value.trim();
  if (!targetRaw) {
    els.collocationOutput.innerHTML = '<p class="status">Enter a target token.</p>';
    return;
  }
  const target = targetRaw.toLowerCase();
  const win = Math.max(1, parseInt(els.collocationWindow.value, 10) || 2);
  const top = Math.max(1, parseInt(els.collocationTop.value, 10) || 30);
  const measure = els.collocationMeasure.value;

  let totalTokens = 0;
  let targetCount = 0;
  const marginal = new Map();
  const co = new Map();

  state.sentences.forEach((sent) => {
    sent.tokens.forEach((tok, idx) => {
      const val = (tok.lemma || tok.form).toLowerCase();
      totalTokens += 1;
      marginal.set(val, (marginal.get(val) || 0) + 1);
      if (val === target) {
        targetCount += 1;
        const start = Math.max(0, idx - win);
        const end = Math.min(sent.tokens.length - 1, idx + win);
        for (let j = start; j <= end; j += 1) {
          if (j === idx) continue;
          const ctx = (sent.tokens[j].lemma || sent.tokens[j].form).toLowerCase();
          co.set(ctx, (co.get(ctx) || 0) + 1);
        }
      }
    });
  });

  const scored = Array.from(co.entries()).map(([ctx, c]) => {
    const marg = marginal.get(ctx) || 1;
    const pmi = Math.log2((c * totalTokens) / Math.max(1, targetCount * marg));
    const expected = (targetCount * marg) / totalTokens;
    const tscore = (c - expected) / Math.sqrt(c || 1);
    return { ctx, c, pmi, tscore };
  });
  const sorted = scored
    .sort((a, b) => (measure === 'pmi' ? b.pmi - a.pmi : b.tscore - a.tscore))
    .slice(0, top);
  const rows = sorted.map((row) => [row.ctx, row.c, row.pmi.toFixed(2), row.tscore.toFixed(2)]);
  renderTable(els.collocationOutput, ['token', 'count', 'pmi', 't-score'], rows);
}

function renderTable(container, headers, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="status">No data.</p>';
    return;
  }
  const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  container.innerHTML = `<table>${thead}${tbody}</table>`;
}

function drawChart(kind) {
  console.log(`drawChart(${kind}) called`);
  if (!state.index) {
    setStatus(els.chartCaption, 'Load corpus first.');
    console.log('No index');
    return;
  }
  if (!els.chartCanvas) {
    setStatus(els.chartCaption, 'Chart canvas element not found.');
    console.log('No canvas element');
    return;
  }
  const ctx = els.chartCanvas.getContext('2d');
  if (!ctx) {
    setStatus(els.chartCaption, 'Canvas context not available.');
    console.log('No context');
    return;
  }
  
  // Switch to Charts tab
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelector('[data-tab="charts"]').classList.add('active');
  document.getElementById('tab-charts').classList.add('active');
  
  ctx.clearRect(0, 0, els.chartCanvas.width, els.chartCanvas.height);

  const entries = selectTopCounts(kind, state.index);
  if (!entries.length) {
    setStatus(els.chartCaption, 'No data to chart.');
    console.log('No entries for kind:', kind);
    return;
  }
  const maxVal = entries[0][1];
  const width = els.chartCanvas.width;
  const height = els.chartCanvas.height;
  const barW = Math.max(8, width / entries.length - 6);
  entries.forEach(([label, val], i) => {
    const x = 10 + i * (barW + 6);
    const h = Math.max(4, (val / maxVal) * (height - 60));
    const y = height - h - 20;
    ctx.fillStyle = '#0f6f94';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#1f1f1f';
    ctx.font = '10px sans-serif';
    ctx.save();
    ctx.translate(x + barW / 2, height - 6);
    ctx.rotate(-Math.PI / 3);
    ctx.fillText(label.slice(0, 12), 0, 0);
    ctx.restore();
  });
  setStatus(els.chartCaption, `Chart: ${kind.toUpperCase()} (top ${entries.length})`);
}

function selectTopCounts(kind, index) {
  const limit = kind === 'upos' ? 30 : 25;
  let sourceMap;
  if (kind === 'upos') sourceMap = index.uposCounts;
  else if (kind === 'lemma') sourceMap = index.lemmaCounts;
  else if (kind === 'form') sourceMap = index.formCounts;
  
  if (!sourceMap || sourceMap.size === 0) {
    console.log(`selectTopCounts(${kind}): sourceMap missing or empty`);
    console.log(`Available maps:`, {
      upos: index.uposCounts?.size,
      lemma: index.lemmaCounts?.size,
      form: index.formCounts?.size,
    });
    return [];
  }
  
  const entries = Array.from(sourceMap.entries());
  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, limit);
  console.log(`selectTopCounts(${kind}): ${sorted.length} entries. Top 3:`, sorted.slice(0, 3));
  return sorted;
}

function renderDependencies(sentence) {
  state.selectedSentence = sentence;
  const svg = els.depSvg;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (!sentence) {
    els.depText.textContent = 'Select a sentence to view dependencies.';
    return;
  }
  els.depText.textContent = `${sentence.id} • ${sentence.tokens.length} tokens`;
  const width = svg.viewBox.baseVal.width || svg.width.baseVal.value;
  const height = svg.viewBox.baseVal.height || svg.height.baseVal.value;
  const baseY = height - 30;
  const step = Math.max(40, (width - 40) / Math.max(1, sentence.tokens.length));
  const positions = {};
  sentence.tokens.forEach((tok, idx) => {
    positions[tok.id] = 20 + idx * step;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', positions[tok.id]);
    text.setAttribute('y', baseY + 16);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = tok.form;
    svg.appendChild(text);
  });

  sentence.tokens.forEach((tok) => {
    if (!tok.head || tok.head < 0) return;
    const from = positions[tok.head];
    const to = positions[tok.id];
    const dist = Math.abs(to - from);
    const arcHeight = Math.max(30, dist / 2);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${from} ${baseY} C ${from} ${baseY - arcHeight}, ${to} ${baseY - arcHeight}, ${to} ${baseY}`);
    path.setAttribute('stroke', '#0f6f94');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', (from + to) / 2);
    label.setAttribute('y', baseY - arcHeight - 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '10');
    label.textContent = tok.deprel;
    svg.appendChild(label);
  });
}

function setStatus(el, msg) {
  if (el) el.textContent = msg;
}

window.addEventListener('DOMContentLoaded', init);
