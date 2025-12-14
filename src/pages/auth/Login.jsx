import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
// Importamos todos los iconos necesarios
import { 
    Loader2, Sun, Moon, Mail, Key, LogIn, User, AlertCircle, 
    CheckCircle, ArrowLeft 
} from 'lucide-react';
import useTheme from '../../hooks/useTheme';

export default function Login() {
  const navigate = useNavigate();
  const { theme, toggleTheme, isDarkMode } = useTheme(); 

  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Nuevo estado para controlar la vista: 'login', 'signup', 'forgot'
  const [view, setView] = useState('login'); 

  // 1. Detectar si el usuario ya tiene sesión o viene de un enlace de correo
  useEffect(() => {
    // Escucha cualquier cambio en la sesión (Login exitoso, Logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Redirigir si la sesión es válida (acceso exitoso o token de correo)
        if (session) {
            navigate('/dashboard');
        }
        
        // Si el usuario acaba de hacer clic en el enlace de recuperación
        if (event === 'PASSWORD_RECOVERY') {
            setSuccessMsg("Establece tu nueva contraseña abajo. ¡Recuerda guardarla!");
            setView('login'); // Vuelve a la vista de Login, el token en la URL ya permite el cambio
        }
    });

    // Limpiar el listener cuando el componente se desmonte
    return () => subscription.unsubscribe();
  }, [navigate]);

  // --- FUNCIÓN DE INICIO DE SESIÓN Y REGISTRO ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (view === 'login') {
        // --- INICIAR SESIÓN ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // La redirección a /dashboard ocurre en el useEffect (onAuthStateChange)
      } 
      else if (view === 'signup') {
        // --- CREAR CUENTA (ENVÍO DE CORREO DE CONFIRMACIÓN) ---
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg("¡Cuenta creada! Revisa tu correo (y Spam) para confirmar tu dirección antes de iniciar sesión.");
        setView('login');
      }
    } catch (e) {
      let errorMessage = e.message;
      if (errorMessage.includes('Email not confirmed')) {
          errorMessage = "Tu correo no ha sido confirmado. Revisa tu bandeja de entrada o usa 'Olvidé mi contraseña' para reenviar el link.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIÓN RECUPERAR CONTRASEÑA ---
  const handleRecovery = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            // El usuario será redirigido a la URL principal al hacer click en el email
            redirectTo: window.location.origin
        });

        if (error) throw error;
        setSuccessMsg("Hemos enviado un enlace de recuperación de contraseña a tu correo.");
        setView('login');
    } catch (e) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
  };

  // --- FUNCIÓN DE LOGIN CON GOOGLE (NUEVA) ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', // <-- Especificamos el proveedor
        options: {
            // Redirige al dashboard después del login exitoso con Google
            redirectTo: `${window.location.origin}/dashboard`, 
        },
    });

    if (error) {
        setError(error.message);
        setLoading(false);
    }
    // Si es exitoso, Supabase se encarga de redirigir a Google y luego al dashboard
  };

  // --- VISTAS DEL FORMULARIO ---
  const renderForm = () => {
    // Si la URL contiene un token de recuperación de contraseña, el usuario puede cambiarla directamente
    if (window.location.hash.includes('access_token')) {
        // Aunque no es la vista 'login', si hay token, mostramos el formulario de cambio de clave
        const handleNewPassword = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            
            // Usamos la función de Supabase para actualizar la contraseña
            const { error: updateError } = await supabase.auth.updateUser({ password });
            
            if (updateError) {
                setError(updateError.message);
            } else {
                setSuccessMsg("¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.");
                setPassword(''); // Limpia el campo
                navigate(window.location.origin); // Limpia el hash de la URL
            }
            setLoading(false);
        };

        return (
             <form onSubmit={handleNewPassword} className="space-y-4">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-6">Nueva Contraseña</h2>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-6">Estás autorizado para cambiar tu contraseña.</p>
                
                <div className="relative">
                    <Key size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Escribe tu nueva Contraseña" required className="input-field pl-12" disabled={loading} />
                </div>
                
                <button type="submit" disabled={loading} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                    {loading ? <Loader2 className="animate-spin" /> : 'GUARDAR NUEVA CONTRASEÑA'}
                </button>
            </form>
        );
    }

    switch (view) {
      case 'signup':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-6">Crear Cuenta</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Necesitarás confirmar tu correo para el primer acceso.</p>
             <div className="relative">
              <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo UNA" required className="input-field pl-12" disabled={loading} />
            </div>
            <div className="relative">
              <Key size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required className="input-field pl-12" disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="animate-spin" /> : 'REGISTRARSE'}
            </button>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
              ¿Ya tienes una cuenta? <button type="button" onClick={() => setView('login')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition">Inicia Sesión</button>
            </p>
          </form>
        );

      case 'forgot':
        return (
          <form onSubmit={handleRecovery} className="space-y-4">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-6">Recuperar Acceso</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Ingresa tu correo para recibir un enlace de cambio de contraseña.</p>
            <div className="relative">
              <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo UNA" required className="input-field pl-12" disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="animate-spin" /> : 'ENVIAR ENLACE'}
            </button>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
              <button type="button" onClick={() => setView('login')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition flex items-center justify-center gap-1">
                <ArrowLeft size={14}/> Volver al Login
              </button>
            </p>
          </form>
        );

      case 'login':
      default:
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-6">Bienvenido</h2>
            {/* Campos de Correo y Contraseña */}
            <div className="relative">
              <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo UNA" required className="input-field pl-12" disabled={loading} />
            </div>
            <div className="relative">
              <Key size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required className="input-field pl-12" disabled={loading} />
            </div>
            
            {/* BOTÓN DE INICIO DE SESIÓN */}
            <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="animate-spin" /> : <><LogIn size={20}/> INICIAR SESIÓN</>}
            </button>
            
            {/* SEPARADOR PARA LOGIN CON GOOGLE */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">O</span>
                </div>
            </div>

            {/* BOTÓN DE LOGIN CON GOOGLE */}
            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/30"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.0001 4.58281V7.96919C14.0001 7.96919 15.6361 8.65086 16.8928 9.80004L19.2638 7.42907C17.4338 5.76007 14.9338 4.58281 12.0001 4.58281Z" fill="#EA4335"/>
                    <path d="M6.98504 12C6.98504 10.9937 7.18504 9.99372 7.55004 9.07722L5.13838 7.20222C4.54504 8.44555 4.16671 9.77388 4.16671 12C4.16671 14.2261 4.54504 15.5544 5.13838 16.7978L7.55004 14.9228C7.18504 14.0063 6.98504 13.0063 6.98504 12Z" fill="#FBBC04"/>
                    <path d="M12.0001 19.4172C14.9338 19.4172 17.4338 18.2399 19.2638 16.5709L16.8928 14.2001C15.6361 15.3492 14.0001 16.0309 12.0001 16.0309C9.98504 16.0309 8.24338 15.2676 7.11171 13.9992L4.69921 15.8742C6.54504 17.7201 9.17004 19.4172 12.0001 19.4172Z" fill="#34A853"/>
                    <path d="M19.2638 7.42907L16.8928 9.80004C17.2578 10.7165 17.4578 11.7165 17.4578 12.7228C17.4578 13.7292 17.2578 14.7292 16.8928 15.6457L19.2638 18.0167C20.1065 16.9442 20.5738 15.7668 20.5738 14.5888V13.4111C20.5738 12.2331 20.1065 11.0557 19.2638 9.98322L19.2638 7.42907Z" fill="#4285F4"/>
                </svg>
                Continuar con Google
            </button>

            {/* Enlaces para Forgot y Signup */}
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4 flex justify-between">
                <button type="button" onClick={() => setView('forgot')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition">
                    Olvidé mi contraseña
                </button>
                <button type="button" onClick={() => setView('signup')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition">
                    Crear cuenta
                </button>
            </p>
          </form>
        );
    }
  };

  // Renderizado Principal (SIN CAMBIOS)
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 transition-colors duration-300">
      <button 
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-yellow-400 shadow-md hover:scale-110 transition-transform"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 transition-colors duration-300 animate-in fade-in zoom-in duration-300">
        
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <User size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">IURIS UNA</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Plataforma de servicios jurídicos</p>
        </div>
        
        {/* Mensajes de error/éxito */}
        {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2 mb-4">
                <AlertCircle size={20} /> {error}
            </div>
        )}
        {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-600 text-sm font-bold flex items-center gap-2 mb-4">
                <CheckCircle size={20} /> {successMsg}
            </div>
        )}

        {renderForm()}
      </div>

      {/* Estilos CSS (SIN CAMBIOS) */}
      <style>{`
        .input-field { 
            width: 100%; 
            padding: 1rem; 
            padding-left: 3rem; 
            border-radius: 1rem; 
            outline: none; 
            font-size: 0.875rem; 
            font-weight: 700; 
            border: 2px solid transparent; 
            transition: all 0.2s; 
            background-color: ${isDarkMode ? '#1e293b' : '#f1f5f9'}; 
            color: ${isDarkMode ? 'white' : '#0f172a'};
        }
        .input-field:focus { 
            border-color: #6366f1; 
            background-color: ${isDarkMode ? '#0f172a' : 'white'};
        }
        .btn-primary { 
            width: 100%; 
            padding: 1rem; 
            font-weight: 900; 
            font-size: 0.875rem; 
            letter-spacing: 0.1em; 
            border-radius: 1rem; 
            text-transform: uppercase; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 0.5rem; 
            transition: transform 0.1s;
            background-color: #4f46e5;
            color: white;
            box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}