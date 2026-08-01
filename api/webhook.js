/**
 * Quiz Fusion Quest — Vercel Serverless Webhook Handler
 * Receives Telegram webhook POST requests and processes updates
 */
const TelegramBot = require('node-telegram-bot-api');
const { attachHandlers, setupBotCommands } = require('../src/bot');

// Cache bot instance for serverless container reuse
let botInstance = null;

function getBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error('BOT_TOKEN environment variable is missing.');
  }
  if (!botInstance) {
    botInstance = new TelegramBot(token, { polling: false });
    attachHandlers(botInstance);
  }
  return botInstance;
}

module.exports = async (req, res) => {
  try {
    const bot = getBot();

    // GET request: show health status and allow webhook / command sync
    if (req.method === 'GET') {
      // If user passes ?sync_commands=true, re-register commands menu
      if (req.query && req.query.sync_commands === 'true') {
        const success = await setupBotCommands(bot);
        return res.status(200).json({
          status: 'ok',
          commands_synced: success,
          message: success
            ? '✅ Telegram Bot Command Menu successfully synced!'
            : '❌ Failed to sync command menu.'
        });
      }

      return res.status(200).json({
        name: 'Quiz Fusion Quest — Telegram Bot Webhook API',
        status: 'online',
        vercel_ready: true,
        message: 'Send POST requests with Telegram update payloads to this endpoint.',
        tips: 'Visit /api/setup to automatically configure your Telegram webhook and command menu.'
      });
    }

    // POST request: process Telegram update
    if (req.method === 'POST') {
      const update = req.body;
      if (update && (update.message || update.callback_query || update.edited_message)) {
        // Also fire setupBotCommands in background once per cold start to guarantee menu registration
        setupBotCommands(bot).catch(() => {});
        await bot.processUpdate(update);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Webhook Error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    });
  }
};
