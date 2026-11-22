"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/wallet", label: "Inicio", icon: "home" },
  { href: "/wallet/sessions", label: "Sesiones", icon: "layers" },
  { href: "/wallet/agents", label: "Agentes", icon: "agent" },
  { href: "/wallet/activity", label: "Actividad", icon: "trend" },
  { href: "/wallet/profile", label: "Perfil", icon: "user" },
];

export function BottomNav() {
  const pathname = usePathname();
  // El asistente de «Nuevo agente» ocupa toda la pantalla.
  if (pathname.startsWith("/wallet/agents/new")) return null;
  const active = tabs.findIndex((tab) => (tab.href === "/wallet" ? pathname === "/wallet" : pathname.startsWith(tab.href)));

  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="relative mx-auto max-w-md px-3 pt-2">
        {/* Un solo indicador que se desliza entre pestañas; en pantallas fuera de la barra se desvanece. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 left-3 h-14 w-[calc((100%-1.5rem)/5)] px-1 transition-[transform,opacity] duration-300 ease-(--ease-in-out) motion-reduce:transition-opacity"
          style={{ transform: `translateX(${Math.max(active, 0) * 100}%)`, opacity: active < 0 ? 0 : 1 }}
        >
          <span className="block size-full rounded-2xl bg-accent" />
        </span>
        <ul className="relative grid grid-cols-5">
          {tabs.map((tab, index) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={index === active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-sm transition-colors duration-200 ${index === active ? "text-ink" : "text-ivory"}`}
              >
                <Icon name={tab.icon} size={24} />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
