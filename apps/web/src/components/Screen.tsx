import type { ReactNode } from "react";

/** Contenedor móvil común a las pantallas de entrada. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="enter-children mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}

export const primaryButton = "flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-5 text-xl text-ink";
export const secondaryButton = "flex min-h-12 w-full items-center justify-center rounded-full border border-ivory/80 px-5 text-xl text-ivory";
