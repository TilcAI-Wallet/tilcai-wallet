import { projectName } from "@tilcai-wallet/config";
import { LandingHeader, LandingHero } from "./landing-hero";

// shortcut: points to the GitHub org until the team has a pilot form or contact email.
const pilotUrl = "https://github.com/TilcAI-Wallet";
const repoUrl = "https://github.com/TilcAI-Wallet/tilcai-wallet";

const steps = [
  {
    title: "Fondeas una tarjeta",
    body: "Creas una tarjeta para un agente o un proyecto y le cargas saldo. Ese dinero queda separado del resto de tu cuenta.",
  },
  {
    title: "Fijas el tope",
    body: "Decides cuánto puede gastar, dónde y hasta cuándo. El contrato en Stellar rechaza cualquier pago que se pase del límite.",
  },
  {
    title: "El agente compra",
    body: "Paga datos e informes por su cuenta. Si necesita más, te pide un aumento y tú lo apruebas con tu passkey.",
  },
  {
    title: "Recibes el recibo",
    body: "Cada compra enlaza permiso, orden, pago y entrega en un solo recibo que puedes mostrarle a tu cliente.",
  },
];

const controls = [
  { title: "Congelar", body: "Pausas la tarjeta y ningún pago nuevo pasa." },
  { title: "Revocar", body: "Cierras la tarjeta para siempre y se concilia lo que estaba en curso." },
  { title: "Recuperar saldo", body: "Devuelves lo que sobra a tu cuenta principal con tu aprobación." },
  { title: "Ver saldo y disponible", body: "Sabes cuánto hay en la tarjeta y cuánto puede gastar el agente ahora mismo." },
];

const channels = ["Web", "App móvil", "Extensión de navegador", "MCP para agentes", "Telegram", "WhatsApp", "Terminal"];

export default function Landing() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-6 px-6 pt-14 pb-24 md:px-10">
          <h2 className="max-w-xl text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">Cómo funciona</h2>
          <ol className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title} className="border-t-2 border-ink pt-5">
                <span className="text-sm font-semibold text-violet">Paso {i + 1}</span>
                <h3 className="mt-2 text-xl font-bold tracking-tight">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-paper">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-[1fr_1.4fr] md:px-10">
            <div>
              <h2 className="text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">Lo detienes cuando quieras</h2>
              <p className="mt-5 max-w-sm leading-relaxed text-muted">
                El agente nunca tiene acceso a tu cuenta principal. Todo se controla desde tu celular.
              </p>
            </div>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {controls.map((control) => (
                <div key={control.title}>
                  <dt className="text-lg font-bold">{control.title}</dt>
                  <dd className="mt-1 leading-relaxed text-muted">{control.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="canales" className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <h2 className="text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">Donde ya trabajas</h2>
          <p className="mt-5 max-w-xl leading-relaxed text-muted">
            La misma wallet y los mismos recibos, sin importar desde dónde se use.
          </p>
          <ul className="mt-10 flex flex-wrap gap-3">
            {channels.map((channel) => (
              <li key={channel} className="rounded-full border border-line bg-paper px-5 py-2.5 font-medium">
                {channel}
              </li>
            ))}
          </ul>
        </section>

        <section id="piloto" className="on-violet mx-auto mb-24 max-w-6xl px-6 md:px-10">
          <div className="bg-violet-deep px-8 py-14 text-paper md:px-14 md:py-20">
            <h2 className="max-w-2xl text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">Piloto con agencias de La Paz</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper/85">
              Buscamos agencias de automatización con IA y freelancers que compran datos o informes para sus clientes. El
              piloto corre en Stellar testnet y el plan previsto es una suscripción mensual por agencia.
            </p>
            <a href={pilotUrl} className="mt-9 inline-block rounded-full bg-paper px-6 py-3 font-semibold text-violet-deep hover:bg-sand">
              Solicitar el piloto
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted md:px-10">
          <span>{projectName}. Hecho en La Paz, sobre Stellar.</span>
          <a href={repoUrl} className="font-medium text-ink underline underline-offset-4 hover:text-violet">
            Código en GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
