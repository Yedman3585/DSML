import satori from "satori";
import { NextRequest } from "next/server";
import { loadDsmlIconDataUri } from "@/lib/assets";
import { loadFonts } from "@/lib/fonts";
import { CardError, fetchGithubStats, GithubStats, isValidUsername } from "@/lib/github";

// Node.js runtime is required because Satori reads local font and icon files.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 495;
const HEIGHT = 195;
const DEMO_STATS: GithubStats = {
  totalContributions: 3585,
  currentStreak: 12,
  longestStreak: 86,
};

// Successful cards: 4h on the CDN, then serve stale for up to a day while refreshing.
const CACHE_OK = "public, max-age=14400, s-maxage=14400, stale-while-revalidate=86400";
// Error cards: short cache so a fixed problem disappears quickly.
const CACHE_ERROR = "public, max-age=300, s-maxage=300";

function Shell({ login, iconSrc, children }: { login: string; iconSrc: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: "#0d1117",
        border: "1px solid #30363d",
        borderRadius: 12,
        padding: 24,
        fontFamily: "Roboto",
        color: "#c9d1d9",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#fff" }}>DSML GitHub Card</div>
          {login ? (
            <div style={{ display: "flex", marginTop: 4, fontSize: 14, color: "#8b949e" }}>@{login}</div>
          ) : null}
        </div>
        <img src={iconSrc} width={54} height={54} alt="DSML KZ" style={{ borderRadius: 8 }} />
      </div>
      {children}
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 140 }}>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color }}>{value.toLocaleString("en-US")}</div>
      <div style={{ display: "flex", fontSize: 12, color }}>{label}</div>
    </div>
  );
}

function StatsRow({ stats }: { stats: GithubStats }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <Stat value={stats.totalContributions} label="Total Contributions" color="#f778ba" />
      <Stat value={stats.currentStreak} label="Current Streak" color="#f0883e" />
      <Stat value={stats.longestStreak} label="Longest Streak" color="#f778ba" />
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
      <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: "#f85149" }}>{message}</div>
    </div>
  );
}

async function render(node: React.ReactNode, status: number, cache: string) {
  const svg = await satori(node as React.ReactElement, { width: WIDTH, height: HEIGHT, fonts: loadFonts() });
  // GitHub's Camo proxy only shows images from 200 responses, so error cards are
  // returned with 200 and the real status goes into a header for debugging.
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": cache,
      "X-Card-Status": String(status),
    },
  });
}

export async function GET(req: NextRequest) {
  const login = req.nextUrl.searchParams.get("username")?.trim() ?? "";
  const isDemo = req.nextUrl.searchParams.get("demo") === "1";
  const iconSrc = loadDsmlIconDataUri();

  const fail = (message: string, status: number) =>
    render(
      <Shell login={isValidUsername(login) ? login : ""} iconSrc={iconSrc}>
        <ErrorRow message={message} />
      </Shell>,
      status,
      CACHE_ERROR
    );

  if (!login) return fail("Add ?username= to the URL", 400);
  if (!isValidUsername(login)) return fail("Invalid GitHub username", 400);

  try {
    const stats = isDemo ? DEMO_STATS : await fetchGithubStats(login);
    return await render(
      <Shell login={login} iconSrc={iconSrc}>
        <StatsRow stats={stats} />
      </Shell>,
      200,
      CACHE_OK
    );
  } catch (err) {
    if (err instanceof CardError) return fail(err.message, err.status);
    console.error(err);
    return fail("Something went wrong", 500);
  }
}
