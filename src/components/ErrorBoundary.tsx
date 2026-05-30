import { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught a critical rendering error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="surface-strong mx-auto my-12 max-w-2xl space-y-6 border-error/25 bg-error/10 p-6 text-error">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-error/25 bg-error/15">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-extrabold text-slate-950 dark:text-white">Erreur de rendu</h2>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">NeoGet Error Boundary</p>
            </div>
          </div>

          <div className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/80 p-4 font-mono text-xs leading-relaxed text-rose-300 shadow-inner">
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.error?.stack}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-500"
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Réinitialiser le composant
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
              type="button"
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
