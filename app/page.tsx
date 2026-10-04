import { headers } from "next/headers";

// Public address of the deployment. Set NEXT_PUBLIC_BASE_URL (e.g. https://card.dsml.kz)
// to pin it; otherwise it is derived from the request host.
function getBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

type HomeProps = {
  searchParams?: {
    username?: string;
  };
};

export default function Home({ searchParams }: HomeProps) {
  const username = searchParams?.username?.trim() || "Yedman3585";
  const encodedUsername = encodeURIComponent(username);
  const previewUrl = `/api/card?username=${encodedUsername}&demo=1`;
  const baseUrl = getBaseUrl();
  const productionUrl = `${baseUrl}/api/card?username=${encodedUsername}`;
  const iconUrl = `${baseUrl}/icons/dsml-kz.svg`;

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: 32,
        background: "#f7f7f4",
        color: "#151515",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <img src="/icons/dsml-kz.svg" width={48} height={48} alt="DSML KZ" />
          <div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>dsml-card</h1>
            <p style={{ margin: "6px 0 0", color: "#555", fontSize: 15 }}>
              SVG cards for GitHub README profiles.
            </p>
          </div>
        </header>

        <section style={{ display: "grid", gap: 20 }}>
          <form action="/" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              name="username"
              defaultValue={username}
              aria-label="GitHub username"
              style={{
                minWidth: 220,
                padding: "10px 12px",
                border: "1px solid #c9c9c1",
                borderRadius: 6,
                fontSize: 15,
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 14px",
                border: "1px solid #111",
                borderRadius: 6,
                background: "#111",
                color: "#fff",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Preview
            </button>
          </form>

          <img
            src={previewUrl}
            width={495}
            height={195}
            alt={`${username} GitHub stats preview`}
            style={{ maxWidth: "100%", height: "auto" }}
          />

          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="card-md" style={{ fontWeight: 700 }}>
              README markdown
            </label>
            <textarea
              id="card-md"
              readOnly
              rows={4}
              value={`![${username} GitHub stats](${productionUrl})\n\n![DSML KZ icon](${iconUrl})`}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 12,
                border: "1px solid #c9c9c1",
                borderRadius: 6,
                fontFamily: "Consolas, monospace",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
