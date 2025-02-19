import type { CharacterStats } from "@/types"

interface CharacterStatsProps {
  stats: CharacterStats
}

export default function CharacterStats({ stats }: CharacterStatsProps) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2 text-space-accent">Character Stats</h2>
      <div className="bg-space-dark shadow-lg rounded-lg p-4">
        <p>
          Health: <span className="text-space-accent">{stats.health}</span>
        </p>
        <p>
          Gold: <span className="text-space-accent">{stats.gold}</span>
        </p>
        <h3 className="font-bold mt-2 text-space-accent">Inventory:</h3>
        <ul className="list-disc list-inside text-gray-300">
          {stats.inventory.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

