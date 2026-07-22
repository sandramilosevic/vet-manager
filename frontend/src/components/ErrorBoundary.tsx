import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time crashes so a single broken component can't blank the
 * whole app. Errors are shown, not swallowed — but nothing is sent anywhere,
 * and in production the stack is hidden since it can echo user data.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // Dev only. `drop: ['console']` strips this from production builds.
      console.error('Render error:', error, info.componentStack)
    }
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="auth">
        <div className="auth__panel">
          <div className="card">
            <div className="card__body">
              <div className="state state--error">
                <span className="state__icon" aria-hidden="true">
                  !
                </span>
                <h1 className="state__title">Something broke</h1>
                <p className="state__description">
                  An unexpected error stopped this screen from rendering. Your data is
                  safe — nothing was saved or lost.
                </p>
                {import.meta.env.DEV && (
                  <pre
                    className="text-xs muted"
                    style={{ maxWidth: '100%', overflowX: 'auto', textAlign: 'left' }}
                  >
                    {error.message}
                  </pre>
                )}
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={this.handleReset}
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => window.location.assign('/')}
                  >
                    Back to dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
