import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
// Iconos necesarios
import { CalendarCheck, ChevronLeft, Trash2, Check, X, Loader2, PlusCircle, AlertCircle } from 'lucide-react';
import useTheme from '../../hooks/useTheme';

export default function Agenda() {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [tareas, setTareas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Estado para la nueva tarea
    const [nuevaTarea, setNuevaTarea] = useState({ titulo: '', descripcion: '', fecha_limite: '' });

    useEffect(() => {
        fetchTareas();
    }, []);

    // ------------------------------------
    // 1. FUNCIONES DE CARGA Y GESTIÓN
    // ------------------------------------

    const fetchTareas = async () => {
        setLoading(true);
        setError(null);
        
        // Traemos todas las tareas del usuario, ordenadas por la fecha y estado
        const { data, error } = await supabase
            .from('tareas_agenda')
            .select('*')
            .order('fecha_limite', { ascending: true })
            .order('completada', { ascending: true }); 

        if (error) {
            console.error('Error fetching tasks:', error);
            setError('No se pudieron cargar los datos. Verifique su conexión y RLS.');
        } else {
            setTareas(data);
        }
        setLoading(false);
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError('Debes iniciar sesión para añadir tareas.');
            setLoading(false);
            return;
        }

        // --- CORRECCIÓN FINAL DE FECHA: AÑADIR UN DÍA ---
        // Se crea el objeto Date, y luego se añade +1 día (86400000 ms) al timestamp.
        // Esto compensa el retraso de medianoche de UTC y asegura el día correcto.
        const dateString = nuevaTarea.fecha_limite;
        const dateObject = new Date(dateString);
        
        // Añadir explícitamente un día (24 * 60 * 60 * 1000 milisegundos)
        dateObject.setTime(dateObject.getTime() + (24 * 60 * 60 * 1000));
        
        const taskData = {
            titulo: nuevaTarea.titulo,
            descripcion: nuevaTarea.descripcion,
            fecha_limite: dateObject.toISOString(), // Usamos la fecha ajustada
            user_id: user.id,
            completada: false,
        };

        const { error: insertError } = await supabase
            .from('tareas_agenda')
            .insert([taskData])
            .select(); // Ejecutamos la inserción

        if (insertError) {
            console.error('Error adding task:', insertError);
            setError(`Error al guardar: ${insertError.message}. REVISAR RLS de INSERT.`);
        } else {
            setNuevaTarea({ titulo: '', descripcion: '', fecha_limite: '' }); // Limpiar el formulario
            fetchTareas(); // Recargar la lista después del éxito
        }

        setLoading(false);
    };

    const toggleCompletada = async (id, currentState) => {
        // Optimistic update
        setTareas(tareas.map(t => 
            t.id === id ? { ...t, completada: !currentState } : t
        ));

        const { error: updateError } = await supabase
            .from('tareas_agenda')
            .update({ completada: !currentState })
            .eq('id', id);

        if (updateError) {
            console.error('Error updating task:', updateError);
            setError(`Error al actualizar: ${updateError.message}. REVISAR RLS de UPDATE.`);
            fetchTareas(); // Revertir y recargar si falla
        }
    };

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm("¿Estás seguro de que quieres eliminar esta tarea?");
        if (!confirmDelete) return;

        // Optimistic delete
        setTareas(tareas.filter(t => t.id !== id)); 
        const tareaOriginal = tareas.find(t => t.id === id);

        // MANEJO DEL ERROR EN DELETE (Ya revisado y robusto)
        const { error: deleteError } = await supabase
            .from('tareas_agenda')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting task:', deleteError);
            setError(`Error al eliminar: ${deleteError.message}. REVISAR RLS de DELETE.`);
            // Revertir el cambio si falla la eliminación
            setTareas([...tareas, tareaOriginal].sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite))); 
        }
    };


    // ------------------------------------
    // 2. RENDERIZADO DEL COMPONENTE
    // ------------------------------------

    const formatDate = (dateString) => {
        if (!dateString) return 'Sin fecha';
        // La visualización lee correctamente el string ISO de la DB
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
    };

    // Determinar la clase de estilo para las tareas completadas
    const taskClass = (isCompleted) => 
        isCompleted 
        ? "opacity-50 line-through bg-emerald-50 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-700"
        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-indigo-400";
    

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 pb-24 transition-colors duration-300">
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigate('/dashboard')} className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition flex items-center gap-1">
                    <ChevronLeft size={24} />
                    <span className="text-lg font-medium">Volver</span>
                </button>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Agenda 🗓️</h1>
                <div className="w-16"></div> {/* Espaciador */}
            </div>

            {/* MENSAJES DE ESTADO */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2 mb-4">
                    <AlertCircle size={20} /> **Error:** {error}
                </div>
            )}

            {/* FORMULARIO PARA AÑADIR NUEVA TAREA */}
            <form onSubmit={handleAddTask} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 mb-8 space-y-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2"><PlusCircle size={20} /> Nueva Tarea</h2>
                
                <input 
                    type="text" 
                    placeholder="Título (Ej: Examen de Derecho Civil)"
                    value={nuevaTarea.titulo}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                    required
                    className="w-full p-3 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
                
                <input 
                    type="text" 
                    placeholder="Descripción (Ej: Bolillas 1-10)"
                    value={nuevaTarea.descripcion}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                    required
                    className="w-full p-3 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
                
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 pt-2">Fecha Límite:</label>
                <input 
                    type="date" 
                    value={nuevaTarea.fecha_limite}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, fecha_limite: e.target.value })}
                    required
                    className="w-full p-3 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                />

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><CalendarCheck size={20} /> AGREGAR TAREA</>}
                </button>
            </form>

            {/* LISTA DE TAREAS */}
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Tareas Pendientes y Completadas</h2>

            {loading && tareas.length === 0 && (
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Cargando agenda...</p>
            )}

            {!loading && tareas.length === 0 && (
                <div className="text-center p-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <CalendarCheck size={32} className="mx-auto text-indigo-500 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">¡Tu agenda está vacía! Añade un nuevo parcial o evento.</p>
                </div>
            )}

            <div className="space-y-3">
                {tareas.map(tarea => (
                    <div 
                        key={tarea.id} 
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${taskClass(tarea.completada)}`}
                    >
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="font-bold truncate text-slate-800 dark:text-slate-100">
                                {tarea.titulo}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {tarea.descripcion}
                            </p>
                            <p className="text-xs font-semibold mt-1 text-indigo-600 dark:text-indigo-400">
                                {formatDate(tarea.fecha_limite)}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* BOTÓN COMPLETADO */}
                            <button
                                onClick={() => toggleCompletada(tarea.id, tarea.completada)}
                                className={`p-2 rounded-full transition-colors ${
                                    tarea.completada 
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                                title={tarea.completada ? 'Marcar como Pendiente' : 'Marcar como Completada'}
                            >
                                {tarea.completada ? <Check size={20} /> : <X size={20} />}
                            </button>
                            
                            {/* BOTÓN ELIMINAR */}
                            <button
                                onClick={() => handleDelete(tarea.id)}
                                className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition"
                                title="Eliminar Tarea"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}