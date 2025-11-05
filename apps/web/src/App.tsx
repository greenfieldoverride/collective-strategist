import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardWithVentures from './pages/DashboardWithVentures'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<DashboardWithVentures />} />
        <Route path="/ai-consultant" element={<DashboardWithVentures />} />
        <Route path="/integrations" element={<DashboardWithVentures />} />
        <Route path="/impact" element={<DashboardWithVentures />} />
        <Route path="/billing" element={<DashboardWithVentures />} />
        <Route path="/content" element={<DashboardWithVentures />} />
        <Route path="/social" element={<DashboardWithVentures />} />
        <Route path="/calendar" element={<DashboardWithVentures />} />
      </Routes>
    </Router>
  )
}

export default App
