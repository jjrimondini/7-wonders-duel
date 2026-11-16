# ⚙ Fumo & Ferro

Gioco di carte steampunk originale per 2 giocatori. Il **PC fa da tabellone**, ogni **telefono fa da mano** del giocatore.

## Avvio

1. Fai doppio clic su `avvia.bat`, oppure esegui `npm install` (solo la prima volta) e poi `npm start`.
2. Sul PC si apre il tabellone su `http://localhost:3000/board/`. Premi ⛶ per lo schermo intero.
3. Ogni giocatore inquadra il QR code con il telefono (connesso alla **stessa rete Wi-Fi** del PC), scrive il nome e sceglie un posto.
4. Quando entrambi i posti sono occupati, la partita parte da sola.

> La prima volta Windows Firewall chiede se consentire a Node.js l'accesso alla rete: autorizza le **reti private**, altrimenti i telefoni non riescono a collegarsi.
> Se il QR mostra un indirizzo sbagliato (per esempio quello di una VPN), apri a mano sul telefono `http://<IP-del-PC>:3000/play/` (l'IP lo trovi con `ipconfig`).

Pulsanti del tabellone (in alto a destra): ⛶ schermo intero · ↻ nuova partita · ⏏ libera i posti.
Se un telefono va in standby o la pagina si ricarica, rientra da solo nel suo posto.

## Regole in breve

**Preparazione**: si fa un draft delle Macchine Colossali in due gruppi da 4. In ogni gruppo si fanno 3 scelte (una, due, una) e la macchina rimasta viene scartata. Ognuno parte con 7 Scellini.

**Turno**: prendi una carta **libera** dalla Fabbrica, cioè una carta non coperta da altre. Puoi:
- **Costruirla**: paghi il costo. Le risorse che produci sono gratis, quelle che ti mancano le compri dalla banca a **2 Scellini + quante ne produce l'avversario**. Alcuni Empori fissano il prezzo a 1.
- **Venderla**: guadagni 2 Scellini + 1 per ogni tuo Emporio.
- **Usarla per alimentare una tua Macchina**: paghi il costo della Macchina e ne ottieni l'effetto.

Le carte con ⛓ concedono un simbolo di concatenazione: le carte "gratis con ⛓…" si costruiscono senza pagare.

**Epoche**: sono 3, ognuna con una forma diversa (Nastro, Ingranaggio, Ciminiera). All'inizio dell'Epoca II e III chi è svantaggiato nella Pressione sceglie chi inizia.

**Vittoria**:
- **Supremazia Aerea**: i Dirigibili spingono l'indicatore della Pressione verso la città avversaria. Alle caselle 3 e 6 l'avversario perde 2 e 5 Scellini, alla 9 vinci subito.
- **Brevetti**: ogni coppia di componenti uguali (⚙ ⊗ ◎ § ∿) completa un'Invenzione e ti fa scegliere un bonus. Con 4 Invenzioni vinci subito.
- **Prestigio**: alla fine dell'Epoca III si sommano i PP di carte, Salotti, Macchine, Invenzioni, Corporazioni, Pressione (2/5/10) e Scellini (1 ogni 3). In caso di parità vince chi ha più PP dai Salotti.

## Struttura

```
server/game/cards.js    dati di carte, macchine, invenzioni (bilanciamento qui)
server/game/layouts.js  forme della Fabbrica per Epoca
server/game/engine.js   regole e motore di gioco
server/game/views.js    cosa vede il tabellone / ogni telefono (le carte coperte restano sul server)
server/index.js         server HTTP + WebSocket
public/board/           tabellone (PC)
public/play/            controller (telefono)
public/shared/          grafica e rendering condivisi
test/                   test del motore (npm test)
```
