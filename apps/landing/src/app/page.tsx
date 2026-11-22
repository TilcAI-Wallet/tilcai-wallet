import { projectName } from "@tilcai-wallet/config";
import { LandingHeader, LandingHero } from "./landing-hero";
import { Walkthrough } from "./walkthrough/walkthrough";
import { ChannelStory } from "./channels/channel-story";

// shortcut: points to the GitHub org until the team has a pilot form or contact email.
const pilotUrl = "https://github.com/TilcAI-Wallet";
const repoUrl = "https://github.com/TilcAI-Wallet/tilcai-wallet";

export default function Landing() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <Walkthrough />

        <ChannelStory />

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
