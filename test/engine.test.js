import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, applyAction, legalActions, actingPlayer, computeCost, cardCost,
  isAvailable, computeScores, mulberry32,
} from '../server/game/engine.js';
import { CARD_BY_ID, CARDS, GUILDS } from '../server/game/cards.js';
import { buildLayout, layoutSize } from '../server/game/layouts.js';
import { publicView, playerView } from '../server/game/views.js';

function draftAll(state) {
  while (state.phase === 'draft') {
    const p = actingPlayer(state);
    const [a] = legalActions(state, p);
    assert.equal(applyAction(state, p, a).ok, true);
  }
}

test('le disposizioni hanno 18 posti e la riga in basso è libera', () => {
  for (const age of [1, 2, 3]) {
    assert.equal(layoutSize(age), 18);
    const slots = buildLayout(age);
    const maxY = Math.max(...slots.map((s) => s.y));
    for (const s of slots) {
      if (s.y === maxY) assert.equal(s.coveredBy.length, 0);
      else assert.ok(s.coveredBy.length > 0, `epoca ${age} posto ${s.index} non coperto`);
    }
  }
});

test('ID delle carte unici e mazzi abbastanza grandi', () => {
  const ids = [...CARDS, ...GUILDS].map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(CARDS.filter((c) => c.age === 1).length >= 18);
  assert.ok(CARDS.filter((c) => c.age === 2).length >= 18);
  assert.ok(CARDS.filter((c) => c.age === 3).length >= 15);
});

test('draft: 3 macchine a testa, poi parte l\'Epoca I', () => {
  const s = createGame({ seed: 1 });
  draftAll(s);
  assert.equal(s.phase, 'play');
  assert.equal(s.age, 1);
  assert.equal(s.players[0].machines.length, 3);
  assert.equal(s.players[1].machines.length, 3);
  assert.equal(s.current, s.first);
});

test('solo le carte scoperte sono disponibili', () => {
  const s = createGame({ seed: 2 });
  draftAll(s);
  const avail = s.slots.filter((_, i) => isAvailable(s, i));
  assert.equal(avail.length, 3); // Epoca I: riga in basso da 3
  assert.ok(!isAvailable(s, 0));
  const res = applyAction(s, s.current, { type: 'build', slot: 0 });
  assert.equal(res.ok, false);
});

test('commercio: 2 + produzione avversaria, e mercato a prezzo fisso', () => {
  const s = createGame({ seed: 3 });
  draftAll(s);
  s.players[1].cards.push('I01', 'I04'); // l'avversario produce 2 carbone
  assert.equal(computeCost(s, 0, { coal: 1 }).coins, 4);
  assert.equal(computeCost(s, 0, { coal: 2, coins: 1 }).coins, 9);
  s.players[0].cards.push('I11'); // Mercato del Carbone
  assert.equal(computeCost(s, 0, { coal: 2 }).coins, 2);
  s.players[0].cards.push('I07'); // Deposito Misto: carbone o ferro
  assert.equal(computeCost(s, 0, { coal: 1, iron: 1 }).coins, 1); // ferro dal deposito, carbone a 1
});

test('concatenazione rende gratis la carta', () => {
  const s = createGame({ seed: 4 });
  draftAll(s);
  s.players[0].cards.push('I14');
  assert.deepEqual(cardCost(s, 0, CARD_BY_ID.II10), { coins: 0, trade: 0, free: true });
});

test('le carte coperte non compaiono nelle viste', () => {
  const s = createGame({ seed: 5 });
  draftAll(s);
  const hidden = s.slots.filter((x) => x.faceDown).map((x) => x.card);
  assert.ok(hidden.length > 0);
  for (const v of [publicView(s), playerView(s, 0), playerView(s, 1)]) {
    const json = JSON.stringify(v.slots);
    for (const id of hidden) assert.ok(!json.includes(`"${id}"`), `${id} trapelato`);
  }
});

test('vittoria per Supremazia Aerea', () => {
  const s = createGame({ seed: 6 });
  draftAll(s);
  const p = s.current;
  s.pressure = p === 0 ? 8 : -8;
  s.loot[p] = [true, true];
  const i = s.slots.findIndex((_, j) => isAvailable(s, j));
  s.slots[i].card = 'I13'; // Pallone Osservatore, costa 1 legname
  s.players[p].coins = 10;
  assert.equal(applyAction(s, p, { type: 'build', slot: i }).ok, true);
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.winner, { player: p, reason: 'air' });
});

test('saccheggio a Pressione 3', () => {
  const s = createGame({ seed: 7 });
  draftAll(s);
  const p = s.current;
  s.pressure = p === 0 ? 2 : -2;
  const i = s.slots.findIndex((_, j) => isAvailable(s, j));
  s.slots[i].card = 'I13';
  s.players[p].coins = 10;
  const before = s.players[1 - p].coins;
  applyAction(s, p, { type: 'build', slot: i });
  assert.equal(s.players[1 - p].coins, before - 2);
});

test('coppia di componenti = invenzione, 4 invenzioni = vittoria', () => {
  const s = createGame({ seed: 8 });
  draftAll(s);
  const p = s.current;
  s.players[p].cards.push('I16', 'I17', 'I18', 'I19', 'II14', 'II15', 'II16');
  s.players[p].completed = ['gear', 'valve', 'lens'];
  const i = s.slots.findIndex((_, j) => isAvailable(s, j));
  s.slots[i].card = 'II17'; // Fabbrica di Molle: seconda molla
  s.players[p].coins = 20;
  assert.equal(applyAction(s, p, { type: 'build', slot: i }).ok, true);
  assert.deepEqual(s.winner, { player: p, reason: 'patent' });
});

test('prima invenzione apre la scelta del bonus', () => {
  const s = createGame({ seed: 9 });
  draftAll(s);
  const p = s.current;
  s.players[p].cards.push('I16');
  const i = s.slots.findIndex((_, j) => isAvailable(s, j));
  s.slots[i].card = 'II14';
  s.players[p].coins = 20;
  applyAction(s, p, { type: 'build', slot: i });
  assert.equal(s.pending[0].type, 'invention');
  assert.equal(actingPlayer(s), p);
  const choice = s.pending[0].options.includes('B2') ? 'B2' : s.pending[0].options[0];
  assert.equal(applyAction(s, p, { type: 'chooseInvention', choice }).ok, true);
  assert.equal(s.pending.length, 0);
  assert.equal(s.current, 1 - p);
});

test('punteggio finale', () => {
  const s = createGame({ seed: 10 });
  draftAll(s);
  s.players[0].cards = ['I21', 'G3', 'I13', 'I14'];
  s.players[0].coins = 10;
  s.pressure = 4;
  const [sc] = computeScores(s);
  assert.equal(sc.salons, 3);
  assert.equal(sc.coins, 3);
  assert.equal(sc.military, 5);
  assert.equal(sc.guilds, 4);
  assert.equal(sc.total, 15);
});

test('200 partite casuali arrivano alla fine senza errori', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = mulberry32(seed * 7919);
    const s = createGame({ seed });
    let guard = 0;
    while (s.phase !== 'over') {
      assert.ok(guard++ < 500, `partita ${seed} bloccata`);
      const p = actingPlayer(s);
      const acts = legalActions(s, p);
      assert.ok(acts.length > 0, `nessuna mossa per ${p} (seed ${seed})`);
      // preferisce costruire per far progredire le vittorie
      const builds = acts.filter((a) => a.type !== 'discard');
      const pool = builds.length && rng() < 0.85 ? builds : acts;
      const a = pool[Math.floor(rng() * pool.length)];
      const r = applyAction(s, p, a);
      assert.ok(r.ok, `seed ${seed}: ${r.error} ${JSON.stringify(a)}`);
      for (const pl of s.players) assert.ok(pl.coins >= 0);
      publicView(s); playerView(s, 0); playerView(s, 1);
    }
    assert.ok(s.winner);
  }
});
