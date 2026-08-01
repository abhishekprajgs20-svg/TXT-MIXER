# 🎮 QUIZ FUSION QUEST — TELEGRAM BOT EDITION (Vercel Serverless Ready)

**Quiz Fusion Quest — Test Merger** is a powerful Telegram Bot converted from the original Quiz Fusion HTML tool (`TXT MIXER.html`). It allows users to upload multiple `.txt` quiz test files, arrange/merge them sequentially, apply power-ups (Shuffle Questions across all files & Shuffle Options), and download a standardized single merged text file.

---

## ✨ Key Features & Highlights

- **🕹️ Multi-File Cartridge System:** Upload unlimited `.txt` quiz files into a level-based queue.
- **😂 Dual Format Support:**
  - **Standard Format (`😂` Marker):** Supports question stem separated from options by a `😂` line and optional explanations starting with `Ex:`.
  - **Compact Format (`1️⃣` Emoji Inline):** Automatically converts inline emojis (`1️⃣`, `2️⃣`, `Statement-I:`, etc.) into clean standard formatting.
- **🔀 Power-Ups (Toggles):**
  - **Shuffle Questions:** Merges all files into a single pool and shuffles their order while keeping sequential question numbers (`Q1.`, `Q2.`, `Q3.`... `QN.`).
  - **Shuffle Options:** Randomly shuffles the answer options within each question while keeping the correct option content aligned.
- **⚡ Interactive Telegram UI:** Clean Markdown messages, inline keyboards, live scoreboard tables, and instantaneous file delivery.
- **📋 Auto-Sync Bot Command Menu:** Automatically registers all commands into Telegram's Bot Command Section Menu (`/start`, `/merge`, `/queue`, `/settings`, `/clear`, `/help`, `/setup`) without any manual `@BotFather` command typing!

---

## 🚀 How to Deploy on Vercel

### Step 1: Import Project to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New -> Project**.
2. Select your GitHub repository: `abhishekprajgs20-svg/TXT-MIXER` (or click Import).
3. Leave the Framework Preset as **Other / Node.js**.

### Step 2: Add Environment Variables
In the Vercel project settings (**Environment Variables** section), add:
- `BOT_TOKEN` : Your Telegram Bot Token obtained from [@BotFather](https://t.me/BotFather).

### Step 3: Deploy & Configure Webhook (One-Click Setup)
Once Vercel finishes deploying your app (e.g. `https://txt-mixer.vercel.app`):
1. Simply visit your Vercel URL in your browser:
   ```
   https://your-app-name.vercel.app/api/setup
   ```
2. **That's it!** The `/api/setup` endpoint will automatically:
   - Detect your Vercel HTTPS domain.
   - Register your Telegram Webhook (`/api/webhook`).
   - **Automatically add all commands to Telegram's Command Section Menu!**

> **Tip:** You can also click the **🕹️ SYNC WEBHOOK & BOT COMMANDS** button directly on the homepage landing page (`https://your-app-name.vercel.app/`).

---

## 📋 Automatic Telegram Command Menu (`setMyCommands`)

The bot automatically registers the following commands into Telegram's menu button:

| Command | Description |
| :--- | :--- |
| `/start` | 🕹️ Start Quiz Fusion Bot & show interactive welcome menu |
| `/merge` | ⚡ Fuse & merge all uploaded `.txt` files in your queue |
| `/queue` | 📋 View currently loaded cartridges (files) in your queue |
| `/settings` | ⚙️ Toggle Shuffle Questions & Shuffle Options power-ups |
| `/clear` | 🗑️ Clear all queued files and start fresh |
| `/help` | ❓ Complete guide & formatting rules for `.txt` files |
| `/setup` | 🔄 Refresh & sync Bot Commands Menu in Telegram |

---

## 💻 Local Development / Polling Mode

To test the bot locally on your PC without Vercel or ngrok:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with your Telegram Bot token:
   ```env
   BOT_TOKEN=your_telegram_bot_token_here
   ```
3. Start the bot:
   ```bash
   npm run dev
   ```
   *Your Bot Command Menu will automatically sync with Telegram as soon as the local runner starts!*

---

## 🏆 How to Use on Telegram (Hindi / English Guide)

1. **File Upload:** Telegram bot me ek ya ek se zyada `.txt` files as a Document upload karein.
2. **Queue Management:** Har uploaded file Level 1, Level 2... ki tarah queue me add hogi.
3. **Power-up Settings:** `/settings` command ya inline keyboard buttons tap karke **Shuffle Questions** aur **Shuffle Options** ko `ON/OFF` karein.
4. **Fuse All Questions:** **⚡ FUSE ALL NOW** button dabayein ya `/merge` command likhein.
5. **Download Output:** Bot aapko turant ek scoreboard summary aur merged text file (`merged_output.txt`) return karega!

---

## 👨‍💻 Author & License
- **Author:** [abhishekprajgs20-svg](https://github.com/abhishekprajgs20-svg)
- **License:** MIT
