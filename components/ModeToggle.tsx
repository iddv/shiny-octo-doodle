import type { GameMode } from "@/types"

interface ModeToggleProps {
  mode: GameMode
  setMode: (mode: GameMode) => void
}

export default function ModeToggle({ mode, setMode }: ModeToggleProps) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2 text-space-accent">Game Mode</h2>
      <div className="flex space-x-2">
        <button
          onClick={() => setMode("regular")}
          className={`px-3 py-1 rounded ${mode === "regular" ? "bg-space-accent text-white" : "bg-space-dark text-gray-200 hover:bg-space-primary"}`}
        >
          Regular
        </button>
        <button
          onClick={() => setMode("streaming")}
          className={`px-3 py-1 rounded ${mode === "streaming" ? "bg-space-accent text-white" : "bg-space-dark text-gray-200 hover:bg-space-primary"}`}
        >
          Streaming
        </button>
      </div>
    </div>
  )
}

