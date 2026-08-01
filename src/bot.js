/**
 * Quiz Fusion Quest — Telegram Bot Logic
 * Handles Telegram commands, inline keyboard actions, file uploads, and auto-registers Bot Command Menu
 */
const TelegramBot = require('node-telegram-bot-api');
const { detectBlocks, fuseFiles } = require('./parser');
const https = require('https');
const http = require('http');

// In-memory storage for serverless sessions (works across warm invocations)
// For multi-file uploads, users queue files and click "FUSE ALL NOW"
const userQueues = new Map();
const userSettings = new Map();

const COMMAND_LIST = [
  { command: 'start', description: '🕹️ Quiz Fusion Bot shuru karein' },
  { command: 'merge', description: '⚡ Saari uploaded .txt files ko merge karein' },
  { command: 'queue', description: '📋 Current uploaded files ki list dekhein' },
  { command: 'settings', description: '⚙️ Shuffle Questions & Options settings' },
  { command: 'clear', description: '🗑️ Queue me existing files clear karein' },
  { command: 'help', description: '❓ Bot guide & supported .txt format rules' },
  { command: 'setup', description: '🔄 Refresh & sync Bot Command Menu' }
];

function getQueue(userId) {
  if (!userQueues.has(userId)) {
    userQueues.set(userId, []);
  }
  return userQueues.get(userId);
}

function getSettings(userId) {
  if (!userSettings.has(userId)) {
    userSettings.set(userId, {
      shuffleQuestions: false,
      shuffleOptions: false
    });
  }
  return userSettings.get(userId);
}

/**
 * Automatically set commands in Telegram's commands section menu
 */
async function setupBotCommands(bot) {
  try {
    await bot.setMyCommands(COMMAND_LIST);
    console.log('✅ Bot Command Menu successfully synced with Telegram!');
    return true;
  } catch (err) {
    console.error('❌ Error setting bot commands:', err.message);
    return false;
  }
}

/**
 * Download file content from a URL
 */
function downloadTextFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Builds the settings inline keyboard
 */
function buildSettingsKeyboard(settings, totalQuestions = 0) {
  return {
    inline_keyboard: [
      [
        {
          text: `⚡ FUSE ALL NOW (${totalQuestions} Qs)`,
          callback_data: 'fuse_now'
        }
      ],
      [
        {
          text: `🔀 Shuffle Qs: ${settings.shuffleQuestions ? 'ON ✅' : 'OFF ❌'}`,
          callback_data: 'toggle_shuffle_qs'
        },
        {
          text: `🔀 Shuffle Options: ${settings.shuffleOptions ? 'ON ✅' : 'OFF ❌'}`,
          callback_data: 'toggle_shuffle_opt'
        }
      ],
      [
        { text: '📋 View Queue', callback_data: 'view_queue' },
        { text: '🗑️ Clear Queue', callback_data: 'clear_queue' }
      ],
      [
        { text: '❓ Help & Guide', callback_data: 'show_help' }
      ]
    ]
  };
}

/**
 * Attach handlers to a TelegramBot instance
 */
function attachHandlers(bot) {
  // /start command
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const settings = getSettings(userId);
    const queue = getQueue(userId);
    const totalQs = queue.reduce((sum, f) => sum + f.count, 0);

    // Auto-register commands menu in background
    setupBotCommands(bot);

    const welcomeMsg = `🎮 *QUIZ FUSION QUEST — TEST MERGER* 🎮

Apni *.txt test files* upload karo, sahi sequence mein *arrange* karo, aur ek *SINGLE merged file* banao — question no. apne aap serial (Q1, Q2, Q3...) ho jaayenge!

✨ *Features & Power-ups:*
🕹️ Unlimited \`.txt\` file uploads
😂 *Standard Format* (\`😂\` marker) & *Compact Format* (\`1️⃣\` emoji) support
🔀 *Shuffle Questions* across all files
🔀 *Shuffle Options* inside each question

👇 *Niche diye buttons se options manage karein ya abhi .txt file bhejein!*`;

    await bot.sendMessage(chatId, welcomeMsg, {
      parse_mode: 'Markdown',
      reply_markup: buildSettingsKeyboard(settings, totalQs)
    });
  });

  // /setup command - manually sync command menu
  bot.onText(/^\/setup$/, async (msg) => {
    const chatId = msg.chat.id;
    const success = await setupBotCommands(bot);
    if (success) {
      await bot.sendMessage(chatId, '✅ *Bot Command Menu* Telegram me add/sync ho gaya hai! Menu button me aapko saare commands dikh jaayenge.', { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, '❌ Bot Command Menu sync karne me problem aayi. Kripya token check karein.');
    }
  });

  // /help command
  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `❓ *QUIZ FUSION QUEST — USER GUIDE*

1️⃣ *File Upload:*
Koi bhi \`.txt\` file bhejein jisme Q1., Q2., Q3. format ke questions ho.
Aap ek ek karke multiple files bhej sakte hain.

2️⃣ *Supported Formats:*
• *Standard Format (\`😂\` marker):*
  Q1. Question stem...
  😂
  a) Option A
  b) Option B
  Ex: Explanation...

• *Compact Format (\`1️⃣\` emoji inline):*
  Q1. Question stem 1️⃣ Option A 2️⃣ Option B 3️⃣ Option C

3️⃣ *Commands:*
• \`/start\` - Welcome menu
• \`/merge\` - Merge all uploaded files
• \`/queue\` - List current queue
• \`/settings\` - Toggle Shuffle Qs & Options
• \`/clear\` - Empty your file queue
• \`/setup\` - Sync Telegram Command Menu`;

    await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
  });

  // /settings command
  bot.onText(/^\/settings$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const settings = getSettings(userId);
    const queue = getQueue(userId);
    const totalQs = queue.reduce((sum, f) => sum + f.count, 0);

    const settingsMsg = `⚙️ *POWER-UPS (SETTINGS)*

🔀 *Shuffle Questions:* ${settings.shuffleQuestions ? 'ON ✅' : 'OFF ❌'}
(Saari files ke questions aapas me random mix honge, par numbering Q1, Q2, Q3 sequence me rahegi)

🔀 *Shuffle Options:* ${settings.shuffleOptions ? 'ON ✅' : 'OFF ❌'}
(Har question ke options random order me aayenge)

👇 Toggle karne ke liye niche buttons tap karein:`;

    await bot.sendMessage(chatId, settingsMsg, {
      parse_mode: 'Markdown',
      reply_markup: buildSettingsKeyboard(settings, totalQs)
    });
  });

  // /queue command
  bot.onText(/^\/queue$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const queue = getQueue(userId);
    const settings = getSettings(userId);
    const totalQs = queue.reduce((sum, f) => sum + f.count, 0);

    if (queue.length === 0) {
      return bot.sendMessage(chatId, '📭 *Queue khali hai.* Koi `.txt` file upload karein!', {
        parse_mode: 'Markdown',
        reply_markup: buildSettingsKeyboard(settings, 0)
      });
    }

    let listText = `📋 *CURRENT CARTRIDGES IN QUEUE* (Total: *${totalQs} Qs*)\n\n`;
    queue.forEach((f, i) => {
      listText += `*Level ${i + 1}:* \`${f.name}\` — *${f.count} Qs*\n`;
    });

    listText += `\n👇 Abhi merge karne ke liye **⚡ FUSE ALL NOW** tap karein ya nayi file upload karein:`;

    await bot.sendMessage(chatId, listText, {
      parse_mode: 'Markdown',
      reply_markup: buildSettingsKeyboard(settings, totalQs)
    });
  });

  // /clear command
  bot.onText(/^\/clear$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    userQueues.set(userId, []);
    const settings = getSettings(userId);

    await bot.sendMessage(chatId, '🗑️ *Queue Clear Ho Gayi Hai!* Ab aap nayi `.txt` files upload kar sakte hain.', {
      parse_mode: 'Markdown',
      reply_markup: buildSettingsKeyboard(settings, 0)
    });
  });

  // /merge command
  bot.onText(/^\/merge$/, async (msg) => {
    await performFusion(bot, msg.chat.id, msg.from.id);
  });

  // Document (file upload) handler
  bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const doc = msg.document;

    if (!doc.file_name || !doc.file_name.toLowerCase().endsWith('.txt')) {
      return bot.sendMessage(chatId, '⚠️ Kripya sirf `.txt` extension wali test files upload karein.', {
        parse_mode: 'Markdown'
      });
    }

    try {
      const waitMsg = await bot.sendMessage(chatId, `🕹️ Loading cartridge: \`${doc.file_name}\`...`, { parse_mode: 'Markdown' });
      
      const fileUrl = await bot.getFileLink(doc.file_id);
      const content = await downloadTextFile(fileUrl);
      const blocks = detectBlocks(content);

      const queue = getQueue(userId);
      queue.push({
        name: doc.file_name,
        content: content,
        count: blocks.length
      });

      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
      const settings = getSettings(userId);

      const loadedMsg = `🕹️ *CARTRIDGE LOADED — Level ${queue.length}*

📄 *File:* \`${doc.file_name}\`
❓ *Questions Detected:* *${blocks.length} Qs*
━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *Total Queue:* *${queue.length} file(s)* | *${totalQs} total questions*

⚡ Agar saari files upload ho gayi hain toh niche **FUSE ALL NOW** click karein!`;

      await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
      await bot.sendMessage(chatId, loadedMsg, {
        parse_mode: 'Markdown',
        reply_markup: buildSettingsKeyboard(settings, totalQs)
      });
    } catch (err) {
      console.error('File processing error:', err);
      await bot.sendMessage(chatId, `❌ File load karne me error aayi: ${err.message}`);
    }
  });

  // Inline button callbacks
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    const settings = getSettings(userId);
    const queue = getQueue(userId);

    if (data === 'toggle_shuffle_qs') {
      settings.shuffleQuestions = !settings.shuffleQuestions;
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
      await bot.answerCallbackQuery(query.id, { text: `Shuffle Questions: ${settings.shuffleQuestions ? 'ON' : 'OFF'}` });
      await bot.editMessageReplyMarkup(
        buildSettingsKeyboard(settings, totalQs).inline_keyboard,
        { chat_id: chatId, message_id: query.message.message_id }
      ).catch(() => {});
    } else if (data === 'toggle_shuffle_opt') {
      settings.shuffleOptions = !settings.shuffleOptions;
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
      await bot.answerCallbackQuery(query.id, { text: `Shuffle Options: ${settings.shuffleOptions ? 'ON' : 'OFF'}` });
      await bot.editMessageReplyMarkup(
        buildSettingsKeyboard(settings, totalQs).inline_keyboard,
        { chat_id: chatId, message_id: query.message.message_id }
      ).catch(() => {});
    } else if (data === 'fuse_now') {
      await bot.answerCallbackQuery(query.id, { text: '⚡ Merging started...' });
      await performFusion(bot, chatId, userId);
    } else if (data === 'view_queue') {
      await bot.answerCallbackQuery(query.id);
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
      if (queue.length === 0) {
        await bot.sendMessage(chatId, '📭 *Queue khali hai.* Koi `.txt` file upload karein!', { parse_mode: 'Markdown' });
      } else {
        let listText = `📋 *CURRENT CARTRIDGES IN QUEUE* (${totalQs} Qs total)\n\n`;
        queue.forEach((f, i) => {
          listText += `*Level ${i + 1}:* \`${f.name}\` — *${f.count} Qs*\n`;
        });
        await bot.sendMessage(chatId, listText, { parse_mode: 'Markdown' });
      }
    } else if (data === 'clear_queue') {
      userQueues.set(userId, []);
      await bot.answerCallbackQuery(query.id, { text: '🗑️ Queue cleared' });
      await bot.sendMessage(chatId, '🗑️ *Queue clear ho gayi hai.* Nayi files bhej sakte hain.', { parse_mode: 'Markdown' });
    } else if (data === 'show_help') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '❓ *\`/help\`* type karein full instructions aur rules dekhne ke liye.', { parse_mode: 'Markdown' });
    } else if (data === 'keep_queue') {
      await bot.answerCallbackQuery(query.id, { text: 'Queue preserved' });
    }
  });
}

/**
 * Execute fusion/merge of queued files
 */
async function performFusion(bot, chatId, userId) {
  const queue = getQueue(userId);
  const settings = getSettings(userId);

  if (queue.length === 0) {
    return bot.sendMessage(chatId, '⚠️ *Koi file nahi mili!* Kripya pehle kam se kam ek `.txt` test file upload karein.', {
      parse_mode: 'Markdown'
    });
  }

  const progMsg = await bot.sendMessage(chatId, '⚡ *FUSION IN PROGRESS...*\nCartridges merge ho rahe hain...', {
    parse_mode: 'Markdown'
  });

  try {
    const result = fuseFiles(queue, settings.shuffleQuestions, settings.shuffleOptions);

    let scoreboard = `🏆 *QUEST COMPLETE — LEVEL ${result.level} REACHED!*\n`;
    scoreboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    scoreboard += `# | File | Format | Qs | Range\n`;
    
    result.fileMeta.forEach((m, idx) => {
      const fmt = m.formatIsA === null ? 'No Qs' : m.formatIsA ? 'Standard' : 'Compact';
      let range = '—';
      if (m.numbers.length) {
        const mn = Math.min(...m.numbers), mx = Math.max(...m.numbers);
        range = `${mn}–${mx}`;
      }
      scoreboard += `${idx + 1}. \`${m.name}\` | ${fmt} | ${m.count} | ${range}\n`;
    });

    scoreboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    scoreboard += `📦 *Total Merged Questions:* *${result.totalQuestions}*\n`;
    scoreboard += `🔀 *Questions Shuffled:* ${result.shuffleQuestions ? 'Yes ✅' : 'No ❌'}\n`;
    scoreboard += `🔀 *Options Shuffled:* ${result.shuffleOptions ? 'Yes ✅' : 'No ❌'}\n\n`;
    scoreboard += `_Niche attachment se apni merged_output.txt download karein:_`;

    await bot.deleteMessage(chatId, progMsg.message_id).catch(() => {});
    await bot.sendMessage(chatId, scoreboard, { parse_mode: 'Markdown' });

    const fileBuffer = Buffer.from(result.mergedText, 'utf8');
    await bot.sendDocument(chatId, fileBuffer, {
      caption: `⚡ Merged Quiz File: ${result.totalQuestions} Questions\nCreated by Quiz Fusion Quest Bot`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🗑️ Clear Queue', callback_data: 'clear_queue' },
            { text: '🔄 Keep Queue', callback_data: 'keep_queue' }
          ]
        ]
      }
    }, {
      filename: 'merged_output.txt',
      contentType: 'text/plain'
    });

  } catch (err) {
    console.error('Merge error:', err);
    await bot.sendMessage(chatId, `❌ Merge karne me error aayi: ${err.message}`);
  }
}

module.exports = {
  attachHandlers,
  setupBotCommands,
  COMMAND_LIST
};
