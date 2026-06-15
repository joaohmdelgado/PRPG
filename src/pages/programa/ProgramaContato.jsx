import React from 'react';
import { usePrograma } from '../../components/programa/ProgramaContext';
import { PageHero } from '../../components/programa/ProgramaUI';

function InfoCard({ icon, label, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
      <span className="shrink-0 h-11 w-11 rounded-xl bg-[var(--prog-primary)]/5 text-[var(--prog-primary)] flex items-center justify-center">
        <i className={`fa-solid ${icon}`}></i>
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">{label}</p>
        <div className="text-gray-700 break-words">{children}</div>
      </div>
    </div>
  );
}

export default function ProgramaContato() {
  const { programa } = usePrograma();
  const hasContato = programa.endereco || programa.email_programa || programa.telefone_secretaria || programa.whatsapp;

  return (
    <>
      <PageHero icon="fa-envelope" eyebrow="Atendimento" title="Contato"
        subtitle={`Secretaria do programa ${programa.nome}.`} />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          {programa.endereco && (
            <InfoCard icon="fa-location-dot" label="Endereço">{programa.endereco}</InfoCard>
          )}
          {programa.email_programa && (
            <InfoCard icon="fa-envelope" label="E-mail">
              <a href={`mailto:${programa.email_programa}`} className="hover:text-[var(--prog-primary)]">{programa.email_programa}</a>
            </InfoCard>
          )}
          {programa.telefone_secretaria && (
            <InfoCard icon="fa-phone" label="Telefone">{programa.telefone_secretaria}</InfoCard>
          )}
          {programa.whatsapp && (
            <InfoCard icon="fa-whatsapp" label="WhatsApp">{programa.whatsapp}</InfoCard>
          )}
          {programa.horario_atendimento && (
            <InfoCard icon="fa-clock" label="Horário de atendimento">{programa.horario_atendimento}</InfoCard>
          )}
          {programa.coordenador_atual?.nome && (
            <InfoCard icon="fa-user-tie" label="Coordenação">{programa.coordenador_atual.nome}</InfoCard>
          )}
        </div>

        {!hasContato && (
          <p className="text-gray-500 text-center py-6">Os dados de contato deste programa ainda não foram informados.</p>
        )}

        {programa.mapa_embed && (
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 aspect-video">
            <iframe src={programa.mapa_embed} title="Localização" className="w-full h-full border-0"
              allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
          </div>
        )}
      </main>
    </>
  );
}
