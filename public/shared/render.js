// Rendering condiviso di carte, macchine e icone (HTML + SVG inline, nessun asset esterno).

export const RES_NAMES = { coal: 'Carbone', iron: 'Ferro', wood: 'Legname', steam: 'Vapore', brass: 'Ottone' };
export const TYPE_NAMES = {
  mine: 'Miniera', workshop: 'Officina', emporium: 'Emporio', airship: 'Dirigibile',
  patent: 'Brevetto', salon: 'Salotto', guild: 'Corporazione',
};
export const TYPE_ORDER = ['mine', 'workshop', 'emporium', 'airship', 'patent', 'salon', 'guild'];
export const COMP_NAMES = { gear: 'Ingranaggio', valve: 'Valvola', lens: 'Lente', spring: 'Molla', coil: 'Bobina' };
export const LINK_NAMES = { hangar: 'Hangar', teatro: 'Palcoscenico', cantiere: 'Cantiere', ferrovia: 'Rotaia', lente: 'Specola' };
const ROMAN = ['', 'I', 'II', 'III'];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ───────────── icone ─────────────

const RES_SVG = {
  coal: '<path d="M5 15l3-7 5-2 5 3 1 6-4 4H9z" fill="#1d1d1f" stroke="#555" stroke-width="1.2"/><path d="M9 10l3-1 2 2" stroke="#777" stroke-width="1" fill="none"/>',
  iron: '<path d="M3 15l4-6h10l4 6z" fill="#8e979e" stroke="#4b5257" stroke-width="1.2"/><path d="M7 9h10l1 2H6z" fill="#c3cbd1"/>',
  wood: '<rect x="3" y="8" width="16" height="8" rx="4" fill="#8a5a2b" stroke="#4e2f12" stroke-width="1.2"/><ellipse cx="18" cy="12" rx="3" ry="4" fill="#d7a868" stroke="#4e2f12" stroke-width="1"/><circle cx="18" cy="12" r="1.3" fill="none" stroke="#8a5a2b"/>',
  steam: '<path d="M6 17a4 4 0 010-8 5 5 0 019-2 4 4 0 013 7 3 3 0 01-3 3z" fill="#eef3f5" stroke="#8aa1ab" stroke-width="1.2"/>',
  brass: '<circle cx="12" cy="12" r="6.5" fill="#d8a945" stroke="#7a5a12" stroke-width="1.2"/><circle cx="12" cy="12" r="2.4" fill="#7a5a12"/><g stroke="#7a5a12" stroke-width="2.4"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></g>',
};

export function resIcon(r, size = 22) {
  return `<svg class="ico res-${r}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-label="${RES_NAMES[r]}"><title>${RES_NAMES[r]}</title>${RES_SVG[r]}</svg>`;
}

export function coinIcon(n, size = 22) {
  return `<span class="coin" style="--s:${size}px" title="Scellini">${n ?? ''}</span>`;
}

export function pointsIcon(n, size = 24) {
  return `<span class="pp" style="--s:${size}px" title="Punti Prestigio">${n}</span>`;
}

const AIRSHIP_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%"><ellipse cx="12" cy="9" rx="9" ry="4.5" fill="#c0392b" stroke="#5c1610" stroke-width="1.2"/><path d="M3.5 9h17" stroke="#7d1f15" stroke-width=".8"/><rect x="9" y="15" width="6" height="3" rx="1" fill="#5c3a1a"/><path d="M10 13.4l-.5 1.6M14 13.4l.5 1.6" stroke="#5c3a1a"/><path d="M20 9l3-2v4z" fill="#7d1f15"/></svg>';

export function airIcon(n, size = 24) {
  return `<span class="air" style="--s:${size}px" title="Pressione aerea">${AIRSHIP_SVG}<b>${n}</b></span>`;
}

const COMP_GLYPH = { gear: '⚙', valve: '⊗', lens: '◎', spring: '§', coil: '∿' };
export function compIcon(c, size = 24, extraClass = '') {
  return `<span class="comp comp-${c} ${extraClass}" style="--s:${size}px" title="${COMP_NAMES[c]}">${COMP_GLYPH[c]}</span>`;
}

export function linkTag(l) {
  return `<span class="link" title="Concatenazione">⛓ ${LINK_NAMES[l] || l}</span>`;
}

// ───────────── costi ed effetti ─────────────

export function costHTML(cost = {}) {
  const parts = [];
  if (cost.coins) parts.push(coinIcon(cost.coins, 20));
  for (const r of Object.keys(RES_NAMES)) for (let i = 0; i < (cost[r] || 0); i++) parts.push(resIcon(r, 18));
  if (!parts.length) return '<span class="free">—</span>';
  return parts.join('');
}

export function effectHTML(card, size = 26) {
  const parts = [];
  if (card.prod) for (const [r, n] of Object.entries(card.prod)) for (let i = 0; i < n; i++) parts.push(resIcon(r, size));
  if (card.choice) parts.push(`<span class="choice">${card.choice.map((r) => resIcon(r, size - 4)).join('<i>/</i>')}</span>`);
  if (card.air) parts.push(airIcon(card.air, size + 2));
  if (card.patent) parts.push(compIcon(card.patent, size));
  if (card.points && card.type !== 'guild') parts.push(pointsIcon(card.points, size));
  if (card.coins) parts.push(coinIcon(card.coins, size - 2));
  if (card.coinsPer) parts.push(`<span class="per">${coinIcon(card.coinsPer.n, size - 6)}<small>× ${TYPE_NAMES[card.coinsPer.type]}</small></span>`);
  if (card.fixTrade) parts.push(`<span class="fix">${card.fixTrade.map((r) => resIcon(r, size - 8)).join('')}<small>a</small>${coinIcon(1, size - 8)}</span>`);
  if (card.type === 'guild' && card.desc) parts.push(`<span class="desc">${esc(card.desc)}</span>`);
  return parts.join('');
}

export function cardHTML(card, { cls = '', attrs = '', badge = '' } = {}) {
  if (!card) return '';
  return `<div class="card t-${card.type} ${cls}" ${attrs}>
    <div class="card-band"><span class="card-type">${TYPE_NAMES[card.type]}</span>${card.link ? linkTag(card.link) : ''}</div>
    <div class="card-cost">${costHTML(card.cost)}</div>
    <div class="card-name">${esc(card.name)}</div>
    <div class="card-effect">${effectHTML(card)}</div>
    ${card.freeIf ? `<div class="card-free">gratis con ⛓ ${LINK_NAMES[card.freeIf] || card.freeIf}</div>` : ''}
    ${badge}
  </div>`;
}

export function cardBackHTML(age, { cls = '' } = {}) {
  return `<div class="card back age-${age} ${cls}"><div class="back-gear">${gearSVG()}</div><div class="back-age">${ROMAN[age]}</div></div>`;
}

export function gearSVG(teeth = 10) {
  const pts = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (Math.PI * i) / teeth;
    const r = i % 2 ? 38 : 48;
    const a2 = a + Math.PI / teeth / 2;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)} ${50 + r * Math.cos(a2)},${50 + r * Math.sin(a2)}`);
  }
  return `<svg viewBox="0 0 100 100" width="100%" height="100%"><polygon points="${pts.join(' ')}" fill="currentColor"/><circle cx="50" cy="50" r="16" fill="var(--gear-hole, #2a1c10)"/></svg>`;
}

export function machineHTML(m, { cls = '', attrs = '', cost = null } = {}) {
  const fx = [];
  if (m.points) fx.push(pointsIcon(m.points, 22));
  if (m.air) fx.push(airIcon(m.air, 22));
  if (m.coins) fx.push(coinIcon(m.coins, 20));
  if (m.choice) fx.push(`<span class="choice">${m.choice.map((r) => resIcon(r, 18)).join('<i>/</i>')}</span>`);
  if (m.extraTurn) fx.push('<span class="tag" title="Turno extra">↻ turno</span>');
  if (m.steal) fx.push(`<span class="tag">−${m.steal} ${coinIcon('', 14)} avv.</span>`);
  if (m.action === 'archive') fx.push('<span class="tag">♻ scarti</span>');
  if (m.action === 'sabotage') fx.push('<span class="tag">💥 sabota</span>');
  const costLine = cost
    ? `<div class="m-price ${cost.affordable ? 'ok' : 'no'}">${cost.coins ? `paghi ${coinIcon(cost.coins, 16)}` : 'pronta'}</div>`
    : '';
  return `<div class="machine ${m.built ? 'built' : ''} ${cls}" ${attrs}>
    <div class="m-gear">${gearSVG(12)}</div>
    <div class="m-body">
      <div class="m-name">${esc(m.name)}</div>
      <div class="m-cost">${costHTML(m.cost)}</div>
      <div class="m-fx">${fx.join('')}</div>
      <div class="m-desc">${esc(m.desc)}</div>
      ${m.built ? '<div class="m-built">✔ COSTRUITA</div>' : costLine}
    </div>
  </div>`;
}

export function inventionHTML(b, { cls = '', attrs = '' } = {}) {
  return `<div class="invention ${cls}" ${attrs}><div class="inv-name">${esc(b.name)}</div><div class="inv-desc">${esc(b.desc)}</div></div>`;
}

export function productionHTML(player, size = 20) {
  const out = [];
  for (const r of Object.keys(RES_NAMES)) {
    const n = player.production[r] || 0;
    out.push(`<span class="prod-cell ${n ? '' : 'zero'}">${resIcon(r, size)}<b>${n}</b></span>`);
  }
  for (const ch of player.choices) {
    out.push(`<span class="prod-cell choice">${ch.map((r) => resIcon(r, size - 4)).join('<i>/</i>')}</span>`);
  }
  return out.join('');
}

export function pressureHTML(pressure, max, names, loot) {
  const cells = [];
  for (let v = -max; v <= max; v++) {
    let cls = 'pcell';
    if (v === 0) cls += ' zero';
    if (Math.abs(v) === 3 || Math.abs(v) === 6) cls += ' loot';
    if (Math.abs(v) === max) cls += ' win';
    // Le soglie di saccheggio già usate si spengono.
    if (v === 3 && loot?.[0]?.[0]) cls += ' used';
    if (v === 6 && loot?.[0]?.[1]) cls += ' used';
    if (v === -3 && loot?.[1]?.[0]) cls += ' used';
    if (v === -6 && loot?.[1]?.[1]) cls += ' used';
    const label = Math.abs(v) === 3 ? '−2' : Math.abs(v) === 6 ? '−5' : Math.abs(v) === max ? '★' : '';
    cells.push(`<div class="${cls}">${v === pressure ? `<div class="pmarker">${AIRSHIP_SVG}</div>` : ''}<span>${label}</span></div>`);
  }
  // Valori positivi = il Giocatore 1 spinge verso la città del Giocatore 2 (a destra).
  return `<div class="pressure">
    <div class="pside left">${esc(names[0])}</div>
    <div class="ptrack">${cells.join('')}</div>
    <div class="pside right">${esc(names[1])}</div>
  </div>`;
}

export const roman = (n) => ROMAN[n] || n;

export function reasonText(winner) {
  if (!winner) return '';
  return { air: 'Supremazia Aerea', patent: 'Brevetti', points: 'Prestigio', tie: 'Pareggio' }[winner.reason];
}

export const SCORE_ROWS = [
  ['cards', 'Carte'], ['salons', 'Salotti'], ['machines', 'Macchine'], ['inventions', 'Invenzioni'],
  ['guilds', 'Corporazioni'], ['military', 'Pressione'], ['coins', 'Scellini'],
];
