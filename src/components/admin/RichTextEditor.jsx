import React, { useEffect, useRef } from 'react';

// Carrega o CKEditor (CDN) uma única vez e reaproveita entre instâncias.
let ckLoading = null;
const loadCK = () => {
  if (window.ClassicEditor) return Promise.resolve();
  if (ckLoading) return ckLoading;
  ckLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.ckeditor.com/ckeditor5/41.1.0/classic/ckeditor.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return ckLoading;
};

// Editor rich-text controlado (value/onChange). Encapsula o ciclo de vida do
// CKEditor para ser reutilizado em vários campos (ex.: seções do microsite).
export default function RichTextEditor({ value, onChange, minHeight = 220 }) {
  const elRef = useRef(null);
  const instRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    let destroyed = false;
    loadCK().then(() => {
      if (destroyed || !elRef.current || instRef.current) return;
      window.ClassicEditor.create(elRef.current, {
        toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
          'blockQuote', 'insertTable', 'undo', 'redo'],
      }).then((editor) => {
        if (destroyed) { editor.destroy().catch(() => {}); return; }
        instRef.current = editor;
        if (valueRef.current) editor.setData(valueRef.current);
        editor.model.document.on('change:data', () => onChangeRef.current?.(editor.getData()));
      }).catch((err) => console.error('Erro ao iniciar editor:', err));
    }).catch((err) => console.error('Erro ao carregar editor:', err));

    return () => {
      destroyed = true;
      if (instRef.current) { instRef.current.destroy().catch(() => {}); instRef.current = null; }
    };
  }, []);

  // Sincroniza quando o valor externo muda (ex.: dados carregados em modo edição).
  // O guard contra getData() evita resetar o cursor enquanto o usuário digita.
  useEffect(() => {
    const editor = instRef.current;
    if (editor && value != null && value !== editor.getData()) {
      editor.setData(value);
    }
  }, [value]);

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
      <div ref={elRef}></div>
      <style>{`.ck-editor__editable_inline{min-height:${minHeight}px !important;}`}</style>
    </div>
  );
}
