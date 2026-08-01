/**
 * Quiz Fusion Quest — Vercel-Safe Telegram Bot Logic with Cloud DB & Interactive Queue Manager
 * Fixed:
 * 1. Cloud Gist Database (db.js) ensures 100% queue persistence across all Vercel Serverless containers
 * 2. Interactive Queue Manager: Users can reorder (⬆️ Up / ⬇️ Down) or delete (❌ Remove) individual files
 * 3. No Markdown parse_mode in dynamic text to prevent ETELEGRAM 400 entity parsing errors
 */
const { detectBlocks, fuseFiles } = require('./parser');
const db = require('./db');

const COMMAND_LIST = [
  { command: 'start', description: '🕹️ Quiz Fusion Bot shuru karein' },
  { command: 'merge', description: '⚡ Saari uploaded .txt files ko merge karein' },
  { command: 'queue', description: '📋 Current queue dekhein aur file order change karein' },
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
        { text: '📋 View & Reorder Queue', callback_data: 'view_queue' },
        { text: '🗑️ Clear Queue', callback_data: 'clear_queue' }
      ],
      [
        { text: '❓ Help & Guide', callback_data: 'show_help' }
      ]
    ]
  };
}

/**
 * Builds interactive keyboard for reordering files (Up / Down / Delete)
 */
function buildQueueReorderKeyboard(queue) {
  const totalQuestions = queue.reduce((sum, f) => sum + f.count, 0);
  const inline_keyboard = [
    [
      {
        text: `⚡ FUSE ALL NOW (${totalQuestions} Qs)`,
        callback_data: 'fuse_now'
      }
    ]
  ];

  queue.forEach((f, idx) => {
    const row = [];
    if (idx > 0) {
      row.push({ text: `${idx + 1}. ⬆️ Up`, callback_data: `up_${idx}` });
    } else {
      row.push({ text: `——`, callback_data: `noop` });
    }

    if (idx < queue.length - 1) {
      row.push({ text: `${idx + 1}. ⬇️ Down`, callback_data: `down_${idx}` });
    } else {
      row.push({ text: `——`, callback_data: `noop` });
    }

    row.push({ text: `${idx + 1}. ❌ Remove`, callback_data: `del_${idx}` });
    inline_keyboard.push(row);
  });

  inline_keyboard.push([
    { text: '🗑️ Clear Entire Queue', callback_data: 'clear_queue' },
    { text: '⚙️ Settings', callback_data: 'show_settings' }
  ]);

  return { inline_keyboard };
}

function renderQueueText(queue) {
  const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
  if (queue.length === 0) {
    return `📭 Queue khali hai! Koi .txt file upload karein.`;
  }
  let text = `📋 CURRENT QUIZ CARTRIDGES QUEUE (${totalQs} Qs total)\n\n`;
  queue.forEach((f, i) => {
    text += `Level ${i + 1}: ${f.name} — ${f.count} Qs\n`;
  });
  text += `\n👇 Kisi bhi file ko upar (⬆️), niche (⬇️) ya delete (❌) karne ke liye buttons tap karein:`;
  return text;
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
      const settings = await db.getSettings(userId);
      const queue = await db.getQueue(userId);
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);

      await setupBotCommands(bot).catch(() => {});

      const welcomeMsg = `🎮 QUIZ FUSION QUEST — TEST MERGER 🎮

Apni .txt test files upload karo, sahi sequence mein arrange karo, aur ek SINGLE merged file banao — question no. apne aap serial (Q1, Q2, Q3...) ho jaayenge!

✨ Features & Power-ups:
🕹️ Unlimited .txt file uploads (Cloud persistent)
📋 Reorder queue any time (/queue)
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

1️⃣ File Upload & Reorder:
Koi bhi .txt file bhejein.
/queue likhkar aap files ka serial order ⬆️ Up aur ⬇️ Down badal sakte hain!

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
• /queue - View & Reorder your file queue
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
      const settings = await db.getSettings(userId);
      const queue = await db.getQueue(userId);
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
      const queue = await db.getQueue(userId);
      await bot.sendMessage(chatId, renderQueueText(queue), {
        reply_markup: buildQueueReorderKeyboard(queue)
      });
      return;
    }

    // /clear command
    if (text.startsWith('/clear')) {
      await db.saveQueue(userId, []);
      const settings = await db.getSettings(userId);
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

        const queue = await db.getQueue(userId);
        queue.push({
          name: doc.file_name,
          content: content,
          count: blocks.length
        });
        await db.saveQueue(userId, queue);

        const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
        const settings = await db.getSettings(userId);

        const loadedMsg = `🕹️ CARTRIDGE LOADED — Level ${queue.length}\n\n` +
          `📄 File: ${doc.file_name}\n` +
          `❓ Questions Detected: ${blocks.length} Qs\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📦 Total Queue: ${queue.length} file(s) | ${totalQs} total questions\n\n` +
          `⚡ Agar saari files upload ho gayi hain toh niche FUSE ALL NOW click karein!`;

        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        await bot.sendMessage(chatId, loadedMsg, {
          reply_markup: buildQueueReorderKeyboard(queue)
        });
      } catch (err) {
        console.error('File download/process error:', err);
        await bot.sendMessage(chatId, `❌ File load karne me error aayi: ${err.message}`);
      }
      return;
    }
  }

  // 2. Handle Callback Queries (Inline Buttons)
  if (update.callback_query) {
    const query = update.callback_query;
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    const settings = await db.getSettings(userId);
    let queue = await db.getQueue(userId);

    if (data === 'toggle_shuffle_qs') {
      settings.shuffleQuestions = !settings.shuffleQuestions;
      await db.saveSettings(userId, settings);
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
      await db.saveSettings(userId, settings);
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
      await bot.sendMessage(chatId, renderQueueText(queue), {
        reply_markup: buildQueueReorderKeyboard(queue)
      });
    } else if (data.startsWith('up_')) {
      const idx = parseInt(data.replace('up_', ''), 10);
      if (idx > 0 && idx < queue.length) {
        const temp = queue[idx - 1];
        queue[idx - 1] = queue[idx];
        queue[idx] = temp;
        await db.saveQueue(userId, queue);
        await bot.answerCallbackQuery(query.id, { text: `Moved up: Level ${idx + 1} ➔ Level ${idx}` }).catch(() => {});
        await bot.editMessageText(renderQueueText(queue), {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: buildQueueReorderKeyboard(queue)
        }).catch(() => {});
      } else {
        await bot.answerCallbackQuery(query.id).catch(() => {});
      }
    } else if (data.startsWith('down_')) {
      const idx = parseInt(data.replace('down_', ''), 10);
      if (idx >= 0 && idx < queue.length - 1) {
        const temp = queue[idx + 1];
        queue[idx + 1] = queue[idx];
        queue[idx] = temp;
        await db.saveQueue(userId, queue);
        await bot.answerCallbackQuery(query.id, { text: `Moved down: Level ${idx + 1} ➔ Level ${idx + 2}` }).catch(() => {});
        await bot.editMessageText(renderQueueText(queue), {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: buildQueueReorderKeyboard(queue)
        }).catch(() => {});
      } else {
        await bot.answerCallbackQuery(query.id).catch(() => {});
      }
    } else if (data.startsWith('del_')) {
      const idx = parseInt(data.replace('del_', ''), 10);
      if (idx >= 0 && idx < queue.length) {
        const removedName = queue[idx].name;
        queue.splice(idx, 1);
        await db.saveQueue(userId, queue);
        await bot.answerCallbackQuery(query.id, { text: `❌ Removed: ${removedName}` }).catch(() => {});
        await bot.editMessageText(renderQueueText(queue), {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: buildQueueReorderKeyboard(queue)
        }).catch(() => {});
      } else {
        await bot.answerCallbackQuery(query.id).catch(() => {});
      }
    } else if (data === 'clear_queue') {
      await db.saveQueue(userId, []);
      await bot.answerCallbackQuery(query.id, { text: '🗑️ Queue cleared' }).catch(() => {});
      await bot.sendMessage(chatId, '🗑️ Queue clear ho gayi hai. Nayi files bhej sakte hain.');
    } else if (data === 'show_settings') {
      await bot.answerCallbackQuery(query.id).catch(() => {});
      const totalQs = queue.reduce((sum, f) => sum + f.count, 0);
      await bot.sendMessage(chatId, `⚙️ POWER-UPS (SETTINGS)\n\n` +
        `🔀 Shuffle Questions: ${settings.shuffleQuestions ? 'ON ✅' : 'OFF ❌'}\n` +
        `🔀 Shuffle Options: ${settings.shuffleOptions ? 'ON ✅' : 'OFF ❌'}\n\n` +
        `👇 Toggle karne ke liye niche buttons tap karein:`, {
        reply_markup: buildSettingsKeyboard(settings, totalQs)
      });
    } else if (data === 'show_help') {
      await bot.answerCallbackQuery(query.id).catch(() => {});
      await bot.sendMessage(chatId, '❓ /help type karein full instructions aur rules dekhne ke liye.');
    } else if (data === 'keep_queue') {
      await bot.answerCallbackQuery(query.id, { text: 'Queue preserved' }).catch(() => {});
    } else if (data === 'noop') {
      await bot.answerCallbackQuery(query.id).catch(() => {});
    }
  }
}

async function performFusion(bot, chatId, userId) {
  const queue = await db.getQueue(userId);
  const settings = await db.getSettings(userId);

  if (queue.length === 0) {
    return bot.sendMessage(
      chatId,
      '⚠️ Koi file nahi mili! Kripya pehle kam se kam ek .txt test file upload karein.'
    );
  }

  const progMsg = await bot.sendMessage(chatId, '⚡ FUSION IN PROGRESS...\nCartridges merge ho rahe hain...');

  try {
    const result = fuseFiles(queue, settings.shuffleQuestions, settings.shuffleOptions);

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
