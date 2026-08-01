/**
 * Quiz Fusion Quest — Local Polling Runner
 * Run this locally for testing without Vercel or Webhook: node local.js
 */
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { handleUpdate, setupBotCommands } = require('./src/bot');

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error('❌ Error: BOT_TOKEN environment variable missing in .env file.');
  console.error('Example: create a .env file with BOT_TOKEN=your_telegram_bot_token');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('🚀 Quiz Fusion Quest Bot starting in LOCAL POLLING mode...');

// Route all incoming updates through handleUpdate
bot.on('message', async (msg) => {
  await handleUpdate(bot, { message: msg });
});

bot.on('callback_query', async (query) => {
  await handleUpdate(bot, { callback_query: query });
});

// Auto-register commands menu in Telegram on startup
setupBotCommands(bot).then(() => {
  console.log('🕹️ Quiz Fusion Bot is READY! Send /start to test in Telegram.');
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});
