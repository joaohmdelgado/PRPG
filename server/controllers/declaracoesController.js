// Fase B.2 (G6, PLANO.md): rota pública única de verificação de declarações,
// substituindo a rota específica de proficiência (mantida como redirect —
// ver proficienciaController.verificarDeclaracao). Ver services/declaracoes.js
// e arquitetura-dados.md §5.7.
import { verificar } from '../services/declaracoes.js';

// Mascara o CPF para exibição pública (LGPD): mantém só os blocos do meio.
const mascararCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return null;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

export const verificarPublica = async (req, res) => {
  const codigo = String(req.params.codigo || '').trim();
  if (!codigo) return res.status(400).json({ message: 'Código não informado.' });

  const declaracao = await verificar(codigo);
  if (!declaracao) return res.status(404).json({ valido: false, message: 'Declaração não encontrada ou inválida.' });

  const dataEmissao = new Date(declaracao.emitidaEm).toISOString().slice(0, 10);
  res.json({
    valido: true,
    tipo: declaracao.tipo,
    ...declaracao.dados,
    ...(declaracao.dados?.cpf ? { cpf: mascararCpf(declaracao.dados.cpf) } : {}),
    dataEmissao,
    dataValidade: declaracao.validaAte,
    codigoVerificacao: declaracao.codigo,
  });
};
