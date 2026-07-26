import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, Loader2, Languages, Home } from 'lucide-react';
import { apiFetch } from '../api';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Formata 'YYYY-MM-DD' como '20 de agosto de 2025' (sem deslocamento de fuso).
const dataExtenso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const [, ano, mes, dia] = m;
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${ano}`;
};

const LINGUA_ADJ = { 'Português': 'Portuguesa', 'Inglês': 'Inglesa', 'Espanhol': 'Espanhola' };
const linguasTexto = (linguas) => {
  const adj = (linguas || []).map((l) => LINGUA_ADJ[l] || l);
  if (adj.length <= 1) return adj.join('');
  return `${adj.slice(0, -1).join(', ')} e ${adj[adj.length - 1]}`;
};

// Página PÚBLICA de verificação de autenticidade da declaração de proficiência.
// Acessada pelo QR code impresso no documento. Reexibe os dados canônicos para
// que o verificador confira contra o papel.
export default function DeclaracaoProficiencia() {
  const { codigo } = useParams();
  const [estado, setEstado] = useState('carregando'); // carregando | valido | invalido | erro
  const [dados, setDados] = useState(null);

  useEffect(() => {
    document.title = 'Verificação de Declaração — Proficiência | PRPG UFRPE';
    let robots = document.querySelector('meta[name="robots"]');
    const criou = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    const prev = robots.content;
    robots.content = 'noindex, nofollow';
    return () => { if (criou) robots.remove(); else robots.content = prev; };
  }, []);

  useEffect(() => {
    let ativo = true;
    setEstado('carregando');
    apiFetch(`/api/proficiencia/declaracoes/${encodeURIComponent(codigo)}`, { auth: false })
      .then(async (r) => {
        if (!ativo) return;
        if (r.ok) {
          const j = await r.json();
          setDados(j);
          setEstado(j?.valido ? 'valido' : 'invalido');
        } else if (r.status === 404) {
          setEstado('invalido');
        } else {
          setEstado('erro');
        }
      })
      .catch(() => { if (ativo) setEstado('erro'); });
    return () => { ativo = false; };
  }, [codigo]);

  return (
    <>
      <div className="bg-ufrpe-blue text-white py-16 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <nav className="flex text-white/60 text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/" className="hover:text-ufrpe-yellow transition-colors">Início</Link>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <i className="fa-solid fa-chevron-right text-[10px] mx-2 opacity-50"></i>
                  <span className="text-ufrpe-yellow font-medium">Verificação de Declaração</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="font-heading text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Languages size={32} /> Verificação de Autenticidade
          </h1>
          <p className="text-white/70 mt-2">
            Declaração de Proficiência em Línguas — Pró-Reitoria de Pós-Graduação / UFRPE
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl">
          {estado === 'carregando' && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center gap-3 text-gray-600">
              <Loader2 size={22} className="animate-spin" /> Verificando documento…
            </div>
          )}

          {estado === 'erro' && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-700">
                Não foi possível verificar a declaração no momento. Tente novamente em instantes.
              </p>
            </div>
          )}

          {estado === 'invalido' && (
            <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 text-red-700 rounded-full p-4">
                  <ShieldX size={48} />
                </div>
              </div>
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                Declaração não encontrada
              </h2>
              <p className="text-gray-600 mt-3">
                O código informado não corresponde a uma declaração de proficiência válida
                emitida pela PRPG/UFRPE. Confira se digitou o código corretamente ou
                escaneie novamente o QR code impresso no documento.
              </p>
              <p className="text-xs text-gray-400 mt-4 break-all">Código consultado: {codigo}</p>
            </div>
          )}

          {estado === 'valido' && dados && (
            <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
              <div className="bg-green-50 border-b border-green-200 p-6 flex items-center gap-4">
                <div className="bg-green-100 text-green-700 rounded-full p-3 shrink-0">
                  <ShieldCheck size={36} />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-green-800">
                    Documento autêntico
                  </h2>
                  <p className="text-sm text-green-700/90">
                    Os dados abaixo constam nos registros oficiais da PRPG/UFRPE.
                    Confira-os com o documento apresentado.
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-gray-100">
                <Linha rotulo="Nome" valor={dados.nome} />
                <Linha rotulo="CPF" valor={dados.cpf || '—'} />
                <Linha rotulo="Nível" valor={dados.nivel} />
                <Linha
                  rotulo={(dados.linguas || []).length > 1 ? 'Línguas' : 'Língua'}
                  valor={linguasTexto(dados.linguas)}
                />
                <Linha rotulo="Nota" valor={dados.nota != null ? String(dados.nota).replace('.', ',') : '—'} />
                <Linha rotulo="Resultado" valor={dados.resultadoLabel} />
                {dados.dataProva && <Linha rotulo="Data da prova" valor={dataExtenso(dados.dataProva)} />}
                <Linha rotulo="Data de emissão" valor={dataExtenso(dados.dataEmissao)} />
                <Linha
                  rotulo="Válida até"
                  valor={`${dataExtenso(dados.dataValidade)} (4 anos a partir da emissão)`}
                />
              </dl>

              <div className="bg-gray-50 border-t border-gray-100 p-4">
                <p className="text-xs text-gray-500 break-all">
                  Código de verificação: <span className="font-mono">{dados.codigoVerificacao}</span>
                </p>
              </div>
            </div>
          )}

          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-ufrpe-blue text-white px-6 py-2 rounded hover:bg-[#2a3a66] transition-colors"
            >
              <Home size={16} /> Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function Linha({ rotulo, valor }) {
  return (
    <div className="px-6 py-3 grid grid-cols-3 gap-4">
      <dt className="text-sm font-medium text-gray-500">{rotulo}</dt>
      <dd className="col-span-2 text-sm text-gray-900 font-medium">{valor || '—'}</dd>
    </div>
  );
}
