import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'

// 1. IMPORTACIONES
import { App as CapApp } from '@capacitor/app'
import { supabase } from './lib/supabase'

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
// COMPONENTE INTERNO: Lógica reactiva + Debugger
// ============================================================
function AppRoutes() {
  const navigate = useNavigate();
  
  // ESTADO PARA DEBUG (Para ver qué pasa si se congela)
  const [logs, setLogs] = useState(["Iniciando App..."]);

  const addLog = (msg) => {
    console.log(msg);
    setLogs(prev => [...prev.slice(-4), msg]); // Guarda los últimos 5 mensajes
  };

  // 1. ESCUCHA AUTORITARIA: Supabase nos dice cuándo movernos
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`🔐 Auth Event: ${event}`);
      
      if (event === 'SIGNED_IN' && session) {
        addLog("✅ SIGNED_IN confirmado. Navegando...");
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
      addLog(`🔗 URL: ${url.slice(0, 20)}...`);
      
      try {
        const cleanUrl = url.replace('com.iurisuna.app://', 'http://dummy/');
        const urlObj = new URL(cleanUrl);
        const paramsString = urlObj.hash ? urlObj.hash.substring(1) : urlObj.search;
        const params = new URLSearchParams(paramsString);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken && refreshToken) {
           addLog("🔑 Tokens OK. Inyectando...");
           
           const { error } = await supabase.auth.setSession({
             access_token: accessToken,
             refresh_token: refreshToken,
           });

           if (error) addLog(`❌ Error: ${error.message}`);
           else addLog("🎉 Inyección OK. Esperando evento...");
        } else {
            addLog("⚠️ Sin tokens en URL");
        }
      } catch (e) {
          addLog(`💀 Error Fatal: ${e.message}`);
      }
    });
  }, []);

  return (
    <>
      {/* --- DEBUGGER EN PANTALLA (Solo visible si hay problemas) --- */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.85)', color: '#00ff00',
        fontSize: '11px', padding: '8px', zIndex: 99999,
        pointerEvents: 'none', fontFamily: 'monospace'
      }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>

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
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App