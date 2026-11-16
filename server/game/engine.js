// Motore di gioco di "Fumo & Ferro": stato, validazione, effetti, vittorie.
// Nessuna dipendenza da rete o DOM: tutto è testabile con node:test.

import {
  RESOURCES, CARDS, GUILDS, MACHINES, INVENTIONS, RULES, COMPONENT_NAMES,
  CARD_BY_ID, MACHINE_BY_ID, INVENTION_BY_ID, RESOURCE_NAMES,
} from './cards.js';
import { buildLayout } from './layouts.js';

// ───────────── utilità ─────────────

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const opp = (p) => 1 - p;
const sign = (p) => (p === 0 ? 1 : -1);

function log(state, text) {
  state.log.push({ n: state.log.length + 1, text });
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
}

function pname(state, p) {
  return state.players[p].name || `Giocatore ${p + 1}`;
}

// ───────────── creazione partita ─────────────

export function createGame({ names = ['Giocatore 1', 'Giocatore 2'], seed } = {}) {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 31));
  const first = rng() < 0.5 ? 0 : 1;

  const decks = {};
  for (const age of [1, 2, 3]) {
    const pool = shuffle(CARDS.filter((c) => c.age === age).map((c) => c.id), rng);
    if (age === 3) {
      const guilds = shuffle(GUILDS.map((g) => g.id), rng).slice(0, 3);
      decks[age] = shuffle([...pool.slice(0, 15), ...guilds], rng);
    } else {
      decks[age] = pool.slice(0, 18);
    }
  }

  const machines = shuffle(MACHINES.map((m) => m.id), rng);
  const inventions = shuffle(INVENTIONS.map((b) => b.id), rng);
  const f = first, s = opp(first);

  const state = {
    phase: 'draft',
    rngState: Math.floor(rng() * 2 ** 31),
    first,
    age: 0,
    current: first,
    players: [0, 1].map((p) => ({
      name: names[p],
      coins: RULES.startCoins,
      cards: [],
      machines: [],
      completed: [],
      inventions: [],
    })),
    pressure: 0,
    loot: [[false, false], [false, false]],
    slots: [],
    decks,
    discard: [],
    inventionsAvailable: inventions.slice(0, RULES.inventionsVisible),
    inventionsHidden: inventions.slice(RULES.inventionsVisible),
    draft: {
      pools: [machines.slice(0, 4), machines.slice(4, 8)],
      order: [f, s, s, s, f, f], // 3 scelte per gruppo, l'ultima macchina del gruppo si scarta
      step: 0,
    },
    pending: [],
    awaitingFinish: false,
    extraTurn: false,
    winner: null,
    scores: null,
    log: [],
    lastAction: null,
    version: 0,
  };
  log(state, `Inizia la partita! ${pname(state, first)} sceglie per primo una Macchina Colossale.`);
  return state;
}

function setupAge(state, age) {
  state.age = age;
  const slots = buildLayout(age);
  const deck = state.decks[age];
  slots.forEach((s, i) => { s.card = deck[i]; s.taken = false; });
  state.slots = slots;
  log(state, `— Inizia l'Epoca ${'I'.repeat(age)} —`);
}

// ───────────── informazioni sui giocatori ─────────────

export function cardsOf(state, p) {
  return state.players[p].cards.map((id) => CARD_BY_ID[id]);
}

export function countType(state, p, type) {
  return cardsOf(state, p).filter((c) => c.type === type).length;
}

export function hasInvention(state, p, id) {
  return state.players[p].inventions.includes(id);
}

export function linksOf(state, p) {
  return new Set(cardsOf(state, p).map((c) => c.link).filter(Boolean));
}

export function fixedProduction(state, p) {
  const prod = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  for (const c of cardsOf(state, p)) {
    if (c.prod) for (const [r, n] of Object.entries(c.prod)) prod[r] += n;
  }
  return prod;
}

export function choiceProduction(state, p) {
  const list = [];
  for (const c of cardsOf(state, p)) if (c.choice) list.push(c.choice);
  for (const m of state.players[p].machines) {
    if (m.built && MACHINE_BY_ID[m.id].choice) list.push(MACHINE_BY_ID[m.id].choice);
  }
  return list;
}

export function tradePrice(state, p, r) {
  const fixed = cardsOf(state, p).some((c) => c.fixTrade?.includes(r));
  if (fixed) return 1;
  return RULES.tradeBase + fixedProduction(state, opp(p))[r];
}

// Calcola il costo minimo in Scellini di un costo in risorse.
// Ritorna { coins, trade } dove coins comprende anche la parte di commercio.
export function computeCost(state, p, cost, wild = 0) {
  const fixed = fixedProduction(state, p);
  const choices = choiceProduction(state, p);
  const prices = Object.fromEntries(RESOURCES.map((r) => [r, tradePrice(state, p, r)]));
  const baseNeed = {};
  for (const r of RESOURCES) baseNeed[r] = Math.max(0, (cost[r] || 0) - fixed[r]);

  let best = Infinity;
  const need = { ...baseNeed };
  const relevant = choices.filter((ch) => ch.some((r) => baseNeed[r] > 0));

  const evaluate = () => {
    const units = [];
    for (const r of RESOURCES) for (let i = 0; i < need[r]; i++) units.push(prices[r]);
    units.sort((a, b) => b - a);
    const sum = units.slice(wild).reduce((a, b) => a + b, 0);
    if (sum < best) best = sum;
  };

  const recurse = (i) => {
    if (i === relevant.length) return evaluate();
    let used = false;
    for (const r of relevant[i]) {
      if (need[r] > 0) {
        used = true;
        need[r]--;
        recurse(i + 1);
        need[r]++;
      }
    }
    if (!used) recurse(i + 1);
  };
  recurse(0);

  const trade = best;
  return { coins: (cost.coins || 0) + trade, trade };
}

export function cardCost(state, p, card) {
  if (card.freeIf && linksOf(state, p).has(card.freeIf)) return { coins: 0, trade: 0, free: true };
  const wild = hasInvention(state, p, 'B8') && (card.type === 'airship' || card.type === 'patent') ? 1 : 0;
  return computeCost(state, p, card.cost, wild);
}

export function machineCost(state, p, machine) {
  const wild = hasInvention(state, p, 'B4') ? 2 : 0;
  return computeCost(state, p, machine.cost, wild);
}

export function discardValue(state, p) {
  return RULES.discardBase + countType(state, p, 'emporium');
}

// ───────────── tabellone ─────────────

export function isAvailable(state, i) {
  const s = state.slots[i];
  return !!s && !s.taken && s.coveredBy.every((j) => state.slots[j].taken);
}

function revealUncovered(state) {
  for (const s of state.slots) {
    if (!s.taken && s.faceDown && s.coveredBy.every((j) => state.slots[j].taken)) s.faceDown = false;
  }
}

// ───────────── effetti ─────────────

function payCost(state, p, price) {
  state.players[p].coins -= price.coins;
  if (price.trade > 0 && hasInvention(state, opp(p), 'B5')) {
    state.players[opp(p)].coins += price.trade;
    log(state, `${pname(state, opp(p))} incassa ${price.trade} Scellini dalla Banca dei Brevetti.`);
  }
}

function loseCoins(state, p, n) {
  const lost = Math.min(state.players[p].coins, n);
  state.players[p].coins -= lost;
  return lost;
}

function applyPressure(state, p, amount) {
  if (!amount) return;
  state.pressure = Math.max(-RULES.pressureWin, Math.min(RULES.pressureWin, state.pressure + sign(p) * amount));
  log(state, `${pname(state, p)} aumenta la Pressione di ${amount}.`);
  const lead = state.pressure * sign(p);
  RULES.pressureLoot.forEach((t, i) => {
    if (lead >= t.at && !state.loot[p][i]) {
      state.loot[p][i] = true;
      const lost = loseCoins(state, opp(p), t.coins);
      log(state, `Il bombardamento aereo costa ${lost} Scellini a ${pname(state, opp(p))}!`);
    }
  });
  if (lead >= RULES.pressureWin) declareWinner(state, p, 'air');
}

function gainCard(state, p, card) {
  const pl = state.players[p];
  pl.cards.push(card.id);
  if (card.coins) pl.coins += card.coins;
  if (card.coinsPer) pl.coins += card.coinsPer.n * countType(state, p, card.coinsPer.type);
  if (card.air) {
    const bonus = card.type === 'airship' && hasInvention(state, p, 'B1') ? 1 : 0;
    applyPressure(state, p, card.air + bonus);
  }
  if (card.patent && !state.winner) {
    const n = cardsOf(state, p).filter((c) => c.patent === card.patent).length;
    if (n >= 2 && !pl.completed.includes(card.patent)) {
      pl.completed.push(card.patent);
      log(state, `${pname(state, p)} completa l'invenzione della ${COMPONENT_NAMES[card.patent]}! (${pl.completed.length}/${RULES.inventionsToWin})`);
      if (pl.completed.length >= RULES.inventionsToWin) {
        declareWinner(state, p, 'patent');
      } else if (state.inventionsAvailable.length) {
        state.pending.push({ type: 'invention', player: p, options: [...state.inventionsAvailable] });
      }
    }
  }
}

function declareWinner(state, p, reason) {
  if (state.winner) return;
  state.winner = { player: p, reason };
  state.phase = 'over';
  state.pending = [];
  const why = { air: 'per Supremazia Aerea', patent: 'per Brevetti', points: 'per Prestigio' }[reason];
  log(state, `🏆 ${pname(state, p)} vince ${why}!`);
}

// ───────────── punteggio ─────────────

export function computeScores(state) {
  return [0, 1].map((p) => {
    const pl = state.players[p];
    const cards = cardsOf(state, p);
    const lead = state.pressure * sign(p);
    const s = {
      cards: cards.filter((c) => c.type !== 'salon' && c.type !== 'guild').reduce((a, c) => a + (c.points || 0), 0),
      salons: cards.filter((c) => c.type === 'salon').reduce((a, c) => a + (c.points || 0), 0),
      machines: pl.machines.filter((m) => m.built).reduce((a, m) => a + MACHINE_BY_ID[m.id].points, 0),
      inventions: pl.inventions.reduce((a, id) => {
        if (id === 'B3') return a + 3 * pl.completed.length;
        return a + (INVENTION_BY_ID[id].points || 0);
      }, 0),
      coins: Math.floor(pl.coins / 3),
      military: lead >= 6 ? 10 : lead >= 3 ? 5 : lead >= 1 ? 2 : 0,
      guilds: 0,
    };
    for (const g of cards.filter((c) => c.type === 'guild')) {
      const { per, n } = g.endPoints;
      let count = 0;
      if (per === 'production') count = countType(state, p, 'mine') + countType(state, p, 'workshop');
      else if (per === 'invention') count = pl.completed.length;
      else if (per === 'machine') count = pl.machines.filter((m) => m.built).length;
      else if (per === 'coins3') count = Math.floor(pl.coins / 3);
      else count = countType(state, p, per);
      s.guilds += count * n;
    }
    s.total = s.cards + s.salons + s.machines + s.inventions + s.coins + s.military + s.guilds;
    return s;
  });
}

function finalScoring(state) {
  const scores = computeScores(state);
  state.scores = scores;
  const [a, b] = scores;
  let winner;
  if (a.total !== b.total) winner = a.total > b.total ? 0 : 1;
  else if (a.salons !== b.salons) winner = a.salons > b.salons ? 0 : 1;
  if (winner === undefined) {
    state.winner = { player: null, reason: 'tie' };
    state.phase = 'over';
    log(state, `Pareggio perfetto: ${a.total} a ${b.total}!`);
  } else {
    log(state, `Punteggio finale: ${pname(state, 0)} ${a.total} – ${pname(state, 1)} ${b.total}.`);
    declareWinner(state, winner, 'points');
  }
}

// ───────────── flusso del turno ─────────────

function finishTurn(state) {
  state.awaitingFinish = false;
  const extra = state.extraTurn;
  state.extraTurn = false;
  if (state.slots.every((s) => s.taken)) return endAge(state);
  if (extra) {
    log(state, `${pname(state, state.current)} gioca un altro turno.`);
  } else {
    state.current = opp(state.current);
  }
}

function endAge(state) {
  if (state.age === 3) return finalScoring(state);
  const lastActor = state.current;
  setupAge(state, state.age + 1);
  let chooser;
  if (state.pressure > 0) chooser = 1;
  else if (state.pressure < 0) chooser = 0;
  else chooser = opp(lastActor);
  state.current = chooser;
  state.pending.push({ type: 'starter', player: chooser, options: [0, 1] });
  log(state, `${pname(state, chooser)} sceglie chi inizia l'Epoca ${'I'.repeat(state.age)}.`);
}

function advance(state) {
  // Risolve da sola le scelte senza opzioni.
  while (state.pending.length && state.pending[0].options.length === 0) state.pending.shift();
  if (state.winner) { state.phase = 'over'; return; }
  if (state.pending.length) return;
  if (state.awaitingFinish) finishTurn(state);
}

// Chi deve agire ora (null se nessuno).
export function actingPlayer(state) {
  if (state.phase === 'over') return null;
  if (state.phase === 'draft') return state.draft.order[state.draft.step];
  if (state.pending.length) return state.pending[0].player;
  return state.current;
}

// ───────────── azioni ─────────────

// Applica un'azione. Ritorna { ok: true } oppure { ok: false, error }.
// In caso di errore lo stato non viene modificato.
export function applyAction(state, p, action) {
  const err = validate(state, p, action);
  if (err) return { ok: false, error: err };
  execute(state, p, action);
  advance(state);
  state.version++;
  state.lastAction = { player: p, type: action.type, at: state.version };
  return { ok: true };
}

function validate(state, p, a) {
  if (!a || typeof a.type !== 'string') return 'Azione non valida';
  if (state.phase === 'over') return 'La partita è finita';
  if (actingPlayer(state) !== p) return 'Non è il tuo turno';

  if (state.phase === 'draft') {
    if (a.type !== 'draftMachine') return 'Devi scegliere una Macchina';
    const pool = state.draft.pools[state.draft.step < 3 ? 0 : 1];
    if (!pool.includes(a.machineId)) return 'Macchina non disponibile';
    return null;
  }

  if (state.pending.length) {
    const pend = state.pending[0];
    const map = { invention: 'chooseInvention', archive: 'chooseArchive', sabotage: 'chooseSabotage', starter: 'chooseStarter' };
    if (a.type !== map[pend.type]) return 'Devi prima completare la scelta in corso';
    if (!pend.options.includes(a.choice)) return 'Scelta non valida';
    return null;
  }

  if (!['build', 'discard', 'machine'].includes(a.type)) return 'Azione sconosciuta';
  if (!Number.isInteger(a.slot) || !isAvailable(state, a.slot)) return 'Carta non disponibile';
  const card = CARD_BY_ID[state.slots[a.slot].card];
  const pl = state.players[p];
  if (a.type === 'build') {
    if (cardCost(state, p, card).coins > pl.coins) return 'Non hai abbastanza Scellini';
  }
  if (a.type === 'machine') {
    const m = pl.machines.find((x) => x.id === a.machineId);
    if (!m) return 'Non possiedi questa Macchina';
    if (m.built) return 'Macchina già costruita';
    if (machineCost(state, p, MACHINE_BY_ID[m.id]).coins > pl.coins) return 'Non hai abbastanza Scellini';
  }
  return null;
}

function execute(state, p, a) {
  const pl = state.players[p];

  if (a.type === 'draftMachine') {
    const pool = state.draft.pools[state.draft.step < 3 ? 0 : 1];
    pool.splice(pool.indexOf(a.machineId), 1);
    pl.machines.push({ id: a.machineId, built: false });
    log(state, `${pname(state, p)} sceglie ${MACHINE_BY_ID[a.machineId].name}.`);
    state.draft.step++;
    if (state.draft.step >= state.draft.order.length) {
      state.phase = 'play';
      state.current = state.first;
      setupAge(state, 1);
      log(state, `${pname(state, state.first)} inizia.`);
    }
    return;
  }

  if (a.type === 'chooseInvention') {
    state.pending.shift();
    const b = INVENTION_BY_ID[a.choice];
    state.inventionsAvailable = state.inventionsAvailable.filter((x) => x !== a.choice);
    pl.inventions.push(a.choice);
    if (b.coins) pl.coins += b.coins;
    log(state, `${pname(state, p)} brevetta: ${b.name}.`);
    return;
  }

  if (a.type === 'chooseArchive') {
    state.pending.shift();
    state.discard = state.discard.filter((x) => x !== a.choice);
    const card = CARD_BY_ID[a.choice];
    log(state, `${pname(state, p)} recupera dall'archivio e costruisce gratis ${card.name}.`);
    gainCard(state, p, card);
    return;
  }

  if (a.type === 'chooseSabotage') {
    state.pending.shift();
    const o = state.players[opp(p)];
    o.cards.splice(o.cards.indexOf(a.choice), 1);
    state.discard.push(a.choice);
    log(state, `${pname(state, p)} distrugge ${CARD_BY_ID[a.choice].name} di ${pname(state, opp(p))}!`);
    return;
  }

  if (a.type === 'chooseStarter') {
    state.pending.shift();
    state.current = a.choice;
    log(state, `${pname(state, a.choice)} inizia l'Epoca ${'I'.repeat(state.age)}.`);
    return;
  }

  // Azioni principali: si prende la carta dal tabellone.
  const slot = state.slots[a.slot];
  const card = CARD_BY_ID[slot.card];
  slot.taken = true;
  revealUncovered(state);
  state.awaitingFinish = true;

  if (a.type === 'build') {
    const price = cardCost(state, p, card);
    payCost(state, p, price);
    const how = price.free ? ' gratis grazie alla concatenazione' : price.coins ? ` per ${price.coins} Scellini` : '';
    log(state, `${pname(state, p)} costruisce ${card.name}${how}.`);
    gainCard(state, p, card);
  } else if (a.type === 'discard') {
    const v = discardValue(state, p);
    pl.coins += v;
    state.discard.push(card.id);
    log(state, `${pname(state, p)} vende ${card.name} per ${v} Scellini.`);
  } else if (a.type === 'machine') {
    const m = pl.machines.find((x) => x.id === a.machineId);
    const mach = MACHINE_BY_ID[m.id];
    payCost(state, p, machineCost(state, p, mach));
    m.built = true;
    m.card = card.id;
    log(state, `${pname(state, p)} costruisce la Macchina ${mach.name}!`);
    if (mach.coins) pl.coins += mach.coins;
    if (mach.steal) {
      const lost = loseCoins(state, opp(p), mach.steal);
      log(state, `${pname(state, opp(p))} perde ${lost} Scellini.`);
    }
    if (mach.air) applyPressure(state, p, mach.air);
    if (mach.extraTurn || hasInvention(state, p, 'B6')) state.extraTurn = true;
    if (!state.winner) {
      if (mach.action === 'archive') {
        state.pending.push({ type: 'archive', player: p, options: [...new Set(state.discard)] });
      }
      if (mach.action === 'sabotage') {
        const options = state.players[opp(p)].cards.filter((id) => ['mine', 'workshop'].includes(CARD_BY_ID[id].type));
        state.pending.push({ type: 'sabotage', player: p, options });
      }
    }
  }
}

// ───────────── mosse legali (per bot e per i client) ─────────────

export function legalActions(state, p) {
  if (actingPlayer(state) !== p) return [];
  if (state.phase === 'draft') {
    return state.draft.pools[state.draft.step < 3 ? 0 : 1].map((machineId) => ({ type: 'draftMachine', machineId }));
  }
  if (state.pending.length) {
    const pend = state.pending[0];
    const type = { invention: 'chooseInvention', archive: 'chooseArchive', sabotage: 'chooseSabotage', starter: 'chooseStarter' }[pend.type];
    return pend.options.map((choice) => ({ type, choice }));
  }
  const acts = [];
  const pl = state.players[p];
  state.slots.forEach((s, i) => {
    if (!isAvailable(state, i)) return;
    const card = CARD_BY_ID[s.card];
    acts.push({ type: 'discard', slot: i });
    if (cardCost(state, p, card).coins <= pl.coins) acts.push({ type: 'build', slot: i });
    for (const m of pl.machines) {
      if (!m.built && machineCost(state, p, MACHINE_BY_ID[m.id]).coins <= pl.coins) {
        acts.push({ type: 'machine', slot: i, machineId: m.id });
      }
    }
  });
  return acts;
}

export { RESOURCE_NAMES };
