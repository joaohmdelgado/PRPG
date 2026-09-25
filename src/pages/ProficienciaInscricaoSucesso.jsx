import React, { useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Languages, CheckCircle2, Mail, Home } from 'lucide-react';
import CabecalhoPagina from '../components/CabecalhoPagina';

// Página de confirmação exibida após o envio de uma inscrição de proficiência.
// É acessada via redirecionamento do formulário (state.fromInscricao); o acesso
// direto pela URL, sem ter enviado uma inscrição, volta para o formulário.
export default function ProficienciaInscricaoSucesso() {
  const location = useLocation();
  const fromInscricao = location.state?.fromInscricao;
  const protocolo = location.state?.protocolo;

  useEffect(() => {
    const prev = document.title;
    document.title = 'Inscrição enviada — Proficiência em Línguas | PRPG UFRPE';

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    const prevDesc = metaDesc.content;
    metaDesc.content =
      'Confirmação de envio da inscrição para o exame de proficiência em línguas da PRPG/UFRPE.';

    const setOg = (prop, val) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', prop);
        document.head.appendChild(el);
      }
      el.content = val;
    };
    setOg('og:title', 'Inscrição enviada — Proficiência em Línguas | PRPG UFRPE');
    setOg('og:description', 'Inscrição registrada com sucesso na PRPG/UFRPE.');

    // Páginas de confirmação não devem ser indexadas.
    let robots = document.querySelector('meta[name="robots"]');
    const criouRobots = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    const prevRobots = robots.content;
    robots.content = 'noindex, nofollow';

    return () => {
      document.title = prev;
      metaDesc.content = prevDesc;
      if (criouRobots) robots.remove();
      else robots.content = prevRobots;
    };
  }, []);

  // Acesso direto à URL sem ter enviado a inscrição: redireciona ao formulário.
  if (!fromInscricao) {
    return <Navigate to="/proficiencia/inscricao" replace />;
  }

  return (
    <>
      <CabecalhoPagina
        titulo={<span className="flex items-center gap-3"><Languages size={36} aria-hidden="true" /> Inscrição enviada</span>}
        atual="Confirmação"
        trilha={[{ rotulo: 'Inscrição — Proficiência', destino: '/proficiencia/inscricao' }]}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 text-green-700 rounded-full p-4">
                <CheckCircle2 size={48} />
              </div>
            </div>

            <h2 className="font-heading text-2xl font-bold text-gray-900">
              Inscrição enviada com sucesso!
            </h2>
            <p className="text-gray-600 mt-3">
              Recebemos a sua inscrição para o exame de proficiência em línguas.
              {protocolo ? (
                <> O número de protocolo da sua inscrição é <strong>#{protocolo}</strong>.</>
              ) : null}
            </p>

            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 mt-6 text-left">
              <Mail size={22} className="shrink-0 mt-0.5" />
              <p className="text-sm">
                Um <strong>e-mail de confirmação</strong> será enviado para o endereço
                cadastrado, com os próximos passos e as informações sobre o exame.
                Caso não receba em alguns minutos, verifique também a caixa de spam.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
              <Link
                to="/proficiencia/inscricao"
                className="border border-ufrpe-blue text-ufrpe-blue px-6 py-2 rounded hover:bg-ufrpe-blue/5 transition-colors"
              >
                Nova inscrição
              </Link>
              <Link
                to="/"
                className="bg-ufrpe-blue text-white px-6 py-2 rounded hover:bg-[#2a3a66] transition-colors flex items-center justify-center gap-2"
              >
                <Home size={16} /> Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
