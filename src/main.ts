import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters'
import dotenv from 'dotenv';
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from "openai/resources/index";

dotenv.config();

//api keys -> .env
const apiKeyTelegram: string | undefined = process.env.API_KEY_TELEGRAM;
const apiKeyOpenAi: string | undefined = process.env.API_KEY_OPEN_AI;


//prompt for open ai -> .env
const prompt: string | undefined = process.env.PROMPT

if (!apiKeyTelegram) {
  throw new Error("API_KEY for telegram is not defined");
}

if (!prompt) {
  throw new Error("API_KEY for openAI is not defined");
}

const openai = new OpenAI({
    apiKey: apiKeyOpenAi
  });

const systemPrompt: ChatCompletionMessageParam  = {
    role: 'system',
    content: prompt,
};

//token
const bot = new Telegraf(apiKeyTelegram)

const lastMessageTime = {};
let history: string[] = [] 
const cooldown = 1000;

bot.on(message('text'), async (ctx) => {
  
  const last_message = ctx.message
  
  let aiReply = await textAnswer(last_message.text, history.join(""))

  if (aiReply === null) {
        aiReply = "couldnt reach open ai"
    }else {
        history.push(aiReply)
    }
    
    //clearing history after 5 messages
    if (history.length === 5){
        history = []
    }
    await ctx.reply(aiReply)
})


const textAnswer = async(message: string, history: string)=>{
    if (message === undefined) throw new Error("message is undefined")
    if (history === undefined) throw new Error("history is undefined") 

    let conversationHistory: ChatCompletionMessageParam[] = [systemPrompt]

    if(history){
       let assistanhistory: ChatCompletionMessageParam  = {
                role: 'assistant',
                content: history,
              }
        
        conversationHistory.push(assistanhistory);
    }
    

    conversationHistory.push({
        role: 'user',
        content: message
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: conversationHistory
      });

        return response.choices[0].message.content
      }


bot.launch()


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))