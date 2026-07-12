import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { Flow } from './components/Flow';
import { Features } from './components/Features';
import { Stats } from './components/Stats';
import { CodeShowcase } from './components/CodeShowcase';
import { CTA, Footer } from './components/Closing';

export function Landing() {
  return (
    <div className="grain relative min-h-screen bg-paper">
      <a
        href="#code"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Flow />
        <Features />
        <Stats />
        <CodeShowcase />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
