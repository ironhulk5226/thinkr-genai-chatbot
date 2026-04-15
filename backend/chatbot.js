import readLine from "node:readline/promises";
import Groq from "groq-sdk";
import dotenv from "dotenv";
// connecting LLM with web search tool using 'tavily'
import { tavily } from "@tavily/core";
// node cache which acts as in memory database to give llm memory support
import NodeCache from 'node-cache';


dotenv.config({});

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const myCache = new NodeCache({stdTTL:60 * 60 * 24});
// after 24 hours cache data will be deleted
// data will be stored in key value pairs 
// sessionId : messages

export async function generate(userMessage , sessionId) {
  const baseMessages = [
    {
      role: "system",
  content: `
  You are a smart and factual AI assistant.
  Answer clearly and directly. Do not add unnecessary info.
  Use tools when needed. Never guess.

  Current Date & Time: ${new Date().toLocaleString()}

  Memory Rules:
- Use previous conversation messages to answer context questions
- Never use tools for user-specific questions
- Only use tools for real-time or unknown external data

  Rules:
  - Do not manually write tool calls
  - Wait for tool results before answering
  - Use tools for real-time or unknown data
  - Use tools only when necessary
  - Do not overuse tools

  ### Examples:

  User: What is 2+2?
  Assistant: 4

  User: Who is the PM of India?
  Assistant: Narendra Modi

  ---

  Now answer the user query:
  `,
    },
    // {
    //   role: "user",
    //   content: "what is the price of iphone 17",
    // },
  ];

  const cached = myCache.get(sessionId);
  const messages = cached ? [...cached] : [...baseMessages];

  messages.push({
    role: "user",
    content: userMessage,
  });

  const MAX_RETRIES = 5;
  let retryCount = 0;



  while (true) {
    // as LLM calls the tool until it gets the final answer so multiple tool calls
    if(retryCount > MAX_RETRIES){
      return 'Assistant Couldnt find the answer, please try again!'
    }
    retryCount++;

    const response = await groq.chat.completions.create({
      temperature: 0, // focused answers
      model: "llama-3.1-8b-instant",
      messages: messages,
      tools: [
        {
          type: "function",
          function: {
            name: "webSearch",
            description:
              "Searches the latest information and real-time data on the internet.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description:
                    "The search query to perform search on internet.",
                },
              },
              required: ["query"],
            },
          },
        },
      ],
      tool_choice: "auto", //tool_choice: "auto" = Let the AI decide whether to call a tool or not
    });

    messages.push(response.choices[0].message);
    // console.log(JSON.stringify(response.choices[0].message,null,2));
    // 3. null

    // i) Ye parameter replacer ke liye hota hai
    // ii) null ka matlab → koi filtering nahi karni

    // 👉 Simple: "sab data print karo"

    // 4. 2

    // i) Ye indentation (spacing) define karta hai
    // ii) 2 → har level pe 2 spaces

    // 👉 Output readable ban jata hai

    const toolCalls = response.choices[0].message.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // either  LLM doesn't require to call the tool for the query or it has gotten the final response after tool call iteration
      myCache.set(sessionId,messages);
      console.log("session stored successfully!",sessionId)

      return response.choices[0].message.content;
    }

    // if there's a tool call

    for (const tool of toolCalls) {
      // console.log('tool:',tool);
      // function: { name: 'webSearch', arguments: '{"query":"iPhone 16 launch date"}' }

      const functionName = tool.function.name;
      const functionParams = JSON.parse(tool.function.arguments); // string -> object

      if (functionName === "webSearch") {
        const toolResult = await webSearch(functionParams);
        // console.log('toolResult : '+toolResult)

        messages.push({
          tool_call_id: tool.id,
          role: "tool",
          name: functionName,
          content: toolResult,
        });
      }
    }
  }
}

async function webSearch({ query }) {
  console.log("Calling Web Search...");
  const response = await tvly.search(query);
  const finalResult = response.results
    .map((result) => result.content)
    .join("\n\n");
  // console.log('result:', finalResult);

  return finalResult;
}
