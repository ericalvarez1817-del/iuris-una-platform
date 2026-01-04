import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'

// 1. IMPORTACIONES
import { supabase } from './lib/supabase'

// 2. IMPORTAMOS EL AIRBAG
import ErrorBoundary from './components/ErrorBoundary'

// 3. IMPORTAMOS EL GESTOR DE NOTIFICACIONES
import { initNotifications } from './lib/notifications'

// 4. IMPORTAMOS LA PANTALLA DE CARGA
// Asegúrate de que src/pages/LoadLaws.jsx exista
import LoadLaws from './pages/LoadLaws'

// COMPONENTE DE SEGURIDAD
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
import Library from './pages/tools/Library'
import NewsFeed from './pages/news/NewsFeed'
import ChatList from './pages/chat/ChatList'
import ChatRoom from './pages/chat/ChatRoom'
import AdminPanel from './pages/tools/marketplace/AdminPanel'

// ============================================================
// COMPONENTE INTERNO: Lógica de Rutas Web
// ============================================================
function AppRoutes() {
  const navigate = useNavigate();

  // 1. INICIALIZAR NOTIFICACIONES WEB
  useEffect(() => {
    initNotifications(); 
  }, []);

  // 2. ESCUCHA DE SESIÓN
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 Evento Web: ${event}`);
      
      if (event === 'SIGNED_IN' && session) {
        if (window.location.pathname === '/') {
           navigate('/dashboard', { replace: true });
        }
      }
      
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* --- RUTA SECRETA DE CARGA --- */}
        {/* CORREGIDO: Se usa <LoadLaws /> sin el .jsx */}
        <Route path="/secret-upload" element={<LoadLaws />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/agenda" element={<Agenda />} /> 
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/tools" element={<Calculator />} />
            <Route path="/gpa" element={<GpaCalculator />} />
            <Route path="/notes" element={<NoteGenerator />} />
            <Route path="/lexicon" element={<Lexicon />} />
            <Route path="/market" element={<Marketplace />} />
            <Route path="/library" element={<Library />} />
            <Route path="/news" element={<NewsFeed />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:roomId" element={<ChatRoom />} />
            <Route path="/laws" element={<LawsSearch />} />
            <Route path="/laws/:id" element={<LawDetails />} />
          </Route>
        </Route>
      </Routes>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App