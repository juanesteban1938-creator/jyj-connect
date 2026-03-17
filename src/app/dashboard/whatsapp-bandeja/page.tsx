'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, User, CheckCheck, Clock, MessageSquareOff, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  jid: string;
  cuerpo: string;
  mensaje?: string;
  fecha: any;
  tipo: 'entrante' | 'saliente';
  leido: boolean;
  clienteNombre?: string;
}

interface ChatGroup {
  jid: string;
  clienteNombre: string;
  ultimoMensaje: Message;
  mensajes: Message[];
  noLeidos: number;
  hasRealName: boolean;
}

function WhatsAppBandejaContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mensajeInput, setMensajeInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // Consultas para resolución de nombres
  const clientesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'clientes'));
  }, [db, user]);

  const cotizacionesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'cotizaciones'));
  }, [db, user]);
  
  const { data: clientesRaw } = useCollection(clientesQuery);
  const { data: cotizacionesRaw } = useCollection(cotizacionesQuery);

  // Sincronizar chat seleccionado desde la URL
  useEffect(() => {
    const jidParam = searchParams.get('jid');
    if (jidParam) setSelectedJid(jidParam);
  }, [searchParams]);

  // Suscripción en tiempo real a la colección de conversaciones
  useEffect(() => {
    if (!db || !user) return;

    const convRef = collection(db, 'conversaciones');
    const q = query(convRef, orderBy('fecha', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          fecha: d.data().fecha?.toDate ? d.data().fecha.toDate() : new Date(d.data().fecha)
        })) as Message[];
        setMessages(data);
        setIsLoading(false);
      },
      (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'conversaciones',
          operation: 'list'
        }));
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, user]);

  // Función para obtener iniciales
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Agrupación de mensajes por JID con resolución de nombres
  const chats = useMemo(() => {
    const groups: Record<string, ChatGroup> = {};

    messages.forEach(msg => {
      if (!groups[msg.jid]) {
        const phoneRawSearch = msg.jid.split('@')[0].replace(/\D/g, '').slice(-10);
        // Buscamos en clientes (comparando los últimos 10 dígitos para evitar problemas de prefijo)
        const clienteMatch = clientesRaw?.find(c => 
          c.telefono?.replace(/\D/g, '').includes(phoneRawSearch)
        );
        // Buscamos en cotizaciones
        const cotizacionMatch = cotizacionesRaw?.find(c => 
          c.telefono?.replace(/\D/g, '').includes(phoneRawSearch)
        );

        const resolvedName = clienteMatch?.razonSocial || 
                           clienteMatch?.nombre || 
                           (cotizacionMatch?.nombreCliente !== 'Cliente' ? cotizacionMatch?.nombreCliente : null);

        const rawPhone = msg.jid.split('@')[0];
        // Extraer solo los últimos 10 dígitos (número colombiano sin prefijo)
        const digits = rawPhone.replace(/\D/g, '');
        const colombianDigits = digits.slice(-10); // últimos 10 dígitos
        const phoneDisplay = colombianDigits.length === 10
            ? '+57 ' + colombianDigits.slice(0,3) + ' ' + colombianDigits.slice(3,6) + ' ' + colombianDigits.slice(6)
            : '+' + rawPhone;

        groups[msg.jid] = {
          jid: msg.jid,
          clienteNombre: resolvedName || phoneDisplay,
          ultimoMensaje: msg,
          mensajes: [],
          noLeidos: 0,
          hasRealName: !!resolvedName
        };
      }
      groups[msg.jid].mensajes.push(msg);
      if (msg.fecha > (groups[msg.jid].ultimoMensaje.fecha)) {
        groups[msg.jid].ultimoMensaje = msg;
      }
      if (msg.tipo === 'entrante' && !msg.leido) {
        groups[msg.jid].noLeidos++;
      }
    });

    return Object.values(groups).sort((a, b) => b.ultimoMensaje.fecha.getTime() - a.ultimoMensaje.fecha.getTime());
  }, [messages, clientesRaw, cotizacionesRaw]);

  // Filtrado de chats
  const filteredChats = chats.filter(c => 
    c.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.jid.includes(searchTerm)
  );

  const selectedChat = useMemo(() => 
    chats.find(c => c.jid === selectedJid), 
  [chats, selectedJid]);

  // Auto-scroll al final cuando llegan mensajes o se cambia de chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedChat]);

  // Marcar como leído al seleccionar chat
  useEffect(() => {
    if (selectedJid && db) {
      const markAsRead = async () => {
        const unreadMessages = messages.filter(m => m.jid === selectedJid && m.tipo === 'entrante' && !m.leido);
        if (unreadMessages.length > 0) {
          const batch = writeBatch(db);
          unreadMessages.forEach(m => {
            const docRef = doc(db, 'conversaciones', m.id);
            batch.update(docRef, { leido: true });
          });
          await batch.commit().catch(() => {});
        }
      };
      markAsRead();
    }
  }, [selectedJid, messages, db]);

  const handleEnviarMensaje = async () => {
    if (!mensajeInput.trim() || !selectedJid) return;
    setEnviando(true);
    try {
      // Enviar via bot Railway
      const response = await fetch(`https://focused-harmony-production.up.railway.app/send-message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'jj-connect-2026'
        },
        body: JSON.stringify({ jid: selectedJid, mensaje: mensajeInput })
      });
      
      if (!response.ok) throw new Error('Error al enviar');
      
      setMensajeInput('');
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error al enviar mensaje' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 overflow-hidden rounded-2xl border bg-white shadow-xl">
      {/* Panel Izquierdo: Lista de Chats */}
      <div className="flex w-full flex-col border-r md:w-[350px] lg:w-[400px]">
        <header className="p-4 bg-slate-50 border-b">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4">Bandeja Nova</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar conversación..." 
              className="pl-9 bg-white border-slate-200 rounded-xl"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase animate-pulse">Sincronizando chats...</div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquareOff className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-bold uppercase">No hay conversaciones</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.jid}
                onClick={() => setSelectedJid(chat.jid)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 transition-all hover:bg-slate-50 border-b last:border-0 min-h-[72px]",
                  selectedJid === chat.jid && "bg-orange-50/50 border-l-4 border-l-orange-500"
                )}
              >
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm shrink-0">
                  <AvatarFallback className="bg-slate-200 text-slate-600 font-bold uppercase">
                    {chat.hasRealName ? getInitials(chat.clienteNombre) : <User className="h-6 w-6 text-slate-400" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden text-left flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-sm uppercase truncate font-black flex-1",
                      chat.hasRealName ? "text-slate-800" : "text-slate-500"
                    )}>{chat.clienteNombre}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      {format(chat.ultimoMensaje.fecha, 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 truncate font-medium flex-1">
                      {chat.ultimoMensaje.tipo === 'saliente' && <CheckCheck className="inline h-3 w-3 mr-1 text-blue-500" />}
                      {chat.ultimoMensaje.mensaje || chat.ultimoMensaje.cuerpo}
                    </p>
                    {chat.noLeidos > 0 && (
                      <Badge className="h-5 min-w-[20px] bg-orange-500 text-white font-black text-[10px] flex items-center justify-center rounded-full p-0 shrink-0">
                        {chat.noLeidos}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Panel Derecho: Hilo de Conversación */}
      <div className="hidden flex-1 flex-col bg-[#F8F9FA] md:flex relative">
        {selectedChat ? (
          <>
            {/* Header del Chat */}
            <header className="flex items-center gap-4 p-4 bg-white border-b shadow-sm z-10">
              <Avatar className="h-10 w-10 border shadow-sm">
                <AvatarFallback className="bg-orange-100 text-orange-600 font-black">
                  {selectedChat.hasRealName ? getInitials(selectedChat.clienteNombre) : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <h3 className="font-black text-slate-800 uppercase text-sm leading-none truncate">{selectedChat.clienteNombre}</h3>
                <p className="text-[10px] font-bold text-green-500 uppercase mt-1 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Canal de WhatsApp activo
                </p>
              </div>
            </header>

            {/* Mensajes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {selectedChat.mensajes.map((msg, i) => {
                const isIncoming = msg.tipo === 'entrante';
                return (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex w-full",
                      isIncoming ? "justify-start" : "justify-end"
                    )}
                  >
                    <div className={cn(
                      "max-w-[70%] px-4 py-2 rounded-2xl shadow-sm relative group",
                      isIncoming 
                        ? "bg-white text-slate-800 rounded-tl-none border border-slate-100" 
                        : "bg-orange-500 text-white rounded-tr-none"
                    )}>
                      <p className="text-sm font-medium leading-relaxed">{msg.mensaje || msg.cuerpo}</p>
                      <div className={cn(
                        "flex items-center gap-1 mt-1 justify-end",
                        isIncoming ? "text-slate-400" : "text-orange-100"
                      )}>
                        <span className="text-[9px] font-bold uppercase">
                          {format(msg.fecha, 'HH:mm')}
                        </span>
                        {!isIncoming && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input de Respuesta */}
            <footer className="p-4 bg-white border-t">
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border">
                <Input 
                  placeholder="Responde a través de Nova..." 
                  className="border-none bg-transparent focus-visible:ring-0 shadow-none text-sm"
                  value={mensajeInput}
                  onChange={(e) => setMensajeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEnviarMensaje()}
                  disabled={enviando}
                />
                <button 
                  onClick={handleEnviarMensaje}
                  disabled={enviando || !mensajeInput.trim()}
                  className={cn(
                    "p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200",
                    (enviando || !mensajeInput.trim()) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-center text-[9px] font-bold text-slate-400 uppercase mt-2">
                Las respuestas enviadas son gestionadas por el núcleo de Nova
              </p>
            </footer>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
            <div className="p-8 rounded-full bg-slate-100 mb-4">
              <User className="h-16 w-16" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-400">Selecciona un chat</h3>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Monitoreo de asistencia virtual en tiempo real</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WhatsAppBandejaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <WhatsAppBandejaContent />
    </Suspense>
  );
}
