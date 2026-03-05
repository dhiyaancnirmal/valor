import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Valor Showcase",
  description: "World Build 2 project showcase and product story for Valor.",
}

export default function ShowcasePage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#121316]">
      <section className="relative overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#0f172a] via-[#1f2937] to-[#334155] text-white">
        <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#7DD756]/30 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-[#22d3ee]/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 py-20">
          <p className="mb-4 inline-flex rounded-full border border-white/20 px-4 py-1 text-xs tracking-[0.2em] uppercase">
            World Build 2
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Valor: from rough hackathon build to a serious product narrative
          </h1>
          <p className="mt-6 max-w-3xl text-base text-white/85 sm:text-lg">
            A World Mini App for crowdsourced gas prices, rewards, and transparent local market data.
            Built in a sprint, refined for real users.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-[#7DD756] px-5 py-2.5 text-sm font-semibold text-[#0f172a] transition hover:scale-[1.02]"
            >
              Open Mini App
            </Link>
            <a
              href="https://github.com/dhiyaancnirmal/valor"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-12 sm:grid-cols-3">
        <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/55">Outcome</p>
          <h2 className="mt-2 text-xl font-bold">World Build 2 Winner</h2>
          <p className="mt-3 text-sm text-black/70">
            The prototype earned recognition despite rough edges, validating the core idea and execution speed.
          </p>
        </article>
        <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/55">Experience</p>
          <h2 className="mt-2 text-xl font-bold">Buenos Aires Trip</h2>
          <p className="mt-3 text-sm text-black/70">
            The team was flown to Argentina and connected with builders in the World ecosystem.
          </p>
        </article>
        <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/55">Now</p>
          <h2 className="mt-2 text-xl font-bold">Cleanup + Hardening</h2>
          <p className="mt-3 text-sm text-black/70">
            Repo, auth, rewards, and UX are being rebuilt into something production-grade and presentable.
          </p>
        </article>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-bold">What this app does</h3>
          <ul className="mt-5 space-y-3 text-sm text-black/80">
            <li>Collects gas prices from nearby stations with geolocation checks.</li>
            <li>Supports wallet authentication through World MiniKit.</li>
            <li>Tracks rewards and claim flows backed by on-chain contracts.</li>
            <li>Runs bilingual UX for English and Spanish (Argentina).</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
