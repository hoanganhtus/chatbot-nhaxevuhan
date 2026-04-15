import { useState, useCallback } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}

export function useChat(apiUrl: string = '/api/chat') {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  })

  const [sessionId] = useState(() => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || state.isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }))

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: content.trim()
        })
      })

      if (!response.ok) {
        throw new Error('Không thể kết nối đến server')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Xin lỗi, có lỗi xảy ra.',
        timestamp: new Date()
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Có lỗi xảy ra'
      }))

      // Add error message to chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Xin lỗi, không thể kết nối. Vui lòng thử lại sau hoặc gọi hotline 0912 037 237.',
        timestamp: new Date()
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage]
      }))
    }
  }, [apiUrl, sessionId, state.isLoading])

  const clearMessages = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null
    })
  }, [])

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearMessages,
    sessionId
  }
}
