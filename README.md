🤖 Telegram AI Chatbot

This is a simple Telegram bot built with [Telegraf.js](https://telegraf.js.org/) that uses the [OpenAI API](https://platform.openai.com/docs) to respond to user messages.

---

🚀 Features

- Integrates with OpenAI (GPT)
- Works via Telegram using Telegraf.js
- Uses a custom prompt as system context
- Easily configurable via `.env` file

---

📦 Requirements

- Node.js (v18 or newer recommended)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- OpenAI API Key from [OpenAI](https://platform.openai.com/)

---

🛠 Setup Instructions

1. Clone the repository

git clone https://github.com/arefaris/telegram_bot.git
cd telegram_bot


2. Install dependencies

npm install

3. Create a .env file in the root directory

API_KEY_TELEGRAM=your_telegram_bot_token
API_KEY_OPEN_AI=your_openai_api_key
PROMPT=You are a helpful assistant. Answer briefly and clearly.


PROMPT is used as the system message for OpenAI and defines the assistant's behavior.

4. Start the bot

node index.js
