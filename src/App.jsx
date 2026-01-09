import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'

// 1. IMPORTACIONES
import { supabase } from './lib/supabase'

// 2. IMPORTAMOS EL AIRBAG
import ErrorBoundary from './components/ErrorBoundary'

// 3. IMPORTAMOS EL GESTOR DE NOTIFICACIONES (ACTUALIZADO)
// Reemplazamos initNotifications por las funciones reales de Firebase
import { requestNotificationPermission, onMessageListener } from './lib/notifications'

// --- NUEVA IMPORTACIÓN PARA EL TEMA ---
import useTheme from './hooks/useTheme'
// --------------------------------------

// 4. IMPORTAMOS LA PANTALLA DE CARGA
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
import Marketplace from './pages/tools/marketplace/Marketplace'
import Library from './pages/tools/Library'
import NewsFeed from './pages/news/NewsFeed'
import ChatList from './pages/chat/ChatList'
import ChatRoom from './pages/chat/ChatRoom'
import AdminPanel from './pages/tools/marketplace/AdminPanel'

// --- ACTUALIZACIÓN IMPORTANTE: NUEVO VISOR DE LEYES ---
// Usamos LawReader en lugar de LawDetails para la lectura continua
import LawReader from './pages/laws/LawReader' 
// -----------------------------------------------------

// ============================================================
// COMPONENTE INTERNO: Lógica de Rutas Web
// ============================================================
function AppRoutes() {
  const navigate = useNavigate();

  // 1. CONFIGURACIÓN DE NOTIFICACIONES (ACTUALIZADO)
  useEffect(() => {
    // A. Verificar sesión inicial para pedir permisos si ya está logueado
    // Esto asegura que si recargas la página, vuelva a verificar el token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        requestNotificationPermission(session.user.id);
      }
    });

    // B. Activar listener para mensajes en PRIMER PLANO (cuando usas la app)
    // Esto mostrará en consola cuando llegue algo mientras usas la app
    onMessageListener()
      .then((payload) => {
        console.log('🔔 Notificación recibida en primer plano:', payload);
        // Opcional: Aquí podrías disparar un toast o alerta
        // alert(`Nuevo mensaje: ${payload.notification.title}`);
      })
      .catch((err) => console.log('Error iniciando listener de notificaciones:', err));
  }, []);

  // 2. ESCUCHA DE SESIÓN
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 Evento Web: ${event}`);
      
      if (event === 'SIGNED_IN' && session) {
        // Pedir permiso de notificaciones al iniciar sesión (Login exitoso)
        if (session?.user?.id) {
          requestNotificationPermission(session.user.id);
        }

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
            
            {/* Rutas de Leyes Actualizadas */}
            <Route path="/laws" element={<LawsSearch />} />
            {/* Ahora usamos el LawReader (lectura continua) al abrir una ley */}
            <Route path="/laws/:id" element={<LawReader />} />
            
          </Route>
        </Route>
      </Routes>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
function App() {
  // --- ACTIVAMOS EL HOOK AQUÍ ---
  // Esto asegura que el tema se aplique apenas carga la app
  useTheme(); 
  // ------------------------------

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App