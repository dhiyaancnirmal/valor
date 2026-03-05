import type { Metadata } from "next"
import Link from "next/link"
import path from "node:path"
import { access } from "node:fs/promises"

export const metadata: Metadata = {
  title: "Valor Showcase",
  description: "World Build 2 project showcase and product story for Valor.",
}

type Shot = {
  file: string
  title: string
  caption: string
}

const shots: Shot[] = [
  {
    file: "01-login-en.png",
    title: "Login",
    caption: "World App sign-in screen with secure wallet auth.",
  },
  {
    file: "02-home-en.png",
    title: "Home",
    caption: "Nearby stations, live coverage panel, and clear action cards.",
  },
  {
    file: "03-submit-review-en.png",
    title: "Submit Review",
    caption: "Product + price confirmation before submission.",
  },
  {
    file: "04-wallet-en.png",
    title: "Wallet",
    caption: "Settlement-ready balance and wallet summary.",
  },
  {
    file: "05-showcase-en.png",
    title: "Showcase",
    caption: "Narrative-driven product summary for public sharing.",
  },
  {
    file: "06-home-es-ar.png",
    title: "Spanish Hero",
    caption: "Localized experience for Argentina users.",
  },
]

async function hasPublicFile(file: string) {
  try {
    await access(path.join(process.cwd(), "public", "showcase", file))
    return true
  } catch {
    return false
  }
}

export default async function ShowcasePage() {
  const availability = await Promise.all(
    shots.map(async (shot) => ({
      ...shot,
      exists: await hasPublicFile(shot.file),
    }))
  )

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
            Valor: from rough hackathon build to a polished mini app story
          </h1>
          <p className="mt-6 max-w-3xl text-base text-white/85 sm:text-lg">
            A World Mini App for crowdsourced gas prices, transparent local market data, and trusted community reporting.
            Built in a sprint, now refined for product-level presentation.
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
          <h2 className="mt-2 text-xl font-bold">Polished Product Story</h2>
          <p className="mt-3 text-sm text-black/70">
            Secure auth, cleaner UI, and a publication-ready narrative with in-app screenshots.
          </p>
        </article>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-bold">App in use</h3>
          <p className="mt-2 text-sm text-black/65">
            Real World App captures from the core product flow.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {availability.map((shot) => (
              <figure key={shot.file} className="rounded-2xl border border-black/10 bg-[#f7f8fb] overflow-hidden">
                {shot.exists ? (
                  <img src={`/showcase/${shot.file}`} alt={shot.title} className="w-full h-[360px] object-cover" />
                ) : (
                  <div className="h-[360px] flex items-center justify-center text-center px-6 bg-gradient-to-br from-[#edf6e6] to-[#f6f8fc]">
                    <div>
                      <p className="text-sm font-semibold text-[#1b1f2a]">Missing screenshot</p>
                      <p className="text-xs text-black/60 mt-1">Drop file in `/public/showcase/{shot.file}`</p>
                    </div>
                  </div>
                )}
                <figcaption className="p-4">
                  <p className="text-sm font-semibold text-[#121316]">{shot.title}</p>
                  <p className="text-xs text-black/65 mt-1">{shot.caption}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
