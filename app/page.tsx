"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────────────── */

type CardType = "streak" | "stats" | "languages" | "compact";

interface CardOption {
  id: CardType;
  label: string;
  description: string;
  icon: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const CARD_TYPES: CardOption[] = [
  { id: "streak", label: "Streak Card", description: "Contributions, current & longest streak", icon: "🔥" },
  { id: "stats", label: "Stats Card", description: "Stars, commits, PRs, issues & repos", icon: "📊" },
  { id: "languages", label: "Top Languages", description: "Most used programming languages", icon: "💻" },
  { id: "compact", label: "Compact Badge", description: "Minimalist inline badge", icon: "🏷️" },
];

const STATIC_BADGES = [
  { src: "/badges/dsmlkz_brand.svg", label: "DSML.KZ Brand" },
  { src: "/badges/dsmlkz_logo.svg", label: "DSML.KZ Logo" },
  { src: "/badges/dsmlkz_compact.svg", label: "DSML.KZ Compact" },
  { src: "/badges/dsmlkz_text.svg", label: "DSML.KZ Text" },
  { src: "/badges/badge_dsmlkz.svg", label: "Badge DSML.KZ" },
  { src: "/badges/badge_dsmlkz_simple.svg", label: "Badge Simple" },
  { src: "/badges/badge_community.svg", label: "Community" },
  { src: "/badges/badge_ds.svg", label: "Data Science" },
];

/* ── Component ──────────────────────────────────────────────────── */

export default function DemoPage() {
  const [username, setUsername] = useState("");
  const [cardType, setCardType] = useState<CardType>("streak");
  const [previewSrc, setPreviewSrc] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const buildUrl = useCallback(
    (user: string, type: CardType) => {
      const params = new URLSearchParams();
      if (user) params.set("username", user);
      else params.set("username", "Yedman3585");
      params.set("type", type);
      if (!user) params.set("demo", "1");
      return `${baseUrl}/api/card?${params.toString()}`;
    },
    [baseUrl]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewSrc(buildUrl(username, cardType));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, cardType, buildUrl]);

  const embedUrl = username ? buildUrl(username, cardType) : `${baseUrl}/api/card?username=YOUR_USERNAME&type=${cardType}`;
  const markdownCode = `[![DSML GitHub Card](${embedUrl})](https://github.com/${username || "YOUR_USERNAME"})`;
  const htmlCode = `<a href="https://github.com/${username || "YOUR_USERNAME"}"><img src="${embedUrl}" alt="DSML GitHub Card" /></a>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #21262d", padding: "20px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/icons/dsml-kz.svg" alt="DSML.KZ" width={40} height={40} style={{ borderRadius: 8 }} />
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>DSML GitHub Cards</h1>
              <p style={{ fontSize: 13, color: "#8b949e", margin: 0 }}>Dynamic stat cards for your GitHub README</p>
            </div>
          </div>
          <a
            href="https://github.com/Yedman3585/DSML"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#c9d1d9", textDecoration: "none", fontSize: 14, fontWeight: 600, padding: "8px 16px", border: "1px solid #8b949e", borderRadius: 6, background: "#21262d" }}
          >
            GitHub ↗
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Two-column layout */}
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {/* Left: Controls */}
          <div style={{ flex: "1 1 340px", minWidth: 300 }}>
            {/* Card Type Selector */}
            <Section title="Card Type">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {CARD_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => setCardType(ct.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      background: cardType === ct.id ? "#1c2333" : "transparent",
                      border: `1px solid ${cardType === ct.id ? "#0babc1" : "#30363d"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      color: "#c9d1d9",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{ct.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: cardType === ct.id ? "#0babc1" : "#fff" }}>{ct.label}</div>
                      <div style={{ fontSize: 12, color: "#8b949e", marginTop: 2 }}>{ct.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Section>

            {/* Username */}
            <Section title="Properties">
              <label style={{ display: "block", fontSize: 13, color: "#8b949e", marginBottom: 6 }}>GitHub Username</label>
              <input
                type="text"
                placeholder="Yedman3585"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#161b22",
                  border: "1px solid #30363d",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: 12, color: "#484f58", marginTop: 6 }}>Leave empty to see demo data</p>
            </Section>
          </div>

          {/* Right: Preview + Embed */}
          <div style={{ flex: "1 1 480px", minWidth: 360 }}>
            <Section title="Preview">
              <div
                style={{
                  background: "#161b22",
                  borderRadius: 8,
                  border: "1px solid #21262d",
                  padding: 24,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 120,
                }}
              >
                {previewSrc ? (
                  <img
                    key={previewSrc}
                    src={previewSrc}
                    alt="Card Preview"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                ) : (
                  <p style={{ color: "#484f58" }}>Enter a username to preview</p>
                )}
              </div>
            </Section>

            <Section title="Deploy">
              <CodeBlock label="Markdown" code={markdownCode} copied={copied} onCopy={copyToClipboard} />
              <div style={{ height: 12 }} />
              <CodeBlock label="HTML" code={htmlCode} copied={copied} onCopy={copyToClipboard} />
              <div style={{ height: 12 }} />
              <CodeBlock label="URL" code={embedUrl} copied={copied} onCopy={copyToClipboard} />
            </Section>
          </div>
        </div>

        {/* Static Badges Section */}
        <div style={{ marginTop: 56, borderTop: "1px solid #21262d", paddingTop: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Static Badges</h2>
          <p style={{ fontSize: 14, color: "#8b949e", marginBottom: 24 }}>
            Pixel-art DSML.KZ badges for your profile and repos. Copy the image URL to use them.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {STATIC_BADGES.map((badge) => (
              <div
                key={badge.src}
                style={{
                  background: "#161b22",
                  border: "1px solid #21262d",
                  borderRadius: 8,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "#0d1117",
                    borderRadius: 6,
                    padding: 16,
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    minHeight: 60,
                    alignItems: "center",
                  }}
                >
                  <img src={badge.src} alt={badge.label} style={{ maxWidth: "100%", maxHeight: 80 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#c9d1d9" }}>{badge.label}</span>
                  <button
                    onClick={() => copyToClipboard(`<p align="left">
  <img src="${baseUrl}${badge.src}" />
</p>`, badge.label)}
                    style={{
                      padding: "4px 10px",
                      background: "transparent",
                      border: "1px solid #30363d",
                      borderRadius: 4,
                      color: copied === badge.label ? "#3fb950" : "#8b949e",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {copied === badge.label ? "Copied!" : "Copy HTML"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: 56, borderTop: "1px solid #21262d", paddingTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#484f58" }}>
            Built with ❤️ by{" "}
            <a href="https://dsml.kz" target="_blank" rel="noopener noreferrer" style={{ color: "#0babc1", textDecoration: "none" }}>
              DSML.KZ
            </a>
            {" "}· Powered by Satori & Next.js
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ── UI helpers ─────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "#8b949e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function CodeBlock({
  label,
  code,
  copied,
  onCopy,
}: {
  label: string;
  code: string;
  copied: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#8b949e" }}>{label}</span>
        <button
          onClick={() => onCopy(code, label)}
          style={{
            padding: "3px 10px",
            background: copied === label ? "#238636" : "#21262d",
            border: "1px solid #30363d",
            borderRadius: 4,
            color: "#c9d1d9",
            cursor: "pointer",
            fontSize: 12,
            transition: "background 0.15s",
          }}
        >
          {copied === label ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          background: "#161b22",
          border: "1px solid #21262d",
          borderRadius: 6,
          padding: "10px 12px",
          fontSize: 12,
          color: "#79c0ff",
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          margin: 0,
        }}
      >
        {code}
      </pre>
    </div>
  );
}
