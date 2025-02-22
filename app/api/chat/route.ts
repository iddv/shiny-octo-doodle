import { ChatOllama } from "@langchain/ollama"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import type { GameResponse } from "@/types/game"
import { ADVENTURE_PROMPT } from "@/lib/prompts/adventure"

export const runtime = "edge"

// Create a singleton chat client
let chatClient: ChatOllama | null = null;
let messageHistory: Array<HumanMessage | SystemMessage | AIMessage> = [];

export async function GET(req: Request) {
  console.log("🚀 API: Starting chat request");
  
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  if (req.method === 'OPTIONS') {
    console.log("👋 API: Handling OPTIONS request");
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  const { searchParams } = new URL(req.url)
  const theme = searchParams.get("theme") || "mystery"
  const endpoint = searchParams.get("endpoint") || process.env.NEXT_PUBLIC_DEFAULT_ENDPOINT
  const modelName = searchParams.get("model") || process.env.NEXT_PUBLIC_DEFAULT_MODEL
  const userInput = searchParams.get("message") || "Start a new adventure in this theme."
  const isNewGame = searchParams.get("newGame") === "true"

  console.log("📝 API: Configuration", {
    theme,
    endpoint,
    modelName
  });

  try {
    // Initialize or reset chat client if needed
    if (!chatClient || isNewGame) {
      console.log("🤖 API: Initializing new chat client");
      chatClient = new ChatOllama({
        baseUrl: endpoint,
        model: modelName,
      });
      
      // Reset message history for new game
      messageHistory = [
        new SystemMessage(ADVENTURE_PROMPT.replace('${theme}', theme)),
      ];
    }

    // Add user message to history
    messageHistory.push(new HumanMessage(userInput));

    console.log("💭 API: Invoking LLM with message history");
    const result = await chatClient.invoke(messageHistory);

    console.log("✨ API: LLM Response:", result);
    console.log("📦 API: Response content:", result.content);

    // Parse the LLM response content as JSON
    let gameResponse: GameResponse;
    try {
      // Remove any <think> tags and their content
      const cleanContent = result.content.replace(/<think>.*?<\/think>/gs, '').trim();
      
      // Try to find the JSON content
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON content found in response");
      }

      gameResponse = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!gameResponse.stats || !gameResponse.narrative || !gameResponse.choices) {
        throw new Error("Missing required fields in game response");
      }
    } catch (error) {
      console.error("❌ API: Failed to parse LLM response as JSON:", error);
      console.error("❌ API: Raw content:", result.content);
      return new Response(JSON.stringify({ 
        error: "Invalid response format",
        details: error.message,
        rawContent: result.content 
      }), {
        status: 500,
        headers,
      });
    }

    console.log("✨ API: Parsed game response:", gameResponse);

    // Add AI response to history
    messageHistory.push(new AIMessage(gameResponse.narrative));

    return new Response(JSON.stringify(gameResponse), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("❌ API: Error during LLM interaction:", error);
    return new Response(JSON.stringify({ error: "Failed to generate story" }), {
      status: 500,
      headers,
    });
  }
}
