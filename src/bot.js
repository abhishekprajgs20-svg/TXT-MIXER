/**
 * Quiz Fusion Quest — Vercel-Safe Telegram Bot Logic
 * Fixed:
 * 1. Zero race-condition queue storage (each uploaded .txt is stored as a separate file in /tmp/qf_user_ID/)
 * 2. Removed Markdown parse_mode from scoreboard & dynamic text to prevent ETELEGRAM: 400 Bad Request: can't parse entities
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { detectBlocks, fuseFiles } = require('./parser');

const TMP_DIR = os.tmpdir();

function getUserDir(userId) {
  const dir = path.join(TMP_DIR, `qf_user_${userId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Reads all queued files for a user from their directory, sorted chronologically
 */
function getQueue(userId) {
  try {
    const dir = getUserDir(userId);
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('file_') && f.endsWith('.json'))
      .sort();

    const queue = [];
    for (const f of files) {
      try {
        const data = fs.readFileSync(path.join(dir, f), 'utf8');
        queue.push(JSON.parse(data));
      } catch (err) {}
    }
    return queue;
  } catch (e) {
    console.error('Error reading queue:', e);
    return [];
  }
}

/**
 * Appends a new file to the user's queue without overwriting existing concurrent uploads
 */
function addFileToQueue(userId, fileObj) {
  try {
    const dir = getUserDir(userId);
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    const filename = `file_${timestamp}_${rand}.json`;
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(fileObj), 'utf8');
  } catch (e) {
    console.error('Error adding file to queue:', e);
  }
}

/**
 * Clears all queued files for a user
 */
function clearQueue(userId) {
  try {
    const dir = getUserDir(userId);
    const files = fs.readdirSync(dir).filter(f => f.startsWith('file_') && f.endsWith('.json'));
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch (err) {}
    }
  } catch (e) {
    console.error('Error clearing queue:', e);
  }
}

function getSettingsFilePath(userId) {
  return path.join(getUserDir(userId), 'settings.json');
}

function getSettings(userId) {
  try {
    const filePath = getSettingsFilePath(userId);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {}
  return { shuffleQuestions: false, shuffleOptions: false };
}

function saveSettings(userId, settings) {
  try {
    const filePath = getSettingsFilePath(userId);
    fs.writeFileSync(filePath, JSON.stringify(settings), 'utf8');
  } catch (e) {}
}

const COMMAND_LIST = [
  { command: 'start', description: '🕹️ Quiz Fusion Bot shuru karein' },
  { command: 'merge', description: '⚡ Saari uploaded .txt files ko merge karein' },
  { command: 'queue', description: '📋 Current uploaded files ki list dekhein' },
  { command: 'settings', description: '⚙️ Shuffle Questions & Options settings' },
  { command: 'clear', description: '🗑️ Queue me existing files clear karein' },
  { command: 'help', description: '❓ Bot guide & supported .txt format rules' },
  { command: 'setup', description: '🔄 Refresh & sync Bot Command Menu' }
];

async function setupBotCommands(bot) {
  try {
    await bot.setMyCommands(COMMAND_LIST);
    console.log('✅ Bot Command Menu synced');
    return true;
  } catch (err) {
    console.error('❌ Error setting bot commands:', err.message);
    return false;
  }
}

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

async function handleUpdate(bot, update) {
  if (!update) return;

  // 1. Handle Messages
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const userId = msg.from ? msg.from.id : chatId;
    const text = (msg.text || '').trim();

    // /start command
    if (text.startsWith('/start')) {
      const settings = getSettings(userId);
      const queue = getQueue(userId);
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);

      await setupBotCommands(bot).catch(() => {});

      const welcomeMsg = `🎮 QUIZ FUSION QUEST — TEST MERGER 🎮

Apni .txt test files upload karo, sahi sequence mein arrange karo, aur ek SINGLE merged file banao — question no. apne aap serial (Q1, Q2, Q3...) ho jaayenge!

✨ Features & Power-ups:
🕹️ Unlimited .txt file uploads
😂 Standard Format (😂 marker) & Compact Format (1️⃣ emoji) support
🔀 Shuffle Questions across all files
🔀 Shuffle Options inside each question

👇 Niche diye buttons se options manage karein ya abhi koi .txt file bhejein!`;

      await bot.sendMessage(chatId, welcomeMsg, {
        reply_markup: buildSettingsKeyboard(settings, totalQs)
      });
      return;
    }

    // /help command
    if (text.startsWith('/help')) {
      const helpText = `❓ QUIZ FUSION QUEST — USER GUIDE

1️⃣ File Upload:
Koi bhi .txt file bhejein jisme Q1., Q2., Q3. format ke questions ho.
Aap ek ek karke ya ek sath multiple files bhej sakte hain.

2️⃣ Supported Formats:
• Standard Format (😂 marker):
  Q1. Question stem...
  😂
  a) Option A
  b) Option B
  Ex: Explanation...

• Compact Format (1️⃣ emoji inline):
  Q1. Question stem 1️⃣ Option A 2️⃣ Option B 3️⃣ Option C

3️⃣ Commands:
• /start - Welcome menu
• /merge - Merge all uploaded files
• /queue - List current queue
• /settings - Toggle Shuffle Qs & Options
• /clear - Empty your file queue
• /setup - Sync Telegram Command Menu`;

      await bot.sendMessage(chatId, helpText);
      return;
    }

    // /setup command
    if (text.startsWith('/setup')) {
      const success = await setupBotCommands(bot);
      await bot.sendMessage(
        chatId,
        success
          ? '✅ Bot Command Menu Telegram me add/sync ho gaya hai!'
          : '❌ Command menu sync error. Check token.'
      );
      return;
    }

    // /settings command
    if (text.startsWith('/settings')) {
      const settings = getSettings(userId);
      const queue = getQueue(userId);
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);

      const settingsMsg = `⚙️ POWER-UPS (SETTINGS)\n\n` +
        `🔀 Shuffle Questions: ${settings.shuffleQuestions ? 'ON ✅' : 'OFF ❌'}\n` +
        `🔀 Shuffle Options: ${settings.shuffleOptions ? 'ON ✅' : 'OFF ❌'}\n\n` +
        `👇 Toggle karne ke liye niche buttons tap karein:`;

      await bot.sendMessage(chatId, settingsMsg, {
        reply_markup: buildSettingsKeyboard(settings, totalQs)
      });
      return;
    }

    // /queue command
    if (text.startsWith('/queue')) {
      const queue = getQueue(userId);
      const settings = getSettings(userId);
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);

      if (queue.length === 0) {
        await bot.sendMessage(chatId, '📭 Queue khali hai. Koi .txt file upload karein!', {
          reply_markup: buildSettingsKeyboard(settings, 0)
        });
        return;
      }

      let listText = `📋 CURRENT CARTRIDGES IN QUEUE (Total: ${totalQs} Qs)\n\n`;
      queue.forEach((f, i) => {
        listText += `Level ${i + 1}: ${f.name} — ${f.count} Qs\n`;
      });
      listText += `\n👇 Abhi merge karne ke liye FUSE ALL NOW tap karein:`;

      await bot.sendMessage(chatId, listText, {
        reply_markup: buildSettingsKeyboard(settings, totalQs)
      });
      return;
    }

    // /clear command
    if (text.startsWith('/clear')) {
      clearQueue(userId);
      const settings = getSettings(userId);
      await bot.sendMessage(chatId, '🗑️ Queue Clear Ho Gayi Hai! Ab aap nayi .txt files upload kar sakte hain.', {
        reply_markup: buildSettingsKeyboard(settings, 0)
      });
      return;
    }

    // /merge command
    if (text.startsWith('/merge')) {
      await performFusion(bot, chatId, userId);
      return;
    }

    // Handle File Uploads (Document)
    if (msg.document) {
      const doc = msg.document;
      if (!doc.file_name || !doc.file_name.toLowerCase().endsWith('.txt')) {
        await bot.sendMessage(chatId, '⚠️ Kripya sirf .txt extension wali test files upload karein.');
        return;
      }

      try {
        const waitMsg = await bot.sendMessage(chatId, `🕹️ Loading cartridge: ${doc.file_name}...`);

        const fileUrl = await bot.getFileLink(doc.file_id);
        const res = await fetch(fileUrl);
        if (!res.ok) {
          throw new Error(`Failed to download file from Telegram (HTTP ${res.status})`);
        }
        const content = await res.text();
        const blocks = detectBlocks(content);

        addFileToQueue(userId, {
          name: doc.file_name,
          content: content,
          count: blocks.length
        });

        const queue = getQueue(userId);
        const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
        const settings = getSettings(userId);

        const loadedMsg = `🕹️ CARTRIDGE LOADED — Level ${queue.length}\n\n` +
          `📄 File: ${doc.file_name}\n` +
          `❓ Questions Detected: ${blocks.length} Qs\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📦 Total Queue: ${queue.length} file(s) | ${totalQs} total questions\n\n` +
          `⚡ Agar saari files upload ho gayi hain toh niche FUSE ALL NOW click karein!`;

        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        await bot.sendMessage(chatId, loadedMsg, {
          reply_markup: buildSettingsKeyboard(settings, totalQs)
        });
      } catch (err) {
        console.error('File download/process error:', err);
        await bot.sendMessage(chatId, `❌ File load karne me error aayi: ${err.message}`);
      }
      return;
    }
  }

  // 2. Handle Callback Queries
  if (update.callback_query) {
    const query = update.callback_query;
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    const settings = getSettings(userId);
    const queue = getQueue(userId);

    if (data === 'toggle_shuffle_qs') {
      settings.shuffleQuestions = !settings.shuffleQuestions;
      saveSettings(userId, settings);
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
      await bot.answerCallbackQuery(query.id, {
        text: `Shuffle Questions: ${settings.shuffleQuestions ? 'ON' : 'OFF'}`
      }).catch(() => {});
      await bot.editMessageReplyMarkup(
        buildSettingsKeyboard(settings, totalQs).inline_keyboard,
        { chat_id: chatId, message_id: query.message.message_id }
      ).catch(() => {});
    } else if (data === 'toggle_shuffle_opt') {
      settings.shuffleOptions = !settings.shuffleOptions;
      saveSettings(userId, settings);
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
      await bot.answerCallbackQuery(query.id, {
        text: `Shuffle Options: ${settings.shuffleOptions ? 'ON' : 'OFF'}`
      }).catch(() => {});
      await bot.editMessageReplyMarkup(
        buildSettingsKeyboard(settings, totalQs).inline_keyboard,
        { chat_id: chatId, message_id: query.message.message_id }
      ).catch(() => {});
    } else if (data === 'fuse_now') {
      await bot.answerCallbackQuery(query.id, { text: '⚡ Merging started...' }).catch(() => {});
      await performFusion(bot, chatId, userId);
    } else if (data === 'view_queue') {
      await bot.answerCallbackQuery(query.id).catch(() => {});
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
      if (queue.length === 0) {
        await bot.sendMessage(chatId, '📭 Queue khali hai. Koi .txt file upload karein!');
      } else {
        let listText = `📋 CURRENT CARTRIDGES IN QUEUE (${totalQs} Qs total)\n\n`;
        queue.forEach((f, i) => {
          listText += `Level ${i + 1}: ${f.name} — ${f.count} Qs\n`;
        });
        await bot.sendMessage(chatId, listText);
      }
    } else if (data === 'clear_queue') {
      clearQueue(userId);
      await bot.answerCallbackQuery(query.id, { text: '🗑️ Queue cleared' }).catch(() => {});
      await bot.sendMessage(chatId, '🗑️ Queue clear ho gayi hai. Nayi files bhej sakte hain.');
    } else if (data === 'show_help') {
      await bot.answerCallbackQuery(query.id).catch(() => {});
      await bot.sendMessage(chatId, '❓ /help type karein full instructions aur rules dekhne ke liye.');
    } else if (data === 'keep_queue') {
      await bot.answerCallbackQuery(query.id, { text: 'Queue preserved' }).catch(() => {});
    }
  }
}

async function performFusion(bot, chatId, userId) {
  const queue = getQueue(userId);
  const settings = getSettings(userId);

  if (queue.length === 0) {
    return bot.sendMessage(
      chatId,
      '⚠️ Koi file nahi mili! Kripya pehle kam se kam ek .txt test file upload karein.'
    );
  }

  const progMsg = await bot.sendMessage(chatId, '⚡ FUSION IN PROGRESS...\nCartridges merge ho rahe hain...');

  try {
    const result = fuseFiles(queue, settings.shuffleQuestions, settings.shuffleOptions);

    // Using clean text without Markdown parse_mode to prevent ETELEGRAM 400 entity parsing errors
    let scoreboard = `🏆 QUEST COMPLETE — LEVEL ${result.level} REACHED!\n`;
    scoreboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    scoreboard += `# | File | Format | Qs | Range\n`;

    result.fileMeta.forEach((m, idx) => {
      const fmt = m.formatIsA === null ? 'No Qs' : m.formatIsA ? 'Standard' : 'Compact';
      let range = '—';
      if (m.numbers.length) {
        const mn = Math.min(...m.numbers), mx = Math.max(...m.numbers);
        range = `${mn}–${mx}`;
      }
      scoreboard += `${idx + 1}. ${m.name} | ${fmt} | ${m.count} | ${range}\n`;
    });

    scoreboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    scoreboard += `📦 Total Merged Questions: ${result.totalQuestions}\n`;
    scoreboard += `🔀 Questions Shuffled: ${result.shuffleQuestions ? 'Yes ✅' : 'No ❌'}\n`;
    scoreboard += `🔀 Options Shuffled: ${result.shuffleOptions ? 'Yes ✅' : 'No ❌'}\n\n`;
    scoreboard += `Niche attachment se apni merged_output.txt download karein:`;

    await bot.deleteMessage(chatId, progMsg.message_id).catch(() => {});
    await bot.sendMessage(chatId, scoreboard);

    const fileBuffer = Buffer.from(result.mergedText, 'utf8');
    await bot.sendDocument(
      chatId,
      fileBuffer,
      {
        caption: `⚡ Merged Quiz File: ${result.totalQuestions} Questions\nCreated by Quiz Fusion Quest Bot`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🗑️ Clear Queue', callback_data: 'clear_queue' },
              { text: '🔄 Keep Queue', callback_data: 'keep_queue' }
            ]
          ]
        }
      },
      {
        filename: 'merged_output.txt',
        contentType: 'text/plain'
      }
    );
  } catch (err) {
    console.error('Merge error:', err);
    await bot.sendMessage(chatId, `❌ Merge karne me error aayi: ${err.message}`);
  }
}

module.exports = {
  handleUpdate,
  setupBotCommands,
  COMMAND_LIST
};
