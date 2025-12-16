import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

// Páginas
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Tracker from './pages/tracker/Tracker'
// Importación corregida y añadida para el componente Agenda
import Agenda from './pages/agenda/agenda' 

import Calculator from './pages/tools/Calculator'
import GpaCalculator from './pages/tools/GpaCalculator'
import NoteGenerator from './pages/tools/NoteGenerator'
import Lexicon from './pages/tools/Lexicon'
import LawsSearch from './pages/laws/LawsSearch'
import LawDetails from './pages/laws/LawDetails'
import Marketplace from './pages/tools/marketplace/Marketplace'

// NUEVA IMPORTACIÓN: Librería de Ebooks
import Library from './pages/tools/Library'

// NUEVA IMPORTACIÓN: Noticias IURIS
import NewsFeed from './pages/news/NewsFeed'

// --- NUEVAS IMPORTACIONES: CHAT IURIS ---
import ChatList from './pages/chat/ChatList'
import ChatRoom from './pages/chat/ChatRoom'

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
          <Route path="/agenda" element={<Agenda />} /> 
          
          {/* NUEVA RUTA ADMIN (Solo visible si entras a /admin) */}
          <Route path="/admin" element={<AdminPanel />} />
          
          {/* Herramientas */}
          <Route path="/tools" element={<Calculator />} />
          <Route path="/gpa" element={<GpaCalculator />} />
          <Route path="/notes" element={<NoteGenerator />} />
          <Route path="/lexicon" element={<Lexicon />} />
          <Route path="/market" element={<Marketplace />} />

          {/* NUEVA RUTA: LIBRERÍA DE EBOOKS */}
          <Route path="/library" element={<Library />} />

          {/* NUEVA RUTA: NOTICIAS IURIS */}
          <Route path="/news" element={<NewsFeed />} />
          
          {/* --- RUTAS DE CHAT --- */}
          <Route path="/chat" element={<ChatList />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />

          {/* Leyes */}
          <Route path="/laws" element={<LawsSearch />} />
          <Route path="/laws/:id" element={<LawDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App