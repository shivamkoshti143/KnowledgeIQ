import { useEffect, useState } from "react";

export function ResendOtpTimer({ 
  cooldownSeconds = 60, 
  onResend, 
  disabled = false,
  label = "Resend code",
  className = ""
}) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    setSecondsLeft(cooldownSeconds);
    setCanResend(false);
    
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    if (canResend && !disabled && onResend) {
      onResend();
    }
  };

  return (
    <button
      type="button"
      className={`resend-otp-timer ${className}`}
      onClick={handleClick}
      disabled={!canResend || disabled}
      style={{
        background: 'none',
        border: 'none',
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: 600,
        cursor: canResend && !disabled ? 'pointer' : 'not-allowed',
        color: canResend && !disabled ? '#2563eb' : '#94a3b8',
        textDecoration: canResend && !disabled ? 'underline' : 'none'
      }}
    >
      {canResend ? label : `${label} in ${formatTime(secondsLeft)}`}
    </button>
  );
}

export function OtpExpiryTimer({ expiresAt, className = "" }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const targetTime = new Date(expiresAt).getTime();
    const now = Date.now();
    let remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
    setTimeLeft(remaining);

    if (remaining <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (timeLeft <= 0) {
    return (
      <span className={`otp-expired ${className}`} style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
        Code expired
      </span>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <span className={`otp-expiry-timer ${className}`} style={{ color: '#64748b', fontSize: 13 }}>
      Code expires in {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
}