export type GithubStats = {
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
};

/** Error with a user-facing message and HTTP status for the card endpoint. */
export class CardError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// GitHub logins: letters, digits, single hyphens, no leading/trailing hyphen, max 39 chars.
const USERNAME_RE = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/;

export function isValidUsername(login: string) {
  return USERNAME_RE.test(login);
}

type Day = { date: string; contributionCount: number };
type Calendar = { totalContributions: number; weeks: { contributionDays: Day[] }[] };

async function graphql(query: string, variables: Record<string, unknown>) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new CardError("Server is missing GH_TOKEN", 500);

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "dsml-card",
    },
    body: JSON.stringify({ query, variables }),
    // Caching is done by the CDN via Cache-Control on the card response.
    cache: "no-store",
  });

  if (res.status === 401) throw new CardError("Invalid GitHub token", 500);
  if (res.status === 403 || res.status === 429) throw new CardError("GitHub rate limit, try later", 503);
  if (!res.ok) throw new CardError(`GitHub API error ${res.status}`, 502);

  const json = await res.json();
  if (json.errors?.length) {
    if (json.errors.some((e: { type?: string }) => e.type === "NOT_FOUND")) {
      throw new CardError("User not found", 404);
    }
    if (json.errors.some((e: { type?: string }) => e.type === "RATE_LIMITED")) {
      throw new CardError("GitHub rate limit, try later", 503);
    }
    throw new CardError("GitHub API returned an error", 502);
  }
  return json.data;
}

const YEARS_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection { contributionYears }
    }
  }
`;

/**
 * All-time stats: GitHub limits one contributionsCollection to a year,
 * so we ask for every contribution year in a single aliased query.
 */
export async function fetchGithubStats(login: string): Promise<GithubStats> {
  const yearsData = await graphql(YEARS_QUERY, { login });
  if (!yearsData?.user) throw new CardError("User not found", 404);

  const years: number[] = yearsData.user.contributionsCollection.contributionYears ?? [];
  if (years.length === 0) return { totalContributions: 0, currentStreak: 0, longestStreak: 0 };

  const now = new Date();
  const parts = years.map((y) => {
    const from = `${y}-01-01T00:00:00Z`;
    const to = y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    return `y${y}: contributionsCollection(from: "${from}", to: "${to}") {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }`;
  });

  const data = await graphql(`query ($login: String!) { user(login: $login) { ${parts.join("\n")} } }`, { login });
  if (!data?.user) throw new CardError("User not found", 404);

  let totalContributions = 0;
  const byDate = new Map<string, number>();
  for (const y of years) {
    const cal: Calendar | undefined = data.user[`y${y}`]?.contributionCalendar;
    if (!cal) continue;
    totalContributions += cal.totalContributions;
    for (const w of cal.weeks) for (const d of w.contributionDays) byDate.set(d.date, d.contributionCount);
  }

  const days = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, count]) => count);

  return { totalContributions, ...computeStreaks(days) };
}

/** `days` are daily counts in chronological order, the last one being "today". */
export function computeStreaks(days: number[]) {
  let longestStreak = 0;
  let running = 0;
  for (const count of days) {
    running = count > 0 ? running + 1 : 0;
    longestStreak = Math.max(longestStreak, running);
  }

  // An empty "today" does not break the streak: the day is not over yet
  // (and GitHub's calendar date may be ahead of the user's timezone).
  let end = days.length - 1;
  if (end >= 0 && days[end] === 0) end -= 1;

  let currentStreak = 0;
  for (let i = end; i >= 0 && days[i] > 0; i--) currentStreak += 1;

  return { currentStreak, longestStreak };
}
