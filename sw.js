// Service worker do Horizonte (protótipo PWA, 05/09/2026).
// Estratégia: network-first pras páginas (boletim/mapa mudam 4x/dia, nunca
// mostrar dado velho se tiver internet), cache-first só pros ícones/manifest
// (não mudam). Sem isso, o app não abriria nada offline nem seria instalável.
const CACHE = "horizonte-v1";
const ESTATICOS = ["manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ESTATICOS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  const url = new URL(evento.request.url);
  const ehEstatico = ESTATICOS.some((f) => url.pathname.endsWith(f));

  if (ehEstatico) {
    evento.respondWith(
      caches.match(evento.request).then((cache) => cache || fetch(evento.request))
    );
    return;
  }

  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
        return resposta;
      })
      .catch(() => caches.match(evento.request))
  );
});

// Exibe a notificação de verdade quando a mensagem push chega (05/09/2026,
// faltava - sem isso o envio funcionaria mas nada aparecia na tela). O
// payload vem de enviar_notificacoes_push.py: {"title": "...", "body": "..."}.
self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch (e) {}
  const titulo = dados.title || "Horizonte";
  const opcoes = {
    body: dados.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: "horizonte-alerta",
  };
  evento.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// Toque na notificação abre o boletim (reaproveita uma aba já aberta do
// app, se existir, em vez de abrir uma nova sempre).
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes("boletim.html") && "focus" in cliente) {
          return cliente.focus();
        }
      }
      return self.clients.openWindow("boletim.html");
    })
  );
});
