import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'

// 1. IMPORTACIONES
import { App as CapApp } from '@capacitor/app'
import { supabase } from './lib/supabase'

// 2. IMPORTAMOS EL AIRBAG (Las letras rojas)
// Asegúrate de haber creado este archivo en src/components/ErrorBoundary.jsx
import ErrorBoundary from './components/ErrorBoundary'

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
// COMPONENTE INTERNO: Lógica de Rutas
// ============================================================
function AppRoutes() {
  const navigate = useNavigate();

  // 1. ESCUCHA AUTORITARIA: Supabase nos dice cuándo movernos
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 Auth Event: ${event}`);
      
      if (event === 'SIGNED_IN' && session) {
        console.log("✅ SIGNED_IN confirmado. Navegando...");
        navigate('/dashboard', { replace: true });
      }
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // 2. ESCUCHA DEL DEEP LINK: Solo inyecta datos, NO navega
  useEffect(() => {
    CapApp.addListener('appUrlOpen', async ({ url }) => {
      console.log(`🔗 URL: ${url}`);
      
      try {
        const cleanUrl = url.replace('com.iurisuna.app://', 'http://dummy/');
        const urlObj = new URL(cleanUrl);
        const paramsString = urlObj.hash ? urlObj.hash.substring(1) : urlObj.search;
        const params = new URLSearchParams(paramsString);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken && refreshToken) {
           console.log("🔑 Tokens OK. Inyectando...");
           
           const { error } = await supabase.auth.setSession({
             access_token: accessToken,
             refresh_token: refreshToken,
           });

           if (error) console.error(`❌ Error SetSession: ${error.message}`);
           else console.log("🎉 Inyección OK. Esperando evento...");
        }
      } catch (e) {
          console.error(`💀 Error Fatal: ${e.message}`);
      }
    });
  }, []);

  return (
      <Routes>
        <Route path="/" element={<Login />} />

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
// APP PRINCIPAL: Envuelto en ErrorBoundary (Letras Rojas)
// ============================================================
function App() {
  return (
    // Aquí está el "Airbag" que pediste
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App