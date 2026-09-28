import { familiaDaRota } from './utils/rotaVitals';
import { API_URL } from './api';

// Desempenho real (Fase P.6 de docs/revisao-portal-conteudo-2026-09-24.md):
// o Lighthouse mede em laboratório, com uma máquina e uma conexão fixas; isto
// mede o que quem visita o site realmente viveu (CLS, FCP, INP, LCP, TTFB —
// biblioteca `web-vitals`), agregado por família de rota no painel Qualidade
// dos dados (server/controllers/webVitalsController.js). Sem cookie, sem
// identificador de pessoa — só a métrica, a rota e "mobile"/"desktop"
// (minimização, LGPD).
//
// A biblioteca é baixada sob demanda (import dinâmico): não pesa no
// carregamento inicial, e chamar onCLS/onLCP/… assim que ela chega já é
// seguro — elas usam PerformanceObserver com buffer, então não perdem uma
// métrica por terem sido registradas alguns instantes depois do carregamento
// (ver a documentação da própria biblioteca).
const dispositivoAtual = () => (typeof matchMedia === 'function' ? (matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop') : undefined);

function enviar(metrica) {
  const payload = JSON.stringify({
    rota: familiaDaRota(window.location.pathname),
    metrica: metrica.name,
    valor: metrica.value,
    avaliacao: metrica.rating,
    dispositivo: dispositivoAtual(),
  });
  const url = `${API_URL}/api/web-vitals`;
  // sendBeacon entrega mesmo que a aba feche logo em seguida (é assim que
  // CLS/INP são finalizados — na troca de visibilidade da página); sem
  // suporte, um fetch com keepalive faz o mesmo papel.
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
  } else if (typeof fetch === 'function') {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  }
}

let iniciado = false;

// Chamado uma vez, no carregamento do site (main.jsx). Falha em silêncio: sem
// rede, com uma extensão bloqueando ou num navegador sem a API, o site
// continua funcionando normalmente — isto é só telemetria.
export function iniciarWebVitals() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  import('web-vitals')
    .then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onCLS(enviar);
      onFCP(enviar);
      onINP(enviar);
      onLCP(enviar);
      onTTFB(enviar);
    })
    .catch(() => {});
}
