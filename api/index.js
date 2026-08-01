/**
 * Quiz Fusion Quest — Vercel Landing Page
 * Serves a stunning retro-gaming styled web UI with one-click webhook & command menu setup
 */

module.exports = (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz Fusion Quest — Telegram Bot (Vercel Ready)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-deep: #0b0f2b;
      --panel: #171b45;
      --panel-light: #232853;
      --edge: #39407c;
      --gold: #ffc93c;
      --cyan: #4ee1d6;
      --magenta: #ff5d8f;
      --text: #ecebff;
      --muted: #9c9fd6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 28px 16px 80px;
      background:
        radial-gradient(circle at 15% 8%, rgba(78,225,214,0.12), transparent 40%),
        radial-gradient(circle at 85% 92%, rgba(255,93,143,0.12), transparent 45%),
        var(--bg-deep);
      color: var(--text);
      font-family: 'Space Mono', monospace;
      min-height: 100vh;
    }
    .qf-wrap { max-width: 860px; margin: 0 auto; }
    .qf-marquee {
      text-align: center; padding: 28px 14px; margin-bottom: 26px;
      border: 3px solid var(--edge); border-radius: 14px;
      background: linear-gradient(180deg, var(--panel-light), var(--panel));
      box-shadow: 0 0 0 4px rgba(0,0,0,0.25), 0 12px 40px rgba(0,0,0,0.45);
      position: relative; overflow: hidden;
    }
    .qf-title {
      font-family: 'Press Start 2P', monospace;
      font-size: clamp(16px, 3.8vw, 28px);
      color: var(--gold);
      text-shadow: 0 0 10px rgba(255,201,60,0.55), 3px 3px 0 rgba(0,0,0,0.4);
      margin: 0 0 14px;
    }
    .qf-sub { color: var(--cyan); font-size: 14px; margin: 0; line-height: 1.6; }
    .qf-panel {
      border: 2px solid var(--edge); border-radius: 12px;
      background: var(--panel); padding: 24px; margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }
    h2 {
      font-family: 'Press Start 2P', monospace;
      font-size: 13px; color: var(--gold); margin: 0 0 16px;
      display: flex; align-items: center; gap: 10px;
    }
    .qf-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 100%; margin: 10px 0;
      font-family: 'Press Start 2P', monospace; font-size: 13px;
      padding: 18px 16px; border-radius: 12px; border: 3px solid #ffe08a;
      background: linear-gradient(180deg, #ffd75e, #e6a91b);
      color: #241800; cursor: pointer; text-decoration: none;
      box-shadow: 0 6px 0 #a8760e, 0 10px 24px rgba(0,0,0,0.4);
      transition: transform .08s;
    }
    .qf-btn:hover { transform: translateY(-2px); }
    .qf-btn:active { transform: translateY(3px); box-shadow: 0 3px 0 #a8760e; }
    .qf-cmd-list { list-style: none; padding: 0; margin: 0; }
    .qf-cmd-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; margin-bottom: 8px; border-radius: 8px;
      background: var(--panel-light); border: 1px solid var(--edge);
    }
    .qf-cmd-code { font-family: 'Press Start 2P', monospace; font-size: 12px; color: var(--cyan); }
    .qf-cmd-desc { font-size: 13px; color: var(--muted); }
    #status-box {
      margin-top: 14px; padding: 14px; border-radius: 8px;
      background: #06081c; border: 1px solid var(--edge); font-size: 13px;
      display: none; white-space: pre-wrap; color: var(--cyan);
    }
    .badge {
      display: inline-block; padding: 4px 10px; border-radius: 20px;
      background: rgba(78,225,214,0.15); border: 1px solid var(--cyan);
      color: var(--cyan); font-size: 11px; margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="qf-wrap">
    <header class="qf-marquee">
      <div class="badge">🚀 VERCEL SERVERLESS TELEGRAM BOT</div>
      <div class="qf-title">QUIZ FUSION QUEST</div>
      <p class="qf-sub">Apni <b>.txt test files</b> upload karo, sahi sequence mein <b>arrange</b> karo, aur ek <b>SINGLE merged file</b> banao — Telegram Bot ab Vercel par live hai!</p>
    </header>

    <section class="qf-panel">
      <h2>⚡ ONE-CLICK WEBHOOK & COMMAND SETUP</h2>
      <p style="color: var(--muted); font-size: 13px; line-height: 1.6;">
        Is button ko click karke apne Telegram Bot ka <b>Webhook</b> aur <b>Telegram Bot Command Menu</b> automatically sync aur register karein:
      </p>
      <button class="qf-btn" onclick="setupWebhook()">🕹️ SYNC WEBHOOK & BOT COMMANDS</button>
      <div id="status-box"></div>
    </section>

    <section class="qf-panel">
      <h2>📋 AUTOMATIC BOT COMMAND MENU</h2>
      <p style="color: var(--muted); font-size: 13px; margin-bottom: 16px;">
        Ye sabhi commands Telegram app ke menu button me <b>apne aap add ho jaate hain</b>:
      </p>
      <ul class="qf-cmd-list">
        <li class="qf-cmd-item"><span class="qf-cmd-code">/start</span><span class="qf-cmd-desc">🕹️ Bot shuru karein & welcome menu</span></li>
        <li class="qf-cmd-item"><span class="qf-cmd-code">/merge</span><span class="qf-cmd-desc">⚡ Saari uploaded files merge karein</span></li>
        <li class="qf-cmd-item"><span class="qf-cmd-code">/queue</span><span class="qf-cmd-desc">📋 Current uploaded files ki list</span></li>
        <li class="qf-cmd-item"><span class="qf-cmd-code">/settings</span><span class="qf-cmd-desc">⚙️ Shuffle Questions & Options</span></li>
        <li class="qf-cmd-item"><span class="qf-cmd-code">/clear</span><span class="qf-cmd-desc">🗑️ Queue clear karein</span></li>
        <li class="qf-cmd-item"><span class="qf-cmd-code">/help</span><span class="qf-cmd-desc">❓ Formatting instructions & guide</span></li>
        <li class="qf-cmd-item"><span class="qf-cmd-code">/setup</span><span class="qf-cmd-desc">🔄 Re-sync Bot Command Menu</span></li>
      </ul>
    </section>

    <footer style="text-align: center; color: var(--muted); font-size: 12px; margin-top: 30px;">
      <b>Quiz Fusion Quest</b> — Built by <a href="https://github.com/abhishekprajgs20-svg" target="_blank" style="color: var(--gold);">abhishekprajgs20-svg</a>
    </footer>
  </div>

  <script>
    async function setupWebhook() {
      const statusBox = document.getElementById('status-box');
      statusBox.style.display = 'block';
      statusBox.textContent = '⏳ Syncing webhook and Telegram command menu...';
      try {
        const res = await fetch('/api/setup');
        const data = await res.json();
        statusBox.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        statusBox.textContent = '❌ Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
