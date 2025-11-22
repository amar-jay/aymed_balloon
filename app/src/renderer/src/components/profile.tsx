import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Settings, LogOut, Dot } from 'lucide-react'
import { SettingsDialog } from './settings-dialog'

function Profile({
  selectedPage,
  setSelectedPage
}: {
  selectedPage: 'serial-monitor' | 'dashboard'
  setSelectedPage: (page: 'serial-monitor' | 'dashboard') => void
}): React.JSX.Element {
  const [showSettings, setShowSettings] = React.useState(false)

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log('Logout clicked')
  }

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src="" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className='text-blue-800'>Aymed Medikal Teknoloji</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSelectedPage('dashboard')}>
            <span>Dashboard</span>
            {selectedPage === 'dashboard' && <Dot className="mr-2 h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedPage('serial-monitor')}>
            <span>Serial Monitor</span>
            {selectedPage === 'serial-monitor' && <Dot className="mr-2 h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}

export { Profile }
