// Build lightweight indexes for fast lookup
export function buildIndex(sentences) {
  const formHits = new Map();
  const lemmaHits = new Map();
  const uposCounts = new Map();
  const lemmaCounts = new Map();
  const formCounts = new Map();
  const featKeys = new Set();
  const uposSet = new Set();
  const deprelSet = new Set();

  sentences.forEach((sent, sid) => {
    sent.uid = sid; // stable numeric id for lookup
    sent.text = sent.text || sent.meta.text || '';
    sent.id = sent.id || sent.meta.sent_id || `s-${sid}`;

    sent.tokens.forEach((tok, tid) => {
      const formKey = tok.form.toLowerCase();
      const lemmaKey = tok.lemma ? tok.lemma.toLowerCase() : formKey;
      addHit(formHits, formKey, sid, tid);
      addHit(lemmaHits, lemmaKey, sid, tid);

      inc(formCounts, formKey);
      inc(lemmaCounts, lemmaKey);
      if (tok.upos) {
        uposSet.add(tok.upos);
        deprelSet.add(tok.deprel);
        inc(uposCounts, tok.upos);
      }
      Object.keys(tok.feats || {}).forEach((k) => featKeys.add(k));
    });
  });

  return { formHits, lemmaHits, uposCounts, lemmaCounts, formCounts, featKeys, uposSet, deprelSet };
}

function addHit(map, key, sid, tid) {
  const arr = map.get(key) || [];
  arr.push({ sid, tid });
  map.set(key, arr);
}

function inc(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}
