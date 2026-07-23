// SSR fallback page — served when a request throws before React can render.
// Kept as raw HTML (no React) so it works even if the bundle failed to boot.
// Copy is Lithuanian and calm: „mes jau žinome, taisom".
export function renderErrorPage(): string {
  const incident = Math.random().toString(36).slice(2, 9);
  return `<!doctype html>
<html lang="lt">
  <head>
    <meta charset="utf-8" />
    <title>Trumpas trikdis — Socialinės Valandos</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex" />
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; padding: 1.5rem;
        font: 15px/1.55 -apple-system, "Inter", system-ui, sans-serif;
        color: #f5f3ff;
        background:
          radial-gradient(1200px 600px at 50% -10%, rgba(244,63,94,.22), transparent 60%),
          radial-gradient(900px 500px at 50% 110%, rgba(139,92,246,.18), transparent 60%),
          #0a0819;
        display: grid; place-items: center;
      }
      .card {
        width: 100%; max-width: 30rem; text-align: center;
        padding: 2rem; border-radius: 24px;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.08);
        backdrop-filter: blur(18px);
        box-shadow: 0 30px 80px rgba(244,63,94,.25);
      }
      .badge {
        display:inline-flex; align-items:center; gap:.5rem;
        padding:.4rem .85rem; border-radius:999px;
        background: rgba(16,185,129,.12);
        border:1px solid rgba(16,185,129,.35);
        color:#a7f3d0; font-size:12px; font-weight:600;
        margin: 1rem 0 .25rem;
      }
      .dot { width:8px; height:8px; border-radius:999px; background:#34d399; box-shadow:0 0 12px #34d399; animation: pulse 1.2s infinite; }
      @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
      h1 { margin: 0; font-size: 22px; }
      p { color: rgba(245,243,255,.7); margin: .5rem 0 0; }
      .id { margin-top: 1.25rem; padding: .75rem; border-radius: 14px; background: rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.08); text-align:left; }
      .id small { color: rgba(255,255,255,.4); letter-spacing:.15em; font-size:10px; text-transform:uppercase; }
      .id code { display:block; font: 600 14px "SF Mono", ui-monospace, monospace; margin-top:2px; }
      .actions { display:flex; gap:.5rem; justify-content:center; flex-wrap:wrap; margin-top:1.5rem; }
      button, a.btn { padding:.6rem 1.1rem; border-radius:999px; font: 600 14px inherit; cursor:pointer; text-decoration:none; border:1px solid transparent; transition: transform .15s; }
      button:hover, a.btn:hover { transform: scale(1.03); }
      .primary { background:#fff; color:#0f172a; }
      .secondary { background: rgba(255,255,255,.06); color:#fff; border-color: rgba(255,255,255,.15); }
      .tiny { margin-top: 1rem; font-size: 11px; color: rgba(255,255,255,.4); }
    </style>
  </head>
  <body>
    <div class="card">
      <div style="font-size:38px">🛠️</div>
      <h1>Kažkas trumpai sulūžo</h1>
      <p>Nesijaudink — mūsų sistema jau <b>automatiškai pranešė adminui</b>. Taisymas prasidėjo.</p>
      <div class="badge"><span class="dot"></span> Taisoma…</div>
      <div class="id">
        <small>Incidento ID</small>
        <code>#${incident}</code>
      </div>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Bandyti dar</button>
        <a class="btn secondary" href="/">Į pradžią</a>
      </div>
      <div class="tiny">Duomenys saugūs. Jei kartojasi — nusiųsk kodą #${incident} adminui.</div>
    </div>
  </body>
</html>`;
}
