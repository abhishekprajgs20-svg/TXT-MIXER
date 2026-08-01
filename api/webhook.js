/**
 * Quiz Fusion Quest — Vercel Serverless Webhook Handler
 * Properly awaits handleUpdate so Vercel never terminates the container early
 */
const TelegramBot = require('node-telegram-bot-api');
const { handleUpdate, setupBotCommands } = require('../src/bot');

let botInstance = null;

function getBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error('BOT_TOKEN environment variable is missing.');
  }
  if (!botInstance) {
    botInstance = new TelegramBot(token, { polling: false });
  }
  return botInstance;
}

module.exports = async (req, res) => {
  try {
    const bot = getBot();

    if (req.method === 'GET') {
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

    if (req.method === 'POST') {
      const update = req.body;
      if (update) {
        // AWAIT handleUpdate so Vercel keeps lambda alive until bot sends Telegram messages!
        await handleUpdate(bot, update);
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
