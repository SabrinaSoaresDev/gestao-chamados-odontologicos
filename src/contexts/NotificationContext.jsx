import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { userData } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [ultimaNotificacao, setUltimaNotificacao] = useState(null);

  useEffect(() => {
    if (!userData?.uid) return;

    // Escuta mensagens não lidas em tempo real
    const unsubscribes = [];
    
    // Para cada chamado, escutar suas mensagens
    // Nota: Isso pode ser otimizado com uma coleção única
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userData?.uid]);

  const mostrarNotificacao = (mensagem) => {
    if (ultimaNotificacao === mensagem.id) return;
    setUltimaNotificacao(mensagem.id);
    setTimeout(() => setUltimaNotificacao(null), 2000);

    const buscarChamado = async () => {
      try {
        const chamadoRef = doc(db, 'chamados', mensagem.chamadoId);
        const chamadoSnap = await getDoc(chamadoRef);
        const chamado = chamadoSnap.data();
        
        const isTecnico = mensagem.remetenteTipo === 'tecnico';
        const remetenteLabel = isTecnico ? 'Técnico' : 'Dentista';
        
        toast.success(`📨 Nova mensagem de ${mensagem.remetenteNome} (${remetenteLabel})`, {
          duration: 5000,
          position: 'top-right',
          icon: '💬',
        });
      } catch (error) {
        console.error('Erro ao buscar chamado:', error);
        toast.success(`📨 Nova mensagem de ${mensagem.remetenteNome}`, {
          duration: 4000,
          position: 'top-right',
          icon: '💬',
        });
      }
    };

    buscarChamado();
  };

  const value = {
    notificacoes,
    temNotificacoes: notificacoes.length > 0,
    totalNaoLidas: notificacoes.length,
    limparNotificacoes: () => setNotificacoes([])
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}