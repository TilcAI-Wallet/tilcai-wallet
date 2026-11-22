import { LandingHeader, LandingHero } from "./landing-hero";
import { Walkthrough } from "./walkthrough/walkthrough";
import { ChannelStory } from "./channels/channel-story";
import { PilotSection } from "./pilot-section";
import { ProjectFooter } from "./project-footer";

export default function Landing() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <Walkthrough />

        <ChannelStory />
        <PilotSection />
      </main>

      <ProjectFooter />
    </>
  );
}
