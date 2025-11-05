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

interface AIConsultantProps {
  ventureId?: string
}

export default function AIConsultantWithVentures({ ventureId }: AIConsultantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi there! I'm here to help you with your venture. Whether you're building a sovereign circle, running a cooperative, or growing a professional business, I can help you with:\n\n• Strategic planning and decision-making\n• Understanding industry trends and opportunities\n• Setting and achieving your collective goals\n• Analyzing your competitive landscape\n\nI'll provide advice that aligns with your venture's values and objectives. What would you like to explore?",
      timestamp: new Date(),
      confidence: 1.0
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>('strategic_advice')
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([
    "How can we attract more aligned community members?",
    "What should we prioritize to achieve our collective goals?",
    "How do we balance liberation principles with sustainability?",
    "What are other successful cooperatives doing differently?"
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

    if (baseResponse.includes('community') || baseResponse.includes('member')) {
      newSuggestions.push("How do we build stronger community engagement?")
      newSuggestions.push("What's the best way to onboard new members?")
    }
    
    if (baseResponse.includes('cooperative') || baseResponse.includes('collective')) {
      newSuggestions.push("How can we improve our collective decision-making?")
      newSuggestions.push("What governance structures work best?")
    }

    if (baseResponse.includes('liberation') || baseResponse.includes('mutual aid')) {
      newSuggestions.push("How do we scale mutual aid efforts?")
      newSuggestions.push("What are sustainable funding models for liberation work?")
    }

    if (baseResponse.includes('goal') || baseResponse.includes('objective')) {
      newSuggestions.push("How do we measure success in our collective work?")
      newSuggestions.push("What's our timeline for achieving this?")
    }

    if (sessionType === 'strategic_advice') {
      newSuggestions.push("How does this align with our core values?")
    } else if (sessionType === 'market_analysis') {
      newSuggestions.push("What do other successful collectives do differently?")
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
      const requestBody: any = {
        sessionType,
        query: currentInput,
        includeMarketData: true
      }

      // Use ventureId if available, fallback to contextualCoreId for backwards compatibility
      if (ventureId) {
        requestBody.ventureId = ventureId
      } else {
        requestBody.contextualCoreId = '12345678-1234-1234-1234-123456789012'
      }

      const response = await fetch('http://localhost:8007/api/v1/ai-consultant/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
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
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment, or let me know if you need help with something specific.",
        timestamp: new Date(),
        sessionType,
        confidence: 0.0
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const useSuggestion = (suggestion: string) => {
    setInputMessage(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="ai-consultant">
      {!ventureId && (
        <div className="warning-banner">
          <span>⚠️ No venture selected. Please select a venture for context-aware advice.</span>
        </div>
      )}
      
      <div className="consultant-header">
        <div className="session-controls">
          <label htmlFor="session-type">Session Type:</label>
          <select
            id="session-type"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as SessionType)}
            disabled={isLoading}
          >
            <option value="strategic_advice">Strategic Advice</option>
            <option value="goal_planning">Goal Planning</option>
            <option value="trend_analysis">Trend Analysis</option>
            <option value="market_analysis">Market Analysis</option>
          </select>
        </div>
      </div>

      <div className="messages-container">
        <div className="messages-list">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">
                    {message.type === 'ai' ? '🤖 AI Consultant' : '👤 You'}
                  </span>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                  {message.confidence !== undefined && (
                    <span className="confidence-score">
                      Confidence: {Math.round(message.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="message-text">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>

                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="message-recommendations">
                    <h4>💡 Recommendations:</h4>
                    <ul>
                      {message.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {message.nextSteps && message.nextSteps.length > 0 && (
                  <div className="message-next-steps">
                    <h4>🎯 Next Steps:</h4>
                    <ol>
                      {message.nextSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai loading">
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">🤖 AI Consultant</span>
                </div>
                <div className="loading-indicator">
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="dismiss-error">×</button>
        </div>
      )}

      <div className="input-section">
        {suggestions.length > 0 && (
          <div className="suggestions">
            <span className="suggestions-label">💡 Try asking:</span>
            <div className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => useSuggestion(suggestion)}
                  className="suggestion-chip"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="input-controls">
          <div className="input-wrapper">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about strategy, goals, trends, or market analysis..."
              disabled={isLoading}
              rows={3}
              data-testid="ai-query-input"
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
              data-testid="send-query-button"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
