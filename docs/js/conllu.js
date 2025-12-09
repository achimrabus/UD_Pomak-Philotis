// Simple CONLL-U parser
export async function loadConllu(url, splitName, onProgress) {
  const res = await fetch(url);
  const text = await res.text();
  return parseConllu(text, splitName, onProgress);
}

export function parseConllu(text, splitName, onProgress) {
  const sentences = [];
  let current = null;
  const lines = text.split(/\r?\n/);
  const total = lines.length;

  const flush = () => {
    if (current && current.tokens.length) {
      current.length = current.tokens.length;
      sentences.push(current);
    }
    current = null;
  };

  lines.forEach((line, idx) => {
    if (!line.trim()) {
      flush();
      return;
    }
    if (line.startsWith('#')) {
      if (!current) current = makeEmpty(splitName);
      const meta = parseMeta(line);
      if (meta.key) current.meta[meta.key] = meta.value;
      return;
    }
    if (!current) current = makeEmpty(splitName);
    const cols = line.split('\t');
    if (cols.length < 8) return; // skip malformed
    const token = buildToken(cols);
    current.tokens.push(token);
    if (onProgress && idx % 500 === 0) onProgress(idx / total);
  });
  flush();
  return sentences;
}

function makeEmpty(splitName) {
  return { id: '', text: '', split: splitName, tokens: [], meta: {} };
}

function parseMeta(line) {
  const m = line.match(/^#\s*([^=]+)=\s*(.*)$/);
  if (!m) return { key: '', value: '' };
  const key = m[1].trim().replace(/\s+/g, '_');
  const value = m[2].trim();
  return { key, value };
}

function buildToken(cols) {
  const [id, form, lemma, upos, xpos, feats, head, deprel, deps, misc] = cols;
  return {
    id: parseInt(id, 10),
    form,
    lemma,
    upos,
    xpos,
    feats: parseFeats(feats),
    head: parseInt(head, 10),
    deprel,
    misc,
  };
}

function parseFeats(raw) {
  if (!raw || raw === '_' || raw === '-') return {};
  return raw.split('|').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});
}
