import { useEffect, useRef, useState } from "react";

export function OtpInput({ value, onChange, disabled, autoFocus = true, length = 6 }) {
  const inputsRef = useRef([]);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [value, autoFocus]);

  const handleChange = (index, char) => {
    if (disabled) return;
    
    const newValue = displayValue.split('');
    newValue[index] = char;
    const joined = newValue.join('');
    setDisplayValue(joined);
    onChange?.(joined);

    // Move to next input
    if (char && index < length - 1 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (disabled) return;

    if (event.key === 'Backspace' && !displayValue[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    if (disabled) return;
    event.preventDefault();
    const paste = (event.clipboardData || window.clipboardData).getData('text');
    const digits = paste.replace(/\D/g, '').slice(0, length);
    if (digits.length > 0) {
      setDisplayValue(digits.padEnd(length, ''));
      onChange?.(digits);
      // Focus last filled input or next empty
      const lastIndex = Math.min(digits.length, length - 1);
      inputsRef.current[lastIndex]?.focus();
    }
  };

  return (
    <div 
      className="otp-input-container" 
      style={{ 
        display: 'flex', 
        gap: 8, 
        justifyContent: 'center',
        width: '100%',
        maxWidth: 360
      }}
      onPaste={handlePaste}
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={displayValue[i] || ''}
          onChange={(e) => handleChange(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoComplete="one-time-code"
          style={{
            width: 48,
            height: 56,
            fontSize: 24,
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '0.1em',
            border: '2px solid #cbd5e1',
            borderRadius: 10,
            outline: 'none',
            background: disabled ? '#f1f5f9' : '#fff',
            color: '#0f172a',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: displayValue[i] ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
          }}
        />
      ))}
    </div>
  );
}