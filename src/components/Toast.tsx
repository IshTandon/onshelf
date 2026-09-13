"use client";

import { useSimulation } from "@/hooks/useSimulation";

export function ToastContainer() {
  const { toasts, dismissToast } = useSimulation();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-neutral-900 text-white text-xs px-3 py-2.5 mb-2 pointer-events-auto animate-slide-up motion-reduce:animate-none"
          onClick={() => dismissToast(toast.id)}
          role="status"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
