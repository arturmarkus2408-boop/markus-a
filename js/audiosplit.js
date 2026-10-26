'use strict';
/* ============================================================================
   v4.2: cutting a long recording into separate small files WITHOUT decoding it
   (decoding 1.5 hours of sound would need ~1 GB of phone memory).

   · MP4 / M4A with AAC (what the Android app and Chrome record) → pieces of ADTS .aac
     (audio/aac — a format Gemini officially accepts). Plain and "fragmented" MP4 both work.
   · WebM (Chrome on a computer) → pieces made of whole WebM clusters.
   Anything else → throws, and the caller falls back to the old way.

   Each piece is ~10 minutes (~5 MB), so one AI request carries only that piece — not the
   whole recording — and fits into the free limits of Gemini however long the meeting was.

   AudioSplit.split(blob, seconds) → { kind, mime, duration, parts: [{ from, to, mime, get() }] }
   get() builds the piece when it is needed (so all pieces never sit in memory at once).
   ========================================================================== */
const AudioSplit = (() => {
  const SF_HZ = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
  const rd = async (blob, a, b) => new Uint8Array(await blob.slice(Math.max(0, a), Math.min(blob.size, b)).arrayBuffer());
  const r32 = (v, o) => v[o] * 16777216 + ((v[o + 1] << 16) | (v[o + 2] << 8) | v[o + 3]);
  const s32 = (v, o) => (v[o] << 24) | (v[o + 1] << 16) | (v[o + 2] << 8) | v[o + 3];
  const r64 = (v, o) => r32(v, o) * 4294967296 + r32(v, o + 4);
  const tag = (v, o) => String.fromCharCode(v[o], v[o + 1], v[o + 2], v[o + 3]);
  const bad = m => new Error('audiosplit: ' + m);

  /* ---------------------------------------------------------------- MP4 ---- */
  function boxes(v, a, b) {
    const r = [];
    while (a + 8 <= b) {
      let s = r32(v, a), hl = 8; const ty = tag(v, a + 4);
      if (s === 1) { if (a + 16 > b) break; s = r64(v, a + 8); hl = 16; } else if (s === 0) s = b - a;
      if (s < hl || a + s > b) break;
      r.push({ ty, a, hl, b: a + s }); a += s;
    }
    return r;
  }
  const sub = (v, bx, ty) => bx && boxes(v, bx.a + bx.hl, bx.b).find(x => x.ty === ty);
  const subs = (v, bx, ty) => bx ? boxes(v, bx.a + bx.hl, bx.b).filter(x => x.ty === ty) : [];

  /* top-level boxes of the file, reading only their headers */
  async function topBoxes(blob) {
    const out = []; let pos = 0; const n = blob.size;
    while (pos + 8 <= n) {
      const h = await rd(blob, pos, pos + 16);
      let size = r32(h, 0), hl = 8; const type = tag(h, 4);
      if (size === 1) { if (h.length < 16) break; size = r64(h, 8); hl = 16; } else if (size === 0) size = n - pos;
      if (size < hl) break;
      if (pos + size > n) size = n - pos;   // a file cut short (recording interrupted): keep what is there
      out.push({ type, pos, size, hl }); pos += size;
    }
    return out;
  }

  /* AudioSpecificConfig → what the ADTS header needs */
  function parseASC(v) {
    let bit = 0;
    const get = n => { let x = 0; for (let i = 0; i < n; i++, bit++) x = x * 2 + (((v[bit >> 3] || 0) >> (7 - (bit & 7))) & 1); return x; };
    let aot = get(5); if (aot === 31) aot = 32 + get(6);
    const sfi = get(4); if (sfi === 15) throw bad('custom sample rate');
    const ch = get(4);
    if (aot === 5 || aot === 29) { get(4); aot = get(5); if (aot === 31) aot = 32 + get(6); }   // HE-AAC: the core is what ADTS describes
    if (aot < 1 || aot > 4 || sfi > 12 || ch < 1 || ch > 7) throw bad('unsupported AAC kind');
    return { aot, sfi, ch };
  }
  function findASC(v, a, b) {
    for (let i = a; i + 8 < b; i++) {
      if (v[i] === 0x65 && v[i + 1] === 0x73 && v[i + 2] === 0x64 && v[i + 3] === 0x73) {   // 'esds'
        let p = i + 8;   // tag + version/flags
        const dsc = () => { const t = v[p++]; let l = 0; for (let k = 0; k < 4; k++) { const c = v[p++]; l = (l << 7) | (c & 0x7F); if (!(c & 0x80)) break; } return { t, l }; };
        let d = dsc();
        if (d.t === 3) { p += 2; const fl = v[p++]; if (fl & 0x80) p += 2; if (fl & 0x40) p += 1 + v[p]; if (fl & 0x20) p += 2; d = dsc(); }
        if (d.t === 4) { const oti = v[p]; if (![0x40, 0x66, 0x67, 0x68].includes(oti)) throw bad('not AAC'); p += 13; d = dsc(); }
        if (d.t === 5) return v.subarray(p, p + d.l);
      }
    }
    return null;
  }

  function trackInfo(v, trak) {
    const mdia = sub(v, trak, 'mdia'); if (!mdia) return null;
    const hdlr = sub(v, mdia, 'hdlr'); if (!hdlr || tag(v, hdlr.a + hdlr.hl + 8) !== 'soun') return null;
    const mdhd = sub(v, mdia, 'mdhd'), tkhd = sub(v, trak, 'tkhd');
    const mv = v[mdhd.a + mdhd.hl], tv = v[tkhd.a + tkhd.hl];
    const timescale = r32(v, mdhd.a + mdhd.hl + (mv === 1 ? 20 : 12));
    const id = r32(v, tkhd.a + tkhd.hl + (tv === 1 ? 20 : 12));
    const stbl = sub(v, sub(v, mdia, 'minf'), 'stbl'); if (!stbl) return null;
    const stsd = sub(v, stbl, 'stsd'); if (!stsd) return null;
    const entry = boxes(v, stsd.a + stsd.hl + 8, stsd.b)[0];
    if (!entry || entry.ty !== 'mp4a') throw bad('track is not mp4a (' + (entry && entry.ty) + ')');
    const asc = findASC(v, entry.a, entry.b); if (!asc) throw bad('no esds');
    return { id, timescale, asc: parseASC(asc), stbl };
  }

  /* plain MP4: sample tables */
  function tableSamples(v, stbl) {
    const stsz = sub(v, stbl, 'stsz'), stsc = sub(v, stbl, 'stsc'), stts = sub(v, stbl, 'stts');
    const stco = sub(v, stbl, 'stco') || sub(v, stbl, 'co64');
    if (!stsz || !stsc || !stts || !stco) return { offs: [], sizes: [], durs: [] };
    const fixed = r32(v, stsz.a + stsz.hl + 4), n = r32(v, stsz.a + stsz.hl + 8);
    const sizes = new Uint32Array(n);
    for (let i = 0; i < n; i++) sizes[i] = fixed || r32(v, stsz.a + stsz.hl + 12 + i * 4);
    const durs = new Uint32Array(n);
    { const c = r32(v, stts.a + stts.hl + 4); let k = 0;
      for (let e = 0; e < c && k < n; e++) { const cnt = r32(v, stts.a + stts.hl + 8 + e * 8), d = r32(v, stts.a + stts.hl + 12 + e * 8); for (let j = 0; j < cnt && k < n; j++) durs[k++] = d; } }
    const is64 = stco.ty === 'co64', nc = r32(v, stco.a + stco.hl + 4);
    const cOff = i => is64 ? r64(v, stco.a + stco.hl + 8 + i * 8) : r32(v, stco.a + stco.hl + 8 + i * 4);
    const ns = r32(v, stsc.a + stsc.hl + 4);
    const runs = []; for (let e = 0; e < ns; e++) runs.push([r32(v, stsc.a + stsc.hl + 8 + e * 12), r32(v, stsc.a + stsc.hl + 12 + e * 12)]);
    const offs = new Float64Array(n); let k = 0;
    for (let c = 0; c < nc && k < n; c++) {
      let spc = 0; for (let e = 0; e < runs.length; e++) if (runs[e][0] <= c + 1) spc = runs[e][1]; else break;
      let o = cOff(c);
      for (let j = 0; j < spc && k < n; j++) { offs[k] = o; o += sizes[k]; k++; }
    }
    return { offs, sizes, durs, n: k };
  }

  /* fragmented MP4 (what Chrome's MediaRecorder writes): moof + mdat pairs */
  async function fragSamples(blob, tops, trackId, trex) {
    const offs = [], sizes = [], durs = [];
    for (const bx of tops.filter(b => b.type === 'moof')) {
      const v = await rd(blob, bx.pos, bx.pos + bx.size);
      const moof = { a: 0, hl: bx.hl, b: v.length };
      for (const traf of subs(v, moof, 'traf')) {
        const tfhd = sub(v, traf, 'tfhd'); if (!tfhd) continue;
        const fl = r32(v, tfhd.a + tfhd.hl) & 0xFFFFFF, tid = r32(v, tfhd.a + tfhd.hl + 4);
        if (trackId != null && tid !== trackId) continue;
        let p = tfhd.a + tfhd.hl + 8, base = bx.pos, dDur = trex.dur, dSize = trex.size;
        if (fl & 0x1) { base = r64(v, p); p += 8; }
        if (fl & 0x2) p += 4;
        if (fl & 0x8) { dDur = r32(v, p); p += 4; }
        if (fl & 0x10) { dSize = r32(v, p); p += 4; }
        let next = null;
        for (const trun of subs(v, traf, 'trun')) {
          const tf = r32(v, trun.a + trun.hl) & 0xFFFFFF, cnt = r32(v, trun.a + trun.hl + 4);
          let q = trun.a + trun.hl + 8, off;
          if (tf & 0x1) { off = base + s32(v, q); q += 4; } else off = next != null ? next : bx.pos + bx.size + 8;
          if (tf & 0x4) q += 4;
          for (let i = 0; i < cnt; i++) {
            let d = dDur, s = dSize;
            if (tf & 0x100) { d = r32(v, q); q += 4; }
            if (tf & 0x200) { s = r32(v, q); q += 4; }
            if (tf & 0x400) q += 4;
            if (tf & 0x800) q += 4;
            offs.push(off); sizes.push(s); durs.push(d); off += s;
          }
          next = off;
        }
      }
    }
    return { offs, sizes, durs };
  }

  async function parseMp4(blob) {
    const tops = await topBoxes(blob);
    const mt = tops.find(b => b.type === 'moov'); if (!mt) throw bad('no moov (file not finished)');
    const v = await rd(blob, mt.pos, mt.pos + mt.size);
    const moov = { a: 0, hl: mt.hl, b: v.length };
    let tr = null;
    for (const trak of subs(v, moov, 'trak')) { tr = trackInfo(v, trak); if (tr) break; }
    if (!tr) throw bad('no audio track');
    const trexBox = sub(v, sub(v, moov, 'mvex'), 'trex');
    const trex = trexBox ? { dur: r32(v, trexBox.a + trexBox.hl + 12), size: r32(v, trexBox.a + trexBox.hl + 16) } : { dur: 1024, size: 0 };
    const t0 = tableSamples(v, tr.stbl);
    let offs = Array.from(t0.offs.subarray ? t0.offs.subarray(0, t0.n) : []), sizes = Array.from((t0.sizes || []).slice(0, t0.n || 0)), durs = Array.from((t0.durs || []).slice(0, t0.n || 0));
    if (tops.some(b => b.type === 'moof')) {
      const f = await fragSamples(blob, tops, tr.id, trex);
      offs = offs.concat(f.offs); sizes = sizes.concat(f.sizes); durs = durs.concat(f.durs);
    }
    // keep only samples that really are inside the file (a recording cut short)
    const O = [], Z = [], T = [];
    for (let i = 0; i < offs.length; i++) if (sizes[i] > 0 && sizes[i] <= 8184 && offs[i] + sizes[i] <= blob.size) { O.push(offs[i]); Z.push(sizes[i]); T.push(durs[i] || 1024); }
    if (!O.length) throw bad('no samples');
    return { asc: tr.asc, timescale: tr.timescale, offs: O, sizes: Z, durs: T };
  }

  function adts(asc, len) {
    const L = len + 7, h = new Uint8Array(7);
    h[0] = 0xFF; h[1] = 0xF1;
    h[2] = ((asc.aot - 1) << 6) | (asc.sfi << 2) | ((asc.ch >> 2) & 1);
    h[3] = ((asc.ch & 3) << 6) | ((L >> 11) & 3);
    h[4] = (L >> 3) & 0xFF;
    h[5] = ((L & 7) << 5) | 0x1F;
    h[6] = 0xFC;
    return h;
  }

  /* where to cut: every `sec` seconds; a short tail is glued to the last piece */
  function plan(times, sec, total, minTail) {
    const cuts = []; let start = 0, t0 = times[0];
    for (let i = 0; i < times.length; i++) if (times[i] - t0 >= sec) { cuts.push([start, i, t0]); start = i; t0 = times[i]; }
    cuts.push([start, times.length, t0]);
    if (cuts.length > 1 && total - cuts[cuts.length - 1][2] < minTail) { const last = cuts.pop(); cuts[cuts.length - 1][1] = last[1]; }
    return cuts;
  }

  async function splitMp4(blob, sec) {
    const m = await parseMp4(blob), n = m.sizes.length;
    const times = new Float64Array(n); let acc = 0;
    for (let i = 0; i < n; i++) { times[i] = acc / m.timescale; acc += m.durs[i]; }
    const total = acc / m.timescale;
    const cuts = plan(times, sec, total, 45);
    const parts = cuts.map(([i0, i1, from], k) => {
      const to = k + 1 < cuts.length ? cuts[k + 1][2] : total;
      return {
        from, to, mime: 'audio/aac',
        async get() {
          let size = 0; for (let i = i0; i < i1; i++) size += m.sizes[i] + 7;
          const out = new Uint8Array(size); let o = 0, i = i0;
          while (i < i1) {   // samples that follow each other in the file are read in one go
            let j = i, end = m.offs[i] + m.sizes[i];
            while (j + 1 < i1 && m.offs[j + 1] === end && end - m.offs[i] < 8 * 1048576) { j++; end += m.sizes[j]; }
            const buf = await rd(blob, m.offs[i], end); let p = 0;
            for (let q = i; q <= j; q++) { out.set(adts(m.asc, m.sizes[q]), o); o += 7; out.set(buf.subarray(p, p + m.sizes[q]), o); o += m.sizes[q]; p += m.sizes[q]; }
            i = j + 1;
          }
          return new Blob([out], { type: 'audio/aac' });
        }
      };
    });
    return { kind: 'mp4', mime: 'audio/aac', duration: total, parts };
  }

  /* --------------------------------------------------------------- WebM ---- */
  function vint(v, o, isId) {
    const b = v[o]; if (b === undefined) return null;
    let len = 1, mask = 0x80; while (len <= 8 && !(b & mask)) { len++; mask >>= 1; }
    if (len > 8) return null;
    let val = isId ? b : (b & (mask - 1)), unknown = !isId && (b & (mask - 1)) === mask - 1;
    for (let i = 1; i < len; i++) { const c = v[o + i]; if (c === undefined) return null; val = val * 256 + c; if (c !== 0xFF) unknown = false; }
    return { len, val, unknown };
  }
  async function splitWebm(blob, sec, durHint) {
    const N = blob.size, WIN = 4 * 1048576, cl = [];
    for (let a = 0; a < N; a += WIN - 64) {   // the windows overlap so no cluster header is cut in two
      const v = await rd(blob, a, a + WIN);
      for (let i = 0; i + 4 < v.length; i++) {
        if (v[i] !== 0x1F || v[i + 1] !== 0x43 || v[i + 2] !== 0xB6 || v[i + 3] !== 0x75) continue;   // Cluster
        const abs = a + i; if (cl.length && abs <= cl[cl.length - 1].pos) continue;
        const sz = vint(v, i + 4, false); if (!sz) continue;
        const q = i + 4 + sz.len;
        if (v[q] !== 0xE7) continue;   // a real cluster starts with its Timecode — this guards against a chance match inside the sound
        const ts = vint(v, q + 1, false); if (!ts || ts.unknown || ts.val < 1 || ts.val > 8) continue;
        let tc = 0; for (let k = 0; k < ts.val; k++) tc = tc * 256 + (v[q + 1 + ts.len + k] || 0);
        cl.push({ pos: abs, tc });
        if (a + v.length >= N && i + 4 >= v.length) break;
      }
      if (a + WIN >= N) break;
    }
    if (!cl.length) throw bad('webm: no clusters');
    const head = await rd(blob, 0, cl[0].pos);
    if (!(head[0] === 0x1A && head[1] === 0x45 && head[2] === 0xDF && head[3] === 0xA3)) throw bad('webm: no EBML header');
    const e = vint(head, 4, false); let p = 4 + e.len + e.val;
    if (!(head[p] === 0x18 && head[p + 1] === 0x53 && head[p + 2] === 0x80 && head[p + 3] === 0x67)) throw bad('webm: no segment');
    const sg = vint(head, p + 4, false), segData = p + 4 + sg.len;
    // the segment's size is rewritten as "unknown": the pieces are shorter than the original
    const header = new Uint8Array(p + 12 + (head.length - segData));
    header.set(head.subarray(0, p), 0); header.set([0x18, 0x53, 0x80, 0x67, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], p); header.set(head.subarray(segData), p + 12);
    let scale = 1000000;
    for (let i = 0; i + 4 < head.length; i++) if (head[i] === 0x2A && head[i + 1] === 0xD7 && head[i + 2] === 0xB1) { const s = vint(head, i + 3, false); if (s && s.val >= 1 && s.val <= 8) { let x = 0; for (let k = 0; k < s.val; k++) x = x * 256 + head[i + 3 + s.len + k]; if (x > 0) scale = x; } break; }
    const base = cl[0].tc, times = cl.map(c => (c.tc - base) * scale / 1e9);
    const lastT = times[times.length - 1], total = Math.max(durHint || 0, lastT + 5);
    const cuts = plan(times, sec, total, 45);
    const parts = cuts.map(([i0, i1, from], k) => {
      const to = k + 1 < cuts.length ? cuts[k + 1][2] : total;
      return { from, to, mime: 'audio/webm', async get() { return new Blob([header, blob.slice(cl[i0].pos, i1 < cl.length ? cl[i1].pos : N)], { type: 'audio/webm' }); } };
    });
    return { kind: 'webm', mime: 'audio/webm', duration: total, parts };
  }

  /* --------------------------------------------------------------- entry ---- */
  async function split(blob, sec = 600, o = {}) {
    const h = await rd(blob, 0, 16);
    if (h.length >= 12 && tag(h, 4) === 'ftyp') return splitMp4(blob, sec);
    if (h[0] === 0x1A && h[1] === 0x45 && h[2] === 0xDF && h[3] === 0xA3) return splitWebm(blob, sec, o.duration);
    throw bad('unknown container');
  }
  return { split };
})();
if (typeof module !== 'undefined') module.exports = AudioSplit;
