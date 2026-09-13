"use client";

import { useSimulation } from "@/hooks/useSimulation";

export function ToastContainer() {
  const { toasts, dismissToast } = useSimulation();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-neutral-900 text-white text-sm px-4 py-3 rounded shadow-lg pointer-events-auto animate-slide-up motion-reduce:animate-none"
          onClick={() => dismissToast(toast.id)}
          role="status"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
