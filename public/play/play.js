import { connect } from '/shared/net.js';
import {
  esc, cardHTML, cardBackHTML, machineHTML, inventionHTML, productionHTML, pressureHTML,
  resIcon, coinIcon, compIcon, effectHTML, RES_NAMES, TYPE_NAMES, TYPE_ORDER, COMP_NAMES,
  roman, reasonText, SCORE_ROWS, gearSVG,
} from '/shared/render.js';

const $ = (sel) => document.querySelector(sel);
const app = $('#app');

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* */ } },
};

// Un link /play/?token=... permette di rientrare nel proprio posto da un altro dispositivo.
const urlToken = new URLSearchParams(location.search).get('token');
if (urlToken) { store.set('ff_token', urlToken); history.replaceState(null, '', location.pathname); }
let token = store.get('ff_token');
let seat = -1;
let lobby = [];
let view = null;
let tab = 'factory';
let selectedSlot = null;
let wasMyTurn = false;

const net = connect({
  hello: () => ({ type: 'hello', role: 'player', token }),
  onStatus: (ok) => $('#offline').classList.toggle('hidden', ok),
  onMessage(msg) {
    if (msg.type === 'joined') { token = msg.token; store.set('ff_token', token); seat = msg.seat; }
    if (msg.type === 'kicked') { token = null; store.set('ff_token', null); seat = -1; view = null; }
    if (msg.type === 'error') toast(msg.error);
    if (msg.type === 'state') {
      lobby = msg.lobby; seat = msg.seat; view = msg.game;
      onNewState();
    }
    render();
  },
});

function act(action) {
  net.send({ type: 'action', action });
  closeSheet();
}

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add('hidden'), 2600);
}

function onNewState() {
  const mine = !!view && view.acting === seat;
  if (mine && !wasMyTurn) {
    try { navigator.vibrate?.([60, 40, 60]); } catch { /* */ }
  }
  wasMyTurn = mine;
  // Chiude la scheda se la carta selezionata non c'è più.
  if (selectedSlot != null && (!view || !view.slots[selectedSlot] || view.slots[selectedSlot].taken)) closeSheet();
  else if (selectedSlot != null) openSheet(selectedSlot);
}

// ───────────── schermate ─────────────

function render() {
  renderModal();
  if (seat < 0) return renderJoin();
  if (!view) return renderWaiting();
  if (view.phase === 'draft') return renderDraft();
  if (view.phase === 'over') return renderOver();
  return renderPlay();
}

function renderJoin() {
  const name = store.get('ff_name') || '';
  const full = lobby.length && lobby.every((s) => s.taken);
  app.innerHTML = `
    <div class="join">
      <div class="logo"><div class="logo-gear">${gearSVG(12)}</div><h1>Fumo<br><span>&amp;</span> Ferro</h1></div>
      <p class="sub">Duello industriale per due</p>
      <label class="field">Il tuo nome<input id="name" maxlength="16" value="${esc(name)}" placeholder="Capitano…" autocomplete="off"></label>
      <div class="seats">
        ${[0, 1].map((i) => {
          const s = lobby[i] || {};
          return `<button class="brass-btn seat-btn ${i ? 'copper' : ''}" data-seat="${i}" ${s.taken ? 'disabled' : ''}>
            Giocatore ${i + 1}<small>${s.taken ? `occupato da ${esc(s.name)}` : 'libero'}</small></button>`;
        }).join('')}
      </div>
      ${full ? '<p class="note">Entrambi i posti sono occupati. Il tabellone può liberarli con "Libera i posti".</p>' : ''}
    </div>`;
  app.querySelectorAll('[data-seat]').forEach((b) => b.addEventListener('click', () => {
    const n = $('#name').value.trim();
    store.set('ff_name', n);
    net.send({ type: 'join', seat: Number(b.dataset.seat), name: n, token });
  }));
}

function renderWaiting() {
  app.innerHTML = `
    <div class="join">
      <div class="logo small"><div class="logo-gear spin">${gearSVG(12)}</div></div>
      <h2>Sei il Giocatore ${seat + 1}</h2>
      <p class="sub">In attesa dell'avversario…</p>
      <button class="brass-btn steel" id="leave">Cambia posto</button>
    </div>`;
  $('#leave').addEventListener('click', () => {
    net.send({ type: 'leave' });
    token = null; store.set('ff_token', null);
  });
}

function topBar() {
  const me = view.players[seat];
  const myTurn = view.acting === seat;
  const other = view.players[1 - seat];
  let status;
  if (view.phase === 'over') status = 'Partita finita';
  else if (myTurn) status = view.pending ? 'Fai la tua scelta' : view.phase === 'draft' ? 'Scegli una Macchina' : 'È il tuo turno!';
  else status = `Tocca a ${esc(other.name)}`;
  return `
    <header class="top ${myTurn ? 'my-turn' : ''} seat-${seat}">
      <div class="who"><span class="dot"></span>${esc(me.name)}</div>
      <div class="status">${status}</div>
      <div class="money">${coinIcon(me.coins, 30)}</div>
    </header>`;
}

function renderDraft() {
  const d = view.draft;
  const myTurn = view.acting === seat;
  const me = view.players[seat];
  app.innerHTML = `${topBar()}
    <main class="scroll">
      <h3 class="section">Draft delle Macchine Colossali · gruppo ${d.round}/2</h3>
      <p class="hint">${myTurn ? 'Tocca una Macchina per prenderla.' : 'Il tuo avversario sta scegliendo…'}</p>
      <div class="mlist">${d.pool.map((m) => machineHTML(m, { cls: myTurn ? 'pick' : '', attrs: `data-m="${m.id}"` })).join('')}</div>
      <h3 class="section">Le tue Macchine (${me.machines.length}/3)</h3>
      <div class="mlist">${me.machines.map((m) => machineHTML(m)).join('') || '<p class="hint">Nessuna ancora.</p>'}</div>
    </main>`;
  if (myTurn) {
    app.querySelectorAll('[data-m]').forEach((el) => el.addEventListener('click', () => {
      const m = d.pool.find((x) => x.id === el.dataset.m);
      confirmModal(`Prendere <b>${esc(m.name)}</b>?`, () => act({ type: 'draftMachine', machineId: m.id }));
    }));
  }
}

function renderPlay() {
  const names = view.players.map((p) => p.name);
  app.innerHTML = `${topBar()}
    <div class="mini-pressure">${pressureHTML(view.pressure, view.pressureWin, names, view.loot)}</div>
    <nav class="tabs">
      ${[['factory', `Fabbrica ${roman(view.age)}`], ['city', 'La mia città'], ['rival', 'Avversario'], ['log', 'Diario']]
        .map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}
    </nav>
    <main class="scroll" id="main">${tab === 'factory' ? factoryHTML() : tab === 'city' ? cityHTML(seat, true) : tab === 'rival' ? cityHTML(1 - seat, false) : logHTML()}</main>`;
  app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  app.querySelectorAll('[data-slot]').forEach((el) => el.addEventListener('click', () => openSheet(Number(el.dataset.slot))));
}

function factoryHTML() {
  const slots = view.slots;
  const maxX = Math.max(...slots.map((s) => s.x));
  const maxY = Math.max(...slots.map((s) => s.y));
  const unitsW = maxX + 2;
  // Larghezza carta in % del contenitore, altezze in rapporto.
  const cw = 100 / unitsW * 2;
  const rowStep = 0.62; // sovrapposizione verticale in altezze di carta
  const myTurn = view.acting === seat && !view.pending;
  const cards = slots.map((s) => {
    if (s.taken) return '';
    const style = `left:${(s.x / unitsW) * 100}%;top:calc(${s.y * rowStep} * var(--ch));z-index:${s.y + 1}`;
    if (s.faceDown) return `<div class="mini back age-${view.age}" style="${style}"><span>${roman(view.age)}</span></div>`;
    const c = s.card;
    const opt = view.options?.slots?.[s.index];
    const cls = [
      'mini', `t-${c.type}`,
      s.available ? 'avail' : 'blocked',
      s.available && myTurn ? (opt?.affordable ? 'can' : 'cant') : '',
    ].join(' ');
    return `<div class="${cls}" style="${style}" data-slot="${s.index}">
      <div class="mini-band"></div>
      <div class="mini-name">${esc(c.name)}</div>
      <div class="mini-fx">${effectHTML(c, 15)}</div>
      ${s.available && myTurn && opt ? `<div class="mini-price">${opt.free ? 'gratis' : opt.coins ? coinIcon(opt.coins, 18) : '✓'}</div>` : ''}
    </div>`;
  }).join('');
  const me = view.players[seat];
  return `
    <div class="factory-wrap">
      <div class="factory" style="--rows:${maxY + 1};--rowstep:${rowStep};--cwp:${cw}">${cards}</div>
    </div>
    <p class="hint center">${myTurn ? 'Tocca una carta libera. I prezzi indicano gli Scellini da pagare.' : 'Tocca una carta per vederla.'}</p>
    <div class="quick plate">
      <div class="prod">${productionHTML(me, 18)}</div>
      ${machinesQuick(me)}
    </div>`;
}

function machinesQuick(me) {
  return `<div class="mq">${me.machines.map((m) => {
    const cost = view.machineCosts?.[m.id];
    return `<span class="mq-item ${m.built ? 'built' : cost?.affordable ? 'ok' : ''}">${m.built ? '✔' : '⚙'} ${esc(m.name)}${!m.built && cost ? ` · ${cost.coins ? coinIcon(cost.coins, 15) : 'pronta'}` : ''}</span>`;
  }).join('')}</div>`;
}

function cityHTML(p, mine) {
  const pl = view.players[p];
  const groups = TYPE_ORDER.map((t) => [t, pl.cards.filter((c) => c.type === t)]).filter(([, cs]) => cs.length);
  const comps = Object.keys(COMP_NAMES).map((c) => {
    const n = pl.cards.filter((x) => x.patent === c).length;
    const done = pl.completed.includes(c);
    return `<span class="comp-slot">${compIcon(c, 28, done ? 'done' : n ? '' : 'dim')}<small>${n}</small></span>`;
  }).join('');
  const score = view.liveScores?.[p];
  return `
    <section class="plate riveted city-head">
      <div class="row"><b class="${p ? 'p1c' : 'p0c'}">${esc(pl.name)}</b><span>${coinIcon(pl.coins, 26)}</span><span class="live">≈ ${score?.total ?? 0} PP</span></div>
      <div class="prod">${productionHTML(pl, 20)}</div>
      <div class="trade">Compri dalla banca: ${Object.keys(RES_NAMES).map((r) => `<span>${resIcon(r, 16)}${pl.tradePrices[r]}</span>`).join('')}</div>
      ${pl.links.length ? `<div class="trade">Concatenazioni: ${pl.links.map((l) => `<span class="link">⛓ ${esc(l)}</span>`).join(' ')}</div>` : ''}
    </section>
    <h3 class="section">Brevetti · invenzioni ${pl.completed.length}/4</h3>
    <div class="comps">${comps}</div>
    ${pl.inventions.length ? `<div class="invs">${pl.inventions.map((b) => inventionHTML(b)).join('')}</div>` : ''}
    <h3 class="section">Macchine Colossali</h3>
    <div class="mlist">${pl.machines.map((m) => machineHTML(m, { cost: mine && !m.built ? view.machineCosts?.[m.id] : null })).join('')}</div>
    <h3 class="section">Edifici (${pl.cards.length})</h3>
    ${groups.length ? groups.map(([t, cs]) => `
      <div class="group"><div class="group-title t-${t}">${TYPE_NAMES[t]} · ${cs.length}</div>
      <div class="cardrow">${cs.map((c) => cardHTML(c, { cls: 'sm' })).join('')}</div></div>`).join('') : '<p class="hint">Nessun edificio.</p>'}
  `;
}

function logHTML() {
  return `<ol class="log">${[...view.log].reverse().map((l) => `<li>${esc(l.text)}</li>`).join('')}</ol>`;
}

function renderOver() {
  const w = view.winner;
  const s = view.scores;
  const iWon = w.player === seat;
  app.innerHTML = `${topBar()}
    <main class="scroll over">
      <div class="trophy ${iWon ? 'win' : w.player == null ? 'tie' : 'lose'}">${iWon ? '🏆' : w.player == null ? '⚖' : '⚙'}</div>
      <h2>${w.player == null ? 'Pareggio!' : iWon ? 'Hai vinto!' : `Vince ${esc(view.players[w.player].name)}`}</h2>
      <p class="sub">${reasonText(w)}</p>
      ${s ? scoreTable(s) : ''}
      <button class="brass-btn" id="again">Nuova partita</button>
    </main>`;
  $('#again').addEventListener('click', () => net.send({ type: 'newGame' }));
}

function scoreTable(s) {
  return `<table class="scores">
    <tr><th></th><th class="p0c">${esc(view.players[0].name)}</th><th class="p1c">${esc(view.players[1].name)}</th></tr>
    ${SCORE_ROWS.map(([k, l]) => `<tr><td>${l}</td><td>${s[0][k]}</td><td>${s[1][k]}</td></tr>`).join('')}
    <tr class="tot"><td>Totale</td><td>${s[0].total}</td><td>${s[1].total}</td></tr></table>`;
}

// ───────────── scheda carta ─────────────

function openSheet(i) {
  const s = view?.slots[i];
  if (!s || !s.card) return;
  selectedSlot = i;
  const c = s.card;
  const me = view.players[seat];
  const myTurn = view.acting === seat && !view.pending && view.phase === 'play';
  const opt = view.options?.slots?.[i];
  let body;
  if (!s.available) {
    body = '<p class="hint center">Questa carta è ancora coperta da altre carte.</p>';
  } else if (!myTurn) {
    body = '<p class="hint center">Aspetta il tuo turno.</p>';
  } else {
    const costText = opt.free ? 'Gratis grazie alla concatenazione'
      : opt.coins === 0 ? 'Gratis: hai già tutto'
        : `Costa ${opt.coins} Scellini${opt.trade ? ` (${opt.trade} di commercio)` : ''}`;
    const machines = me.machines.filter((m) => !m.built);
    body = `
      <p class="cost-line ${opt.affordable ? 'ok' : 'no'}">${costText}</p>
      <button class="brass-btn wide" data-do="build" ${opt.affordable ? '' : 'disabled'}>Costruisci${opt.coins ? ` · ${coinIcon(opt.coins, 20)}` : ''}</button>
      <button class="brass-btn steel wide" data-do="discard">Vendi · +${coinIcon(view.options.discardValue, 20)}</button>
      ${machines.length ? `<div class="feed-title">Oppure usala per alimentare una Macchina:</div>
      ${machines.map((m) => {
        const mc = view.machineCosts[m.id];
        return `<button class="brass-btn copper wide feed" data-feed="${m.id}" ${mc.affordable ? '' : 'disabled'}>
          ⚙ ${esc(m.name)} · ${mc.coins ? coinIcon(mc.coins, 20) : 'gratis'}</button>`;
      }).join('')}` : ''}`;
  }
  const sheet = $('#sheet');
  sheet.innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-card">${cardHTML(c, { cls: 'big' })}</div>
    <div class="sheet-actions">${body}</div>`;
  sheet.classList.remove('hidden');
  $('#sheet-backdrop').classList.remove('hidden');
  sheet.querySelector('[data-do="build"]')?.addEventListener('click', () => act({ type: 'build', slot: i }));
  sheet.querySelector('[data-do="discard"]')?.addEventListener('click', () => act({ type: 'discard', slot: i }));
  sheet.querySelectorAll('[data-feed]').forEach((b) => b.addEventListener('click', () => {
    act({ type: 'machine', slot: i, machineId: b.dataset.feed });
  }));
}

function closeSheet() {
  selectedSlot = null;
  $('#sheet').classList.add('hidden');
  $('#sheet-backdrop').classList.add('hidden');
}
$('#sheet-backdrop').addEventListener('click', closeSheet);

// ───────────── scelte in sospeso ─────────────

let confirmState = null;
function confirmModal(html, onYes) {
  confirmState = { html, onYes };
  renderModal();
}

function renderModal() {
  const modal = $('#modal');
  const pend = view?.pending;
  if (pend && pend.player === seat && view.phase === 'play') {
    confirmState = null;
    let title, items;
    if (pend.type === 'invention') {
      title = 'Invenzione completata! Scegli un brevetto:';
      items = pend.options.map((b) => inventionHTML(b, { cls: 'pick', attrs: `data-choice="${b.id}"` })).join('');
    } else if (pend.type === 'archive') {
      title = 'Archivio Meccanico: costruisci gratis una carta scartata';
      items = `<div class="cardrow wrap">${pend.options.map((c) => cardHTML(c, { cls: 'pick', attrs: `data-choice="${c.id}"` })).join('')}</div>`;
    } else if (pend.type === 'sabotage') {
      title = 'Cannone Orbitale: distruggi un edificio avversario';
      items = `<div class="cardrow wrap">${pend.options.map((c) => cardHTML(c, { cls: 'pick', attrs: `data-choice="${c.id}"` })).join('')}</div>`;
    } else if (pend.type === 'starter') {
      title = `Chi inizia l'Epoca ${roman(view.age)}?`;
      items = `<div class="starter">${[seat, 1 - seat].map((p) => `<button class="brass-btn ${p === seat ? '' : 'copper'}" data-choice="${p}">${p === seat ? 'Io' : esc(view.players[p].name)}</button>`).join('')}</div>`;
    }
    modal.innerHTML = `<div class="modal-box plate riveted"><h3>${title}</h3><div class="modal-items">${items}</div></div>`;
    modal.classList.remove('hidden');
    modal.querySelectorAll('[data-choice]').forEach((el) => el.addEventListener('click', () => {
      const raw = el.dataset.choice;
      const type = { invention: 'chooseInvention', archive: 'chooseArchive', sabotage: 'chooseSabotage', starter: 'chooseStarter' }[pend.type];
      act({ type, choice: pend.type === 'starter' ? Number(raw) : raw });
    }));
    return;
  }
  if (confirmState) {
    modal.innerHTML = `<div class="modal-box plate riveted"><h3>${confirmState.html}</h3>
      <div class="starter"><button class="brass-btn" id="yes">Sì</button><button class="brass-btn steel" id="no">Annulla</button></div></div>`;
    modal.classList.remove('hidden');
    $('#yes').addEventListener('click', () => { const f = confirmState.onYes; confirmState = null; renderModal(); f(); });
    $('#no').addEventListener('click', () => { confirmState = null; renderModal(); });
    return;
  }
  modal.classList.add('hidden');
  modal.innerHTML = '';
}

render();
