import { useState } from 'react'
import { Button } from './ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from './ui/field'
import { Input } from './ui/input'
import { toast } from 'sonner'

export function CreateSessionForm({ setSessionId }: { setSessionId: (sessionId: number) => void }) {
  const [loading, setLoading] = useState(false)
  const handleOnStartSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const operatorName = formData.get('operator-name') as string
    const companyName = formData.get('company-name') as string
    try {
      const sessionId = await window.api.DBcreateSession({
        operatorName,
        companyName,
        averageBottomHeaterTemperature: 0,
        averageTopHeaterTemperature: 0,
        averagePowerSupplyVoltage: 0,
        welds: [],
        failureCount: 0,
        successCount: 0,
        startSession: Date.now().toString()
      })
      setSessionId(sessionId as number)
    } catch {
      toast.error('Failed to create session')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="w-full max-w-lg">
      <form onSubmit={handleOnStartSession}>
        <FieldGroup className="gap-0">
          <FieldSet className="gap-0">
            <FieldLegend>Welding Session</FieldLegend>
            <FieldDescription className="mb-0">Start a daily welding session</FieldDescription>
            <FieldGroup className="gap-3">
              <Field className="gap-0">
                <FieldLabel htmlFor="operator-name-7j9-card-name-43j">Operator</FieldLabel>
                <Input
                  id="operator-name-7j9-card-name-43j"
                  name="operator-name"
                  placeholder="Amar Jay"
                  disabled={loading}
                  required
                />
                <FieldDescription>Enter your balloon machine operator identifier</FieldDescription>
              </Field>
              <Field className="gap-0">
                <FieldLabel htmlFor="company-name-7j9-card-number-uw1">Company</FieldLabel>
                <Input
                  id="company-name-7j9-card-number-uw1"
                  name="company-name"
                  placeholder="Aymed Medikal Teknoloji"
                  disabled={loading}
                  required
                />
                <FieldDescription>Enter your company name</FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
          {/* <FieldSeparator /> */}
          <Field orientation="horizontal" className="justify-end mt-4">
            <Button type="submit" disabled={loading}>
              Start Session
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
