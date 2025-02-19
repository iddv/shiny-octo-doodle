"use client"

import { useState } from "react"
import ChatInterface from "@/components/ChatInterface"
import ThemeSelector from "@/components/ThemeSelector"
import CharacterStats from "@/components/CharacterStats"
import QuickActions from "@/components/QuickActions"
import ModeToggle from "@/components/ModeToggle"
import type { Theme, GameMode, CharacterStats as StatsType } from "@/types"

export default function Home() {
  const [theme, setTheme] = useState<Theme>("Fantasy")
  const [mode, setMode] = useState<GameMode>("regular")
  const [stats, setStats] = useState<StatsType>({
    health: 100,
    gold: 0,
    inventory: [],
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-space-darker">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-space-accent">AI Adventure Game</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <ChatInterface theme={theme} mode={mode} />
          </div>
          <div>
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

