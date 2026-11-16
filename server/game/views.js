// Proiezioni dello stato: cosa vede il tabellone e cosa vede ciascun telefono.
// Le carte coperte non lasciano mai il server.

import {
  CARD_BY_ID, MACHINE_BY_ID, INVENTION_BY_ID, RESOURCES, RULES,
} from './cards.js';
import {
  actingPlayer, isAvailable, cardCost, machineCost, discardValue,
  fixedProduction, choiceProduction, tradePrice, linksOf, computeScores,
} from './engine.js';

function publicPlayer(state, p) {
  const pl = state.players[p];
  return {
    name: pl.name,
    coins: pl.coins,
    cards: pl.cards.map((id) => CARD_BY_ID[id]),
    machines: pl.machines.map((m) => ({ ...MACHINE_BY_ID[m.id], built: m.built })),
    completed: pl.completed,
    inventions: pl.inventions.map((id) => INVENTION_BY_ID[id]),
    production: fixedProduction(state, p),
    choices: choiceProduction(state, p),
    links: [...linksOf(state, p)],
    tradePrices: Object.fromEntries(RESOURCES.map((r) => [r, tradePrice(state, p, r)])),
  };
}

export function publicView(state) {
  const pending = state.pending[0];
  return {
    phase: state.phase,
    age: state.age,
    current: state.current,
    acting: actingPlayer(state),
    pressure: state.pressure,
    pressureWin: RULES.pressureWin,
    loot: state.loot,
    players: [0, 1].map((p) => publicPlayer(state, p)),
    slots: state.slots.map((s, i) => ({
      index: i, x: s.x, y: s.y,
      taken: s.taken,
      faceDown: s.faceDown,
      available: isAvailable(state, i),
      card: s.taken || s.faceDown ? null : CARD_BY_ID[s.card],
    })),
    discard: state.discard.map((id) => CARD_BY_ID[id]),
    inventionsAvailable: state.inventionsAvailable.map((id) => INVENTION_BY_ID[id]),
    draft: state.phase === 'draft' ? {
      pool: state.draft.pools[state.draft.step < 3 ? 0 : 1].map((id) => MACHINE_BY_ID[id]),
      step: state.draft.step,
      round: state.draft.step < 3 ? 1 : 2,
      upcoming: state.draft.pools[1].map((id) => MACHINE_BY_ID[id]),
    } : null,
    pending: pending ? {
      type: pending.type,
      player: pending.player,
      options: pending.type === 'invention' ? pending.options.map((id) => INVENTION_BY_ID[id])
        : pending.type === 'starter' ? pending.options
          : pending.options.map((id) => CARD_BY_ID[id]),
    } : null,
    winner: state.winner,
    scores: state.phase === 'over' ? (state.scores || computeScores(state)) : null,
    liveScores: computeScores(state),
    log: state.log.slice(-40),
    lastAction: state.lastAction,
    version: state.version,
  };
}

export function playerView(state, p) {
  const view = publicView(state);
  view.you = p;
  if (state.phase === 'play' && !state.pending.length && actingPlayer(state) === p) {
    const coins = state.players[p].coins;
    view.options = {
      discardValue: discardValue(state, p),
      slots: Object.fromEntries(state.slots.map((s, i) => {
        if (!isAvailable(state, i)) return null;
        const price = cardCost(state, p, CARD_BY_ID[s.card]);
        return [i, { ...price, affordable: price.coins <= coins }];
      }).filter(Boolean)),
    };
  }
  // I costi delle macchine servono anche fuori turno, per pianificare.
  view.machineCosts = Object.fromEntries(state.players[p].machines.map((m) => {
    const price = machineCost(state, p, MACHINE_BY_ID[m.id]);
    return [m.id, { ...price, affordable: price.coins <= state.players[p].coins }];
  }));
  return view;
}
