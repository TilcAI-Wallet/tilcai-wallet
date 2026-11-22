"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { Result } from "@/app/actions";
import { Banner } from "./ui";

/** Interruptor accesible. Cambia al instante y vuelve atrás si la acción falla. */
export function Toggle({ label, detail, on, onChange }: { label: string; detail?: string; on: boolean; onChange: (next: boolean) => Promise<Result> }) {
  const [value, setValue] = useState(on);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1 px-4 py-2">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-lg">{label}</span>
          {detail && <span className="text-sm text-muted">{detail}</span>}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={label}
          disabled={pending}
          onClick={() => {
            const next = !value;
            setValue(next);
            setError(null);
            start(async () => {
              const result = await onChange(next);
              if (!result.ok) {
                setValue(!next);
                setError(result.error);
              } else router.refresh();
            });
          }}
          className={`relative h-8 w-14 shrink-0 rounded-full ${value ? "bg-accent" : "bg-ivory/25"}`}
        >
          <span className={`absolute top-1 size-6 rounded-full ${value ? "right-1 bg-ink" : "left-1 bg-ivory"}`} />
          <span className="sr-only">{value ? "Activado" : "Desactivado"}</span>
        </button>
      </div>
      {error && <Banner tone="error">{error}</Banner>}
    </div>
  );
}

/** Botón que ejecuta una acción del servidor y muestra el resultado con texto. */
export function ActionButton({
  action,
  children,
  busy = "Procesando…",
  className,
  confirm,
  onDone,
}: {
  action: () => Promise<Result>;
  children: ReactNode;
  busy?: string;
  className: string;
  confirm?: string;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        className={`${className} disabled:opacity-60`}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const result = await action();
            if (!result.ok) setError(result.error);
            else {
              router.refresh();
              onDone?.();
            }
          });
        }}
      >
        {pending ? busy : children}
      </button>
      {error && <Banner tone="error">{error}</Banner>}
    </div>
  );
}
