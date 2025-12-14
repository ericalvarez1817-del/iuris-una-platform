import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

// Páginas
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Tracker from './pages/tracker/Tracker'
import Calculator from './pages/tools/Calculator'
import GpaCalculator from './pages/tools/GpaCalculator'
import NoteGenerator from './pages/tools/NoteGenerator'
import Lexicon from './pages/tools/Lexicon'
import LawsSearch from './pages/laws/LawsSearch'
import LawDetails from './pages/laws/LawDetails'
import Marketplace from './pages/tools/marketplace/Marketplace'

// IMPORTANTE: Importar el Panel de Administración que creamos
import AdminPanel from './pages/tools/marketplace/AdminPanel'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTA PÚBLICA */}
        <Route path="/" element={<Login />} />

        {/* RUTAS PRIVADAS (Dentro de la App) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracker" element={<Tracker />} />
          
          {/* NUEVA RUTA ADMIN (Solo visible si entras a /admin) */}
          <Route path="/admin" element={<AdminPanel />} />
          
          {/* Herramientas */}
          <Route path="/tools" element={<Calculator />} />
          <Route path="/gpa" element={<GpaCalculator />} />
          <Route path="/notes" element={<NoteGenerator />} />
          <Route path="/lexicon" element={<Lexicon />} />
          <Route path="/market" element={<Marketplace />} />
          
          {/* Leyes */}
          <Route path="/laws" element={<LawsSearch />} />
          <Route path="/laws/:id" element={<LawDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App