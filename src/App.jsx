import { BrowserRouter, Routes, Route } from 'react-router-dom'

// COMPONENTE DE SEGURIDAD (El Guardia)
import ProtectedRoute from './components/ProtectedRoute'

import AppLayout from './components/layout/AppLayout'

// Páginas
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Tracker from './pages/tracker/Tracker'
import Agenda from './pages/agenda/agenda' 

import Calculator from './pages/tools/Calculator'
import GpaCalculator from './pages/tools/GpaCalculator'
import NoteGenerator from './pages/tools/NoteGenerator'
import Lexicon from './pages/tools/Lexicon'
import LawsSearch from './pages/laws/LawsSearch'
import LawDetails from './pages/laws/LawDetails'
import Marketplace from './pages/tools/marketplace/Marketplace'

// Librería de Ebooks
import Library from './pages/tools/Library'

// Noticias IURIS
import NewsFeed from './pages/news/NewsFeed'

// --- CHAT IURIS ---
import ChatList from './pages/chat/ChatList'
import ChatRoom from './pages/chat/ChatRoom'

// Panel de Administración
import AdminPanel from './pages/tools/marketplace/AdminPanel'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTA PÚBLICA (Solo Login es accesible sin sesión) */}
        <Route path="/" element={<Login />} />

        {/* 🔒 RUTAS PROTEGIDAS (Requieren Sesión Activa) */}
        <Route element={<ProtectedRoute />}>
          
          {/* Si pasa la seguridad, mostramos el Layout (Menú lateral, etc) */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/agenda" element={<Agenda />} /> 
            
            {/* Admin */}
            <Route path="/admin" element={<AdminPanel />} />
            
            {/* Herramientas */}
            <Route path="/tools" element={<Calculator />} />
            <Route path="/gpa" element={<GpaCalculator />} />
            <Route path="/notes" element={<NoteGenerator />} />
            <Route path="/lexicon" element={<Lexicon />} />
            <Route path="/market" element={<Marketplace />} />

            {/* Librería */}
            <Route path="/library" element={<Library />} />

            {/* Noticias */}
            <Route path="/news" element={<NewsFeed />} />
            
            {/* Chat */}
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:roomId" element={<ChatRoom />} />

            {/* Leyes */}
            <Route path="/laws" element={<LawsSearch />} />
            <Route path="/laws/:id" element={<LawDetails />} />
          </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App