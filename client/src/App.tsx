import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/shared/Landingpage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* More routes added here as we build each page */}
      </Routes>
    </BrowserRouter>
  )
}