const loadMessages = async (offset = 0) => {
      if (offset > 0) setLoadingMore(true)
      
      const { data } = await supabase
        .from('messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1)
      
      if (data) {
          if (data.length < MESSAGES_PER_PAGE) setHasMore(false)
          const orderedMessages = data.reverse()

          setMessages(prev => {
              if (offset === 0) {
                  setTimeout(scrollToBottom, 100)
                  return orderedMessages
              } else {
                  return [...orderedMessages, ...prev]
              }
          })
      }
      setLoadingInitial(false)
      setLoadingMore(false)
  }

  // Lógica de Scroll Infinito
  const handleScroll = () => {
      const container = chatContainerRef.current
      if (!container) return

      if (container.scrollTop === 0 && hasMore && !loadingMore && !loadingInitial) {
          prevScrollHeightRef.current = container.scrollHeight
          loadMessages(messages.length)
      }
  }

  // Restaurar posición de scroll tras cargar más
  useEffect(() => {
      if (!loadingMore && prevScrollHeightRef.current > 0 && chatContainerRef.current) {
          const container = chatContainerRef.current
          const newScrollHeight = container.scrollHeight
          container.scrollTop = newScrollHeight - prevScrollHeightRef.current
          prevScrollHeightRef.current = 0
      }
  }, [messages, loadingMore])

  const fetchSingleMessage = async (msgId) => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name, avatar_url)')
      .eq('id', msgId)
      .single()
    
    if(data) {
        setMessages(prev => {
            // Evitar duplicados estrictos
            if (prev.some(m => m.id === data.id)) return prev
            return [...prev, data]
        })
        scrollToBottom()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // --- GESTIÓN DE INPUT Y TYPING ---
  const handleTypingInput = (e) => {
      setNewMessage(e.target.value)
      
      // Auto-resize textarea
      e.target.style.height = 'auto'
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'

      // Emitir evento de "Escribiendo..."
      if (channelRef.current) {
          if (!typingTimeoutRef.current) {
             channelRef.current.track({ 
                 online_at: new Date().toISOString(), 
                 typing: true, 
                 username: 'Yo' 
             })
          }
          
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => {
              if (channelRef.current) {
                  channelRef.current.track({ 
                      online_at: new Date().toISOString(), 
                      typing: false,
                      username: 'Yo' 
                  })
              }
              typingTimeoutRef.current = null
          }, 2000)
      }
  }

  // --- ENVÍO DE MENSAJES (BROADCAST + DB) ---
  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return

    const contentToSend = newMessage
    const fileToSend = selectedFile
    const typeToSend = fileToSend ? fileType : 'text'

    // Reset UI
    setNewMessage('')
    clearFile() 
    setShowAttachMenu(false)
    setUploading(true)
    
    const textarea = document.querySelector('textarea')
    if(textarea) textarea.style.height = 'auto'

    // 1. Mensaje Optimista Local
    const tempId = `temp-${Date.now()}`
    const tempMessage = {
        id: tempId,
        room_id: roomId,
        sender_id: session.user.id,
        content: contentToSend,
        media_url: fileToSend ? URL.createObjectURL(fileToSend) : null,
        media_type: typeToSend,
        created_at: new Date().toISOString(),
        profiles: { full_name: 'Yo', avatar_url: null },
        is_sending: true 
    }

    setMessages(prev => [...prev, tempMessage])
    scrollToBottom()

    try {
        let mediaUrl = null
        if (fileToSend) {
            let fileToUpload = fileToSend
            // Compresión de imágenes
            if (typeToSend === 'image') {
                const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/webp' }
                fileToUpload = await imageCompression(fileToSend, options)
            }
            const ext = typeToSend === 'image' ? 'webp' : fileToSend.name.split('.').pop()
            const fileName = `${typeToSend}_${Date.now()}.${ext}`
            
            await supabase.storage.from('chat-media').upload(fileName, fileToUpload)
            const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName)
            mediaUrl = data.publicUrl
            
            // Actualizamos la URL en el mensaje optimista para que si se envía por broadcast lleve la foto real
            tempMessage.media_url = mediaUrl
        }

        // 2. BROADCAST INSTANTÁNEO (Magia de velocidad)
        // Enviamos el mensaje directamente a los otros usuarios conectados SIN esperar a la base de datos
        if (channelRef.current) {
            await channelRef.current.send({
                type: 'broadcast',
                event: 'new_message',
                payload: { ...tempMessage, id: tempId, is_sending: false } // Enviamos como 'no enviando' para que lo vean normal
            })
        }

        // 3. Guardado Persistente en DB
        const { data: sentData, error } = await supabase.from('messages').insert({
            room_id: roomId,
            sender_id: session.user.id,
            content: contentToSend,
            media_url: mediaUrl,
            media_type: typeToSend
        }).select('*, profiles(full_name, avatar_url)').single()

        if (error) throw error

        // 4. Confirmación: Reemplazar optimista con real
        setMessages(prev => prev.map(msg => msg.id === tempId ? sentData : msg))

        // 5. Actualizar última actividad de la sala
        await supabase.from('chat_rooms').update({
            last_message: typeToSend !== 'text' ? `📎 ${typeToSend === 'image' ? 'Foto' : 'Video'}` : contentToSend,
            last_message_time: new Date()
        }).eq('id', roomId)

    } catch (error) {
        console.error(error)
        alert("Error al enviar mensaje. Verifica tu conexión.")
        setMessages(prev => prev.filter(m => m.id !== tempId))
    }
    setUploading(false)
  }

  // --- HELPERS AUXILIARES ---
  const handleFileSelect = (e, type) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        setSelectedFile(file)
        setFileType(type)
        setPreviewUrl(URL.createObjectURL(file))
        setShowAttachMenu(false)
    }
  }
  const clearFile = () => { setSelectedFile(null); setPreviewUrl(null); setFileType('text'); }

  const handleSearchUsers = async (term) => {
      setSearchTerm(term)
      if (term.length < 3) return setSearchResults([])
      const { data, error } = await supabase.rpc('search_users_not_in_room', { p_search_term: term, p_room_id: roomId })
      if (!error) setSearchResults(data)
  }
  const addMember = async (userId) => {
      await supabase.from('chat_participants').insert({ room_id: roomId, user_id: userId })
      setShowAddModal(false); setSearchTerm('')
  }

  return (
    <div className="fixed inset-0 z-50 md:static md:z-auto bg-slate-100 dark:bg-slate-950 flex flex-col md:max-w-5xl md:mx-auto md:shadow-2xl md:h-[90vh] md:my-5 md:rounded-3xl md:overflow-hidden md:border dark:border-slate-800 transition-colors relative">
      
      {/* HEADER PREMIUM */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 shadow-sm flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 z-20 absolute top-0 w-full h-[60px]">
        <button onClick={() => navigate('/chat')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"><ArrowLeft size={20} className="dark:text-white"/></button>
        
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-slate-200 dark:border-slate-700 relative shadow-sm">
             {roomDetails?.avatar ? <img src={roomDetails.avatar} className="w-full h-full object-cover"/> : (roomDetails?.name?.charAt(0) || '#')}
             {/* Punto Verde si está Online */}
             {onlineUsers.size > 0 && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>}
        </div>
        
        <div className="flex-1 cursor-default min-w-0 flex flex-col justify-center">
            <h2 className="font-bold text-slate-800 dark:text-white text-base leading-tight truncate">{roomDetails?.name || 'Cargando...'}</h2>
            
            {/* ESTADO EN LÍNEA / ÚLTIMA VEZ */}
            <p className="text-xs font-medium truncate h-4">
                {typingUsers.size > 0 ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                        {roomDetails?.is_group 
                            ? `${Array.from(typingUsers).join(', ')} escribiendo...` 
                            : 'escribiendo...'}
                    </span>
                ) : onlineUsers.size > 0 ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold">En línea</span>
                ) : !roomDetails?.is_group && otherUserProfile?.last_seen ? (
                    <span className="text-slate-500 dark:text-slate-400">
                        Visto {formatLastSeen(otherUserProfile.last_seen)}
                    </span>
                ) : (
                    <span className="text-slate-400">Desconectado</span>
                )}
            </p>
        </div>
        
        {roomDetails?.is_group && (
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-700 transition"><UserPlus size={20}/></button>
        )}
      </div>

      {/* ÁREA DE MENSAJES */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-[70px] pb-4 px-2 md:px-4 space-y-1 bg-[#e5ddd5] dark:bg-slate-950 scroll-smooth"
        style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: 'overlay' }}
      >
        {loadingMore && <div className="text-center py-2"><Loader2 className="animate-spin inline text-indigo-600" size={20}/></div>}

        {messages.map((msg, index) => {
            const isMe = msg.sender_id === session?.user?.id
            const isOptimistic = msg.is_sending 
            
            const prevMsg = messages[index - 1]
            const nextMsg = messages[index + 1]
            
            const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDate
            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id
            
            const roundedClass = isMe 
                ? `${isFirstInGroup ? 'rounded-tr-none' : ''} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-md'} rounded-l-2xl rounded-tr-2xl`
                : `${isFirstInGroup ? 'rounded-tl-none' : ''} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-md'} rounded-r-2xl rounded-tl-2xl`

            return (
                <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {showDate && (
                        <div className="flex justify-center my-4 sticky top-[70px] z-10">
                            <span className="bg-slate-200/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-white/20">
                                {getMessageDateLabel(msg.created_at)}
                            </span>
                        </div>
                    )}

                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-${isLastInGroup ? '2' : '0.5'}`}>
                        <div className={`
                            relative max-w-[85%] sm:max-w-[65%] px-3 py-2 shadow-sm text-[15px]
                            ${isMe 
                                ? 'bg-indigo-600 text-white shadow-indigo-500/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700'} 
                            ${roundedClass}
                            ${isOptimistic ? 'opacity-70' : 'opacity-100'}
                        `}>
                            {isFirstInGroup && (
                                <svg className={`absolute top-0 ${isMe ? '-right-2 text-indigo-600' : '-left-2 text-white dark:text-slate-800'} w-2 h-3`} viewBox="0 0 8 13" fill="currentColor">
                                    <path d={isMe ? "M-3 0v13h11c0-5-2-9-11-13z" : "M11 0v13H0c0-5 2-9 11-13z"} />
                                </svg>
                            )}

                            {!isMe && roomDetails?.is_group && isFirstInGroup && (
                                <p className="text-[11px] font-bold mb-1 opacity-90" style={{ color: stringToColor(msg.profiles?.full_name || 'A') }}>
                                    {msg.profiles?.full_name}
                                </p>
                            )}

                            {msg.media_type === 'image' && (
                                <div className="mb-1 rounded-lg overflow-hidden relative group/img mt-1">
                                    <img 
                                        src={msg.media_url} 
                                        className="max-h-80 w-full object-cover cursor-pointer hover:scale-[1.01] transition-transform" 
                                        onClick={() => setLightboxSrc(msg.media_url)}
                                    />
                                </div>
                            )}
                             {msg.media_type === 'video' && (
                                <video src={msg.media_url} controls className="rounded-lg mb-1 max-h-80 w-full bg-black mt-1"/>
                            )}

                            {msg.content && <p className="whitespace-pre-wrap break-words leading-snug">{msg.content}</p>}
                            
                            <div className={`flex justify-end items-center gap-1 mt-1 -mb-1 select-none ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                <span className="text-[10px] font-medium">
                                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </span>
                                {isOptimistic ? <Loader2 size={10} className="animate-spin"/> : isMe && <CheckCheck size={12} className="text-indigo-200"/>}
                            </div>
                        </div>
                    </div>
                </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30">
        {selectedFile && (
            <div className="px-4 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-5">
                <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {fileType === 'image' ? (
                        <img src={previewUrl} className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center"><Video size={24} className="text-slate-500"/></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold dark:text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Listo para enviar</p>
                </div>
                <button onClick={clearFile} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition group">
                    <Trash2 size={18} className="text-red-500"/>
                </button>
            </div>
        )}

        <div className="p-2 md:p-3 flex items-end gap-2 max-w-5xl mx-auto">
            <div className="relative pb-1">
                <button 
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className={`p-3 rounded-full transition-all duration-200 ${showAttachMenu ? 'bg-indigo-100 text-indigo-600 rotate-45' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    <Plus size={24} />
                </button>

                {showAttachMenu && (
                    <div className="absolute bottom-16 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 flex flex-col gap-1 min-w-[160px] animate-in slide-in-from-bottom-5 zoom-in-95 z-50">
                        <label className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><ImageIcon size={18}/></div>
                            <span className="text-sm font-bold dark:text-white">Foto</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')}/>
                        </label>
                        <label className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition">
                            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><Video size={18}/></div>
                            <span className="text-sm font-bold dark:text-white">Video</span>
                            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')}/>
                        </label>
                    </div>
                )}
            </div>
            
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center px-4 py-1.5 my-1 border border-transparent focus-within:border-indigo-500/30 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-inner">
                <textarea 
                    className="w-full bg-transparent outline-none text-[15px] dark:text-white max-h-32 resize-none py-2 leading-relaxed"
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    value={newMessage}
                    onChange={handleTypingInput}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                />
            </div>

            <button 
                onClick={handleSend}
                disabled={(!newMessage.trim() && !selectedFile) || uploading}
                className={`p-3.5 mb-1 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 
                    ${(!newMessage.trim() && !selectedFile) 
                        ? 'bg-slate-200 text-slate-400 scale-90 opacity-50 cursor-not-allowed dark:bg-slate-800' 
                        : 'bg-indigo-600 text-white hover:scale-110 active:scale-95 hover:shadow-indigo-500/30'
                    }`}
            >
                {uploading ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} className="ml-0.5"/>}
            </button>
        </div>
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl">
                <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X size={18}/></button>
                <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">Añadir al grupo</h3>
                <input 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 outline-none font-bold dark:text-white focus:ring-2 ring-indigo-500/20 transition"
                    placeholder="Buscar persona..."
                    value={searchTerm}
                    autoFocus
                    onChange={e => handleSearchUsers(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map(user => (
                        <div key={user.id} onClick={() => addMember(user.id)} className="flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl cursor-pointer transition group">
                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} className="w-10 h-10 rounded-full"/>
                            <div>
                                <p className="font-bold text-sm dark:text-white">{user.full_name}</p>
                                <p className="text-[10px] text-indigo-500 font-bold group-hover:underline">Añadir ahora</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
// ... (Aquí termina el código de la Parte 1)

  return (
    // CONTENEDOR PRINCIPAL: Full Screen en móvil (z-50) para tapar la navegación
    <div className="fixed inset-0 z-50 md:static md:z-auto bg-slate-100 dark:bg-slate-950 flex flex-col md:max-w-5xl md:mx-auto md:shadow-2xl md:h-[90vh] md:my-5 md:rounded-3xl md:overflow-hidden md:border dark:border-slate-800 transition-colors relative">
      
      {/* 1. HEADER PREMIUM (Glassmorphism + Estados) */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 shadow-sm flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 z-20 absolute top-0 w-full h-[65px]">
        <button onClick={() => navigate('/chat')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"><ArrowLeft size={20} className="dark:text-white"/></button>
        
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-slate-200 dark:border-slate-700 relative shadow-sm shrink-0">
             {roomDetails?.avatar ? <img src={roomDetails.avatar} className="w-full h-full object-cover"/> : (roomDetails?.name?.charAt(0) || '#')}
             {/* Punto Verde si está Online */}
             {onlineUsers.size > 0 && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>}
        </div>
        
        <div className="flex-1 cursor-default min-w-0 flex flex-col justify-center">
            <h2 className="font-bold text-slate-800 dark:text-white text-base leading-tight truncate">{roomDetails?.name || 'Cargando...'}</h2>
            
            {/* LÓGICA DE ESTADO: Escribiendo > En línea > Visto por última vez */}
            <p className="text-xs font-medium truncate h-4 flex items-center">
                {typingUsers.size > 0 ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse transition-all duration-300">
                        {roomDetails?.is_group 
                            ? `${Array.from(typingUsers).join(', ')} escribiendo...` 
                            : 'escribiendo...'}
                    </span>
                ) : onlineUsers.size > 0 ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold transition-all duration-300">En línea</span>
                ) : !roomDetails?.is_group && otherUserProfile?.last_seen ? (
                    <span className="text-slate-500 dark:text-slate-400 transition-all duration-300">
                        Visto {formatLastSeen(otherUserProfile.last_seen)}
                    </span>
                ) : (
                    <span className="text-slate-400">Toc para ver info</span>
                )}
            </p>
        </div>
        
        {roomDetails?.is_group && (
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-700 transition"><UserPlus size={20}/></button>
        )}
      </div>

      {/* 2. ÁREA DE MENSAJES (Scroll Infinito + Fondo Doodle) */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-[75px] pb-4 px-2 md:px-4 space-y-1 bg-[#e5ddd5] dark:bg-slate-950 scroll-smooth"
        style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: 'overlay' }}
      >
        {loadingMore && <div className="text-center py-4"><Loader2 className="animate-spin inline text-indigo-600" size={24}/></div>}

        {messages.map((msg, index) => {
            const isMe = msg.sender_id === session?.user?.id
            const isOptimistic = msg.is_sending 
            
            // Lógica de Agrupación Visual
            const prevMsg = messages[index - 1]
            const nextMsg = messages[index + 1]
            
            const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDate
            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id
            
            // Bordes inteligentes (CSS dinámico)
            const roundedClass = isMe 
                ? `${isFirstInGroup ? 'rounded-tr-none' : ''} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-md'} rounded-l-2xl rounded-tr-2xl`
                : `${isFirstInGroup ? 'rounded-tl-none' : ''} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-md'} rounded-r-2xl rounded-tl-2xl`

            return (
                <div key={msg.id || index} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
                    {/* FECHA FLOTANTE (Sticky UI) */}
                    {showDate && (
                        <div className="flex justify-center my-4 sticky top-[70px] z-10">
                            <span className="bg-slate-200/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-white/20 dark:border-white/5">
                                {getMessageDateLabel(msg.created_at)}
                            </span>
                        </div>
                    )}

                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-${isLastInGroup ? '2' : '0.5'}`}>
                        <div className={`
                            relative max-w-[85%] sm:max-w-[70%] px-3 py-2 shadow-sm text-[15px]
                            ${isMe 
                                ? 'bg-indigo-600 text-white shadow-indigo-500/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700'} 
                            ${roundedClass}
                            ${isOptimistic ? 'opacity-70' : 'opacity-100'}
                        `}>
                            {/* COLA DE BURBUJA (TAIL) SVG */}
                            {isFirstInGroup && (
                                <svg className={`absolute top-0 ${isMe ? '-right-2 text-indigo-600' : '-left-2 text-white dark:text-slate-800'} w-2 h-3 fill-current`} viewBox="0 0 8 13">
                                    <path d={isMe ? "M-3 0v13h11c0-5-2-9-11-13z" : "M11 0v13H0c0-5 2-9 11-13z"} />
                                </svg>
                            )}

                            {/* Nombre del remitente en grupos */}
                            {!isMe && roomDetails?.is_group && isFirstInGroup && (
                                <p className="text-[11px] font-bold mb-1 opacity-90" style={{ color: stringToColor(msg.profiles?.full_name || 'A') }}>
                                    {msg.profiles?.full_name}
                                </p>
                            )}

                            {/* Multimedia (Imagen) */}
                            {msg.media_type === 'image' && (
                                <div className="mb-1 rounded-lg overflow-hidden relative group/img mt-1 bg-black/10 min-h-[100px] min-w-[150px]">
                                    <img 
                                        src={msg.media_url} 
                                        className="max-h-80 w-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-200" 
                                        onClick={() => setLightboxSrc(msg.media_url)}
                                        loading="lazy"
                                    />
                                </div>
                            )}
                            {/* Multimedia (Video) */}
                             {msg.media_type === 'video' && (
                                <video src={msg.media_url} controls className="rounded-lg mb-1 max-h-80 w-full bg-black mt-1"/>
                            )}

                            {/* Contenido Texto */}
                            {msg.content && <p className="whitespace-pre-wrap break-words leading-snug">{msg.content}</p>}
                            
                            {/* Hora y Checks de Estado */}
                            <div className={`flex justify-end items-center gap-1 mt-1 -mb-1 select-none ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                <span className="text-[10px] font-medium">
                                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </span>
                                {/* Doble Check si es mío */}
                                {isMe && (
                                    isOptimistic ? <Loader2 size={10} className="animate-spin"/> : <CheckCheck size={14} className="text-blue-300"/>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. INPUT BAR (Pie de página) */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30">
        
        {/* PREVIEW DE ARCHIVO ADJUNTO */}
        {selectedFile && (
            <div className="px-4 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-5">
                <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {fileType === 'image' ? (
                        <img src={previewUrl} className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center"><Video size={24} className="text-slate-500"/></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold dark:text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Listo para enviar</p>
                </div>
                <button onClick={clearFile} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition group">
                    <Trash2 size={18} className="text-red-500"/>
                </button>
            </div>
        )}

        {/* ÁREA DE TEXTO Y BOTONES */}
        <div className="p-2 md:p-3 flex items-end gap-2 max-w-5xl mx-auto">
            {/* Botón Adjuntar (+) */}
            <div className="relative pb-1">
                <button 
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className={`p-3 rounded-full transition-all duration-200 ${showAttachMenu ? 'bg-indigo-100 text-indigo-600 rotate-45' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    <Plus size={24} />
                </button>

                {/* Menú Desplegable Adjuntos */}
                {showAttachMenu && (
                    <div className="absolute bottom-16 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 flex flex-col gap-1 min-w-[160px] animate-in slide-in-from-bottom-5 zoom-in-95 z-50 origin-bottom-left">
                        <label className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><ImageIcon size={18}/></div>
                            <span className="text-sm font-bold dark:text-white">Foto</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')}/>
                        </label>
                        <label className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition">
                            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><Video size={18}/></div>
                            <span className="text-sm font-bold dark:text-white">Video</span>
                            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')}/>
                        </label>
                    </div>
                )}
            </div>
            
            {/* TextArea Auto-creciente */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center px-4 py-1.5 my-1 border border-transparent focus-within:border-indigo-500/30 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-inner">
                <textarea 
                    className="w-full bg-transparent outline-none text-[15px] dark:text-white max-h-32 resize-none py-2 leading-relaxed custom-scrollbar"
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    value={newMessage}
                    onChange={handleTypingInput}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                />
            </div>

            {/* Botón Enviar */}
            <button 
                onClick={handleSend}
                disabled={(!newMessage.trim() && !selectedFile) || uploading}
                className={`p-3.5 mb-1 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 
                    ${(!newMessage.trim() && !selectedFile) 
                        ? 'bg-slate-200 text-slate-400 scale-90 opacity-50 cursor-not-allowed dark:bg-slate-800' 
                        : 'bg-indigo-600 text-white hover:scale-110 active:scale-95 hover:shadow-indigo-500/30'
                    }`}
            >
                {uploading ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} className="ml-0.5"/>}
            </button>
        </div>
      </div>

      {/* Componentes Globales del Chat */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Modal Añadir Miembro (Solo Grupos) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl">
                <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X size={18}/></button>
                <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">Añadir al grupo</h3>
                <input 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 outline-none font-bold dark:text-white focus:ring-2 ring-indigo-500/20 transition"
                    placeholder="Buscar persona..."
                    value={searchTerm}
                    autoFocus
                    onChange={e => handleSearchUsers(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map(user => (
                        <div key={user.id} onClick={() => addMember(user.id)} className="flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl cursor-pointer transition group">
                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} className="w-10 h-10 rounded-full"/>
                            <div>
                                <p className="font-bold text-sm dark:text-white">{user.full_name}</p>
                                <p className="text-[10px] text-indigo-500 font-bold group-hover:underline">Añadir ahora</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}