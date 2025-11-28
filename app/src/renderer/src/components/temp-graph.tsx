import { SystemData } from 'src/lib/types/minibuf'

export function TempGraph({
  name,
  pastSystemData
}: {
  name: 'Top' | 'Bottom'
  pastSystemData: SystemData[]
}) {
  return (
    <div>
      {/* Implement the graph rendering logic here using pastSystemData */}
      <p>Graph for {name} Temperature</p>
      <pre>{JSON.stringify(pastSystemData, null, 2)}</pre>
    </div>
  )
}
