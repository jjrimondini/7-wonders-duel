import { connect } from '/shared/net.js';
import {
  esc, cardHTML, cardBackHTML, machineHTML, inventionHTML, productionHTML, pressureHTML,
  resIcon, coinIcon, compIcon, RES_NAMES, TYPE_NAMES, TYPE_ORDER, COMP_NAMES,
  roman, reasonText, SCORE_ROWS, gearSVG,
} from '/shared/render.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');

let lobby = [];
let playUrl = '';
let game = null;
let prevSlots = null;
let scoresOpen = true;

const net = connect({
  hello: () => ({ type: 'hello', role: 'board' }),
  onStatus: (ok) => $('#offline').classList.toggle('hidden', ok),
  onMessage(msg) {
    if (msg.type !== 'state') return;
    lobby = msg.lobby;
    playUrl = msg.playUrl;
    const prevPhase = game?.phase;
    game = msg.game;
    if (game?.phase === 'over' && prevPhase !== 'over') scoresOpen = true;
    render();
  },
});

function render() {
  if (!game) return renderLobby();
  if (game.phase === 'draft') return renderDraft();
  renderGame();
}

function toolbar() {
  return `<div class="toolbar">
    <button class="tb" id="fs" title="Schermo intero">⛶</button>
    <button class="tb" id="ng" title="Nuova partita">↻</button>
    <button class="tb" id="rs" title="Libera i posti">⏏</button>
  </div>`;
}

function bindToolbar() {
  $('#fs')?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
  });
  $('#ng')?.addEventListener('click', () => {
    if (!game || confirm('Iniziare una nuova partita? Quella in corso andrà persa.')) net.send({ type: 'newGame' });
  });
  $('#rs')?.addEventListener('click', () => {
    if (confirm('Liberare entrambi i posti? I telefoni dovranno rientrare.')) net.send({ type: 'resetSeats' });
  });
}

// ───────────── lobby ─────────────

function renderLobby() {
  app.innerHTML = `
    <div class="lobby">
      ${toolbar()}
      <div class="lobby-title">
        <div class="big-gear g1">${gearSVG(14)}</div>
        <div class="big-gear g2">${gearSVG(10)}</div>
        <h1>Fumo <span>&amp;</span> Ferro</h1>
        <p>Duello industriale per due capitani d'industria</p>
      </div>
      <div class="lobby-body">
        <div class="qr plate riveted">
          <img src="/api/qr" alt="QR code per collegarsi">
          <div class="url">${esc(playUrl)}</div>
          <div class="qr-hint">Inquadra con il telefono (stessa rete Wi-Fi)</div>
        </div>
        <div class="seats-board">
          ${[0, 1].map((i) => {
            const s = lobby[i] || {};
            return `<div class="seat plate riveted ${s.taken ? 'taken' : ''} s${i}">
              <div class="seat-n">Giocatore ${i + 1}</div>
              <div class="seat-name">${s.taken ? esc(s.name) : 'in attesa…'}</div>
              <div class="seat-st">${s.taken ? (s.connected ? '● collegato' : '○ disconnesso') : ''}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      ${rulesHTML()}
    </div>`;
  bindToolbar();
}

function rulesHTML() {
  return `<div class="rules plate">
    <h3>Come si gioca</h3>
    <ul>
      <li>Prima del via ognuno sceglie <b>3 Macchine Colossali</b>.</li>
      <li>A turno prendi una carta <b>libera</b> (non coperta) dalla Fabbrica e la <b>costruisci</b>, la <b>vendi</b> oppure la usi per <b>alimentare una Macchina</b>.</li>
      <li>Le risorse che non produci le compri dalla banca: <b>2 Scellini + quante ne produce l'avversario</b>.</li>
      <li>Vinci subito portando la <b>Pressione aerea</b> fino alla città rivale, oppure completando <b>4 Invenzioni</b> (coppie di componenti uguali).</li>
      <li>Altrimenti, dopo 3 Epoche, vince chi ha più <b>Punti Prestigio</b>.</li>
    </ul>
  </div>`;
}

// ───────────── draft ─────────────

function renderDraft() {
  const d = game.draft;
  const acting = game.acting;
  app.innerHTML = `
    <div class="layout">
      ${headerHTML(`Draft delle Macchine · gruppo ${d.round}/2`)}
      <div class="mid">
        ${playerPanel(0)}
        <div class="center draft-center">
          <h2 class="draft-title"><span class="${acting ? 'p1c' : 'p0c'}">${esc(game.players[acting].name)}</span> sceglie una Macchina Colossale</h2>
          <div class="draft-pool">${d.pool.map((m) => machineHTML(m, { cls: 'xl' })).join('')}</div>
          ${d.round === 1 ? `<h3 class="sub-title">Secondo gruppo</h3><div class="draft-pool dim">${d.upcoming.map((m) => machineHTML(m)).join('')}</div>` : ''}
        </div>
        ${playerPanel(1)}
      </div>
    </div>`;
  bindToolbar();
}

// ───────────── partita ─────────────

function headerHTML(centerText) {
  const names = game.players.map((p) => p.name);
  return `<header class="bhead">
      <div class="brand"><span class="mini-gear">${gearSVG(10)}</span> Fumo &amp; Ferro</div>
      <div class="age">${centerText}</div>
      ${toolbar()}
    </header>
    <div class="track plate">${pressureHTML(game.pressure, game.pressureWin, names, game.loot)}</div>`;
}

function statusText() {
  const pend = game.pending;
  const name = (p) => `<span class="${p ? 'p1c' : 'p0c'}">${esc(game.players[p].name)}</span>`;
  if (game.phase === 'over') return 'Partita conclusa';
  if (pend) {
    const what = { invention: 'sceglie un\'Invenzione', archive: 'recupera una carta dagli scarti', sabotage: 'sceglie cosa distruggere', starter: `decide chi inizia l'Epoca ${roman(game.age)}` }[pend.type];
    return `${name(pend.player)} ${what}…`;
  }
  return `Turno di ${name(game.current)}`;
}

function renderGame() {
  const newly = new Set();
  if (prevSlots && prevSlots.length === game.slots.length) {
    game.slots.forEach((s, i) => { if (prevSlots[i].faceDown && !s.faceDown && !s.taken) newly.add(i); });
  }
  prevSlots = game.slots;

  app.innerHTML = `
    <div class="layout">
      ${headerHTML(`Epoca ${roman(game.age)}`)}
      <div class="mid">
        ${playerPanel(0)}
        <div class="center">
          <div class="status-bar">${statusText()}</div>
          <div class="factory-area">${factoryHTML(newly)}</div>
          <div class="bottom">
            <div class="inv-bank">
              <div class="label">Invenzioni disponibili</div>
              <div class="inv-row">${game.inventionsAvailable.map((b) => inventionHTML(b)).join('') || '<span class="muted">esaurite</span>'}</div>
            </div>
            <div class="discard plate">
              <div class="label">Scarti</div>
              <div class="discard-n">${game.discard.length}</div>
              <div class="discard-last">${game.discard.slice(-3).map((c) => `<span class="chip t-${c.type}">${esc(c.name)}</span>`).join('')}</div>
            </div>
            <ol class="blog plate">${game.log.slice(-6).map((l) => `<li>${esc(l.text)}</li>`).join('')}</ol>
          </div>
        </div>
        ${playerPanel(1)}
      </div>
      ${game.phase === 'over' && scoresOpen ? overHTML() : ''}
    </div>`;
  bindToolbar();
  $('#close-over')?.addEventListener('click', () => { scoresOpen = false; render(); });
  $('#again')?.addEventListener('click', () => net.send({ type: 'newGame' }));
}

function factoryHTML(newly) {
  const slots = game.slots;
  const maxX = Math.max(...slots.map((s) => s.x));
  const maxY = Math.max(...slots.map((s) => s.y));
  const step = 0.6;
  const cards = slots.map((s, i) => {
    if (s.taken) return '';
    const style = `left:calc(${s.x} * var(--cw) / 2);top:calc(${s.y * step} * var(--ch));z-index:${s.y + 1}`;
    const inner = s.faceDown
      ? cardBackHTML(game.age)
      : cardHTML(s.card, { cls: `${s.available ? 'free-card' : 'covered'} ${newly.has(i) ? 'flip' : ''}` });
    return `<div class="bslot" style="${style}">${inner}</div>`;
  }).join('');
  return `<div class="factory" style="--units:${maxX + 2};--rows:${maxY + 1};--step:${step}">${cards}</div>`;
}

function playerPanel(p) {
  const pl = game.players[p];
  const active = game.acting === p && game.phase !== 'over';
  const lobbyS = lobby[p] || {};
  const comps = Object.keys(COMP_NAMES).map((c) => {
    const n = pl.cards.filter((x) => x.patent === c).length;
    const done = pl.completed.includes(c);
    return `<span class="comp-slot">${compIcon(c, 26, done ? 'done' : n ? '' : 'dim')}</span>`;
  }).join('');
  const groups = TYPE_ORDER.map((t) => [t, pl.cards.filter((c) => c.type === t)]).filter(([, cs]) => cs.length);
  const score = game.liveScores?.[p];
  return `<aside class="ppanel plate riveted s${p} ${active ? 'active' : ''}">
    <div class="pp-head">
      <div class="pp-name">${esc(pl.name)}${lobbyS.connected === false ? ' <span class="disc" title="telefono disconnesso">⚠</span>' : ''}</div>
      <div class="pp-coins">${coinIcon(pl.coins, 38)}</div>
    </div>
    <div class="pp-score">≈ ${score?.total ?? 0} PP · ${pl.cards.length} edifici</div>
    <div class="pp-sec">Produzione</div>
    <div class="prod">${productionHTML(pl, 22)}</div>
    <div class="pp-trade">Commercio: ${Object.keys(RES_NAMES).map((r) => `<span>${resIcon(r, 15)}${pl.tradePrices[r]}</span>`).join('')}</div>
    <div class="pp-sec">Brevetti <small>${pl.completed.length}/4 invenzioni</small></div>
    <div class="comps">${comps}</div>
    ${pl.inventions.length ? `<div class="pp-invs">${pl.inventions.map((b) => `<span class="inv-chip" title="${esc(b.desc)}">💡 ${esc(b.name)}</span>`).join('')}</div>` : ''}
    <div class="pp-sec">Macchine</div>
    <div class="pp-machines">${pl.machines.map((m) => `<div class="pm ${m.built ? 'built' : ''}" title="${esc(m.desc)}"><span class="pm-g">${gearSVG(10)}</span>${esc(m.name)}</div>`).join('') || '<span class="muted">—</span>'}</div>
    <div class="pp-sec">Edifici</div>
    <div class="pp-cards">${groups.map(([t, cs]) => `<div class="pp-group">${cs.map((c) => `<span class="chip t-${t}" title="${esc(TYPE_NAMES[t])}">${esc(c.name)}</span>`).join('')}</div>`).join('') || '<span class="muted">—</span>'}</div>
  </aside>`;
}

function overHTML() {
  const w = game.winner;
  const s = game.scores;
  const title = w.player == null ? 'Pareggio!' : `Vince ${esc(game.players[w.player].name)}!`;
  return `<div class="over-overlay">
    <div class="over-box plate riveted">
      <div class="over-gear">${gearSVG(14)}</div>
      <h1>${title}</h1>
      <p class="over-reason">${reasonText(w)}</p>
      ${s ? `<table class="scores">
        <tr><th></th><th class="p0c">${esc(game.players[0].name)}</th><th class="p1c">${esc(game.players[1].name)}</th></tr>
        ${SCORE_ROWS.map(([k, l]) => `<tr><td>${l}</td><td>${s[0][k]}</td><td>${s[1][k]}</td></tr>`).join('')}
        <tr class="tot"><td>Totale</td><td>${s[0].total}</td><td>${s[1].total}</td></tr></table>` : ''}
      <div class="over-btns">
        <button class="brass-btn" id="again">Nuova partita</button>
        <button class="brass-btn steel" id="close-over">Guarda il tabellone</button>
      </div>
    </div>
  </div>`;
}

render();
