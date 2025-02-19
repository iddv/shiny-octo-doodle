import type { Theme } from "@/types"

interface ThemeSelectorProps {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export default function ThemeSelector({ theme, setTheme }: ThemeSelectorProps) {
  const themes: Theme[] = ["Fantasy", "Sci-Fi", "Horror"]

  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2 text-space-accent">Theme</h2>
      <div className="flex space-x-2">
        {themes.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-3 py-1 rounded ${theme === t ? "bg-space-accent text-white" : "bg-space-dark text-gray-200 hover:bg-space-primary"}`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

