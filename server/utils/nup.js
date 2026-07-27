// Fase A.14 (PLANO.md): movido de camaraController.js — validação do NUP
// (número único de protocolo, SIPAC/processo eletrônico): NNNNN.NNNNNN/AAAA-DD.
// É um AVISO, nunca um bloqueio — o acervo real já tem processos fora do
// padrão (ver requisitos-camara.md §1.3, §9.5). numero_valido=false não
// impede o cadastro nem a importação.
export const NUP_REGEX = /^\d{5}\.\d{6}\/\d{4}-\d{2}$/;
export const validarNumeroProcesso = (numero) => NUP_REGEX.test(String(numero || '').trim());
