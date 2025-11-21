import OpenAI from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/index";
import { wrapOpenAI } from "langsmith/wrappers";
import dotenv from "dotenv";
dotenv.config();

class DeepSeek {
    openai: OpenAI;

    constructor() {
        const client = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: process.env.DEEPSEEK_BASE_URL,
        });

        this.openai = wrapOpenAI(client, {
            name: "DeepSeek Chat Completion",
            tags: ["deepseek", "llm"],
        });
    }

    async invoke(params: Partial<ChatCompletionCreateParamsNonStreaming> & {messages: ChatCompletionCreateParamsNonStreaming['messages']}) {
        const defaultParams: ChatCompletionCreateParamsNonStreaming = {
            model: "deepseek-chat",
            temperature: 0,
            ...params
        }
        const completion = await this.openai.chat.completions.create(defaultParams);
        return completion.choices[0].message.content;
    }
}

const deepSeek = new DeepSeek();

export default deepSeek;
