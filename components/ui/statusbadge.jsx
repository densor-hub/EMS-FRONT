import React from 'react';

const StatusBadge = ({ status, className = '', heartbeat = true }) => {
  const statusConfig = {
    Pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300',
      dotBg: 'bg-amber-400',
    },
    Approved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      dotBg: 'bg-emerald-400',
    },
    Delivered: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      dotBg: 'bg-emerald-400',
    },
    Success: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      dotBg: 'bg-emerald-400',
    },
    Declined: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-300',
      dotBg: 'bg-rose-400',
    },
    Completed: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-300',
      dotBg: 'bg-sky-400',
    }
  };

  const config = statusConfig[status] || statusConfig.Declined;

  // Inline keyframe animation styles
  const pulseStyles = {
    '@keyframes pulse': {
      '0%': { transform: 'scale(0.8)', opacity: 0.8 },
      '30%': { transform: 'scale(1.8)', opacity: 0.2 },
      '60%': { transform: 'scale(1)', opacity: 0.5 },
      '100%': { transform: 'scale(0.8)', opacity: 0.8 }
    },
    animation: 'pulse 1.2s ease-in-out infinite'
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 sm:gap-2.5
      px-2 py-1 sm:px-2 sm:py-1
      rounded-full
      text-xs sm:text-sm font-semibold
      ${config.bg}
      ${config.text}
      ${config.border}
      border-2
      shadow-md
      ${className}
    `}>
      {heartbeat && (
        <span className="relative flex h-2 w-2 sm:h-3 sm:w-3">
          <span
            className={`
              absolute inline-flex h-full w-full
              rounded-full
              ${config.dotBg}
              opacity-60
            `}
            style={{
              animation: 'pulse-ring 1.2s ease-in-out infinite',
            }}
          />
          <span
            className={`
              relative inline-flex rounded-full
              h-2 w-2 sm:h-3 sm:w-3
              ${config.dotBg}
            `}
            style={{
              animation: 'heartbeat 1.2s ease-in-out infinite',
            }}
          />
        </span>
      )}
      {status}
    </span>
  );
};

// Add styles once globally
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 0.8; }
      30% { transform: scale(1.8); opacity: 0.2; }
      60% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(0.8); opacity: 0.8; }
    }
    
    @keyframes heartbeat {
      0% { transform: scale(1); }
      14% { transform: scale(1.4); }
      28% { transform: scale(1); }
      42% { transform: scale(1.4); }
      70% { transform: scale(1); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default StatusBadge;