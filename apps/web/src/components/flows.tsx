"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { fundWallet, sendTransfer } from "@/app/actions";
import { formatUsdc, parseUsdc } from "@/lib/money";
import { verifyPasskey } from "@/lib/passkey";
import { isStellarAddress, shortKey } from "@/lib/stellar";
import { primaryButton, secondaryButton } from "./Screen";
import { Banner, Field, input } from "./ui";

const btn = primaryButton.replace("min-h-12", "min-h-14");

function ReviewTable({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-ivory/20 rounded-3xl border border-ivory/60 px-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 py-3">
          <dt className="text-base text-muted">{label}</dt>
          <dd className={`break-all text-right text-base ${/^[GS][A-Z2-7]{55}$|^[0-9a-f]{64}$|XLM/.test(value) ? "font-data" : ""}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Done({ title, children, id }: { title: string; children?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Banner tone="ok">{title}</Banner>
      {children}
      <Link href={id ? `/wallet/activity/${id}` : "/wallet/activity"} className={btn}>
        Ver detalle
      </Link>
      <Link href="/wallet" className={secondaryButton}>
        Volver al inicio
      </Link>
    </div>
  );
}

export function FundFlow({ address }: { address: string }) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const atomic = parseUsdc(amount);

  if (step === "done") return <Done id={id} title={`Fondeo confirmado: ${formatUsdc(atomic!)} acreditados.`} />;

  if (step === "review")
    return (
      <>
        <ReviewTable
          rows={[
            ["Red", "Stellar Testnet"],
            ["Origen", "Faucet de Testnet"],
            ["Destino", `Tu wallet · ${shortKey(address)}`],
            ["Monto", formatUsdc(atomic!)],
            ["Comisión", "Sin costo (la cubre el faucet)"],
          ]}
        />
        {error && <Banner tone="error">{error}</Banner>}
        <button
          type="button"
          disabled={pending}
          className={`${btn} disabled:opacity-60`}
          onClick={() =>
            start(async () => {
              const result = await fundWallet(amount);
              if (!result.ok) return setError(result.error);
              setId(result.id);
              setStep("done");
              router.refresh();
            })
          }
        >
          {pending ? "Fondeando…" : "Confirmar fondeo"}
        </button>
        <button type="button" onClick={() => setStep("form")} className={secondaryButton}>
          Editar monto
        </button>
      </>
    );

  return (
    <>
      <Banner tone="info">Estás en Testnet: son USDC de prueba que entrega el faucet, sin valor real.</Banner>
      <div className="flex flex-wrap gap-2">
        {["5", "10", "20", "50", "100"].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setAmount(preset);
              setError(null);
            }}
            className={`min-h-11 rounded-full border px-4 text-base ${amount === preset ? "border-accent bg-accent text-ink" : "border-ivory/50"}`}
          >
            {preset} USDC
          </button>
        ))}
      </div>
      <Field
        label="Monto en USDC"
        name="amount"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          setError(null);
        }}
        error={error}
      />
      <button
        type="button"
        className={btn}
        onClick={() => {
          if (!atomic) return setError("Escribe un monto válido, por ejemplo 10 o 10,50.");
          if (BigInt(atomic) > 1_000n * 10_000_000n) return setError("El faucet de Testnet entrega hasta 1.000 USDC por vez.");
          setStep("review");
        }}
      >
        Revisar
      </button>
    </>
  );
}

export function TransferFlow({ balance, requirePasskey }: { balance: string; requirePasskey: boolean }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<{ to?: string; amount?: string; form?: string }>({});
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [id, setId] = useState<string>();
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const atomic = parseUsdc(amount);

  function review() {
    const next: typeof errors = {};
    if (!isStellarAddress(to)) next.to = "La dirección no es válida. Debe empezar con G y tener 56 caracteres.";
    if (!atomic) next.amount = "Escribe un monto válido, por ejemplo 10 o 10,50.";
    else if (BigInt(atomic) > BigInt(balance)) next.amount = `Saldo insuficiente. Tienes ${formatUsdc(balance)}.`;
    setErrors(next);
    if (!next.to && !next.amount) setStep("review");
  }

  if (step === "done")
    return (
      <Done id={id} title={`Enviaste ${formatUsdc(atomic!)} a ${shortKey(to.trim())}.`}>
        {note && <Banner tone="info">{note}</Banner>}
      </Done>
    );

  if (step === "review")
    return (
      <>
        <p className="text-base text-muted">Revisa los detalles antes de confirmar.</p>
        <ReviewTable
          rows={[
            ["Red", "Stellar Testnet"],
            ["Destino", to.trim()],
            ["Monto", formatUsdc(atomic!)],
            ["Comisión de red (estimada)", "≈ 0,00001 XLM"],
            ["Recibe", formatUsdc(atomic!)],
          ]}
        />
        {errors.form && <Banner tone="error">{errors.form}</Banner>}
        <button
          type="button"
          disabled={pending}
          className={`${btn} disabled:opacity-60`}
          onClick={() =>
            start(async () => {
              setErrors({});
              if (requirePasskey) {
                const check = await verifyPasskey();
                if (!check.ok && check.reason === "cancelled") return setErrors({ form: "Cancelaste la verificación. No se envió nada." });
                if (!check.ok && check.reason === "error") return setErrors({ form: "No pudimos verificar tu passkey. No se envió nada." });
                if (!check.ok || check.simulated) setNote("La verificación con passkey se simuló en este dispositivo.");
              }
              const result = await sendTransfer(to, amount);
              if (!result.ok) return setErrors({ form: result.error });
              setId(result.id);
              setStep("done");
              router.refresh();
            })
          }
        >
          {pending ? "Enviando…" : requirePasskey ? "Confirmar con passkey" : "Confirmar envío"}
        </button>
        <button type="button" onClick={() => setStep("form")} className={secondaryButton}>
          Editar
        </button>
      </>
    );

  return (
    <>
      <Banner tone="info">Disponible: {formatUsdc(balance)} en Stellar Testnet.</Banner>
      <Field
        label="Dirección de destino"
        name="to"
        className={`${input} font-data`}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="G…"
        value={to}
        onChange={(e) => {
          setTo(e.target.value.trim().toUpperCase());
          setErrors((current) => ({ ...current, to: undefined }));
        }}
        error={errors.to}
      />
      <div className="flex flex-col gap-2">
        <Field
          label="Monto en USDC"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrors((current) => ({ ...current, amount: undefined }));
          }}
          error={errors.amount}
        />
        <button
          type="button"
          className="flex min-h-11 w-fit items-center text-accent"
          onClick={() => setAmount(formatUsdc(balance).replace(" USDC", "").replace(/\./g, ""))}
        >
          Usar el máximo
        </button>
      </div>
      <button type="button" className={btn} onClick={review}>
        Revisar envío
      </button>
    </>
  );
}

export function CopyAddress({ address }: { address: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="flex flex-col gap-3">
      <p className="font-data break-all rounded-2xl border border-ivory/40 p-4 text-lg">{address}</p>
      <button
        type="button"
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setState("copied");
          } catch {
            setState("failed");
          }
        }}
      >
        Copiar dirección
      </button>
      {canShare && (
        <button type="button" className={secondaryButton} onClick={() => navigator.share({ title: "Mi dirección Tilcai", text: address }).catch(() => undefined)}>
          Compartir
        </button>
      )}
      {state === "copied" && <Banner tone="ok">Dirección copiada.</Banner>}
      {state === "failed" && <Banner tone="error">No se pudo copiar. Mantén presionada la dirección para copiarla.</Banner>}
    </div>
  );
}
