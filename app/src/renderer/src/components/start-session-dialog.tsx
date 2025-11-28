import * as React from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Field, FieldContent, FieldLabel } from './ui/field'
import { SessionData, sessionManager } from '../lib/session-manager'
import { toast } from 'sonner'

interface StartSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionStarted: (session: SessionData) => void
  config: any
}

export function StartSessionDialog({
  open,
  onOpenChange,
  onSessionStarted,
  config
}: StartSessionDialogProps) {
  const [operatorName, setOperatorName] = React.useState('')
  const [batchNumber, setBatchNumber] = React.useState('')
  const [productType, setProductType] = React.useState('')

  const handleStart = () => {
    if (!operatorName.trim()) {
      toast.error('Operator name is required')
      return
    }

    const session = sessionManager.startSession(
      operatorName.trim(),
      batchNumber.trim() || undefined,
      productType.trim() || undefined,
      config
    )

    toast.success('Session Started', {
      description: `Session ${session.id} has been started`
    })

    onSessionStarted(session)
    onOpenChange(false)

    // Reset form
    setOperatorName('')
    setBatchNumber('')
    setProductType('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Welding Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Field>
            <FieldLabel>Operator Name *</FieldLabel>
            <FieldContent>
              <Input
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Enter operator name"
                autoFocus
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Batch Number</FieldLabel>
            <FieldContent>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g., BATCH-2024-001"
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Product Type</FieldLabel>
            <FieldContent>
              <Input
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="e.g., Medical Tubing Type A"
              />
            </FieldContent>
          </Field>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <div className="font-semibold mb-2">Current Configuration:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Op Time: {config?.opTime || 0}s</div>
              <div>Cool Time: {config?.coTime || 0}s</div>
              <div>Top Temp: {config?.topTempThreshold || 0}°C</div>
              <div>Bottom Temp: {config?.bottomTempThreshold || 0}°C</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart}>Start Session</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
