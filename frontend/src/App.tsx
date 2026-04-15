import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import RouteChecker from './pages/RouteChecker'
import ScheduleViewer from './pages/ScheduleViewer'
import ChatTester from './pages/ChatTester'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <h1>🚌 Nhà xe Vũ Hán - Route Console</h1>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              Kiểm tra tuyến
            </NavLink>
            <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''}>
              Xem lịch chạy
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
              Test Chatbot
            </NavLink>
          </div>
        </nav>
        
        <main className="container">
          <Routes>
            <Route path="/" element={<RouteChecker />} />
            <Route path="/schedule" element={<ScheduleViewer />} />
            <Route path="/chat" element={<ChatTester />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
