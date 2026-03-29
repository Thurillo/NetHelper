import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface State {
  error: Error | null
  resetKey: number
}

interface Props {
  children: React.ReactNode
}

export class PageErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  handleReset = () => {
    this.setState(s => ({ error: null, resetKey: s.resetKey + 1 }))
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-6">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Errore di rendering</h2>
            <p className="text-sm text-gray-500 mb-4">{this.state.error.message}</p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Ricarica pagina
          </button>
        </div>
      )
    }

    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    )
  }
}
