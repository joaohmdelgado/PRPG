import React from 'react';
import { Link } from 'react-router-dom';
import { ehExterno } from '../hooks/usePortal';

// Link para o destino de um item de menu (Fase H.1): rota interna pelo
// roteador; URL externa em nova aba; e-mail/telefone/âncora como <a> comum.
export default function LinkDestino({ destino, className, children, ...resto }) {
  if (!destino) return <span className={className} {...resto}>{children}</span>;
  if (/^https?:\/\//i.test(destino)) {
    return <a href={destino} target="_blank" rel="noopener noreferrer" className={className} {...resto}>{children}</a>;
  }
  if (ehExterno(destino) || destino.startsWith('#')) {
    return <a href={destino} className={className} {...resto}>{children}</a>;
  }
  return <Link to={destino} className={className} {...resto}>{children}</Link>;
}
