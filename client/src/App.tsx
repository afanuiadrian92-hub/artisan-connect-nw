import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/shared/LandingPage'
import LoginPage from './pages/shared/LoginPage'
import RegisterPage from './pages/shared/RegisterPage'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import ArtisanDashboard from './pages/artisan/ArtisanDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/artisan/dashboard" element={<ArtisanDashboard />} />
        {/* More routes added here as we build each page */}
      </Routes>
    </BrowserRouter>
  )
}