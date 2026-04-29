import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ClipboardDocumentListIcon, 
  Cog6ToothIcon,
  BellIcon,
  UserCircleIcon,
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  updateDoc, 
  doc,
  writeBatch,
  addDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function Layout({ children }) {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Função para criar notificação no Firestore (com tratamento de erro)
  const createNotification = async (userId, titulo, mensagem, tipo, link = null, chamadoId = null) => {
    try {
      // Verificar se já existe notificação similar nas últimas 24h
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      
      const q = query(
        collection(db, 'notificacoes'),
        where('userId', '==', userId),
        where('chamadoId', '==', chamadoId),
        where('tipo', '==', tipo),
        where('data', '>=', ontem)
      );
      
      const existing = await getDocs(q);
      
      // Se já existe notificação similar, não criar duplicada
      if (!existing.empty) {
        console.log('Notificação já existe, ignorando...');
        return null;
      }
      
      const notificacaoData = {
        userId: userId,
        titulo: titulo,
        mensagem: mensagem,
        tipo: tipo,
        lida: false,
        data: new Date(),
        createdAt: serverTimestamp(),
        chamadoId: chamadoId || null,
        link: link || null
      };
      
      const docRef = await addDoc(collection(db, 'notificacoes'), notificacaoData);
      console.log('Notificação criada com sucesso:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      // Não mostrar toast para evitar spam
      return null;
    }
  };

  // Função para marcar notificação como lida
  const handleMarkAsRead = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notificacoes', notificationId);
      await updateDoc(notifRef, {
        lida: true,
        lidaEm: new Date()
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      // Se erro de permissão, apenas atualizar localmente
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, lida: true } : n
        )
      );
    }
  };

  // Função para marcar todas como lidas
  const handleMarkAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      let hasUpdates = false;
      
      notifications.forEach(notif => {
        if (!notif.lida) {
          const notifRef = doc(db, 'notificacoes', notif.id);
          batch.update(notifRef, {
            lida: true,
            lidaEm: new Date()
          });
          hasUpdates = true;
        }
      });
      
      if (hasUpdates) {
        await batch.commit();
        toast.success('Todas notificações marcadas como lidas');
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      // Fallback: atualizar localmente
      setNotifications(prev =>
        prev.map(n => ({ ...n, lida: true }))
      );
      toast.success('Notificações marcadas como lidas localmente');
    }
  };

  // Função ao clicar na notificação
  const handleNotificationClick = async (notificacao) => {
    // Marcar como lida se ainda não estiver
    if (!notificacao.lida) {
      await handleMarkAsRead(notificacao.id);
    }
    
    // Navegar para a página relacionada
    if (notificacao.link) {
      navigate(notificacao.link);
    } else if (notificacao.chamadoId) {
      navigate(`/${userData?.role}/chamados/${notificacao.chamadoId}`);
    }
    
    setShowNotifications(false);
  };

  // Função para obter ícone baseado no tipo
  const getNotificationIcon = (tipo) => {
    switch(tipo) {
      case 'chamado_urgente':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />;
      case 'chamado_novo':
        return <ClipboardDocumentListIcon className="w-5 h-5 text-blue-400" />;
      case 'chamado_concluido':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'chamado_atualizado':
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
      case 'novo_usuario':
        return <UserPlusIcon className="w-5 h-5 text-green-400" />;
      default:
        return <BellIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  // Carregar notificações do Firestore
  useEffect(() => {
    if (!userData?.uid) return;

    console.log('Carregando notificações para usuário:', userData.uid);

    const q = query(
      collection(db, 'notificacoes'),
      where('userId', '==', userData.uid),
      orderBy('data', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const notificacoes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          data: doc.data().data?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date()
        }));
        
        setNotifications(notificacoes);
        const unread = notificacoes.filter(n => !n.lida).length;
        setUnreadCount(unread);
        console.log('Notificações carregadas:', notificacoes.length);
      },
      (error) => {
        console.error('Erro ao carregar notificações:', error);
        // Se erro de permissão, mostrar mensagem amigável
        if (error.code === 'permission-denied') {
          console.log('Sem permissão para ler notificações. Verifique as regras do Firebase.');
        }
      }
    );

    return () => unsubscribe();
  }, [userData?.uid]);

  // Monitorar eventos em tempo real para criar notificações (APENAS PARA ADMIN)
  useEffect(() => {
    if (!userData || userData.role !== 'admin') return;

    let unsubscribeChamados;
    let unsubscribeUsuarios;

    // Admin: monitorar chamados urgentes
    const chamadosQuery = query(
      collection(db, 'chamados'),
      where('prioridade', 'in', ['alta', 'emergencial']),
      where('status', 'in', ['aberto', 'em_andamento']),
      orderBy('dataCriacao', 'desc'),
      limit(10)
    );

    unsubscribeChamados = onSnapshot(chamadosQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const chamado = change.doc.data();
          
          // Verificar se já existe notificação para este chamado
          const existingNotif = notifications.find(n => n.chamadoId === change.doc.id);
          if (!existingNotif) {
            await createNotification(
              userData.uid,
              'Chamado Urgente',
              `${chamado.titulo} - Prioridade ${chamado.prioridade}`,
              'chamado_urgente',
              '/admin/chamados',
              change.doc.id
            );
          }
        }
      });
    }, (error) => {
      console.error('Erro no listener de chamados:', error);
    });

    // Admin: monitorar novos usuários
    const usuariosQuery = query(
      collection(db, 'usuarios'),
      orderBy('dataCriacao', 'desc'),
      limit(5)
    );

    unsubscribeUsuarios = onSnapshot(usuariosQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const usuario = change.doc.data();
          
          // Não criar notificação para o próprio usuário
          if (usuario.uid !== userData.uid) {
            const existingNotif = notifications.find(n => n.id === `usuario-${change.doc.id}`);
            if (!existingNotif) {
              await createNotification(
                userData.uid,
                'Novo Usuário',
                `${usuario.nome} (${usuario.role}) acabou de se cadastrar`,
                'novo_usuario',
                '/admin/usuarios'
              );
            }
          }
        }
      });
    }, (error) => {
      console.error('Erro no listener de usuários:', error);
    });

    return () => {
      if (unsubscribeChamados) unsubscribeChamados();
      if (unsubscribeUsuarios) unsubscribeUsuarios();
    };
  }, [userData, notifications]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getBasePath = () => {
    switch(userData?.role) {
      case 'admin': return '/admin';
      case 'dentista': return '/dentista';
      case 'tecnico': return '/tecnico';
      default: return '';
    }
  };

  const basePath = getBasePath();

  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: HomeIcon,
      path: basePath,
      roles: ['admin', 'dentista', 'tecnico']
    },
    {
      id: 'chamados',
      name: 'Chamados',
      icon: ClipboardDocumentListIcon,
      path: `${basePath}/chamados`,
      roles: ['admin', 'dentista', 'tecnico']
    }
  ];

  if (userData?.role === 'tecnico') {
    menuItems.push({
      id: 'ordem-servico',
      name: 'Ordem de serviço',
      icon: ChartBarIcon, 
      path: '/tecnico/OrdemServico',
      roles: ['tecnico']
    });
  }

  if (userData?.role === 'admin') {
    menuItems.push(
      {
        id: 'usuarios',
        name: 'Usuários',
        icon: UsersIcon,
        path: '/admin/usuarios',
        roles: ['admin']
      },
      {
        id: 'relatorios',
        name: 'Relatórios',
        icon: ChartBarIcon,
        path: '/admin/relatorios',
        roles: ['admin']
      },
      {
        id: 'patrimonio',
        name: 'Patrimônio',
        icon: BuildingOfficeIcon,
        path: '/admin/patrimonio',
        roles: ['admin']
      },
      {
        id: 'configuracoes',
        name: 'Configurações',
        icon: Cog6ToothIcon,
        path: '/admin/configuracoes',
        roles: ['admin']
      }
    );
  }

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userData?.role)
  );

  const getRoleIcon = () => {
    switch(userData?.role) {
      case 'admin':
        return <Cog6ToothIcon className="w-4 h-4 text-purple-600" />;
      case 'dentista':
        return <UserCircleIcon className="w-4 h-4 text-blue-600" />;
      case 'tecnico':
        return <WrenchScrewdriverIcon className="w-4 h-4 text-green-600" />;
      default:
        return <UserCircleIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours} h atrás`;
    if (days < 7) return `${days} d atrás`;
    
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-800">
      {/* Header - mantido igual */}
      <header className="bg-gray-700 border-b border-gray-600 sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-300 hover:bg-gray-700 mr-2"
              >
                {sidebarOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
              </button>

              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex p-2 rounded-md text-gray-300 hover:bg-gray-700 mr-2"
              >
                {sidebarCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-white rounded-lg flex items-center justify-center shadow-lg">
                  <img src="/logo.ico" alt="Logo" />
                </div>
                <h1 className="text-lg font-bold text-white">Ortodonsist</h1>
              </div>
              
              <div className="ml-4 px-3 py-1 bg-gray-700 text-gray-200 text-sm rounded-full hidden sm:flex items-center gap-1.5 shadow-sm">
                {getRoleIcon()}
                <span>
                  {userData?.role === 'admin' && 'Administrador'}
                  {userData?.role === 'dentista' && 'Dentista'}
                  {userData?.role === 'tecnico' && 'Técnico'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Notificações */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-md hover:bg-gray-700 relative"
                >
                  <BellIcon className="w-5 h-5 text-gray-300" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-lg shadow-xl border border-gray-700 z-50">
                    <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-gray-200">Notificações</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition ${
                              !notif.lida ? 'bg-gray-800/50' : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0">
                                {getNotificationIcon(notif.tipo)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-200">
                                  {notif.titulo}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {notif.mensagem}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDate(notif.data)}
                                </p>
                              </div>
                              {!notif.lida && (
                                <div className="flex-shrink-0">
                                  <span className="block w-2 h-2 bg-blue-500 rounded-full"></span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-400 text-sm">
                          Nenhuma notificação
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Menu do Usuário */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-1.5 rounded-md hover:bg-gray-700"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold text-sm">
                      {userData?.nome?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-200">{userData?.nome}</p>
                    <p className="text-xs text-gray-400">{userData?.email}</p>
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm font-medium text-gray-200">{userData?.nome}</p>
                      <p className="text-xs text-gray-400">{userData?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar */}
        <aside className={`
          lg:block lg:static lg:transform-none
          fixed top-16 bottom-0 left-0 overflow-y-auto z-20 bg-gray-900 shadow-xl min-h-screen border-r border-gray-700
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-56'}
          w-56
        `}>
          <nav className="mt-4 px-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center px-3 py-2.5 rounded-lg mb-1
                    transition-all duration-200
                    ${active 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-gray-300 hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className={`
                    ${sidebarCollapsed ? 'mx-auto' : 'mr-3'} 
                    h-5 w-5
                    ${active ? 'text-white' : 'text-gray-400'}
                  `} />
                  
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-left text-sm font-medium">{item.name}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`
          flex-1 p-6 min-w-0 transition-all duration-300 bg-white
          ${sidebarCollapsed}
        `}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}