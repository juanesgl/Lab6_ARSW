export default function ErrorBanner({ message, onRetry, onClose }) {
  if (!message) return null
  return (
    <div className="banner error" role="alert">
      <span>{message}</span>
      <div className="banner-actions">
        {onRetry && (
          <button type="button" className="btn small" onClick={onRetry}>
            Reintentar
          </button>
        )}
        {onClose && (
          <button type="button" className="btn small ghost" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
