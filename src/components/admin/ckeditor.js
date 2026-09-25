import { apiFetch } from '../../api';

// Configuração única do CKEditor para todos os formulários do painel (Fase
// F.6). Antes cada formulário tinha a sua cópia da barra de ferramentas e
// nenhum permitia imagem no corpo do texto.

export const CKEDITOR_CDN = 'https://cdn.ckeditor.com/ckeditor5/41.1.0/classic/ckeditor.js';

// Imagem colada/arrastada/escolhida no editor vai para /api/upload — e entra
// na biblioteca de mídia (com deduplicação). O conteúdo guarda a URL relativa
// (/uploads/...): em desenvolvimento o Vite repassa /uploads para a API, e o
// SafeHtml acrescenta o host da API quando o site roda em outro endereço.
function AdaptadorUploadPrpg(editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
    const controle = new AbortController();
    return {
      upload: async () => {
        const arquivo = await loader.file;
        const corpo = new FormData();
        corpo.append('file', arquivo);
        const r = await apiFetch('/api/upload', { method: 'POST', body: corpo, signal: controle.signal });
        const dados = await r.json().catch(() => ({}));
        if (!r.ok) throw dados.message || 'Não foi possível enviar a imagem.';
        return { default: dados.url };
      },
      abort: () => controle.abort(),
    };
  };
}

export const configEditor = (extra = {}) => ({
  toolbar: [
    'heading', '|',
    'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
    'blockQuote', 'insertTable', 'uploadImage', '|',
    'undo', 'redo',
  ],
  extraPlugins: [AdaptadorUploadPrpg],
  // "Texto alternativo" na barra da imagem: acessibilidade da imagem no corpo.
  image: { toolbar: ['imageTextAlternative', '|', 'imageStyle:inline', 'imageStyle:block', 'imageStyle:side'] },
  link: { addTargetToExternalLinks: true },
  ...extra,
});
