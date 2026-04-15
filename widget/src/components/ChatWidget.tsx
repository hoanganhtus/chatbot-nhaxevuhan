import { useState, useRef, useEffect } from 'react'
import { useChat } from '../hooks/useChat'
import './ChatWidget.css'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isLoading, sendMessage } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initial greeting
  const [showGreeting, setShowGreeting] = useState(true)

  const allMessages = showGreeting && messages.length === 0
    ? [{
        id: 'greeting',
        role: 'assistant' as const,
        content: 'Dạ em chào anh/chị ạ! 👋\nEm là trợ lý ảo của Nhà xe Vũ Hán. Anh/chị cần em hỗ trợ gì ạ?\n\n• Đặt vé xe\n• Xem lịch chạy\n• Hỏi giá vé\n• Gửi hàng',
        timestamp: new Date()
      }]
    : messages

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    setShowGreeting(false)
    sendMessage(input)
    setInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickReplies = [
    'Đặt vé đi Hà Giang',
    'Giá vé Limousine',
    'Lịch xe hôm nay'
  ]

  return (
    <div className="vuhan-widget">
      {/* Chat Window */}
      {isOpen && (
        <div className="vuhan-widget-window">
          {/* Header */}
          <div className="vuhan-widget-header">
            <div className="vuhan-widget-header-info">
              <div className="vuhan-widget-avatar">🚌</div>
              <div>
                <div className="vuhan-widget-title">Nhà xe Vũ Hán</div>
                <div className="vuhan-widget-status">
                  <span className="vuhan-widget-status-dot"></span>
                  Trực tuyến
                </div>
              </div>
            </div>
            <button className="vuhan-widget-close" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="vuhan-widget-messages">
            {allMessages.map((msg) => (
              <div
                key={msg.id}
                className={`vuhan-widget-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="vuhan-widget-bubble">
                  {msg.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="vuhan-widget-message assistant">
                <div className="vuhan-widget-bubble vuhan-widget-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length === 0 && (
            <div className="vuhan-widget-quick-replies">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setShowGreeting(false)
                    sendMessage(reply)
                  }}
                  disabled={isLoading}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="vuhan-widget-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="vuhan-widget-send"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        className={`vuhan-widget-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Đóng chat' : 'Mở chat'}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
            <circle cx="12" cy="10" r="1.5" />
            <circle cx="8" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
          </svg>
        )}
      </button>
    </div>
  )
}
