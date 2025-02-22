"use client"
import { useState, useEffect, useRef } from "react"
import { useChat } from "ai/react"
import type { Theme, GameMode } from "@/types"

interface ChatInterfaceProps {
  theme: Theme
  mode: GameMode
  endpoint: string
  model: string
  context: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface GameState {
  stats: {
    health: number;
    maxHealth: number;
    gold: number;
    inventory: string[];
  };
  narrative: string;
  storySoFar: string;
  systemLog: {
    decisions: Array<{
      timestamp: string;
      type: string;
      description: string;
      consequences: string[];
      affectedNPCs: string[];
      flags: {
        isBetrayal: boolean;
        isKilling: boolean;
        isHeroic: boolean;
        isPermanent: boolean;
      };
    }>;
    worldState: {
      alliances: Record<string, 'friendly' | 'hostile' | 'neutral'>;
      deadNPCs: string[];
      unlockedLocations: string[];
      activeQuests: string[];
      completedQuests: string[];
      reputation: Record<string, number>;
    };
    gameState: {
      currentPhase: 'DISASTER' | 'SURVIVAL' | 'CHALLENGE' | 'VICTORY';
      daysSurvived: number;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    };
  };
  changes: {
    healthChange: number | null;
    goldChange: number | null;
    itemsAdded: string[] | null;
    itemsRemoved: string[] | null;
  };
  choices: Array<{
    id: number;
    text: string;
    preview: string;
  }>;
}

/**
 * ChatInterface component for rendering a chat interface with streaming capabilities.
 * 
 * This component handles the display of chat messages, streaming of incoming messages,
 * and user input for sending new messages. It uses the useChat hook for managing
 * chat state and communication with the server.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {Theme} props.theme - The current theme of the application.
 * @param {GameMode} props.mode - The current game mode.
 * @returns {JSX.Element} A React component that renders the chat interface.
 */
export default function ChatInterface({ theme, mode, endpoint, model, context }: ChatInterfaceProps) {
  const [completedMessages, setCompletedMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const streamingContentRef = useRef("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/stream-adventure',
    onResponse: async (response) => {
      if (!response.ok) {
        console.error('Chat response error:', response.statusText);
        return;
      }

      setIsStreaming(true);
      try {
        const data = await response.json();
        setGameState(prevState => {
          // Update game state with new data
          const newState = {
            ...data,
            stats: {
              ...prevState?.stats,
              health: data.stats.health,
              gold: data.stats.gold,
              inventory: data.stats.inventory,
            }
          };

          // Handle changes
          if (data.changes) {
            if (data.changes.healthChange) {
              console.log(`Health changed by ${data.changes.healthChange}`);
            }
            if (data.changes.goldChange) {
              console.log(`Gold changed by ${data.changes.goldChange}`);
            }
            if (data.changes.itemsAdded?.length) {
              console.log(`Items added: ${data.changes.itemsAdded.join(', ')}`);
            }
            if (data.changes.itemsRemoved?.length) {
              console.log(`Items removed: ${data.changes.itemsRemoved.join(', ')}`);
            }
          }

          return newState;
        });

        // Add the response to completed messages
        setCompletedMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.narrative
          }
        ]);
      } catch (error) {
        console.error("Error processing game response:", error);
      }
      setIsStreaming(false);
    },
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [completedMessages, streamingContent]);
useEffect(() => {
  console.log("useChat messages:", messages);
}, [messages]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: input
      };
      setCompletedMessages(prev => [...prev, userMessage]);
      
      // Add message parameter to the request
      const response = await fetch(`/api/chat?message=${encodeURIComponent(input)}&newGame=${!completedMessages.length}`);
      // ... rest of the handling
    } catch (error) {
      console.error('Chat submission error:', error);
      setIsStreaming(false);
    }
  };

  return (
    <div className="bg-space-dark shadow-lg rounded-lg p-4">
      {/* Game Stats Display */}
      {gameState && (
        <div className="mb-4 p-4 bg-space-darker rounded-lg">
          <h3 className="text-space-accent font-bold mb-2">Game Stats</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>❤️ Health: {gameState.stats.health}/{gameState.stats.maxHealth}</div>
            <div>💰 Gold: {gameState.stats.gold}</div>
            <div className="col-span-2">
              🎒 Inventory: {gameState.stats.inventory.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Story Context */}
      {gameState?.storySoFar && (
        <div className="mb-4 p-4 bg-space-darker rounded-lg">
          <h3 className="text-space-accent font-bold mb-2">Story So Far</h3>
          <p className="text-gray-200">{gameState.storySoFar}</p>
        </div>
      )}

      {/* Adventure story output */}
      <div className="mb-4">
        <h3 className="text-space-accent font-bold mb-2">Current Adventure</h3>
        <textarea
          value={(() => {
            console.log("🔍 Debug - All props:", { completedMessages, context });
            console.log("🔍 Debug - First message:", completedMessages[0]);
            console.log("🔍 Debug - Context:", context);
            
            const displayValue = completedMessages[0]?.content || context?.content || "No adventure loaded yet...";
            console.log("🔍 Debug - Display value:", displayValue);
            
            return displayValue;
          })()}
          readOnly
          className="w-full p-2 border rounded bg-space-darker text-gray-200 border-space-primary focus:outline-none min-h-[80px] resize-none opacity-90 cursor-default"
          rows={3}
        />
      </div>

      <div ref={chatContainerRef} className="h-96 overflow-y-auto mb-4 space-y-4">
        {completedMessages.length === 0 && <div>No messages yet</div>}
        {completedMessages.map((message) => (
          <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${
              message.role === 'user' ? 'bg-space-primary text-white' : 'bg-space-darker text-gray-200'
            }`}>
              {message.content}
            </span>
          </div>
        ))}
        {streamingContent && (
          <div className="text-left mb-2">
            <span className="inline-block p-2 rounded-lg bg-space-darker text-gray-200">
              [Streaming]: {streamingContent}
            </span>
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Type your action..."
          className="flex-grow mr-2 p-2 border rounded bg-space-darker text-gray-200 border-space-primary focus:outline-none focus:ring-2 focus:ring-space-accent min-h-[80px] resize-y w-full"
          rows={3}
        />
        <button 
          type="submit" 
          className="bg-space-accent text-white p-2 rounded hover:bg-opacity-80 transition-colors w-full"
        >
          Send
        </button>
      </form>
    </div>
  )
}