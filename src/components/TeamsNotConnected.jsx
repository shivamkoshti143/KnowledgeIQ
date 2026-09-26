import { MessageSquare, AlertTriangle, ExternalLink } from "lucide-react";

export function TeamsNotConnected({ 
  email, 
  onRetry, 
  onBack,
  className = ""
}) {
  return (
    <div 
      className={`teams-not-connected ${className}`}
      style={{
        padding: '24px 20px',
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: 12,
        textAlign: 'center'
      }}
    >
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#fef3c7',
        color: '#f59e0b',
        marginBottom: 16,
        fontSize: 24
      }}>
        <AlertTriangle size={28} />
      </div>
      
      <h3 style={{
        fontSize: 18,
        fontWeight: 700,
        color: '#92400e',
        margin: '0 0 8px'
      }}>
        Microsoft Teams Not Connected
      </h3>
      
      <p style={{
        fontSize: 14,
        color: '#78350f',
        lineHeight: 1.5,
        margin: '0 0 16px',
        maxWidth: 360
      }}>
        To receive verification codes, you need to connect your Microsoft Teams account first.
        Please open Microsoft Teams and install/start the <strong>TaskIQ Bot</strong>.
      </p>
      
      <div style={{
        background: '#fff',
        border: '1px solid #fde68a',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 20,
        textAlign: 'left',
        fontSize: 13,
        color: '#78350f'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 20, 
            height: 20, 
            background: '#fef3c7', 
            borderRadius: 4, 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#92400e',
            flexShrink: 0
          }}>1</span>
          <span>Open <strong>Microsoft Teams</strong> (desktop or web)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 20, 
            height: 20, 
            background: '#fef3c7', 
            borderRadius: 4, 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#92400e',
            flexShrink: 0
          }}>2</span>
          <span>Search for <strong>TaskIQ Bot</strong> in Apps or search bar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 20, 
            height: 20, 
            background: '#fef3c7', 
            borderRadius: 4, 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#92400e',
            flexShrink: 0
          }}>3</span>
          <span>Click <strong>Add</strong> or <strong>Start</strong> to connect your account</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 20, 
            height: 20, 
            background: '#fef3c7', 
            borderRadius: 4, 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#92400e',
            flexShrink: 0
          }}>4</span>
          <span>Return here and click <strong>Retry</strong></span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRetry}
          className="primary"
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 9,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <MessageSquare size={16} /> Retry
        </button>
        
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 9,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#fff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <ExternalLink size={16} /> Back to Email
          </button>
        )}
      </div>
      
      <p style={{
        marginTop: 16,
        fontSize: 12,
        color: '#a16207',
        fontStyle: 'italic'
      }}>
        If your organization has centrally deployed the TaskIQ Bot, you may already have access. 
        Contact your IT administrator if you cannot find the bot.
      </p>
    </div>
  );
}