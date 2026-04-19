'use client';

import { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  duration?: number;
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast };
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
