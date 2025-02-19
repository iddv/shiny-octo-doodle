export default function QuickActions() {
  const actions = ["Attack", "Defend", "Use Item", "Run"]

  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2 text-space-accent">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action}
            className="bg-space-dark hover:bg-space-primary text-gray-200 px-3 py-1 rounded transition-colors"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}

