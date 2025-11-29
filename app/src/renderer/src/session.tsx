// page to manage welding sessions
// export PDF downloads typeshit
// view session details (welds, config, etc)
export function WeldSession(sessionID: string) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Welding Session Details</h2>
      <p>Session ID: {sessionID}</p>
    </div>
  )
}
