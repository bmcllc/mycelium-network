import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Evita tela preta total quando um painel lazy falha ao carregar. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ET-RNET] Erro de UI:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#050607] text-zinc-300 p-8 font-mono text-sm" role="alert">
          <p className="text-[#b6ff3a] mb-2">ERRO AO CARREGAR A INTERFACE</p>
          <pre className="text-red-400/90 whitespace-pre-wrap break-words mb-6 max-w-3xl">
            {this.state.error.message}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-4 py-2 border border-[#b6ff3a]/40 text-[#b6ff3a] hover:bg-[#b6ff3a]/10"
              onClick={() => this.setState({ error: null })}
            >
              TENTAR DE NOVO
            </button>
            <button
              type="button"
              className="px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
              onClick={() => {
                this.setState({ error: null });
                window.location.href = "/";
              }}
            >
              VOLTAR AO INÍCIO
            </button>
          </div>
          <p className="mt-4 text-[10px] text-zinc-600 max-w-md">
            Se a app ficou presa após toque longo ou botão direito, atualize o APK release — o menu nativo
            Android já está bloqueado.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
