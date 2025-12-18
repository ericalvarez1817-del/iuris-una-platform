import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom' // AÑADIDO: useNavigate

// 1. IMPORTACIONES PARA EL LOGIN MÓVIL
import { App as CapApp } from '@capacitor/app'
import { supabase } from './lib/supabase'

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
import Library from './pages/tools/Library'
import NewsFeed from './pages/news/NewsFeed'
import ChatList from './pages/chat/ChatList'
import ChatRoom from './pages/chat/ChatRoom'
import AdminPanel from './pages/tools/marketplace/AdminPanel'

// ============================================================
// COMPONENTE INTERNO: Maneja las rutas y la lógica del Login
// ============================================================
function AppRoutes() {
  const navigate = useNavigate(); // AHORA SÍ podemos usar esto gracias a la reestructuración

  useEffect(() => {
    // Escuchamos el evento 'appUrlOpen'
    CapApp.addListener('appUrlOpen', async ({ url }) => {
      console.log("🔗 Enlace profundo recibido:", url);
      
      try {
        const cleanUrl = url.replace('com.iurisuna.app://', 'http://dummy/');
        const urlObj = new URL(cleanUrl);
        const paramsString = urlObj.hash ? urlObj.hash.substring(1) : urlObj.search;
        const params = new URLSearchParams(paramsString);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken && refreshToken) {
           console.log("✅ Tokens detectados. Guardando sesión...");
           
           const { error } = await supabase.auth.setSession({
             access_token: accessToken,
             refresh_token: refreshToken,
           });

           if (!error) {
             console.log("🎉 Sesión lista. Navegando suavemente...");
             // USAMOS NAVIGATE EN LUGAR DE RELOAD (Evita pantalla blanca)
             navigate('/dashboard');
           }
        }
      } catch (e) {
          console.error("Error procesando URL:", e);
      }
    });
  }, [navigate]);

  return (
      <Routes>
        {/* RUTA PÚBLICA */}
        <Route path="/" element={<Login />} />

        {/* 🔒 RUTAS PROTEGIDAS */}
        <Route element={<ProtectedRoute />}>
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
  );
}

// ============================================================
// APP PRINCIPAL: Provee el Router para que AppRoutes funcione
// ============================================================
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App