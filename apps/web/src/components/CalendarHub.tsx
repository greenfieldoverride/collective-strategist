import { useState } from 'react'
import { useVentureContext, CalendarEvent } from '../contexts/VentureContext'
import GoogleCalendarConnect from './GoogleCalendarConnect'
import '../styles/calendar-hub.css'

interface CalendarHubProps {
  ventureId: string
}

export default function CalendarHub({ }: CalendarHubProps) {
  const {
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
    getEventsByDateRange,
    calendarConnections,
    syncExternalCalendar,
    notifications,
    getUnreadNotifications
  } = useVentureContext()

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'agenda'>('calendar')
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [filterType, setFilterType] = useState<CalendarEvent['type'] | 'all'>('all')
  const [showConnectModal, setShowConnectModal] = useState(false)

  // Get current month's events
  const currentMonth = new Date(selectedDate)
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString()
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString()
  const monthEvents = getEventsByDateRange(monthStart, monthEnd)

  // Filter events by type
  const filteredEvents = filterType === 'all' 
    ? monthEvents 
    : monthEvents.filter(event => event.type === filterType)

  // Get upcoming events (next 7 days)
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingEvents = getEventsByDateRange(today.toISOString(), nextWeek.toISOString())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  // Calendar grid generation
  const generateCalendarGrid = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const calendar = []
    let currentDate = new Date(startDate)

    for (let week = 0; week < 6; week++) {
      const weekRow = []
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayEvents = filteredEvents.filter(event => 
          event.startDate.split('T')[0] === dateStr
        )
        
        weekRow.push({
          date: new Date(currentDate),
          dateStr,
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: dateStr === new Date().toISOString().split('T')[0],
          events: dayEvents
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      calendar.push(weekRow)
    }

    return calendar
  }

  const handleCreateEvent = () => {
    setSelectedEvent(null)
    setShowEventModal(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
    if (selectedEvent) {
      updateCalendarEvent(selectedEvent.id, eventData)
    } else {
      addCalendarEvent({
        title: eventData.title || '',
        description: eventData.description || '',
        startDate: eventData.startDate || selectedDate,
        endDate: eventData.endDate,
        type: eventData.type || 'meeting',
        source: 'calendar',
        priority: eventData.priority || 'medium',
        status: 'pending',
        assignees: eventData.assignees || []
      })
    }
    setShowEventModal(false)
  }

  const handleDeleteEvent = (eventId: string) => {
    removeCalendarEvent(eventId)
  }

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    const colors = {
      content_deadline: 'bg-red-500',
      content_review: 'bg-orange-500', 
      social_post: 'bg-blue-500',
      meeting: 'bg-green-500',
      milestone: 'bg-purple-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  const getPriorityIcon = (priority: CalendarEvent['priority']) => {
    const icons = {
      low: '🔵',
      medium: '🟡', 
      high: '🟠',
      urgent: '🔴'
    }
    return icons[priority] || '⚪'
  }

  return (
    <div className="calendar-hub">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">📅 Calendar Hub</h2>
            <p className="page-subtitle">Unified scheduling for content, social media, and team coordination</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <span>🔗</span>
              Connect Calendar
            </button>
            <button
              onClick={handleCreateEvent}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>➕</span>
              New Event
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Connections Status */}
      <div className="mb-6 p-4 bg-white rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Calendar Connections</h3>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Connect Calendars
          </button>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${calendarConnections.google?.connected ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-sm">Google Calendar</span>
            {calendarConnections.google?.connected && (
              <button
                onClick={() => syncExternalCalendar('google')}
                className="text-xs text-blue-600 hover:underline"
              >
                Sync
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${calendarConnections.outlook?.connected ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            <span className="text-sm">Outlook Calendar</span>
            {calendarConnections.outlook?.connected && (
              <button
                onClick={() => syncExternalCalendar('outlook')}
                className="text-xs text-blue-600 hover:underline"
              >
                Sync
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['calendar', 'timeline', 'agenda'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-sm ${viewMode === mode ? 'bg-white shadow' : ''}`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CalendarEvent['type'] | 'all')}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">All Events</option>
            <option value="content_deadline">Content Deadlines</option>
            <option value="content_review">Content Reviews</option>
            <option value="social_post">Social Posts</option>
            <option value="meeting">Meetings</option>
            <option value="milestone">Milestones</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          {filteredEvents.length} events this month
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Calendar View */}
        <div className="col-span-8">
          {viewMode === 'calendar' && (
            <div className="bg-white rounded-lg border p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const newDate = new Date(currentMonth)
                      newDate.setMonth(newDate.getMonth() - 1)
                      setSelectedDate(newDate.toISOString().split('T')[0])
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    ←
                  </button>
                  <h3 className="text-lg font-semibold">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => {
                      const newDate = new Date(currentMonth)
                      newDate.setMonth(newDate.getMonth() + 1)
                      setSelectedDate(newDate.toISOString().split('T')[0])
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    →
                  </button>
                </div>
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Today
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="calendar-grid">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar dates */}
                {generateCalendarGrid().map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                    {week.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`
                          min-h-[100px] p-2 border rounded cursor-pointer hover:bg-gray-50
                          ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                          ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                        `}
                        onClick={() => setSelectedDate(day.dateStr)}
                      >
                        <div className="text-sm font-medium mb-1">
                          {day.date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {day.events.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditEvent(event)
                              }}
                              className={`
                                text-xs p-1 rounded text-white cursor-pointer
                                ${getEventTypeColor(event.type)}
                              `}
                            >
                              <span className="mr-1">{getPriorityIcon(event.priority)}</span>
                              {event.title.length > 15 ? event.title.slice(0, 15) + '...' : event.title}
                            </div>
                          ))}
                          {day.events.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{day.events.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'timeline' && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">Timeline View</h3>
              <div className="space-y-4">
                {filteredEvents
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEditEvent(event)}
                  >
                    <div className={`w-4 h-4 rounded-full ${getEventTypeColor(event.type)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.title}</span>
                        <span>{getPriorityIcon(event.priority)}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {event.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(event.startDate).toLocaleDateString()} at {new Date(event.startDate).toLocaleTimeString()}
                      </div>
                      {event.description && (
                        <div className="text-sm text-gray-500 mt-1">{event.description}</div>
                      )}
                    </div>
                    <div className={`
                      text-xs px-2 py-1 rounded
                      ${event.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        event.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        event.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {event.status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'agenda' && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">Agenda View</h3>
              <div className="space-y-6">
                {Object.entries(
                  filteredEvents.reduce((acc, event) => {
                    const date = event.startDate.split('T')[0]
                    if (!acc[date]) acc[date] = []
                    acc[date].push(event)
                    return acc
                  }, {} as Record<string, CalendarEvent[]>)
                ).map(([date, dayEvents]) => (
                  <div key={date}>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h4>
                    <div className="space-y-2 ml-4">
                      {dayEvents
                        .sort((a, b) => a.startDate.localeCompare(b.startDate))
                        .map(event => (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => handleEditEvent(event)}
                        >
                          <div className="text-sm text-gray-600 w-16">
                            {new Date(event.startDate).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{event.title}</span>
                              <span>{getPriorityIcon(event.priority)}</span>
                            </div>
                            {event.description && (
                              <div className="text-sm text-gray-500">{event.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Upcoming Events */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Upcoming Events</h3>
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => handleEditEvent(event)}
                >
                  <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{event.title}</div>
                    <div className="text-xs text-gray-600">
                      {new Date(event.startDate).toLocaleDateString()} at {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span>{getPriorityIcon(event.priority)}</span>
                </div>
              ))}
              {upcomingEvents.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No upcoming events
                </div>
              )}
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">
              Recent Notifications
              {getUnreadNotifications().length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {getUnreadNotifications().length}
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {notifications.slice(0, 5).map(notification => (
                <div
                  key={notification.id}
                  className={`p-2 rounded text-sm ${notification.read ? 'bg-gray-50' : 'bg-blue-50'}`}
                >
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-gray-600 text-xs mt-1">{notification.message}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {new Date(notification.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Type Legend */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Event Types</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Content Deadlines</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Content Reviews</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Social Posts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Meetings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>Milestones</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Creation/Edit Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onSave={handleSaveEvent}
          onClose={() => setShowEventModal(false)}
          onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent.id) : undefined}
        />
      )}

      {/* Calendar Connection Modal */}
      <GoogleCalendarConnect
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={() => {
          // Refresh connections after successful connection
          window.location.reload() // Simple refresh for now
        }}
      />
    </div>
  )
}

// Event Modal Component
interface EventModalProps {
  event: CalendarEvent | null
  onSave: (event: Partial<CalendarEvent>) => void
  onClose: () => void
  onDelete?: () => void
}

function EventModal({ event, onSave, onClose, onDelete }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    startDate: event?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    startTime: event?.startDate ? new Date(event.startDate).toTimeString().slice(0, 5) : '09:00',
    type: event?.type || 'meeting' as CalendarEvent['type'],
    priority: event?.priority || 'medium' as CalendarEvent['priority']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      startDate: `${formData.startDate}T${formData.startTime}:00.000Z`
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {event ? 'Edit Event' : 'Create Event'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as CalendarEvent['type'] })}
              className="w-full p-2 border rounded"
            >
              <option value="meeting">Meeting</option>
              <option value="content_deadline">Content Deadline</option>
              <option value="content_review">Content Review</option>
              <option value="social_post">Social Post</option>
              <option value="milestone">Milestone</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as CalendarEvent['priority'] })}
              className="w-full p-2 border rounded"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {event ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

