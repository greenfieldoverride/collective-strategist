import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  sessionType?: SessionType
  confidence?: number
  recommendations?: string[]
  nextSteps?: string[]
  marketData?: any[]
}

type SessionType = 'strategic_advice' | 'trend_analysis' | 'goal_planning' | 'market_analysis'

interface AIResponse {
  response: string
  confidenceScore: number
  marketDataUsed: any[]
  recommendations: string[]
  nextSteps: string[]
  processingTimeMs: number
}

export default function AIConsultant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi there! I'm here to help you with your business. Whether you're just starting out or looking to grow, I can help you with:\n\n• Growing your business and making it more successful\n• Understanding what's happening in your industry\n• Planning your next steps and setting goals\n• Learning about your competition\n\nI'll give you practical advice that makes sense for your situation. What would you like to talk about?",
      timestamp: new Date(),
      confidence: 1.0
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>('strategic_advice')
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([
    "How can I get more customers?",
    "What should I focus on first to grow my business?",
    "How do I know if my business idea is good?",
    "What are other businesses like mine doing?"
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateSuggestions = (aiResponse: AIResponse, sessionType: SessionType) => {
    const baseResponse = aiResponse.response.toLowerCase()
    let newSuggestions: string[] = []

    if (baseResponse.includes('quarterly') || baseResponse.includes('revenue') || baseResponse.includes('performance')) {
      newSuggestions.push("Why are my trends changing this quarter?")
      newSuggestions.push("How did competitors perform recently?")
    }
    
    if (baseResponse.includes('market') || baseResponse.includes('competition')) {
      newSuggestions.push("What market factors are driving this?")
      newSuggestions.push("Should I adjust my strategy based on this?")
    }

    if (baseResponse.includes('growth') || baseResponse.includes('expansion')) {
      newSuggestions.push("What are the risks with this approach?")
      newSuggestions.push("How should I prioritize these opportunities?")
    }

    if (baseResponse.includes('goal') || baseResponse.includes('objective')) {
      newSuggestions.push("How do I measure success on this?")
      newSuggestions.push("What's my timeline for achieving this?")
    }

    if (sessionType === 'strategic_advice') {
      newSuggestions.push("How does this fit into my long-term vision?")
    } else if (sessionType === 'market_analysis') {
      newSuggestions.push("What do industry leaders do differently?")
    } else if (sessionType === 'goal_planning') {
      newSuggestions.push("Break this down into actionable steps")
    } else if (sessionType === 'trend_analysis') {
      newSuggestions.push("How long will this trend continue?")
    }

    return [...new Set(newSuggestions)].slice(0, 4)
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      sessionType
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8007/api/v1/ai-consultant/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contextualCoreId: '12345678-1234-1234-1234-123456789012',
          sessionType,
          query: currentInput,
          includeMarketData: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const aiData: AIResponse = data.data
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: aiData.response,
            timestamp: new Date(),
            sessionType,
            confidence: aiData.confidenceScore,
            recommendations: aiData.recommendations,
            nextSteps: aiData.nextSteps,
            marketData: aiData.marketDataUsed
          }
          setMessages(prev => [...prev, aiMessage])
          
          const newSuggestions = generateSuggestions(aiData, sessionType)
          if (newSuggestions.length > 0) {
            setSuggestions(newSuggestions)
          }
        } else {
          throw new Error(data.error?.message || 'Failed to get AI response')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to connect to AI consultant')
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error while processing your request. Please try again, or let me know if you\'d like to try a different question.',
        timestamp: new Date(),
        confidence: 0
      }
      setMessages(prev => [...prev, errorMessage])
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      console.error('AI Consultant error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const applySuggestion = (suggestion: string) => {
    setInputMessage(suggestion)
  }

  const sessionTypeLabels = {
    strategic_advice: 'Growing My Business',
    trend_analysis: 'What\'s Happening in My Industry', 
    goal_planning: 'Planning What to Do Next',
    market_analysis: 'Understanding My Competition'
  }

  const sessionTypeDescriptions = {
    strategic_advice: 'Get advice on how to grow, improve, and develop your business',
    trend_analysis: 'Learn about changes and opportunities in your industry',
    goal_planning: 'Figure out your next steps and create actionable plans',
    market_analysis: 'Understand your competitors and find your competitive advantage'
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">🤖 AI Business Consultant</h2>
        <p className="page-subtitle">Get strategic business advice tailored to your context and goals</p>
      </div>

      <div className="ai-session-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <label className="form-label" style={{ margin: 0 }}>Consultation Type:</label>
          <select 
            value={sessionType} 
            onChange={(e) => setSessionType(e.target.value as SessionType)}
            className="session-type-select"
          >
            {Object.entries(sessionTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          {sessionTypeDescriptions[sessionType]}
        </p>
      </div>

      <div className="ai-chat-container">
        <div className="ai-chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'ai' ? '🤖' : '👤'}
              </div>
              <div className="message-content">
                <div className="message-text">
                  {message.type === 'ai' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                  
                  {message.type === 'ai' && message.confidence !== undefined && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      marginTop: '0.5rem',
                      fontStyle: 'italic'
                    }}>
                      Confidence: {(message.confidence * 100).toFixed(0)}%
                    </div>
                  )}

                  {message.recommendations && message.recommendations.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        💡 Key Recommendations:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                        {message.recommendations.map((rec, idx) => (
                          <li key={idx} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {message.nextSteps && message.nextSteps.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        🎯 Next Steps:
                      </div>
                      <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                        {message.nextSteps.map((step, idx) => (
                          <li key={idx} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {message.sessionType && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.6rem', opacity: 0.7 }}>
                      {sessionTypeLabels[message.sessionType]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message ai">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="message-text loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  Analyzing your question and generating insights...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-chat-input">
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              marginBottom: '0.75rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
          
          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask me about ${sessionTypeDescriptions[sessionType].toLowerCase()}...`}
              className="chat-textarea"
              rows={3}
              disabled={isLoading}
            />
            <button 
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
              title="Send message (Enter)"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>

      <div className="ai-suggestions">
        <h4 className="suggestions-title">💡 Suggested Follow-up Questions:</h4>
        <div className="suggestion-buttons">
          {suggestions.map((suggestion, idx) => (
            <button 
              key={idx}
              onClick={() => applySuggestion(suggestion)}
              className="suggestion-btn"
              disabled={isLoading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}