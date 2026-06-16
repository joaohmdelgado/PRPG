import React from 'react';
import AdminProgramaPessoas from './AdminProgramaPessoas';

const PAPEIS = {
  DOCENTE_PERMANENTE:  'Docente Permanente',
  DOCENTE_COLABORADOR: 'Docente Colaborador',
};

export default function AdminProgramaDocentes() {
  return (
    <AdminProgramaPessoas
      recurso="docentes"
      titulo="Corpo Docente"
      papeis={PAPEIS}
      createRole="Professor"
      createNoun="professor"
    />
  );
}
