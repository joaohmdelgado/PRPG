import React from 'react';
import { useMenu, useConfig, linkTelefone } from '../hooks/usePortal';
import LinkDestino from './LinkDestino';

// Colunas de links, redes sociais e contato vêm do banco (Fase H.1 —
// editados no painel em "Menus e portal"). Cada item de primeiro nível do
// menu "rodape" é o título de uma coluna.
export default function Footer() {
  const colunas = useMenu('rodape');
  const redes = useMenu('redes-sociais');
  const contato = useConfig('contato');

  return (
    <footer style={{ background: '#151e36' }} className="text-white pt-20 pb-8 mt-auto border-t-4 border-ufrpe-yellow">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand + address */}
          <div>
            <h3 className="font-heading font-bold text-2xl text-white mb-6">
              PRPG <span className="text-ufrpe-yellow">UFRPE</span>
            </h3>
            {contato.endereco && (
              <p className="text-sm text-gray-400 font-light leading-relaxed mb-6 whitespace-pre-line">
                {contato.endereco}
              </p>
            )}
            {redes.length > 0 && (
              <ul className="flex gap-3" aria-label="Redes sociais">
                {redes.map((r) => (
                  <li key={r.id}>
                    <LinkDestino destino={r.destino} aria-label={r.rotulo} title={r.rotulo}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-ufrpe-yellow hover:text-ufrpe-blue flex items-center justify-center transition">
                      <i className={r.icone || 'fa-solid fa-link'} aria-hidden="true"></i>
                    </LinkDestino>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {colunas.slice(0, 2).map((coluna) => (
            <div key={coluna.id}>
              <h4 className="font-bold text-lg mb-6 border-b border-white/10 pb-3">{coluna.rotulo}</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {(coluna.filhos || []).map((item) => (
                  <li key={item.id}>
                    <LinkDestino destino={item.destino} className="hover:text-ufrpe-yellow transition flex items-center text-left">
                      <i className="fa-solid fa-angle-right text-[10px] mr-2 text-ufrpe-yellow opacity-70" aria-hidden="true"></i>
                      {item.rotulo}
                    </LinkDestino>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Atendimento */}
          <div>
            <h4 className="font-bold text-lg mb-6 border-b border-white/10 pb-3">Atendimento</h4>
            <ul className="space-y-5 text-sm text-gray-400">
              {contato.email && (
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded flex items-center justify-center text-ufrpe-yellow shrink-0"
                    style={{ background: 'rgba(254,189,17,0.10)' }}>
                    <i className="fa-solid fa-envelope" aria-hidden="true"></i>
                  </div>
                  <div>
                    <span className="block font-semibold text-white mb-0.5">Secretaria PRPG</span>
                    <a href={`mailto:${contato.email}`} className="hover:text-ufrpe-yellow transition">{contato.email}</a>
                  </div>
                </li>
              )}
              {contato.whatsapp && (
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded flex items-center justify-center text-ufrpe-yellow shrink-0"
                    style={{ background: 'rgba(254,189,17,0.10)' }}>
                    <i className="fa-brands fa-whatsapp text-lg" aria-hidden="true"></i>
                  </div>
                  <div>
                    <span className="block font-semibold text-white mb-0.5">WhatsApp Institucional</span>
                    <a href={linkTelefone(contato.whatsapp)} className="hover:text-ufrpe-yellow transition">{contato.whatsapp}</a>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} PRPG - Universidade Federal Rural de Pernambuco. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
