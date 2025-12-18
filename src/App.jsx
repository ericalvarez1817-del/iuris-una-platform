import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

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

  // ============================================================
  // 🥅 EL PORTERO V3: LÓGICA PACIENTE (CON RETRASO)
  // ============================================================
  useEffect(() => {
    // Escuchamos el evento 'appUrlOpen' que lanza Capacitor cuando una app externa nos abre
    CapApp.addListener('appUrlOpen', async ({ url }) => {
      console.log("🔗 Enlace profundo recibido en App.jsx:", url);
      
      try {
        // Truco para leer URLs raras: Reemplazamos el protocolo por http para usar el parser estándar
        const cleanUrl = url.replace('com.iurisuna.app://', 'http://dummy/');
        const urlObj = new URL(cleanUrl);
        
        // Buscamos los tokens en Hash (#) o Search (?)
        const paramsString = urlObj.hash ? urlObj.hash.substring(1) : urlObj.search;
        const params = new URLSearchParams(paramsString);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken && refreshToken) {
           console.log("✅ Tokens detectados. Guardando sesión en Supabase...");
           
           // Inyectamos la sesión manualmente en Supabase
           const { error } = await supabase.auth.setSession({
             access_token: accessToken,
             refresh_token: refreshToken,
           });

           if (error) {
             console.error("❌ Error al establecer sesión:", error);
           } else {
             console.log("🎉 Sesión iniciada. Esperando a que se guarde en disco...");
             
             // --- AQUÍ ESTÁ EL ARREGLO ---
             // Esperamos 1.5 segundos para evitar la pantalla blanca (Race Condition)
             setTimeout(() => {
                 console.log("🚀 Tiempo cumplido. Redirigiendo al Dashboard.");
                 window.location.href = '/dashboard';
             }, 1500); 
           }
        } else {
            console.log("⚠️ La URL no tenía tokens válidos.");
        }
      } catch (e) {
          console.error("Error procesando URL:", e);
      }
    });
  }, []);
  // ============================================================

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