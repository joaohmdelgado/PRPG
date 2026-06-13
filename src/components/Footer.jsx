import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();

  const quickLinks = [
    { label: 'Calendário Acadêmico', path: '/calendario-academico' },
    { label: 'Resoluções', path: '/resolucoes' },
    { label: 'Formulários', path: '/formularios' },
    { label: 'Editais', path: '/editais' },
    { label: 'Relatório de Gestão', path: 'https://prpg.ufrpe.br/relatorio-de-gestao', isExternal: true },
  ];
  const sistemas = [
    { label: 'SIGAA', path: 'https://sigs.ufrpe.br/sigaa/', isExternal: true },
    { label: 'AVA - UFRPE', path: 'http://ava.ufrpe.br/', isExternal: true },
    { label: 'E-mail Institucional', path: 'https://www.ufrpe.br/', isExternal: true },
    { label: 'Wi-Fi Eduroam', path: 'https://www.ufrpe.br/', isExternal: true }
  ];
  const socials = ['instagram', 'youtube', 'linkedin-in'];

  return (
    <footer style={{ background: '#151e36' }} className="text-white pt-20 pb-8 mt-auto border-t-4 border-ufrpe-yellow">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand + address */}
          <div>
            <h3 className="font-heading font-bold text-2xl text-white mb-6">
              PRPG <span className="text-ufrpe-yellow">UFRPE</span>
            </h3>
            <p className="text-sm text-gray-400 font-light leading-relaxed mb-6">
              Pró-Reitoria de Pós-Graduação<br />
              Universidade Federal Rural de Pernambuco<br />
              Rua Dom Manoel de Medeiros, s/n<br />
              Dois Irmãos, Recife - PE, Brasil<br />
              CEP 52171-900
            </p>
            <div className="flex gap-3">
              {socials.map(s => (
                <a key={s} href="#"
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-ufrpe-yellow hover:text-ufrpe-blue hover:border-ufrpe-yellow transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <i className={`fa-brands fa-${s}`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold text-lg mb-6 border-b border-white/10 pb-3">Acesso Rápido</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              {quickLinks.map(({ label, path, isExternal }) => (
                <li key={label}>
                  {isExternal ? (
                    <a
                      href={path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-ufrpe-yellow transition flex items-center text-left"
                    >
                      <i className="fa-solid fa-angle-right text-[10px] mr-2 text-ufrpe-yellow opacity-70"></i>
                      {label}
                    </a>
                  ) : (
                    <Link
                      to={path}
                      className="hover:text-ufrpe-yellow transition flex items-center text-left"
                    >
                      <i className="fa-solid fa-angle-right text-[10px] mr-2 text-ufrpe-yellow opacity-70"></i>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Sistemas */}
          <div>
            <h4 className="font-bold text-lg mb-6 border-b border-white/10 pb-3">Sistemas</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              {sistemas.map(({ label, path, isExternal }) => (
                <li key={label}>
                  <a
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-ufrpe-yellow transition flex items-center text-left"
                  >
                    <i className="fa-solid fa-angle-right text-[10px] mr-2 text-ufrpe-yellow opacity-70"></i>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Atendimento */}
          <div>
            <h4 className="font-bold text-lg mb-6 border-b border-white/10 pb-3">Atendimento</h4>
            <ul className="space-y-5 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded flex items-center justify-center text-ufrpe-yellow shrink-0"
                  style={{ background: 'rgba(254,189,17,0.10)' }}>
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <span className="block font-semibold text-white mb-0.5">Secretaria PRPG</span>
                  <span className="hover:text-ufrpe-yellow cursor-pointer transition">secretaria.prpg@ufrpe.br</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded flex items-center justify-center text-ufrpe-yellow shrink-0"
                  style={{ background: 'rgba(254,189,17,0.10)' }}>
                  <i className="fa-brands fa-whatsapp text-lg"></i>
                </div>
                <div>
                  <span className="block font-semibold text-white mb-0.5">WhatsApp Institucional</span>
                  <span>+55 81 3320-6050</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© 2026 PRPG - Universidade Federal Rural de Pernambuco. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition">Política de Privacidade</a>
            <a href="#" className="hover:text-white transition">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
