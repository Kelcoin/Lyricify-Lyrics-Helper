import type { ProviderName } from "./types";

interface HomePageOptions {
  providers: ProviderName[];
  authEnabled: boolean;
  cacheTtlSeconds: number;
}

const providerLabels: Record<ProviderName, string> = {
  lrclib: "LRCLIB",
  netease: "Netease Cloud Music",
  qqmusic: "QQ Music",
  kugou: "Kugou Music"
};

const iconDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAALiMAAC4jAXilP3YAAAUWaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0OCA3OS4xNjQwMzYsIDIwMTkvMDgvMTMtMDE6MDY6NTcgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyMS4xIChXaW5kb3dzKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjAtMTAtMDZUMTg6MDg6MzYrMDg6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIwLTEwLTA2VDE4OjEwOjM4KzA4OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIwLTEwLTA2VDE4OjEwOjM4KzA4OjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXBNTTpJbnN0YW5j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";

export function renderHomePage({ providers, authEnabled, cacheTtlSeconds }: HomePageOptions): string {
  const providerList = providers
    .map((provider, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span>${providerLabels[provider]}</li>`)
    .join("");
  const authStatus = authEnabled ? "Protected" : "Public";
  const cacheStatus = cacheTtlSeconds > 0 ? `${cacheTtlSeconds.toLocaleString("en-US")} seconds` : "Disabled";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <link rel="icon" type="image/png" href="${iconDataUri}">
  <title>Lyricify Lyrics API</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #151719;
      --muted: #63686d;
      --paper: #f3f4f2;
      --surface: #fbfcfa;
      --line: rgba(21, 23, 25, 0.12);
      --line-soft: rgba(21, 23, 25, 0.07);
      --green: #137a4b;
      --green-soft: #dff1e7;
      --code: #202421;
      --code-ink: #e7eee9;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-width: 320px;
      min-height: 100dvh;
      color: var(--ink);
      background: var(--paper);
      font-family: "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    body::before {
      position: fixed;
      inset: 0;
      pointer-events: none;
      content: "";
      opacity: 0.32;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.035'/%3E%3C/svg%3E");
    }

    a { color: inherit; }

    .shell {
      width: min(1120px, calc(100% - 64px));
      margin: 0 auto;
      padding: 72px 0 48px;
    }

    .masthead {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
      gap: 72px;
      align-items: end;
      padding-bottom: 56px;
      animation: reveal 900ms cubic-bezier(0.32, 0.72, 0, 1) both;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 22px;
      color: var(--green);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .brand-mark {
      display: block;
      width: 52px;
      height: 52px;
      margin-bottom: 28px;
      object-fit: contain;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 0 5px var(--green-soft);
    }

    h1 {
      max-width: 680px;
      margin: 0;
      font-family: "Georgia Pro", Georgia, serif;
      font-size: 52px;
      font-weight: 400;
      line-height: 1.05;
      letter-spacing: 0;
    }

    .intro {
      max-width: 650px;
      margin: 24px 0 0;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.7;
    }

    .runtime {
      margin: 0;
      border-top: 1px solid var(--line);
    }

    .runtime div {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 16px 0;
      border-bottom: 1px solid var(--line);
    }

    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 650; text-align: right; }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
      gap: 24px;
      align-items: start;
    }

    .panel {
      padding: 32px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: inset 0 0 0 4px var(--paper), inset 0 0 0 5px var(--line-soft), 0 20px 60px rgba(24, 27, 25, 0.06);
      animation: reveal 900ms cubic-bezier(0.32, 0.72, 0, 1) 100ms both;
    }

    .panel + .panel { animation-delay: 180ms; }

    .section-label {
      margin: 0 0 28px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    h2 {
      margin: 0 0 12px;
      font-size: 24px;
      font-weight: 650;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .endpoint {
      display: block;
      overflow-wrap: anywhere;
      margin: 22px 0 32px;
      padding: 18px 20px;
      border-radius: 6px;
      color: var(--code-ink);
      background: var(--code);
      font-family: "Cascadia Code", "SFMono-Regular", monospace;
      font-size: 13px;
      line-height: 1.6;
    }

    .providers {
      margin: 0;
      padding: 0;
      list-style: none;
      border-top: 1px solid var(--line);
    }

    .providers li {
      display: flex;
      gap: 20px;
      padding: 15px 0;
      border-bottom: 1px solid var(--line);
      font-weight: 600;
    }

    .providers span {
      color: var(--muted);
      font-family: "Cascadia Code", "SFMono-Regular", monospace;
      font-size: 12px;
    }

    .parameters {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 32px;
      margin: 0 0 36px;
    }

    .parameter {
      padding: 15px 0;
      border-bottom: 1px solid var(--line);
    }

    .parameter code {
      font-family: "Cascadia Code", "SFMono-Regular", monospace;
      font-size: 13px;
      font-weight: 650;
    }

    .parameter p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }

    .required {
      margin-left: 6px;
      color: var(--green);
      font-size: 10px;
      font-weight: 750;
      text-transform: uppercase;
    }

    .auth {
      padding-top: 28px;
      border-top: 1px solid var(--line);
    }

    .auth p {
      margin: 0 0 14px;
      color: var(--muted);
      line-height: 1.6;
    }

    .auth > code {
      display: block;
      overflow-wrap: anywhere;
      padding: 12px 0;
      color: var(--ink);
      font-family: "Cascadia Code", "SFMono-Regular", monospace;
      font-size: 13px;
    }

    footer {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding-top: 40px;
      color: var(--muted);
      font-size: 12px;
    }

    footer a { text-underline-offset: 4px; }

    @keyframes reveal {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .shell { width: 100%; padding: 40px 16px 32px; }
      .masthead, .layout { grid-template-columns: 1fr; gap: 32px; }
      .masthead { padding-bottom: 40px; }
      h1 { font-size: 40px; }
      .panel { padding: 24px; }
      .parameters { grid-template-columns: 1fr; }
      footer { flex-direction: column; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 1ms !important; animation-delay: 0ms !important; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="masthead">
      <div>
        <img class="brand-mark" src="${iconDataUri}" width="52" height="52" alt="Lyricify">
        <div class="eyebrow"><span class="dot" aria-hidden="true"></span>Service operational</div>
        <h1>Lyricify Lyrics API</h1>
        <p class="intro">A line-synced lyrics service for lightweight client integrations. Responses use a stable JSON shape with millisecond timestamps and optional translations.</p>
      </div>
      <dl class="runtime" aria-label="Runtime configuration">
        <div><dt>Status</dt><dd>Online</dd></div>
        <div><dt>Authentication</dt><dd>${authStatus}</dd></div>
        <div><dt>Cache TTL</dt><dd>${cacheStatus}</dd></div>
      </dl>
    </header>

    <div class="layout">
      <section class="panel" aria-labelledby="endpoint-title">
        <p class="section-label">Endpoint</p>
        <h2 id="endpoint-title">Line-synced lyrics</h2>
        <code class="endpoint">GET /v1/lyrics</code>
        <p class="section-label">Provider fallback</p>
        <ol class="providers">${providerList}</ol>
      </section>

      <section class="panel" aria-labelledby="parameters-title">
        <p class="section-label">Request reference</p>
        <h2 id="parameters-title">API parameters</h2>
        <div class="parameters">
          <div class="parameter"><code>title</code><span class="required">Required</span><p>Track title</p></div>
          <div class="parameter"><code>artist</code><span class="required">Required</span><p>Primary artist name</p></div>
          <div class="parameter"><code>album</code><p>Album name for better matching</p></div>
          <div class="parameter"><code>durationMs</code><p>Track duration in milliseconds</p></div>
          <div class="parameter"><code>spotifyId</code><p>Optional Spotify track context</p></div>
          <div class="parameter"><code>language</code><p>Translation language code</p></div>
          <div class="parameter"><code>providers</code><p>Per-request provider order</p></div>
        </div>

        <div class="auth">
          <p class="section-label">Authentication</p>
          <p>When <code>API_TOKEN</code> is configured, send either header:</p>
          <code>Authorization: Bearer &lt;token&gt;</code>
          <code>X-API-Key: &lt;token&gt;</code>
        </div>
      </section>
    </div>

    <footer>
      <span>Lyricify Lyrics Helper</span>
      <a href="/health">JSON health check</a>
    </footer>
  </main>
</body>
</html>`;
}
