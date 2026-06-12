import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { 
  PaperAirplaneIcon, 
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ChatDoChamado({ chamado, onClose, onNovaMensagem }) {
  const { userData } = useAuth();
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [fotosEnvio, setFotosEnvio] = useState([]);
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Função para determinar o tipo de usuário
  const determinarTipoUsuario = () => {
    console.log('🔍 userData completo:', userData);
    console.log('🔍 userData.role:', userData?.role);
    console.log('🔍 userData.tipo:', userData?.tipo);
    
    // Verificar se é ADMIN primeiro (prioridade máxima)
    if (userData?.role === 'admin' || userData?.tipo === 'admin' || userData?.isAdmin === true) {
      console.log('✅ Usuário identificado como ADMIN');
      return 'admin';
    }
    // Se for técnico
    if (userData?.role === 'tecnico' || userData?.tipo === 'tecnico') {
      console.log('✅ Usuário identificado como TÉCNICO');
      return 'tecnico';
    }
    // Se for dentista
    if (userData?.role === 'dentista' || userData?.tipo === 'dentista') {
      console.log('✅ Usuário identificado como DENTISTA');
      return 'dentista';
    }
    // Fallback
    console.log('⚠️ Tipo não identificado, usando fallback: dentista');
    return 'dentista';
  };

  const tipoUsuario = determinarTipoUsuario();
  const nomeUsuario = userData?.nome || 'Usuário';
  const uidUsuario = userData?.uid;

  const chatCollection = `mensagens_chamado_${chamado.id}`;

  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const compressImage = (base64, maxWidth = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth * height) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
    });
  };

  useEffect(() => {
    if (!chamado?.id) return;

    const q = query(
      collection(db, chatCollection),
      orderBy('data', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mensagensData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data: doc.data().data?.toDate()
      }));
      setMensagens(mensagensData);
      setLoading(false);
      
      const mensagensNaoLidas = mensagensData.filter(
        m => !m.lida && m.remetenteId !== uidUsuario
      );
      mensagensNaoLidas.forEach(async (msg) => {
        try {
          await updateDoc(doc(db, chatCollection, msg.id), { lida: true });
        } catch (error) {
          console.error('Erro ao marcar como lida:', error);
        }
      });
    }, (error) => {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chamado?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const abrirImagem = (url) => {
    setImagemAmpliada(url);
  };

  const enviarMensagem = async (e) => {
    e?.preventDefault();
    
    if (!novaMensagem.trim() && fotosEnvio.length === 0) return;
    
    setEnviando(true);
    
    try {
      let fotosUrls = [];
      for (const foto of fotosEnvio) {
        let base64 = await imageToBase64(foto);
        if (base64.length > 500 * 1024) {
          base64 = await compressImage(base64);
        }
        fotosUrls.push(base64);
      }

      const mensagemData = {
        chamadoId: chamado.id,
        remetenteId: uidUsuario,
        remetenteNome: nomeUsuario,
        remetenteTipo: tipoUsuario,
        mensagem: novaMensagem.trim(),
        data: new Date(),
        lida: false,
        anexos: fotosUrls
      };

      await addDoc(collection(db, chatCollection), mensagemData);
      
      setNovaMensagem('');
      setFotosEnvio([]);
      
      if (onNovaMensagem) onNovaMensagem();
      
      inputRef.current?.focus();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem: ' + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + fotosEnvio.length > 5) {
      toast.error('Máximo 5 fotos por mensagem');
      return;
    }
    
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem`);
        return false;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (max 2MB)`);
        return false;
      }
      return true;
    });
    
    setFotosEnvio([...fotosEnvio, ...validFiles]);
  };

  const removerFoto = (index) => {
    setFotosEnvio(fotosEnvio.filter((_, i) => i !== index));
  };

  const formatarHora = (date) => {
    if (!date) return '';
    const hoje = new Date();
    const mensagemDate = new Date(date);
    
    if (mensagemDate.toDateString() === hoje.toDateString()) {
      return mensagemDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return mensagemDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Função para obter a badge do tipo de usuário
  const getTipoBadge = (remetenteTipo, isMeu) => {
    if (remetenteTipo === 'admin') {
      if (isMeu) return <span className="text-xs bg-gray-700 text-white px-1.5 py-0.5 rounded-full">Você (Admin)</span>;
      return <span className="text-xs bg-gray-700 text-white px-1.5 py-0.5 rounded-full">Admin</span>;
    }
    if (remetenteTipo === 'tecnico') {
      if (isMeu) return <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Você (Técnico)</span>;
      return <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Técnico</span>;
    }
    if (remetenteTipo === 'dentista') {
      if (isMeu) return <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Você (Dentista)</span>;
      return <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Dentista</span>;
    }
    return null;
  };
  // ChatDoChamado.js - Adicione esta função ao componente
const enviarMensagemComNotificacao = async () => {
  if (!novaMensagem.trim()) return;
  
  try {
    const mensagemData = {
      texto: novaMensagem,
      remetenteId: userData.uid,
      remetenteNome: userData.nome,
      remetenteRole: userData.role,
      timestamp: new Date(),
      lida: false,
      notificada: false // Campo para controlar se já gerou notificação
    };
    
    await addDoc(collection(db, `mensagens_chamado_${chamado.id}`), mensagemData);
    
    // Atualizar último chat no chamado
    const chamadoRef = doc(db, 'chamados', chamado.id);
    await updateDoc(chamadoRef, {
      ultimaMensagem: novaMensagem.substring(0, 100),
      ultimaMensagemData: new Date(),
      ultimoRemetente: userData.nome
    });
    
    setNovaMensagem('');
    scrollToBottom();
    
    // A notificação será criada pelo listener do Layout
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    toast.error('Erro ao enviar mensagem');
  }
};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
          <div>
            <h3 className="font-bold text-lg">Conversa do Chamado</h3>
            <p className="text-sm text-blue-100">{chamado.titulo}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex justify-center py-8">
              <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : mensagens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          ) : (
            mensagens.map((msg) => {
              const isMeu = msg.remetenteId === uidUsuario;
              
              return (
                <div key={msg.id} className={`flex ${isMeu ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMeu ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center gap-2 mb-1 ml-2">
                      <span className="text-xs text-gray-500">{msg.remetenteNome}</span>
                      {getTipoBadge(msg.remetenteTipo, isMeu)}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      isMeu 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-white border border-gray-200 rounded-bl-none'
                    }`}>
                      {msg.mensagem && <p className="text-sm whitespace-pre-wrap break-words">{msg.mensagem}</p>}
                      
                      {msg.anexos && msg.anexos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.anexos.map((url, idx) => (
                            <div 
                              key={idx} 
                              className="relative group cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirImagem(url);
                              }}
                            >
                              <img 
                                src={url} 
                                alt={`Anexo ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded-lg flex items-center justify-center">
                                <EyeIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className={`text-xs mt-1 flex items-center gap-1 justify-end ${
                        isMeu ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        {formatarHora(msg.data)}
                        {isMeu && (
                          <span title={msg.lida ? "Lida" : "Não lida"}>
                            {msg.lida ? (
                              <CheckCircleIcon className="w-3 h-3 text-green-300" />
                            ) : (
                              <ClockIcon className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {fotosEnvio.length > 0 && (
          <div className="p-2 border-t bg-white flex gap-2 overflow-x-auto">
            {fotosEnvio.map((foto, idx) => (
              <div key={idx} className="relative">
                <img 
                  src={URL.createObjectURL(foto)} 
                  alt={`Preview ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removerFoto(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={enviarMensagem} className="p-3 border-t bg-white flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviarMensagem();
                }
              }}
            />
          </div>
          
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="chat-foto-upload"
              disabled={enviando}
            />
            <label
              htmlFor="chat-foto-upload"
              className="p-2 text-gray-500 hover:text-blue-600 cursor-pointer transition"
            >
              <PhotoIcon className="w-5 h-5" />
            </label>
          </div>
          
          <button
            type="submit"
            disabled={(!novaMensagem.trim() && fotosEnvio.length === 0) || enviando}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {enviando ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>

      {/* Modal de Imagem Ampliada */}
      {imagemAmpliada && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[200]"
          onClick={() => setImagemAmpliada(null)}
        >
          <button
            onClick={() => setImagemAmpliada(null)}
            className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-3 hover:bg-red-600 transition shadow-lg z-10"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <img
            src={imagemAmpliada}
            alt="Imagem ampliada"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}