"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { login, renameOwner } from "@/app/actions";
import { createPasskey, describeDevice, verifyPasskey } from "@/lib/passkey";
import { isStellarSecret } from "@/lib/stellar";
import { parseUsername } from "@/lib/username";
import { Icon, type IconName } from "./Icon";
import { QrArt } from "./QrArt";
import { primaryButton, secondaryButton } from "./Screen";
import { Banner, Field, input } from "./ui";

const methods: { id: string; icon: IconName; title: string; detail: string; badge?: string }[] = [
  { id: "passkey", icon: "fingerprint", title: "Passkey", detail: "Inicio rápido con huella o rostro", badge: "Recomendado" },
  { id: "key", icon: "key", title: "Llave privada", detail: "Importa una clave existente" },
  { id: "phrase", icon: "list", title: "Frase de recuperación", detail: "Restaura tu cuenta con 12 o 24 palabras" },
  { id: "device", icon: "scan", title: "Conectar dispositivo", detail: "Usa QR o vinculación segura" },
];

export function ConnectOptions({ returning }: { returning: boolean }) {
  return (
    <>
      <nav aria-label="Método de acceso" className="flex flex-col gap-2.5">
        {methods.map((method) => (
          <Link
            key={method.id}
            href={method.id === "passkey" ? (returning ? "/passkey?mode=login" : "/passkey") : `/connect/${method.id}`}
            className="flex min-h-16 items-center gap-3 rounded-full border border-ivory/60 px-3 text-left active:border-accent active:bg-accent/10"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
              <Icon name={method.icon} size={26} />
            </span>
            <span className="h-8 w-px bg-ivory/40" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center justify-between gap-2">
                <span className="text-lg">{method.title}</span>
                {method.badge && <span className="rounded-full bg-mint px-2.5 py-0.5 text-sm text-ink">{method.badge}</span>}
              </span>
              <span className="text-sm text-ivory/80">{method.detail}</span>
            </span>
          </Link>
        ))}
      </nav>
      <Link href="/" className={secondaryButton}>
        Volver
      </Link>
    </>
  );
}

type Phase = "idle" | "working" | "cancelled" | "error" | "none" | "done";

export function PasskeyFlow({ mode, hasSession }: { mode: "create" | "login"; hasSession: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const userAgent = useSyncExternalStore(
    () => () => undefined,
    () => navigator.userAgent,
    () => "",
  );
  const device = describeDevice(userAgent);

  const parsed = parseUsername(username);

  async function run() {
    if (mode === "create" && !parsed.ok) return setTouched(true);
    setPhase("working");
    setNote(null);
    const result = mode === "create" && parsed.ok ? await createPasskey(parsed.value) : await verifyPasskey();
    if (!result.ok) return setPhase(result.reason);
    if (result.simulated) setNote("Este navegador no admite passkeys reales; se simuló la verificación.");
    setPhase("done");
    if (mode === "create" && parsed.ok) {
      if (hasSession) await renameOwner(parsed.value);
      else await login("passkey", parsed.value);
    } else if (!hasSession) await login("passkey");
    setTimeout(() => router.push("/wallet"), result.simulated ? 1400 : 500);
  }

  const busy = phase === "working" || phase === "done";
  return (
    <>
      {mode === "create" && (
        <Field
          label="Nombre de usuario"
          hint="Tu passkey se crea con este nombre."
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          placeholder="ej. ana.paz"
          disabled={busy}
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/s/g, ""))}
          onBlur={() => setTouched(true)}
          error={touched && !parsed.ok ? parsed.error : null}
        />
      )}
      {mode === "create" && (
        <dl className="divide-y divide-ivory/25 rounded-3xl border border-ivory/70 px-4">
          {[
            { icon: "phone" as const, label: "Dispositivo", value: device.device },
            { icon: "face" as const, label: "Método", value: device.method },
            { icon: "cloud" as const, label: "Respaldo", value: device.backup },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-2">
              <span className="text-accent">
                <Icon name={row.icon} size={26} />
              </span>
              <dt className="w-24 shrink-0 text-sm text-ivory/75">{row.label}</dt>
              <dd className="flex-1 text-base">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {phase === "cancelled" && <Banner tone="error">Cancelaste la verificación del dispositivo. Inténtalo de nuevo cuando quieras.</Banner>}
      {phase === "error" && <Banner tone="error">No pudimos usar el passkey en este dispositivo. Revisa que tenga bloqueo de pantalla activo e inténtalo otra vez.</Banner>}
      {phase === "none" && <Banner tone="info">Este dispositivo no tiene un passkey de Tilcai. Crea uno nuevo para continuar.</Banner>}
      {phase === "done" && <Banner tone="ok">{mode === "create" ? "Passkey creado. Abriendo tu wallet…" : "Verificado. Abriendo tu wallet…"}</Banner>}
      {note && <Banner tone="info">{note}</Banner>}
      <div className="flex flex-col gap-3">
        <button type="button" disabled={busy || (mode === "create" && !parsed.ok)} onClick={run} className={`${primaryButton} disabled:opacity-50`}>
          {phase === "working" ? "Esperando a tu dispositivo…" : mode === "create" ? "Crear passkey" : "Usar passkey"}
        </button>
        {mode === "login" && phase === "none" && (
          <Link href="/passkey" className={secondaryButton}>
            Crear passkey nuevo
          </Link>
        )}
        <Link href={hasSession ? "/wallet" : "/connect"} className={secondaryButton}>
          {hasSession ? "Más tarde" : "Volver"}
        </Link>
      </div>
    </>
  );
}

export function KeyImport() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!isStellarSecret(secret)) return setError("La llave no es válida. Una llave privada de Stellar empieza con S y tiene 56 caracteres.");
    if (!agree) return setError("Confirma que entiendes el riesgo para continuar.");
    setBusy(true);
    setSecret("");
    await login("key");
    router.push("/passkey?next=protect");
  }

  return (
    <>
      <Banner tone="info">Tu llave se valida solo en este dispositivo: no se envía ni se guarda. Nunca la compartas con nadie.</Banner>
      <div className="flex flex-col gap-2">
        <Field
          label="Llave privada (S…)"
          name="secret"
          className={`${input} font-data`}
          type={show ? "text" : "password"}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value.trim().toUpperCase());
            setError(null);
          }}
          error={error}
          hint={secret ? `${secret.length}/56 caracteres` : undefined}
        />
        <button type="button" onClick={() => setShow((value) => !value)} className="flex min-h-11 w-fit items-center text-accent">
          {show ? "Ocultar llave" : "Mostrar llave"}
        </button>
      </div>
      <label className="flex min-h-11 items-start gap-3 text-base">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 accent-[#c8a6ff]" />
        Entiendo que quien tenga esta llave controla los fondos.
      </label>
      <div className="flex flex-col gap-3">
        <button type="button" disabled={busy} onClick={submit} className={`${primaryButton} disabled:opacity-70`}>
          {busy ? "Importando…" : "Importar wallet"}
        </button>
        <Link href="/connect" className={secondaryButton}>
          Volver
        </Link>
      </div>
    </>
  );
}

// shortcut: solo valida forma (cantidad de palabras, 3–8 letras minúsculas). No comprueba la lista BIP-39 ni el checksum;
// añadirlos cuando se derive la clave real.
const wordShape = /^[a-z]{3,8}$/;

export function PhraseImport() {
  const router = useRouter();
  const [count, setCount] = useState<12 | 24>(12);
  const [words, setWords] = useState<string[]>(Array(24).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setWord = (index: number, value: string) => {
    setError(null);
    const parts = value.toLowerCase().split(/[\s,]+/).filter(Boolean);
    setWords((current) => {
      const next = [...current];
      if (parts.length > 1) {
        parts.slice(0, 24).forEach((word, i) => (next[index + i] = i + index < 24 ? word : next[index + i]!));
        if (parts.length > 12) setCount(24);
      } else next[index] = parts[0] ?? "";
      return next;
    });
  };

  async function submit() {
    const used = words.slice(0, count);
    const bad = used.findIndex((word) => !wordShape.test(word));
    if (bad >= 0) return setError(`Revisa la palabra ${bad + 1}: debe tener entre 3 y 8 letras minúsculas.`);
    setBusy(true);
    setWords(Array(24).fill(""));
    await login("phrase");
    router.push("/passkey?next=protect");
  }

  return (
    <>
      <Banner tone="info">Escribe tus palabras en orden, o pega la frase completa en la primera casilla. Se procesa solo en este dispositivo.</Banner>
      <div role="radiogroup" aria-label="Longitud de la frase" className="flex gap-2">
        {([12, 24] as const).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={count === n}
            onClick={() => setCount(n)}
            className={`min-h-11 flex-1 rounded-full border text-base ${count === n ? "border-accent bg-accent text-ink" : "border-ivory/50"}`}
          >
            {n} palabras
          </button>
        ))}
      </div>
      <ol className="grid grid-cols-2 gap-2">
        {words.slice(0, count).map((word, i) => (
          <li key={i} className="flex items-center gap-2 rounded-2xl border border-ivory/30 px-3">
            <span className="w-6 text-sm text-muted">{i + 1}</span>
            <input
              aria-label={`Palabra ${i + 1}`}
              value={word}
              onChange={(e) => setWord(i, e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (/\s/.test(text.trim())) {
                  e.preventDefault();
                  setWord(i, text);
                }
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-11 w-full min-w-0 bg-transparent text-base focus:outline-none"
            />
          </li>
        ))}
      </ol>
      {error && <Banner tone="error">{error}</Banner>}
      <div className="flex flex-col gap-3">
        <button type="button" disabled={busy} onClick={submit} className={`${primaryButton} disabled:opacity-70`}>
          {busy ? "Restaurando…" : "Restaurar wallet"}
        </button>
        <Link href="/connect" className={secondaryButton}>
          Volver
        </Link>
      </div>
    </>
  );
}

const lifetime = 120;

export function DeviceLink() {
  const router = useRouter();
  const [round, setRound] = useState(1);
  const [left, setLeft] = useState(lifetime);
  const linked = left <= lifetime - 6;
  const code = `TL-${(round * 7919).toString(36).toUpperCase().padStart(4, "0")}-${(round * 104729 + 4242).toString(36).toUpperCase().slice(-4)}`;

  useEffect(() => {
    if (linked) return;
    const tick = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(tick);
  }, [linked, round]);

  // shortcut: el otro dispositivo se simula; vincula solo a los 6 s. Con el protocolo real, espera la aprobación remota.
  useEffect(() => {
    if (!linked) return;
    login("device").then(() => setTimeout(() => router.push("/wallet"), 1200));
  }, [linked, router]);

  const expired = left === 0 && !linked;
  return (
    <>
      <div className="mx-auto w-56">
        <div className={expired ? "opacity-30" : ""}>
          <QrArt seed={code} label={`Código QR de vinculación ${code}`} />
        </div>
      </div>
      <p className="text-center text-2xl tracking-widest">{code}</p>
      <ol className="flex flex-col gap-1 text-base text-ivory/80">
        <li>1. Abre Tilcai Wallet en tu otro dispositivo.</li>
        <li>2. Ve a Perfil → Vincular dispositivo.</li>
        <li>3. Escanea el código o escribe el código de arriba.</li>
      </ol>
      {linked ? (
        <Banner tone="ok">Dispositivo vinculado. Abriendo tu wallet…</Banner>
      ) : expired ? (
        <Banner tone="error">El código venció. Genera uno nuevo.</Banner>
      ) : (
        <Banner tone="info">
          Esperando confirmación del otro dispositivo… vence en {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </Banner>
      )}
      <div className="flex flex-col gap-3">
        {expired && (
          <button
            type="button"
            className={primaryButton}
            onClick={() => {
              setRound((value) => value + 1);
              setLeft(lifetime);
            }}
          >
            Generar código nuevo
          </button>
        )}
        <Link href="/connect" className={secondaryButton}>
          Volver
        </Link>
      </div>
    </>
  );
}
