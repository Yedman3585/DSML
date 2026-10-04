# dsml-card

SVG cards for GitHub README profiles, branded for DSML KZ.
Stack: Next.js + Satori + GitHub GraphQL API.

## What is included

- `app/api/card/route.tsx` - `JSX -> Satori -> SVG` endpoint (stats card and error card).
- `app/page.tsx` - preview page with ready-to-use Markdown.
- `lib/github.ts` - all-time contribution stats and streaks via GraphQL.
- `lib/fonts.ts` - Roboto font loading for Satori.
- `lib/assets.ts` - local SVG asset loader for Satori.
- `public/icons/dsml-kz.svg` - DSML KZ icon.

## Card endpoint

```text
/api/card?username=<github-login>        real stats (needs GH_TOKEN)
/api/card?username=<github-login>&demo=1 demo numbers, no token needed
```

- **Total Contributions** and **Longest Streak** are all-time: every year from
  `contributionYears` is requested in one aliased GraphQL query.
- **Current Streak** does not reset while today still has 0 contributions.
- Errors (bad username, user not found, rate limit) are rendered as an SVG card
  with HTTP 200, so GitHub's Camo proxy still shows them. The real status is in
  the `X-Card-Status` response header.
- Cache: successful cards `s-maxage=4h` + `stale-while-revalidate=1d`,
  error cards 5 minutes.

## Environment variables

Copy `.env.local.example` to `.env.local`:

```text
GH_TOKEN=github_pat_...
NEXT_PUBLIC_BASE_URL=            # optional, e.g. https://card.dsml.kz
```

`GH_TOKEN`: a fine-grained personal access token, "Public repositories
(read-only)", no extra permissions. Private contributions are counted only for
users who enabled "Include private contributions on my profile".

`NEXT_PUBLIC_BASE_URL` is only used for the Markdown snippet on the home page.
If empty, the address is taken from the request host.

## Local run

Requires Node.js LTS in `PATH` (install with the official `.msi`, keep
"Add to PATH" enabled). Check in a new terminal:

```powershell
node -v
npm -v
```

Then:

```powershell
cd C:\Users\Yedman\PycharmProjects\DSML\dsml-card-app
npm install
npm run dev
```

Open `http://localhost:3000` or
`http://localhost:3000/api/card?username=Yedman3585&demo=1`.

## Deploy to Vercel (free Hobby plan)

1. Create the git repository inside `dsml-card-app` (not in the parent `DSML`
   folder) and push it to GitHub:

   ```powershell
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin <your-repository-url>
   git push -u origin main
   ```

2. Vercel -> Add New -> Project -> import the repository.
3. Settings -> Environment Variables -> add `GH_TOKEN`
   (and optionally `NEXT_PUBLIC_BASE_URL`) -> Deploy.
4. Check `https://<project>.vercel.app/api/card?username=Yedman3585`.
5. Optional custom domain: Vercel -> Domains -> `card.dsml.kz`, then add a
   `CNAME card -> cname.vercel-dns.com` record in the dsml.kz DNS.

## README Markdown

```md
![GitHub stats](https://card.dsml.kz/api/card?username=Yedman3585)
![DSML KZ icon](https://card.dsml.kz/icons/dsml-kz.svg)
```
