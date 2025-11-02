'use client';
import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: '✅',
      text: 'text-green-800'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '❌',
      text: 'text-red-800'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: '⚠️',
      text: 'text-yellow-800'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'ℹ️',
      text: 'text-blue-800'
    }
  };

  const styles = typeStyles[toast.type];

  return (
    <div
      className={`${styles.bg} ${styles.border} border-l-4 rounded-lg shadow-lg p-4 mb-3 animate-slide-in-right flex items-start justify-between min-w-[300px] max-w-md`}
      role="alert"
    >
      <div className="flex items-start">
        <span className="text-xl mr-3">{styles.icon}</span>
        <p className={`${styles.text} font-medium`}>{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className={`${styles.text} ml-4 opacity-70 hover:opacity-100 transition-opacity`}
        aria-label="Close notification"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Toast;

