export function AuthError({ message, className = "", onDismiss }) {
  if (!message) return null;

  return (
    <div 
      className={`auth-error ${className}`}
      role="alert"
      style={{
        marginTop: 14,
        padding: '10px 14px',
        background: '#fef2f2',
        borderRadius: 8,
        border: '1px solid #fecaca',
        color: '#dc2626',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
            opacity: 0.7
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function AuthLoadingState({ message = "Loading...", className = "" }) {
  return (
    <div 
      className={`auth-loading ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '24px 16px',
        color: '#64748b',
        fontSize: 14
      }}
    >
      <div className="spinner" style={{
        width: 24,
        height: 24,
        border: '3px solid #e2e8f0',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <span>{message}</span>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function AuthSuccess({ message, className = "", icon = "✓" }) {
  return (
    <div 
      className={`auth-success ${className}`}
      role="status"
      style={{
        marginTop: 14,
        padding: '12px 16px',
        background: '#f0fdf4',
        borderRadius: 8,
        border: '1px solid #bbf7d0',
        color: '#166534',
        fontSize: 14,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        background: '#22c55e',
        color: '#fff',
        borderRadius: '50%',
        fontSize: 14,
        fontWeight: 700,
        flexShrink: 0
      }}>
        {icon}
      </span>
      <span>{message}</span>
    </div>
  );
}