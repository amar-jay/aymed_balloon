export function History(): React.JSX.Element {
	const sessions = useSessions()
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Weld History</h2>
    </div>
  )
}
