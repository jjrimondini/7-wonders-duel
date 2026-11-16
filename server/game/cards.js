// Dati di gioco di "Fumo & Ferro". Tutto qui è modificabile per il bilanciamento.
//
// Formato carta:
//   id, name, age, type
//   cost:      { coins, coal, iron, wood, steam, brass }
//   prod:      produzione fissa per turno          es. { coal: 2 }
//   choice:    produzione "una a scelta"           es. ['coal', 'iron']
//   points:    Punti Prestigio a fine partita
//   air:       spinta sull'indicatore Pressione
//   patent:    componente di brevetto (gear|valve|lens|spring|coil)
//   coins:     Scellini guadagnati subito
//   coinsPer:  Scellini subito per ogni tua carta di un tipo { type, n }
//   fixTrade:  risorse che compri dalla banca a 1 Scellino
//   link:      simbolo di concatenazione che la carta concede
//   freeIf:    la carta è gratuita se possiedi questo simbolo
//   endPoints: punti a fine partita { per, n }  (solo Corporazioni)

export const RESOURCES = ['coal', 'iron', 'wood', 'steam', 'brass'];
export const BASE_RESOURCES = ['coal', 'iron', 'wood'];

export const RESOURCE_NAMES = {
  coal: 'Carbone', iron: 'Ferro', wood: 'Legname', steam: 'Vapore', brass: 'Ottone',
};

export const TYPE_NAMES = {
  mine: 'Miniera', workshop: 'Officina', emporium: 'Emporio', airship: 'Dirigibile',
  patent: 'Brevetto', salon: 'Salotto', guild: 'Corporazione',
};

export const COMPONENTS = ['gear', 'valve', 'lens', 'spring', 'coil'];
export const COMPONENT_NAMES = {
  gear: 'Ingranaggio', valve: 'Valvola', lens: 'Lente', spring: 'Molla', coil: 'Bobina',
};

export const LINK_NAMES = {
  hangar: 'Hangar', teatro: 'Palcoscenico', cantiere: 'Cantiere', ferrovia: 'Rotaia', lente: 'Specola',
};

export const CARDS = [
  // ───────────── EPOCA I (22 carte, se ne usano 18) ─────────────
  { id: 'I01', age: 1, type: 'mine', name: 'Pozzo di Carbone', cost: {}, prod: { coal: 1 } },
  { id: 'I02', age: 1, type: 'mine', name: 'Miniera di Ferro', cost: {}, prod: { iron: 1 } },
  { id: 'I03', age: 1, type: 'mine', name: 'Segheria', cost: {}, prod: { wood: 1 } },
  { id: 'I04', age: 1, type: 'mine', name: 'Cava Carbonifera', cost: { coins: 1 }, prod: { coal: 1 } },
  { id: 'I05', age: 1, type: 'mine', name: 'Fonderia Grezza', cost: { coins: 1 }, prod: { iron: 1 } },
  { id: 'I06', age: 1, type: 'mine', name: 'Bosco Comunale', cost: { coins: 1 }, prod: { wood: 1 } },
  { id: 'I07', age: 1, type: 'mine', name: 'Deposito Misto', cost: { coins: 2 }, choice: ['coal', 'iron'] },
  { id: 'I08', age: 1, type: 'workshop', name: 'Caldaia Pubblica', cost: { coins: 1 }, prod: { steam: 1 } },
  { id: 'I09', age: 1, type: 'workshop', name: "Fucina dell'Ottone", cost: { coins: 1 }, prod: { brass: 1 } },
  { id: 'I10', age: 1, type: 'emporium', name: 'Bottega del Rigattiere', cost: {}, coins: 4 },
  { id: 'I11', age: 1, type: 'emporium', name: 'Mercato del Carbone', cost: {}, fixTrade: ['coal', 'wood'] },
  { id: 'I12', age: 1, type: 'emporium', name: 'Mercato del Ferro', cost: {}, fixTrade: ['iron'], coins: 1 },
  { id: 'I13', age: 1, type: 'airship', name: 'Pallone Osservatore', cost: { wood: 1 }, air: 1 },
  { id: 'I14', age: 1, type: 'airship', name: 'Dirigibile Postale', cost: { coal: 1 }, air: 1, link: 'hangar' },
  { id: 'I15', age: 1, type: 'airship', name: 'Torretta a Vapore', cost: { iron: 1 }, air: 1 },
  { id: 'I16', age: 1, type: 'patent', name: "Bottega dell'Orologiaio", cost: { wood: 1 }, patent: 'gear' },
  { id: 'I17', age: 1, type: 'patent', name: 'Officina Idraulica', cost: { iron: 1 }, patent: 'valve' },
  { id: 'I18', age: 1, type: 'patent', name: 'Laboratorio Ottico', cost: { steam: 1 }, patent: 'lens', link: 'lente' },
  { id: 'I19', age: 1, type: 'patent', name: 'Studio del Molleggio', cost: { coal: 1 }, patent: 'spring' },
  { id: 'I20', age: 1, type: 'patent', name: 'Gabinetto Elettrico', cost: { brass: 1 }, patent: 'coil' },
  { id: 'I21', age: 1, type: 'salon', name: 'Caffè Letterario', cost: { iron: 1 }, points: 3 },
  { id: 'I22', age: 1, type: 'salon', name: 'Teatro di Varietà', cost: { wood: 1 }, points: 2, link: 'teatro' },

  // ───────────── EPOCA II (22 carte, se ne usano 18) ─────────────
  { id: 'II01', age: 2, type: 'mine', name: 'Miniera Profonda', cost: { coins: 2 }, prod: { coal: 2 } },
  { id: 'II02', age: 2, type: 'mine', name: 'Altoforno', cost: { coins: 2 }, prod: { iron: 2 } },
  { id: 'II03', age: 2, type: 'mine', name: 'Grande Segheria', cost: { coins: 2 }, prod: { wood: 2 } },
  { id: 'II04', age: 2, type: 'workshop', name: 'Turbina', cost: { iron: 1 }, prod: { steam: 1 } },
  { id: 'II05', age: 2, type: 'workshop', name: 'Laminatoio', cost: { coal: 1 }, prod: { brass: 1 } },
  { id: 'II06', age: 2, type: 'emporium', name: 'Borsa Merci', cost: { coal: 1, wood: 1 }, fixTrade: ['steam', 'brass'] },
  { id: 'II07', age: 2, type: 'emporium', name: 'Magazzino Generale', cost: { coins: 2 }, choice: ['coal', 'iron', 'wood'] },
  { id: 'II08', age: 2, type: 'emporium', name: 'Raffineria', cost: { coins: 3 }, choice: ['steam', 'brass'] },
  { id: 'II09', age: 2, type: 'emporium', name: 'Agenzia di Cambio', cost: { wood: 1 }, coinsPer: { type: 'emporium', n: 2 } },
  { id: 'II10', age: 2, type: 'airship', name: 'Corazzata Aerea', cost: { iron: 2 }, air: 2, freeIf: 'hangar' },
  { id: 'II11', age: 2, type: 'airship', name: 'Batteria Antiaerea', cost: { coal: 1, steam: 1 }, air: 2 },
  { id: 'II12', age: 2, type: 'airship', name: 'Hangar Militare', cost: { wood: 2, brass: 1 }, air: 2, link: 'cantiere' },
  { id: 'II13', age: 2, type: 'airship', name: 'Scuola di Volo', cost: { iron: 1, wood: 1 }, air: 2 },
  { id: 'II14', age: 2, type: 'patent', name: 'Accademia degli Ingranaggi', cost: { iron: 1, brass: 1 }, patent: 'gear', points: 1 },
  { id: 'II15', age: 2, type: 'patent', name: 'Consorzio delle Valvole', cost: { coal: 1, steam: 1 }, patent: 'valve', points: 1 },
  { id: 'II16', age: 2, type: 'patent', name: 'Osservatorio', cost: { wood: 1, brass: 1 }, patent: 'lens', points: 1, freeIf: 'lente' },
  { id: 'II17', age: 2, type: 'patent', name: 'Fabbrica di Molle', cost: { iron: 2 }, patent: 'spring', points: 1 },
  { id: 'II18', age: 2, type: 'patent', name: 'Laboratorio Elettrico', cost: { steam: 1, coal: 1 }, patent: 'coil', points: 1 },
  { id: 'II19', age: 2, type: 'salon', name: "Galleria d'Arte", cost: { brass: 1, wood: 1 }, points: 4 },
  { id: 'II20', age: 2, type: 'salon', name: 'Grand Hotel', cost: { iron: 2, steam: 1 }, points: 5 },
  { id: 'II21', age: 2, type: 'salon', name: "Teatro dell'Opera", cost: { wood: 2, brass: 1 }, points: 5, freeIf: 'teatro' },
  { id: 'II22', age: 2, type: 'salon', name: 'Municipio', cost: { iron: 1, wood: 1, coal: 1 }, points: 4, link: 'ferrovia' },

  // ───────────── EPOCA III (18 carte, se ne usano 15 + 3 Corporazioni) ─────────────
  { id: 'III01', age: 3, type: 'emporium', name: 'Camera di Commercio', cost: { brass: 2, iron: 1 }, points: 3, coins: 3 },
  { id: 'III02', age: 3, type: 'emporium', name: 'Porto Franco', cost: { steam: 2, wood: 1 }, points: 2, coinsPer: { type: 'mine', n: 1 } },
  { id: 'III03', age: 3, type: 'emporium', name: 'Fiera Universale', cost: { coal: 2, brass: 1 }, points: 3, coinsPer: { type: 'workshop', n: 2 } },
  { id: 'III04', age: 3, type: 'airship', name: 'Flotta Imperiale', cost: { iron: 3, steam: 1 }, air: 3, freeIf: 'cantiere' },
  { id: 'III05', age: 3, type: 'airship', name: 'Cannone a Vapore', cost: { coal: 2, iron: 1, brass: 1 }, air: 2 },
  { id: 'III06', age: 3, type: 'airship', name: 'Fortezza Volante', cost: { wood: 2, steam: 2 }, air: 3 },
  { id: 'III07', age: 3, type: 'airship', name: 'Arsenale', cost: { iron: 2, coal: 2 }, air: 2 },
  { id: 'III08', age: 3, type: 'patent', name: 'Istituto di Ingegneria', cost: { steam: 2, wood: 1 }, patent: 'gear', points: 2 },
  { id: 'III09', age: 3, type: 'patent', name: 'Politecnico', cost: { brass: 2, coal: 1 }, patent: 'valve', points: 2 },
  { id: 'III10', age: 3, type: 'patent', name: 'Planetario', cost: { iron: 2, brass: 1 }, patent: 'lens', points: 2 },
  { id: 'III11', age: 3, type: 'patent', name: 'Museo delle Scienze', cost: { wood: 2, steam: 1 }, patent: 'spring', points: 2 },
  { id: 'III12', age: 3, type: 'patent', name: 'Torre Elettrica', cost: { iron: 1, brass: 1, steam: 1 }, patent: 'coil', points: 2 },
  { id: 'III13', age: 3, type: 'salon', name: 'Palazzo di Cristallo', cost: { iron: 2, brass: 2, steam: 1 }, points: 7 },
  { id: 'III14', age: 3, type: 'salon', name: 'Esposizione Universale', cost: { coal: 3, wood: 2 }, points: 6 },
  { id: 'III15', age: 3, type: 'salon', name: 'Cattedrale degli Ingranaggi', cost: { iron: 3, brass: 1 }, points: 6 },
  { id: 'III16', age: 3, type: 'salon', name: 'Palazzo Reale', cost: { wood: 2, brass: 1, steam: 1, coal: 1 }, points: 7 },
  { id: 'III17', age: 3, type: 'salon', name: 'Stazione Centrale', cost: { coal: 2, iron: 1, wood: 1 }, points: 5, freeIf: 'ferrovia' },
  { id: 'III18', age: 3, type: 'salon', name: 'Biblioteca Reale', cost: { steam: 1, brass: 1, wood: 1 }, points: 5 },
];

// Corporazioni: Epoca III, se ne pescano 3 su 6.
export const GUILDS = [
  { id: 'G1', age: 3, type: 'guild', name: 'Gilda dei Minatori', cost: { coal: 2, iron: 1, coins: 1 }, endPoints: { per: 'production', n: 1 }, desc: '1 PP per ogni tua Miniera e Officina' },
  { id: 'G2', age: 3, type: 'guild', name: 'Gilda dei Mercanti', cost: { brass: 1, wood: 2 }, endPoints: { per: 'emporium', n: 2 }, coinsPer: { type: 'emporium', n: 1 }, desc: '2 PP per ogni tuo Emporio (e 1 Scellino subito ciascuno)' },
  { id: 'G3', age: 3, type: 'guild', name: 'Gilda degli Aeronauti', cost: { iron: 2, steam: 1 }, endPoints: { per: 'airship', n: 2 }, desc: '2 PP per ogni tuo Dirigibile' },
  { id: 'G4', age: 3, type: 'guild', name: 'Gilda degli Inventori', cost: { steam: 1, brass: 1, wood: 1 }, endPoints: { per: 'invention', n: 3 }, desc: '3 PP per ogni tua Invenzione' },
  { id: 'G5', age: 3, type: 'guild', name: 'Gilda degli Architetti', cost: { iron: 1, wood: 1, coal: 1 }, endPoints: { per: 'machine', n: 2 }, desc: '2 PP per ogni tua Macchina costruita' },
  { id: 'G6', age: 3, type: 'guild', name: 'Gilda dei Banchieri', cost: { brass: 2, coal: 1 }, endPoints: { per: 'coins3', n: 1 }, desc: '1 PP ogni 3 Scellini che possiedi' },
];

// Macchine Colossali: draft iniziale, 3 a testa.
//   extraTurn, air, points, coins, steal (Scellini tolti all'avversario),
//   choice (produzione a scelta), action: 'archive' | 'sabotage'
export const MACHINES = [
  { id: 'M1', name: 'Orologio Astronomico', cost: { iron: 2, brass: 1, steam: 1 }, points: 3, extraTurn: true, desc: 'Gioca subito un altro turno. 3 PP.' },
  { id: 'M2', name: 'Locomotiva Titanica', cost: { coal: 3, iron: 1 }, points: 3, air: 2, desc: '+2 Pressione. 3 PP.' },
  { id: 'M3', name: 'Fonderia Celeste', cost: { wood: 2, steam: 1 }, points: 2, choice: ['coal', 'iron', 'wood'], desc: 'Produce 1 Carbone, Ferro o Legname a scelta. 2 PP.' },
  { id: 'M4', name: 'Distilleria di Vapore', cost: { coal: 2, iron: 1 }, points: 2, choice: ['steam', 'brass'], desc: 'Produce 1 Vapore o Ottone a scelta. 2 PP.' },
  { id: 'M5', name: 'Banca Pneumatica', cost: { wood: 1, brass: 2 }, points: 3, coins: 6, steal: 3, desc: "+6 Scellini, l'avversario ne perde 3. 3 PP." },
  { id: 'M6', name: 'Archivio Meccanico', cost: { wood: 2, iron: 1, steam: 1 }, points: 2, action: 'archive', desc: 'Costruisci gratis una carta dagli scarti. 2 PP.' },
  { id: 'M7', name: "Faro d'Ottone", cost: { brass: 2, steam: 1, coal: 1 }, points: 7, desc: '7 PP.' },
  { id: 'M8', name: 'Cannone Orbitale', cost: { iron: 2, coal: 1, steam: 1 }, points: 1, air: 1, action: 'sabotage', extraTurn: true, desc: "+1 Pressione, distruggi una Miniera o Officina avversaria, poi gioca un altro turno. 1 PP." },
];

// Invenzioni: si scelgono completando una coppia di componenti uguali. 5 visibili su 8.
export const INVENTIONS = [
  { id: 'B1', name: 'Telegrafo Ottico', desc: 'Ogni tuo Dirigibile dà +1 Pressione in più.' },
  { id: 'B2', name: 'Telaio Automatico', desc: '+6 Scellini subito e 2 PP.', coins: 6, points: 2 },
  { id: 'B3', name: 'Calcolatore Meccanico', desc: '3 PP per ogni Invenzione che possiedi a fine partita.' },
  { id: 'B4', name: 'Gru a Vapore', desc: 'Le Macchine ti costano 2 risorse in meno.' },
  { id: 'B5', name: 'Banca dei Brevetti', desc: "Incassi gli Scellini che l'avversario paga alla banca per il commercio." },
  { id: 'B6', name: 'Cronometro di Precisione', desc: 'Quando costruisci una Macchina giochi un altro turno.' },
  { id: 'B7', name: "Lampada ad Arco", desc: '7 PP.', points: 7 },
  { id: 'B8', name: 'Pompa Idraulica', desc: 'Dirigibili e Brevetti ti costano 1 risorsa in meno.' },
];

export const ALL_CARDS = [...CARDS, ...GUILDS];
export const CARD_BY_ID = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]));
export const MACHINE_BY_ID = Object.fromEntries(MACHINES.map((m) => [m.id, m]));
export const INVENTION_BY_ID = Object.fromEntries(INVENTIONS.map((b) => [b.id, b]));

export const RULES = {
  startCoins: 7,
  pressureWin: 9,
  pressureLoot: [{ at: 3, coins: 2 }, { at: 6, coins: 5 }],
  inventionsToWin: 4,
  discardBase: 2,
  tradeBase: 2,
  inventionsVisible: 5,
  machinesPerPlayer: 3,
};
