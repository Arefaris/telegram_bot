import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters'
import dotenv from 'dotenv';
import OpenAI from 'openai'
import { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionMessageToolCall } from "openai/resources/index";

const getTwitterMedia = require('get-twitter-media');


dotenv.config();

//api keys -> .env
const apiKeyTelegram: string | undefined = process.env.API_KEY_TELEGRAM;
const apiKeyOpenAi: string | undefined = process.env.API_KEY_OPEN_AI;
const USERS: string[] | undefined = process.env.USERS?.split(",")

//prompt for open ai -> .env
const prompt: string | undefined = process.env.PROMPT

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


const openai = new OpenAI({
    apiKey: apiKeyOpenAi
  });

const systemPrompt: ChatCompletionMessageParam  = {
    role: 'system',
    content: prompt,
};

const tools: ChatCompletionTool[] = [
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
]
//token
const bot = new Telegraf(apiKeyTelegram)

//history of the chat messages
let history: string[] = [] 

//arguments that we get from the ai response, like a link
let arg: string

interface twitter_link {
        link: string
    }

interface media_from_twitter {
  found: boolean,
  type: string,
  media: [
    {
      url: string;
    }
  ]
}

let link: twitter_link

bot.on(message('text'), async (ctx) => {
  const last_message = ctx.message
  const username = last_message.from.username

  
  //cleaning message history if its too long
  if (history.length === 5){
         history = []    
   }

  if (username && USERS && USERS.includes(username)){
     let aiReply = await textAnswer(last_message.text, history.join(""))

     if (aiReply === null) ctx.reply("couldnt reach open ai")

     const tools = aiReply.choices[0].message.tool_calls

     // checking if youser requesting to call functions like get twitter media 
     if (tools) {
        arg = tools[0].function.arguments
        let func = await getFunctionCall(tools, arg)

        // replying based on return type
        if (func === undefined){
            ctx.reply("Something went wrong during a function call, please try again later")
        }
        else if (func.media[0].url){
            ctx.replyWithVideo(func.media[0].url)  
        }
      }

      // sending message from ai if exist
      const aiMessage = aiReply.choices[0].message.content
      if (aiMessage) ctx.reply(aiMessage)

    }else {
      ctx.reply("Not authorized")
    }
})

const embdedFromLink = async(mgsFromUser:string)=> {
    try{
        let media: media_from_twitter = await getTwitterMedia(mgsFromUser, {
            buffer: true
          });
          return media
    }catch (e){
        console.log(e)
    }
}


const getFunctionCall = async(tools: ChatCompletionMessageToolCall[], arg: string): Promise<media_from_twitter | undefined>=>{
    for (let i=0; i < tools.length; i++){
        if (tools[i].function.name === "get_media") {
            link = await JSON.parse(arg)
            const media = await embdedFromLink(link.link)
            return media    
    }
}
}

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
        messages: conversationHistory,
        tools,
      });

        return response
      }



bot.launch()


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))