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
        <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 max-w-2xl mx-auto my-12 space-y-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Oups ! Une erreur de rendu s'est produite</h2>
              <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">NeoGet Error Boundary</p>
            </div>
          </div>

          <div className="bg-black/90 rounded-xl p-4 border border-zinc-850 font-mono text-xs text-red-400 break-all whitespace-pre-wrap leading-relaxed shadow-inner">
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.error?.stack}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all duration-200 flex items-center gap-2 text-sm shadow-lg shadow-red-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              Réinitialiser le composant
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-zinc-850 hover:bg-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all duration-200 text-sm border border-zinc-700/30"
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
