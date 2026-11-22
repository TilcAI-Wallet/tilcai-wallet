"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./Icon";
import { primaryButton, secondaryButton } from "./Screen";

const choiceKey = "tilcai_install_choice";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Lee en el cliente si la app ya está instalada y si la persona ya eligió seguir en la web. */
function readState() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return `${standalone}|${localStorage.getItem(choiceKey) ?? ""}|${/iphone|ipad|ipod/i.test(navigator.userAgent)}`;
}

export function InstallPrompt() {
  const state = useSyncExternalStore(
    () => () => undefined,
    readState,
    () => "server",
  );
  const [closed, setClosed] = useState(false);
  const [help, setHelp] = useState(false);
  const installEvent = useRef<InstallEvent | null>(null);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      installEvent.current = event as InstallEvent;
    };
    const installed = () => setClosed(true);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const [standalone, choice, ios] = state.split("|");
  if (state === "server" || closed || standalone === "true" || choice === "web") return null;

  function stayOnWeb() {
    localStorage.setItem(choiceKey, "web");
    setClosed(true);
  }

  async function install() {
    const event = installEvent.current;
    // shortcut: sin el evento del navegador (iOS, Firefox, o aún sin disparar) se muestran los pasos manuales.
    if (!event) return setHelp(true);
    await event.prompt();
    const { outcome } = await event.userChoice;
    installEvent.current = null;
    if (outcome === "accepted") setClosed(true);
  }

  return (
    <div className="install-backdrop fixed inset-0 z-50 flex items-end bg-ink/80">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="install-sheet mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-[2rem] border border-b-0 border-ivory/30 bg-ink px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
            <Icon name="phone" size={30} />
          </span>
          <div>
            <h2 id="install-title" className="text-2xl leading-tight">
              Instala TilcAI Wallet
            </h2>
            <p className="text-base text-ivory/75">Úsala como app en tu teléfono.</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2 text-base text-ivory/85">
          {["Abre con un toque desde tu pantalla de inicio", "Pantalla completa, sin barra del navegador", "Entra rápido con tu passkey"].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="text-mint">
                <Icon name="check" size={22} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        {help && (
          <p className="rounded-2xl border border-ivory/40 p-3 text-base" role="status">
            {ios === "true"
              ? "En Safari toca Compartir y luego «Agregar a pantalla de inicio»."
              : "En el menú del navegador (⋮) elige «Instalar app» o «Agregar a pantalla de inicio»."}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button type="button" autoFocus onClick={install} className={primaryButton}>
            Instalar app
          </button>
          <button type="button" onClick={stayOnWeb} className={secondaryButton}>
            Seguir en la web
          </button>
        </div>
      </section>
    </div>
  );
}
