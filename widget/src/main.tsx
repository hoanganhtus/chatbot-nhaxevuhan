import React from 'react'
import ReactDOM from 'react-dom/client'
import ChatWidget from './components/ChatWidget'

// Create a container for the widget
const containerId = 'vuhan-chat-widget'
let container = document.getElementById(containerId)

if (!container) {
  container = document.createElement('div')
  container.id = containerId
  document.body.appendChild(container)
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ChatWidget />
  </React.StrictMode>,
)

// Export for embedding
export { ChatWidget }
