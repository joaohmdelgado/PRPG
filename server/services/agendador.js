// Fase J (Prazos e cobranças, PLANO.md): agendador diário que avalia as
// regras concretas de prazo sobre Câmara, PNPD, Contatos e Expedientes — ver
// server/services/prazos.js. Substitui o esqueleto vazio da Fase I, que
// existia só como ponto de extensão até estas regras serem escritas.
//
// Não é chamado automaticamente por server/index.js: como as outras tarefas
// em background do projeto (nenhuma até aqui), ligar o timer é decisão de
// operação (systemd timer, cron do SO chamando uma rota, ou iniciarAgendador()
// no boot) — deixado explícito para quem sobe o servidor escolher a estratégia,
// em vez de um setInterval calado dentro do processo web.
import {
  avaliarRelatoriasCamara, avaliarPosDoutorado, avaliarMandatosVencendo,
  avaliarPortariasVencendo, avaliarReservasPendentes,
} from './prazos.js';

export const avaliarPrazos = async () => {
  const [camara, posdoc, mandatos, portarias, reservas] = await Promise.all([
    avaliarRelatoriasCamara(),
    avaliarPosDoutorado(),
    avaliarMandatosVencendo(),
    avaliarPortariasVencendo(),
    avaliarReservasPendentes(),
  ]);
  return { camara, posdoc, mandatos, portarias, reservas };
};

export const iniciarAgendador = (intervaloMs = 24 * 60 * 60 * 1000) => {
  const rodar = () => avaliarPrazos().catch((e) => console.error('[Agendador] Erro ao avaliar prazos:', e.message));
  rodar();
  return setInterval(rodar, intervaloMs);
};
