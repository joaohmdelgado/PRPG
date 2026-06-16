import React from 'react';
import AdminProgramaPessoas from './AdminProgramaPessoas';

const PAPEIS = {
  DISCENTE_MESTRADO:     'Mestrando(a)',
  DISCENTE_DOUTORADO:    'Doutorando(a)',
  DISCENTE_PROFISSIONAL: 'Mestrando(a) Profissional',
  EGRESSO:               'Egresso(a)',
};

export default function AdminProgramaDiscentes() {
  return (
    <AdminProgramaPessoas
      recurso="discentes"
      titulo="Corpo Discente"
      papeis={PAPEIS}
      createRole="Aluno"
      createNoun="aluno"
    />
  );
}
