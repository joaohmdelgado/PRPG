import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

// Fase B.2 (PLANO.md): rota antiga de verificação da declaração de
// proficiência. Mantida só para os QR codes já impressos com este link —
// redireciona para a página pública única de verificação.
export default function DeclaracaoProficiencia() {
  const { codigo } = useParams();
  return <Navigate to={`/verificar/${encodeURIComponent(codigo)}`} replace />;
}
