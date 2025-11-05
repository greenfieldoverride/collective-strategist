import { useState } from 'react'
import { useVentureContext } from '../contexts/VentureContext'

interface GoogleCalendarConnectProps {
  isOpen: boolean
  onClose: () => void
  onConnected: () => void
}

export default function GoogleCalendarConnect({ isOpen, onClose, onConnected }: GoogleCalendarConnectProps) {
  const { connectCalendar, calendarConnections } = useVentureContext()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleConnect = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      
      // Start Google OAuth flow
      await connectCalendar('google')
      
      // Note: The actual connection completion happens via redirect/popup
      // For now, we'll simulate the connection after OAuth
      onConnected()
      onClose()
    } catch (err) {
      setError('Failed to connect Google Calendar. Please try again.')
      console.error('Google Calendar connection error:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleOutlookConnect = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      
      // Start Outlook OAuth flow
      await connectCalendar('outlook')
      
      onConnected()
      onClose()
    } catch (err) {
      setError('Failed to connect Outlook Calendar. Please try again.')
      console.error('Outlook Calendar connection error:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Connect Calendar</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Google Calendar */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                  <span className="text-white text-sm">G</span>
                </div>
                <div>
                  <h3 className="font-medium">Google Calendar</h3>
                  <p className="text-sm text-gray-600">Sync your Google Calendar events</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {calendarConnections.google?.connected ? (
                  <span className="text-green-600 text-sm font-medium">Connected</span>
                ) : (
                  <button
                    onClick={handleGoogleConnect}
                    disabled={isConnecting}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
            {calendarConnections.google?.connected && (
              <div className="text-xs text-gray-500">
                Last synced: {calendarConnections.google.lastSync ? 
                  new Date(calendarConnections.google.lastSync).toLocaleDateString() : 
                  'Never'
                }
              </div>
            )}
          </div>

          {/* Outlook Calendar */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-sm">O</span>
                </div>
                <div>
                  <h3 className="font-medium">Outlook Calendar</h3>
                  <p className="text-sm text-gray-600">Sync your Outlook Calendar events</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {calendarConnections.outlook?.connected ? (
                  <span className="text-green-600 text-sm font-medium">Connected</span>
                ) : (
                  <button
                    onClick={handleOutlookConnect}
                    disabled={isConnecting}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
            {calendarConnections.outlook?.connected && (
              <div className="text-xs text-gray-500">
                Last synced: {calendarConnections.outlook.lastSync ? 
                  new Date(calendarConnections.outlook.lastSync).toLocaleDateString() : 
                  'Never'
                }
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}