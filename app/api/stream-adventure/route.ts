import { ChatOllama } from "@langchain/ollama"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import type { GameResponse } from "@/types/game"
import { ADVENTURE_PROMPT } from "@/lib/prompts/adventure"

export const runtime = "edge"

// Create a singleton chat client
let chatClient: ChatOllama | null = null;
let messageHistory: Array<HumanMessage | SystemMessage | AIMessage> = [];
let gameState: GameResponse | null = null;

// Helper function to clean and parse LLM response
async function parseGameResponse(content: string): Promise<GameResponse> {
  console.log("🧹 API: Raw content:", content);
  
  try {
    // First, try to find any JSON-like structure
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ API: No JSON structure found in content");
      throw new Error("No JSON content found in response");
    }

    // Extract the JSON part and parse it
    let jsonContent = jsonMatch[0];
    
    // Remove any think tags and their content that might be inside the JSON
    jsonContent = jsonContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove complete think blocks
      .replace(/<think>/g, '')                    // Remove any orphaned opening tags
      .replace(/<\/think>/g, '')                  // Remove any orphaned closing tags
      .trim();

    // Clean up any potential double-encoded content
    jsonContent = jsonContent
      .replace(/\\<think\\>[\s\S]*?\\<\/think\\>/g, '')
      .replace(/\\<think\\>/g, '')
      .replace(/\\<\/think\\>/g, '');

    console.log("🧹 API: Cleaned JSON content:", jsonContent);

    const gameResponse = JSON.parse(jsonContent);
    
    // Validate required fields
    if (!gameResponse.stats || !gameResponse.narrative || !gameResponse.choices) {
      throw new Error("Missing required fields in game response");
    }

    // Ensure all required fields exist with defaults if needed
    return {
      stats: {
        health: gameResponse.stats.health ?? 100,
        maxHealth: gameResponse.stats.maxHealth ?? 100,
        gold: gameResponse.stats.gold ?? 0,
        inventory: gameResponse.stats.inventory ?? []
      },
      narrative: gameResponse.narrative,
      storySoFar: gameResponse.storySoFar || gameResponse.narrative,
      systemLog: {
        decisions: gameResponse.systemLog?.decisions ?? [],
        worldState: {
          alliances: gameResponse.systemLog?.worldState?.alliances ?? {},
          deadNPCs: gameResponse.systemLog?.worldState?.deadNPCs ?? [],
          unlockedLocations: gameResponse.systemLog?.worldState?.unlockedLocations ?? [],
          activeQuests: gameResponse.systemLog?.worldState?.activeQuests ?? [],
          completedQuests: gameResponse.systemLog?.worldState?.completedQuests ?? [],
          reputation: gameResponse.systemLog?.worldState?.reputation ?? {}
        },
        gameState: {
          currentPhase: gameResponse.systemLog?.gameState?.currentPhase ?? 'DISASTER',
          daysSurvived: gameResponse.systemLog?.gameState?.daysSurvived ?? 0,
          difficulty: gameResponse.systemLog?.gameState?.difficulty ?? 'MEDIUM'
        },
        messageHistory: gameResponse.systemLog?.messageHistory ?? []
      },
      changes: {
        healthChange: gameResponse.changes?.healthChange ?? null,
        goldChange: gameResponse.changes?.goldChange ?? null,
        itemsAdded: gameResponse.changes?.itemsAdded ?? null,
        itemsRemoved: gameResponse.changes?.itemsRemoved ?? null
      },
      choices: gameResponse.choices
    };
  } catch (error) {
    console.error("❌ API: Failed to parse game response:", error);
    console.error("❌ API: Raw content was:", content);
    throw new Error(`Failed to parse game response: ${error.message}`);
  }
}

export async function POST(req: Request) {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  try {
    const { messages, theme, endpoint, model, isNewGame } = await req.json();

    // Initialize or reset chat client if needed
    if (!chatClient || isNewGame) {
      chatClient = new ChatOllama({
        baseUrl: endpoint,
        model: model,
      });
      
      // Reset message history but keep it for our records
      messageHistory = [
        new SystemMessage(ADVENTURE_PROMPT.replace('${theme}', theme)),
      ];
    }

    // Get just the latest user message
    const latestMessage = messages[messages.length - 1].content;

    // Send only system prompt and current message to LLM
    const promptMessages = [
      messageHistory[0], // System prompt
      new HumanMessage(latestMessage)
    ];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use minimal context for LLM
          const result = await chatClient.invoke(promptMessages);
          console.log("🎯 API: Raw LLM response:", result.content);
          
          // Store in our history after successful response
          messageHistory.push(new HumanMessage(latestMessage));
          messageHistory.push(new AIMessage(result.content));

          // Use the helper function to parse response
          const parsedResponse = await parseGameResponse(result.content);
          console.log("✨ API: Parsed game response:", parsedResponse);

          // Add message history to system log
          parsedResponse.systemLog = {
            ...parsedResponse.systemLog,
            messageHistory: messageHistory.map(msg => ({
              role: msg instanceof SystemMessage ? 'system' : 
                    msg instanceof HumanMessage ? 'user' : 'assistant',
              content: msg.content
            }))
          };

          // Stream the response in chunks
          const text = JSON.stringify(parsedResponse);
          const chunkSize = 100;
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          // Update game state
          gameState = parsedResponse;
          
          controller.close();
        } catch (error) {
          console.error("❌ API: Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("❌ API: Error during streaming:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate story",
        details: error instanceof Error ? error.message : "Unknown error"
      }), 
      {
        status: 500,
        headers,
      }
    );
  }
}
