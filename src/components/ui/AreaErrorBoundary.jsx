import React from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RotateCw } from 'lucide-react';

// Um erro de renderização numa tela derrubava a árvore inteira (tela branca).
// Cada área (painel, site público, microsite, /minha-conta) ganha o seu limite:
// o erro fica contido na área, a navegação em volta continua funcionando e a
// pessoa vê o que fazer. `chave` (a rota) zera o erro ao navegar para outra tela.
class Limite extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // Sem serviço de telemetria ainda: o console é o que o suporte consegue pedir.
    console.error(`[${this.props.area}]`, erro, info?.componentStack);
  }

  componentDidUpdate(anterior) {
    if (this.state.erro && anterior.chave !== this.props.chave) this.setState({ erro: null });
  }

  render() {
    if (!this.state.erro) return this.props.children;
    const { area, compacto } = this.props;
    return (
      <div role="alert" className={`${compacto ? 'py-10' : 'min-h-[50vh] py-16'} flex flex-col items-center justify-center text-center px-4`}>
        <div className="w-14 h-14 rounded-full bg-red-50 grid place-items-center mb-4">
          <AlertTriangle className="text-red-600" size={26} aria-hidden="true" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-gray-800">Algo deu errado nesta tela</h2>
        <p className="text-sm text-gray-600 mt-1 max-w-md">
          O erro ficou contido em {area}: o restante do site continua funcionando. Recarregar a página costuma resolver.
        </p>
        <button type="button" onClick={() => window.location.reload()}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ufrpe-blue text-white text-sm font-medium hover:bg-[#2a3a66]">
          <RotateCw size={16} aria-hidden="true" /> Recarregar a página
        </button>
      </div>
    );
  }
}

export default function AreaErrorBoundary({ area = 'esta área', compacto = false, children }) {
  const { pathname } = useLocation();
  return <Limite area={area} compacto={compacto} chave={pathname}>{children}</Limite>;
}
