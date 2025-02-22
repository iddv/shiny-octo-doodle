import { useState, useEffect, useRef } from "react"
import { useChat } from "ai/react"
import type { Theme, GameMode, GameResponse } from "@/types"
import { ChatView } from "./ChatView"

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

export default function ChatInterface({ theme, mode, endpoint, model, context }: ChatInterfaceProps) {
  const [completedMessages, setCompletedMessages] = useState<Message[]>([]);
  const [gameState, setGameState] = useState<GameResponse | null>(() => {
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
      content: 'Begin the adventure'
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
        
        setGameState(prevState => {
          const newState = {
            ...prevState,
            narrative: data.narrative || prevState?.narrative || "",
            storySoFar: data.storySoFar || data.narrative || prevState?.storySoFar || "",
            stats: {
              ...prevState?.stats,
              health: data.stats?.health ?? prevState?.stats?.health ?? 100,
              maxHealth: data.stats?.maxHealth ?? prevState?.stats?.maxHealth ?? 100,
              gold: data.stats?.gold ?? prevState?.stats?.gold ?? 0,
              inventory: data.stats?.inventory ?? prevState?.stats?.inventory ?? []
            },
            systemLog: {
              ...prevState?.systemLog,
              ...data.systemLog
            },
            changes: {
              ...prevState?.changes,
              ...data.changes
            },
            choices: data.choices || []
          };
          return newState;
        });

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

        setInput('');
      } catch (error) {
        console.error("❌ ChatInterface: Error processing game response:", error);
      }
      setIsStreaming(false);
    },
  });

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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [completedMessages]);

  return (
    <ChatView
      gameState={gameState}
      completedMessages={completedMessages}
      isStreaming={isStreaming}
      input={input}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      chatContainerRef={chatContainerRef}
    />
  );
} 