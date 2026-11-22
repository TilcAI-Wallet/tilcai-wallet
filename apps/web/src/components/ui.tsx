import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export const card = "rounded-3xl border border-line bg-surface";
export const input =
  "min-h-12 w-full rounded-2xl border border-ivory/40 bg-transparent px-4 text-lg text-ivory placeholder:text-ivory/40 focus:border-accent focus:outline-none";

export function PageHeader({ title, back = "/wallet", children }: { title: string; back?: string | null; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      {back && (
        <Link href={back} className="flex min-h-11 w-fit items-center gap-1 text-accent">
          <span className="rotate-180">
            <Icon name="chevron" size={20} />
          </span>
          Volver
        </Link>
      )}
      <h1 className="text-4xl tracking-tight">{title}</h1>
      {children}
    </header>
  );
}

export function Field({ label, hint, error, ...props }: { label: string; hint?: string; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name ?? label;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base text-ivory/80">
        {label}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={input} {...props} />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-ivory">
          ✕ {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted">{hint}</p>
      )}
    </div>
  );
}

/** Aviso con texto (nunca solo color): `error` lleva borde marfil, `ok` fondo menta. */
export function Banner({ tone, children }: { tone: "ok" | "error" | "info"; children: ReactNode }) {
  const style = tone === "ok" ? "bg-mint text-ink" : tone === "error" ? "border border-ivory text-ivory" : "bg-mist text-ink";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-base ${style}`}>
      {tone === "ok" ? "✓ " : tone === "error" ? "✕ " : ""}
      {children}
    </p>
  );
}

export function ListRow({ href, icon, title, detail, value }: { href: string; icon: IconName; title: string; detail?: string; value?: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-ivory/10">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent">
        <Icon name={icon} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg">{title}</span>
        {detail && <span className="text-sm text-muted">{detail}</span>}
      </span>
      {value && <span className="text-base text-muted">{value}</span>}
      <Icon name="chevron" size={20} />
    </Link>
  );
}

export const Page = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</main>
);
