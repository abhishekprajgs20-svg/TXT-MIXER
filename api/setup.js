/**
 * Quiz Fusion Quest — One-Click Vercel Webhook & Command Menu Setup
 * Automatically detects Vercel domain, sets webhook, and registers Telegram bot command menu
 */
const TelegramBot = require('node-telegram-bot-api');
const { setupBotCommands, COMMAND_LIST } = require('../src/bot');

module.exports = async (req, res) => {
  try {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'BOT_TOKEN environment variable is not configured on Vercel.'
      });
    }

    const bot = new TelegramBot(token, { polling: false });

    // Detect target webhook URL (either passed via ?url= or inferred from req headers)
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const inferredUrl = `${protocol}://${host}/api/webhook`;
    const targetUrl = req.query.url || inferredUrl;

    // 1. Set Webhook
    const webhookResult = await bot.setWebHook(targetUrl);

    // 2. Set Commands Menu
    const commandsResult = await setupBotCommands(bot);

    // 3. Get current bot info
    const me = await bot.getMe();

    return res.status(200).json({
      success: true,
      bot: {
        username: me.username,
        first_name: me.first_name,
        id: me.id
      },
      webhook: {
        registered_url: targetUrl,
        success: webhookResult
      },
      commands_menu: {
        synced: commandsResult,
        commands: COMMAND_LIST
      },
      message: `🎉 Bot @${me.username} is fully configured on Vercel! Webhook and Command Menu are active.`
    });
  } catch (err) {
    console.error('Setup Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
};
