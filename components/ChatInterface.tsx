"use client"
import { useState, useEffect, useRef } from "react"
import { useChat } from "ai/react"
import type { Theme, GameMode, GameResponse } from "@/types"
import { ChoiceOptions } from './ChatInterface/ChoiceOptions'

interface ChatInterfaceProps {
  theme: Theme
  mode: GameMode
  endpoint: string
  model: string
  context: string
  setStats: (stats: CharacterStats) => void
  initialGameState: GameResponse | null
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
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
export default function ChatInterface({ 
  theme, 
  mode, 
  endpoint, 
  model, 
  context,
  setStats,
  initialGameState 
}: ChatInterfaceProps) {
  const [completedMessages, setCompletedMessages] = useState<Message[]>([]);
  const [gameState, setGameState] = useState<GameResponse | null>(() => {
    if (initialGameState) {
      return initialGameState;
    }
    if (context) {
      console.log("🎲 ChatInterface: Initializing with context:", context);
      return {
        narrative: context,
        storySoFar: context,
        stats: {
          health: 100,
          maxHealth: 100,
          gold: 0,
          inventory: []
        },
        systemLog: {
          decisions: [],
          worldState: {
            alliances: {},
            deadNPCs: [],
            unlockedLocations: [],
            activeQuests: [],
            completedQuests: [],
            reputation: {}
          },
          gameState: {
            currentPhase: 'DISASTER',
            daysSurvived: 0,
            difficulty: 'MEDIUM'
          },
          messageHistory: []
        },
        changes: {
          healthChange: null,
          goldChange: null,
          itemsAdded: null,
          itemsRemoved: null
        },
        choices: []
      };
    }
    return null;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, setInput } = useChat({
    api: '/api/stream-adventure',
    initialMessages: [{
      id: 'initial',
      role: 'system',
      content: 'Begin the adventure with three choices for the player'
    }],
    body: {
      theme,
      endpoint,
      model,
      isNewGame: completedMessages.length === 0
    },
    onResponse: async (response) => {
      if (!response.ok) {
        console.error('Chat response error:', response.statusText);
        return;
      }

      setIsStreaming(true);
      try {
        const data = await response.json();
        console.log("📦 ChatInterface: Parsed response data:", data);
        
        // Update game state with new narrative
        setGameState(prevState => {
          const newState = {
            ...data,
            narrative: data.narrative || prevState?.narrative || "",
            storySoFar: data.storySoFar || data.narrative || prevState?.storySoFar || "",
            stats: {
              ...prevState?.stats,
              health: data.stats?.health ?? prevState?.stats?.health ?? 100,
              gold: data.stats?.gold ?? prevState?.stats?.gold ?? 0,
              inventory: data.stats?.inventory ?? prevState?.stats?.inventory ?? []
            }
          };
          
          // Update parent component's stats
          setStats({
            health: newState.stats.health,
            gold: newState.stats.gold,
            inventory: newState.stats.inventory
          });
          
          return newState;
        });

        // Add both user and AI messages to completed messages
        setCompletedMessages(prev => [
          ...prev,
          {
            id: Date.now().toString() + '-user',
            role: 'user',
            content: input
          },
          {
            id: Date.now().toString() + '-assistant',
            role: 'assistant',
            content: data.narrative || 'No narrative provided'
          }
        ]);

        // Clear input after successful response
        setInput('');
      } catch (error) {
        console.error("❌ ChatInterface: Error processing game response:", error);
      }
      setIsStreaming(false);
    },
  });

  // Add effect to update gameState when context changes
  useEffect(() => {
    if (context) {
      console.log("🔄 ChatInterface: Context updated, updating gameState");
      setGameState(prevState => ({
        ...prevState,
        narrative: context,
        storySoFar: context
      }));
    }
  }, [context]);

  // Add effect to handle initialGameState updates
  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
    }
  }, [initialGameState]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [completedMessages]);

  return (
    <div className="bg-space-dark shadow-lg rounded-lg p-4">
      {/* Adventure story output */}
      <div className="mb-4">
        <h3 className="text-space-accent font-bold mb-2">Current Adventure</h3>
        <textarea
          value={gameState?.narrative || "Your adventure is about to begin..."}
          readOnly
          className="w-full p-2 border rounded bg-space-darker text-gray-200 border-space-primary focus:outline-none min-h-[80px] resize-none opacity-90 cursor-default"
          rows={3}
        />
      </div>

      {/* Chat messages */}
      <div 
        ref={chatContainerRef} 
        className="h-96 overflow-y-auto mb-4 space-y-4 p-2"
      >
        {completedMessages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-space-primary text-white ml-4' 
                  : 'bg-space-darker text-gray-200 mr-4'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        
        {/* Choice Options */}
        {gameState?.choices && gameState.choices.length > 0 && (
          <div className="flex justify-center">
            <ChoiceOptions 
              choices={gameState.choices} 
              onSelect={(choice) => {
                setInput(choice);
                // Use setTimeout to ensure input is set before submitting
                setTimeout(() => {
                  handleSubmit(new Event('submit') as any);
                }, 0);
              }} 
            />
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Type your action..."
          disabled={isStreaming}
          className="flex-grow mr-2 p-2 border rounded bg-space-darker text-gray-200 border-space-primary focus:outline-none focus:ring-2 focus:ring-space-accent min-h-[80px] resize-y w-full disabled:opacity-50"
          rows={3}
        />
        <button 
          type="submit" 
          disabled={isStreaming || !input.trim()}
          className="bg-space-accent text-white p-2 rounded hover:bg-opacity-80 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStreaming ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
}