import { useState, useEffect } from 'react'

interface Conversation {
  id: string
  title: string
  sessionType: string
  totalMessages: number
  lastActivityAt: string
}

interface ConversationHistoryProps {
  onSelectConversation: (conversation: Conversation) => void
}

export default function ConversationHistory({ onSelectConversation }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8007/api/v1/conversations?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setConversations(data.data.conversations)
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  return (
    <div className="conversation-history">
      <h3>💬 Recent Conversations</h3>
      
      {loading && <div>Loading...</div>}
      
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className="conversation-item"
          onClick={() => onSelectConversation(conversation)}
          style={{
            padding: '0.75rem',
            margin: '0.5rem 0',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>
            {conversation.title}
          </h4>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {conversation.totalMessages} messages • {new Date(conversation.lastActivityAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}