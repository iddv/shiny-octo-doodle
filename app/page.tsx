"use client"

import { useState } from "react"
import ChatInterface from "@/components/ChatInterface"
import ThemeSelector from "@/components/ThemeSelector"
import CharacterStats from "@/components/CharacterStats"
import QuickActions from "@/components/QuickActions"
import ModeToggle from "@/components/ModeToggle"
import ModelSelector from "@/components/ModelSelector"
import { llmOptions } from "@/config/llm"
import type { Theme, GameMode, CharacterStats as StatsType } from "@/types"

export default function Home() {
  const [theme, setTheme] = useState<Theme>("Fantasy")
  const [mode, setMode] = useState<GameMode>("regular")
  const [endpoint, setEndpoint] = useState(llmOptions.defaultEndpoint)
  const [model, setModel] = useState(llmOptions.defaultModel)
  const [context, setContext] = useState("")
  const [stats, setStats] = useState<StatsType>({
    health: 100,
    gold: 0,
    inventory: [],
  })
  const [gameState, setGameState] = useState<GameResponse | null>(null)

  const handleLoadAdventure = async () => {
    console.log("🎮 UI: Loading adventure with config:", {
      theme,
      endpoint,
      model
    });

    try {
      const params = new URLSearchParams({
        theme,
        endpoint,
        model,
        newGame: 'true'
      });
      const response = await fetch(`/api/chat?${params}`);
      console.log("📡 UI: Got response:", response.status);
      
      const data = await response.json();
      console.log("📄 UI: Received data:", data);
      
      setContext(data.narrative);
      setStats({
        health: data.stats?.health ?? 100,
        gold: data.stats?.gold ?? 0,
        inventory: data.stats?.inventory ?? []
      });

      const initialGameState = {
        narrative: data.narrative,
        storySoFar: data.narrative,
        stats: data.stats,
        systemLog: data.systemLog,
        changes: data.changes,
        choices: data.choices
      };

      setGameState(initialGameState);
      
      console.log("✅ UI: Game state initialized:", initialGameState);
    } catch (error) {
      console.error("❌ UI: Failed to load adventure:", error);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-space-darker">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-space-accent">AI Adventure Game</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <ChatInterface 
              theme={theme} 
              mode={mode} 
              endpoint={endpoint}
              model={model}
              context={context}
              setStats={setStats}
              initialGameState={gameState}
            />
          </div>
          <div>
            <ModelSelector
              endpoint={endpoint}
              model={model}
              setEndpoint={setEndpoint}
              setModel={setModel}
              onLoad={handleLoadAdventure}
            />
            <ThemeSelector theme={theme} setTheme={setTheme} />
            <CharacterStats stats={stats} />
            <QuickActions />
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
        </div>
      </div>
    </main>
  )
}

