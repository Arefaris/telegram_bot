"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const filters_1 = require("telegraf/filters");
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = __importDefault(require("openai"));
const getTwitterMedia = require('get-twitter-media');
dotenv_1.default.config();
//api keys -> .env
const apiKeyTelegram = process.env.API_KEY_TELEGRAM;
const apiKeyOpenAi = process.env.API_KEY_OPEN_AI;
const USERS = (_a = process.env.USERS) === null || _a === void 0 ? void 0 : _a.split(",");
const MODEL = process.env.MODEL;
//prompt for open ai -> .env
const prompt = process.env.PROMPT;
if (!apiKeyTelegram) {
    throw new Error("Please provide api for telegram bot in .env file");
}
if (!apiKeyOpenAi) {
    throw new Error("Please provide prompt in .env file");
}
if (!USERS) {
    throw new Error("No users specifed in .env file");
}
if (!prompt) {
    throw new Error("Please provide prompt in .env file");
}
if (!MODEL) {
    throw new Error("Please provide model name in .env file");
}
const openai = new openai_1.default({
    apiKey: apiKeyOpenAi
});
const systemPrompt = {
    role: 'system',
    content: prompt,
};
const tools = [
    {
        type: "function",
        function: {
            name: "get_media",
            description: "Get link that contains media on x.com or twitter.com from user message, to download it. Example of the link: https://x.com/MarioEmblem_2/status/1935391736576028803",
            parameters: {
                type: "object",
                properties: {
                    link: {
                        type: "string",
                        description: "Link x.com or twitter.com",
                    },
                },
                required: ["link"],
                additionalProperties: false,
            },
        },
    }
];
//token
const bot = new telegraf_1.Telegraf(apiKeyTelegram);
//history of the chat messages
let history = [];
//arguments that we get from the ai response, like a link
let arg;
let link;
bot.on((0, filters_1.message)('text'), (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const last_message = ctx.message;
    const username = last_message.from.username;
    //cleaning message history if its too long
    if (history.length === 5) {
        history = [];
    }
    if (username && USERS && USERS.includes(username)) {
        let aiReply = yield textAnswer(last_message.text, history.join(""));
        if (aiReply === null)
            ctx.reply("couldnt reach open ai");
        const tools = aiReply.choices[0].message.tool_calls;
        // checking if youser requesting to call functions like get twitter media 
        if (tools) {
            arg = tools[0].function.arguments;
            let func = yield getFunctionCall(tools, arg);
            // replying based on return type
            if (func === undefined) {
                ctx.reply("Something went wrong during a function call, please try again later");
            }
            else if (func.media[0].url) {
                ctx.replyWithVideo(func.media[0].url);
            }
        }
        // sending message from ai if exist
        const aiMessage = aiReply.choices[0].message.content;
        if (aiMessage)
            ctx.replyWithMarkdownV2(markDownRefactor(aiMessage));
    }
    else {
        ctx.reply("Not authorized");
    }
}));
const embdedFromLink = (mgsFromUser) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let media = yield getTwitterMedia(mgsFromUser, {
            buffer: true
        });
        return media;
    }
    catch (e) {
        console.log(e);
    }
});
const getFunctionCall = (tools, arg) => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 0; i < tools.length; i++) {
        if (tools[i].function.name === "get_media") {
            link = yield JSON.parse(arg);
            const media = yield embdedFromLink(link.link);
            return media;
        }
    }
});
const textAnswer = (message, history) => __awaiter(void 0, void 0, void 0, function* () {
    if (message === undefined)
        throw new Error("message is undefined");
    if (history === undefined)
        throw new Error("history is undefined");
    let conversationHistory = [systemPrompt];
    if (history) {
        let assistanhistory = {
            role: 'assistant',
            content: history,
        };
        conversationHistory.push(assistanhistory);
    }
    conversationHistory.push({
        role: 'user',
        content: message
    });
    const response = yield openai.chat.completions.create({
        model: MODEL,
        messages: conversationHistory,
        tools,
    });
    return response;
});
const markDownRefactor = (text) => {
    text = text.replace(/\_/g, '\\_')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\~/g, '\\~')
        .replace(/\>/g, '\\>')
        .replace(/\#/g, '\\#')
        .replace(/\+/g, '\\+')
        .replace(/\-/g, '\\-')
        .replace(/\=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\./g, '\\.')
        .replace(/\!/g, '\\!');
    return text;
};
bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
