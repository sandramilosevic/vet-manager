import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/States'

export function NotFoundPage({ standalone = false }: { standalone?: boolean }) {
  const body = (
    <div className="card">
      <EmptyState
        icon="404"
        title="Page not found"
        description="The page you're looking for doesn't exist, or you followed a link that has since changed."
        action={
          <Link className="btn btn--primary btn--sm" to="/">
            Back to dashboard
          </Link>
        }
      />
    </div>
  )

  if (standalone) {
    return (
      <div className="auth">
        <div className="auth__panel">{body}</div>
      </div>
    )
  }

  return body
}
