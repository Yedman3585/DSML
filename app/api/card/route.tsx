import satori from "satori";
import { NextRequest } from "next/server";
import { loadDsmlIconDataUri } from "@/lib/assets";
import { loadFonts } from "@/lib/fonts";
import {
  CardError,
  fetchStreakStats,
  fetchProfileStats,
  fetchLanguages,
  isValidUsername,
  StreakStats,
  ProfileStats,
  LanguageStat,
} from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── Dimensions per card type ───────────────────────────────────── */

const SIZES: Record<string, { w: number; h: number }> = {
  streak: { w: 495, h: 195 },
  stats: { w: 495, h: 195 },
  languages: { w: 400, h: 320 },
  compact: { w: 400, h: 60 },
};

/* ── Demo data ──────────────────────────────────────────────────── */

const DEMO_STREAK: StreakStats = { totalContributions: 3585, currentStreak: 12, longestStreak: 86 };
const DEMO_PROFILE: ProfileStats = { stars: 142, commitsThisYear: 847, prs: 63, issues: 29, repos: 34 };
const DEMO_LANGS: LanguageStat[] = [
  { name: "Python", color: "#3572A5", size: 450000, percent: 38.2 },
  { name: "TypeScript", color: "#3178c6", size: 310000, percent: 26.3 },
  { name: "JavaScript", color: "#f1e05a", size: 150000, percent: 12.7 },
  { name: "Jupyter Notebook", color: "#DA5B0B", size: 120000, percent: 10.2 },
  { name: "HTML", color: "#e34c26", size: 80000, percent: 6.8 },
  { name: "CSS", color: "#563d7c", size: 40000, percent: 3.4 },
  { name: "Shell", color: "#89e051", size: 20000, percent: 1.7 },
  { name: "Dockerfile", color: "#384d54", size: 8000, percent: 0.7 },
];

/* ── Cache ──────────────────────────────────────────────────────── */

const CACHE_OK = "public, max-age=14400, s-maxage=14400, stale-while-revalidate=86400";
const CACHE_ERROR = "public, max-age=300, s-maxage=300";

/* ── Brand colors ───────────────────────────────────────────────── */

const C = {
  bg: "#0d1117",
  border: "#30363d",
  text: "#c9d1d9",
  muted: "#8b949e",
  white: "#ffffff",
  teal: "#0babc1",
  yellow: "#fdf22c",
  pink: "#f778ba",
  orange: "#f0883e",
  red: "#f85149",
  green: "#3fb950",
};

/* ── Shared components ──────────────────────────────────────────── */

function Shell({
  login,
  iconSrc,
  title,
  width,
  height,
  children,
}: {
  login: string;
  iconSrc: string;
  title: string;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 24,
        fontFamily: "Roboto",
        color: C.text,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: C.white }}>{title}</div>
          {login ? (
            <div style={{ display: "flex", marginTop: 4, fontSize: 14, color: C.muted }}>@{login}</div>
          ) : null}
        </div>
        <img src={iconSrc} width={42} height={42} alt="DSML KZ" style={{ borderRadius: 8 }} />
      </div>
      {children}
    </div>
  );
}

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  const display = typeof value === "number" ? value.toLocaleString("en-US") : value;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color }}>{display}</div>
      <div style={{ display: "flex", fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
      <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: C.red }}>{message}</div>
    </div>
  );
}

/* ── Card: Streak ───────────────────────────────────────────────── */

function StreakCard({ login, iconSrc, stats }: { login: string; iconSrc: string; stats: StreakStats }) {
  return (
    <Shell login={login} iconSrc={iconSrc} title="DSML Streak Card" width={SIZES.streak.w} height={SIZES.streak.h}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Stat value={stats.totalContributions} label="Total Contributions" color={C.pink} />
        <Stat value={stats.currentStreak} label="Current Streak" color={C.orange} />
        <Stat value={stats.longestStreak} label="Longest Streak" color={C.pink} />
      </div>
    </Shell>
  );
}

/* ── Card: Stats ────────────────────────────────────────────────── */

function StatsCard({ login, iconSrc, stats }: { login: string; iconSrc: string; stats: ProfileStats }) {
  return (
    <Shell login={login} iconSrc={iconSrc} title="DSML Stats Card" width={SIZES.stats.w} height={SIZES.stats.h}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Stat value={stats.stars} label="Stars Earned" color={C.yellow} />
        <Stat value={stats.commitsThisYear} label="Commits (Year)" color={C.green} />
        <Stat value={stats.prs} label="PRs Merged" color={C.teal} />
        <Stat value={stats.issues} label="Issues" color={C.orange} />
        <Stat value={stats.repos} label="Repos" color={C.pink} />
      </div>
    </Shell>
  );
}

/* ── Card: Languages ────────────────────────────────────────────── */

function LanguagesCard({ login, iconSrc, langs }: { login: string; iconSrc: string; langs: LanguageStat[] }) {
  const barHeight = 10;
  return (
    <Shell login={login} iconSrc={iconSrc} title="DSML Top Languages" width={SIZES.languages.w} height={SIZES.languages.h}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
        {/* progress bar */}
        <div style={{ display: "flex", width: "100%", height: barHeight, borderRadius: barHeight / 2, overflow: "hidden" }}>
          {langs.map((l, i) => (
            <div key={i} style={{ display: "flex", width: `${l.percent}%`, height: "100%", background: l.color }} />
          ))}
        </div>
        {/* legend grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {langs.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, width: "45%" }}>
              <div style={{ display: "flex", width: 10, height: 10, borderRadius: 5, background: l.color }} />
              <div style={{ display: "flex", fontSize: 12, color: C.text }}>{l.name}</div>
              <div style={{ display: "flex", fontSize: 12, color: C.muted }}>{l.percent}%</div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/* ── Card: Compact ──────────────────────────────────────────────── */

function CompactCard({
  login,
  iconSrc,
  stats,
}: {
  login: string;
  iconSrc: string;
  stats: StreakStats;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "100%",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "8px 16px",
        fontFamily: "Roboto",
        color: C.text,
        gap: 16,
      }}
    >
      <img src={iconSrc} width={28} height={28} alt="DSML" style={{ borderRadius: 4 }} />
      <div style={{ display: "flex", fontSize: 14, fontWeight: 700, color: C.white }}>@{login}</div>
      <div style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color: C.pink }}>
            {stats.totalContributions.toLocaleString("en-US")}
          </div>
          <div style={{ display: "flex", fontSize: 10, color: C.muted }}>contrib</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color: C.orange }}>
            {stats.currentStreak}
          </div>
          <div style={{ display: "flex", fontSize: 10, color: C.muted }}>streak</div>
        </div>
      </div>
    </div>
  );
}

/* ── Renderer ───────────────────────────────────────────────────── */

async function render(node: React.ReactNode, w: number, h: number, status: number, cache: string) {
  const svg = await satori(node as React.ReactElement, { width: w, height: h, fonts: loadFonts() });
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": cache,
      "X-Card-Status": String(status),
    },
  });
}

/* ── Route handler ──────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const login = sp.get("username")?.trim() ?? "";
  const isDemo = sp.get("demo") === "1";
  const type = sp.get("type") ?? "streak";
  const iconSrc = loadDsmlIconDataUri();

  const size = SIZES[type] ?? SIZES.streak;

  const fail = (message: string, status: number) =>
    render(
      <Shell login={isValidUsername(login) ? login : ""} iconSrc={iconSrc} title="DSML Card" width={size.w} height={size.h}>
        <ErrorRow message={message} />
      </Shell>,
      size.w,
      size.h,
      status,
      CACHE_ERROR
    );

  if (!login) return fail("Add ?username= to the URL", 400);
  if (!isValidUsername(login)) return fail("Invalid GitHub username", 400);

  try {
    switch (type) {
      case "streak": {
        const stats = isDemo ? DEMO_STREAK : await fetchStreakStats(login);
        return await render(<StreakCard login={login} iconSrc={iconSrc} stats={stats} />, size.w, size.h, 200, CACHE_OK);
      }
      case "stats": {
        const stats = isDemo ? DEMO_PROFILE : await fetchProfileStats(login);
        return await render(<StatsCard login={login} iconSrc={iconSrc} stats={stats} />, size.w, size.h, 200, CACHE_OK);
      }
      case "languages": {
        const langs = isDemo ? DEMO_LANGS : await fetchLanguages(login);
        return await render(<LanguagesCard login={login} iconSrc={iconSrc} langs={langs} />, size.w, size.h, 200, CACHE_OK);
      }
      case "compact": {
        const stats = isDemo ? DEMO_STREAK : await fetchStreakStats(login);
        return await render(<CompactCard login={login} iconSrc={iconSrc} stats={stats} />, size.w, size.h, 200, CACHE_OK);
      }
      default:
        return fail(`Unknown card type: ${type}`, 400);
    }
  } catch (err) {
    if (err instanceof CardError) return fail(err.message, err.status);
    console.error(err);
    return fail("Something went wrong", 500);
  }
}
