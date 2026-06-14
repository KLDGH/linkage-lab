import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SiteNav from './components/SiteNav'
import ToolsPage from './pages/ToolsPage'
import LearnPage from './pages/LearnPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <SiteNav />
        <Routes>
          <Route path="/" element={<ToolsPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
        <footer className="footer">
          <span>SOLITAIRE DYNAMICS · spring rates are theoretical — always validate with your specific bike geometry</span>
        </footer>
      </div>
    </BrowserRouter>
  )
}
