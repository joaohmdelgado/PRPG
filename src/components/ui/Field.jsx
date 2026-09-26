import React, { cloneElement, isValidElement, useId } from 'react';
import { Upload, Trash2, FileText } from 'lucide-react';

// Componentes de formulário acessíveis (Fase U.4). O problema que resolvem:
// quase todos os <label> do painel não estavam ligados ao campo (só 1 de 247
// tinha htmlFor), então leitor de tela não anunciava o nome do campo e clicar
// no rótulo não focava nada. `Field` liga rótulo, ajuda e erro ao controle
// (id, aria-describedby, aria-invalid, required) — o controle é o filho.

export const CLASSE_CAMPO =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-ufrpe-yellow focus:border-ufrpe-yellow outline-none disabled:bg-gray-50 disabled:text-gray-500 aria-[invalid=true]:border-red-500';

const semPontos = (s) => s.replace(/:/g, '');

// Uso:
//   <Field label="Título" required hint="Aparece na listagem" error={erros.title}>
//     <input value={...} onChange={...} />
//   </Field>
// O filho recebe `id`, `required`, `aria-invalid` e `aria-describedby`. Para um
// componente próprio que não repassa essas props, use a forma função:
//   <Field label="Data">{(p) => <MeuCampo {...p} />}</Field>
export function Field({ label, hint, error, required, children, className = '', id, ocultarRotulo = false }) {
  const gerado = semPontos(useId());
  const fid = id || `campo-${gerado}`;
  const hintId = hint ? `${fid}-ajuda` : undefined;
  const erroId = error ? `${fid}-erro` : undefined;

  const propsControle = {
    id: fid,
    required: required || undefined,
    'aria-invalid': error ? true : undefined,
  };
  const describedBy = (existente) => [existente, hintId, erroId].filter(Boolean).join(' ') || undefined;

  let controle;
  if (typeof children === 'function') {
    controle = children({ ...propsControle, 'aria-describedby': describedBy() });
  } else if (isValidElement(children)) {
    controle = cloneElement(children, {
      ...propsControle,
      'aria-describedby': describedBy(children.props['aria-describedby']),
    });
  } else {
    controle = children;
  }

  return (
    <div className={className}>
      <label htmlFor={fid} className={ocultarRotulo ? 'sr-only' : 'block text-sm font-medium text-gray-700 mb-1'}>
        {label}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (obrigatório)</span>}
      </label>
      {controle}
      {hint && <p id={hintId} className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p id={erroId} role="alert" className="text-xs text-red-700 mt-1">{error}</p>}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${CLASSE_CAMPO} ${className}`} {...props} />;
});

export const Textarea = React.forwardRef(function Textarea({ className = '', rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={`${CLASSE_CAMPO} ${className}`} {...props} />;
});

// `opcoes`: [{ value, label }] ou strings. `vazio`: rótulo da opção sem valor.
export const Select = React.forwardRef(function Select({ opcoes = [], vazio, className = '', children, ...props }, ref) {
  return (
    <select ref={ref} className={`${CLASSE_CAMPO} ${className}`} {...props}>
      {vazio !== undefined && <option value="">{vazio}</option>}
      {opcoes.map((o) => {
        const value = typeof o === 'object' ? o.value : o;
        const label = typeof o === 'object' ? o.label : o;
        return <option key={value} value={value}>{label}</option>;
      })}
      {children}
    </select>
  );
});

// Campo de arquivo: o <input type="file"> fica visualmente escondido, mas
// continua no teclado e no leitor de tela (o rótulo é o botão).
//   atual: URL/nome do arquivo já enviado.  onEscolher(file).  onRemover().
export function FileField({
  label, hint, error, required, accept, atual, atualRotulo, onEscolher, onRemover,
  enviando = false, id, className = '', textoBotao = 'Escolher arquivo',
}) {
  const gerado = semPontos(useId());
  const fid = id || `arquivo-${gerado}`;
  const hintId = hint ? `${fid}-ajuda` : undefined;
  const erroId = error ? `${fid}-erro` : undefined;
  const statusId = `${fid}-status`;
  return (
    <div className={className}>
      <span id={`${fid}-rotulo`} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (obrigatório)</span>}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={fid}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-ufrpe-yellow">
          <Upload size={16} aria-hidden="true" />
          {enviando ? 'Enviando…' : textoBotao}
          <span className="sr-only"> — {label}</span>
        </label>
        <input
          id={fid} type="file" accept={accept} disabled={enviando} required={required && !atual}
          aria-describedby={[hintId, erroId, statusId].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f && onEscolher) onEscolher(f); e.target.value = ''; }}
        />
        <span id={statusId} aria-live="polite" className="text-sm text-gray-600 inline-flex items-center gap-1.5">
          {atual ? (
            <>
              <FileText size={14} aria-hidden="true" />
              {typeof atual === 'string' && /^https?:|^\//.test(atual)
                ? <a href={atual} target="_blank" rel="noopener noreferrer" className="text-ufrpe-blue underline">{atualRotulo || 'Arquivo enviado'}</a>
                : <span>{atualRotulo || 'Arquivo enviado'}</span>}
            </>
          ) : 'Nenhum arquivo escolhido'}
        </span>
        {atual && onRemover && (
          <button type="button" onClick={onRemover}
            className="inline-flex items-center gap-1 text-sm text-red-700 hover:underline">
            <Trash2 size={14} aria-hidden="true" /> Remover<span className="sr-only"> {label}</span>
          </button>
        )}
      </div>
      {hint && <p id={hintId} className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p id={erroId} role="alert" className="text-xs text-red-700 mt-1">{error}</p>}
    </div>
  );
}

// Caixa de seleção com rótulo clicável (o texto faz parte do <label>).
export function Checkbox({ label, hint, className = '', ...props }) {
  const gerado = semPontos(useId());
  const id = props.id || `check-${gerado}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input id={id} type="checkbox" className="w-4 h-4 rounded border-gray-300" {...props} />
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500 mt-1 ml-6">{hint}</p>}
    </div>
  );
}
