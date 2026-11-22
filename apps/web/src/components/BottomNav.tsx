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
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between px-3 pt-2">
        {tabs.map((tab) => {
          const on = tab.href === "/wallet" ? pathname === "/wallet" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-sm ${on ? "bg-accent text-ink" : "text-ivory"}`}
              >
                <Icon name={tab.icon} size={24} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
