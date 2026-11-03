/* ── Types ──────────────────────────────────────────────────────── */

export type StreakStats = {
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
};

export type ProfileStats = {
  stars: number;
  commitsThisYear: number;
  prs: number;
  issues: number;
  repos: number;
};

export type LanguageStat = {
  name: string;
  color: string;
  size: number;
  percent: number;
};

export type AllStats = {
  streak: StreakStats;
  profile: ProfileStats;
  languages: LanguageStat[];
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

/* ── GraphQL helpers ────────────────────────────────────────────── */

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

/* ── Streak stats (original) ────────────────────────────────────── */

const YEARS_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection { contributionYears }
    }
  }
`;

export async function fetchStreakStats(login: string): Promise<StreakStats> {
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

/** backward compat alias */
export const fetchGithubStats = fetchStreakStats;

/** `days` are daily counts in chronological order, the last one being "today". */
export function computeStreaks(days: number[]) {
  let longestStreak = 0;
  let running = 0;
  for (const count of days) {
    running = count > 0 ? running + 1 : 0;
    longestStreak = Math.max(longestStreak, running);
  }

  let end = days.length - 1;
  if (end >= 0 && days[end] === 0) end -= 1;

  let currentStreak = 0;
  for (let i = end; i >= 0 && days[i] > 0; i--) currentStreak += 1;

  return { currentStreak, longestStreak };
}

/* ── Profile stats ──────────────────────────────────────────────── */

const PROFILE_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      pullRequests { totalCount }
      issues { totalCount }
      repositories(ownerAffiliations: OWNER) { totalCount }
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
      }
      starredTotal: repositories(ownerAffiliations: OWNER, first: 0) { totalCount }
    }
  }
`;

const STARS_QUERY = `
  query ($login: String!, $after: String) {
    user(login: $login) {
      repositories(ownerAffiliations: OWNER, first: 100, after: $after, orderBy: {field: STARGAZERS, direction: DESC}) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { stargazerCount }
      }
    }
  }
`;

export async function fetchProfileStats(login: string): Promise<ProfileStats> {
  const data = await graphql(PROFILE_QUERY, { login });
  if (!data?.user) throw new CardError("User not found", 404);

  const u = data.user;
  const commitsThisYear =
    (u.contributionsCollection.totalCommitContributions ?? 0) +
    (u.contributionsCollection.restrictedContributionsCount ?? 0);

  // Paginate stars
  let stars = 0;
  let after: string | null = null;
  let pages = 0;
  do {
    const sd = await graphql(STARS_QUERY, { login, after });
    if (!sd?.user) break;
    const repos = sd.user.repositories;
    for (const r of repos.nodes) stars += r.stargazerCount ?? 0;
    after = repos.pageInfo.hasNextPage ? repos.pageInfo.endCursor : null;
    pages++;
  } while (after && pages < 10); // cap at 1000 repos

  return {
    stars,
    commitsThisYear,
    prs: u.pullRequests.totalCount ?? 0,
    issues: u.issues.totalCount ?? 0,
    repos: u.repositories.totalCount ?? 0,
  };
}

/* ── Top languages ──────────────────────────────────────────────── */

const LANGS_QUERY = `
  query ($login: String!, $after: String) {
    user(login: $login) {
      repositories(ownerAffiliations: OWNER, first: 100, after: $after, isFork: false) {
        pageInfo { hasNextPage endCursor }
        nodes {
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges { size node { name color } }
          }
        }
      }
    }
  }
`;

export async function fetchLanguages(login: string): Promise<LanguageStat[]> {
  const langMap = new Map<string, { color: string; size: number }>();
  let after: string | null = null;
  let pages = 0;

  do {
    const data = await graphql(LANGS_QUERY, { login, after });
    if (!data?.user) throw new CardError("User not found", 404);
    const repos = data.user.repositories;
    for (const repo of repos.nodes) {
      if (!repo.languages?.edges) continue;
      for (const edge of repo.languages.edges) {
        const name = edge.node.name;
        const existing = langMap.get(name);
        if (existing) {
          existing.size += edge.size;
        } else {
          langMap.set(name, { color: edge.node.color || "#858585", size: edge.size });
        }
      }
    }
    after = repos.pageInfo.hasNextPage ? repos.pageInfo.endCursor : null;
    pages++;
  } while (after && pages < 5);

  const total = [...langMap.values()].reduce((s, l) => s + l.size, 0);
  if (total === 0) return [];

  return [...langMap.entries()]
    .sort(([, a], [, b]) => b.size - a.size)
    .slice(0, 8)
    .map(([name, { color, size }]) => ({
      name,
      color,
      size,
      percent: Math.round((size / total) * 1000) / 10,
    }));
}

/* ── Combined fetch ─────────────────────────────────────────────── */

export async function fetchAllStats(login: string): Promise<AllStats> {
  const [streak, profile, languages] = await Promise.all([
    fetchStreakStats(login),
    fetchProfileStats(login),
    fetchLanguages(login),
  ]);
  return { streak, profile, languages };
}
