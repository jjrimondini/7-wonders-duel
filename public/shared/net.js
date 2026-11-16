// Connessione WebSocket con riconnessione automatica.
export function connect({ hello, onMessage, onStatus }) {
  let ws;
  let retry = 0;
  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => {
      retry = 0;
      onStatus?.(true);
      ws.send(JSON.stringify(hello()));
    };
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); } catch (err) { console.error(err); }
    };
    ws.onclose = () => {
      onStatus?.(false);
      setTimeout(open, Math.min(4000, 400 * 2 ** retry++));
    };
  };
  open();
  // Quando il telefono esce dallo standby forziamo un controllo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ws && ws.readyState > 1) open();
  });
  return {
    send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); },
  };
}
