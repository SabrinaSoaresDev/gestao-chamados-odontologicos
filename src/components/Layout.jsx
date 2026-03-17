import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ClipboardDocumentListIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
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
  UserPlusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

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

  // Carregar notificações do Firebase
  useEffect(() => {
    if (!userData) return;

    let unsubscribe;

    if (userData.role === 'tecnico') {
      // Técnico: novos chamados atribuídos
      const q = query(
        collection(db, 'chamados'),
        where('tecnicoId', '==', userData.uid),
        where('status', '==', 'aberto'),
        orderBy('dataCriacao', 'desc'),
        limit(20)
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const notificacoes = snapshot.docs.map(doc => ({
          id: doc.id,
          tipo: 'novo_chamado',
          titulo: 'Novo chamado atribuído',
          mensagem: doc.data().titulo,
          data: doc.data().dataCriacao?.toDate(),
          lida: false,
          link: `/${userData.role}/chamados`,
          icone: <ClipboardDocumentListIcon className="w-5 h-5 text-blue-400" />
        }));
        setNotifications(notificacoes);
        setUnreadCount(notificacoes.length);
      });

    } else if (userData.role === 'admin') {
      // Admin: chamados urgentes e novos usuários
      const chamadosQuery = query(
        collection(db, 'chamados'),
        where('prioridade', 'in', ['alta', 'emergencial']),
        where('status', 'in', ['aberto', 'em_andamento']),
        orderBy('dataCriacao', 'desc'),
        limit(10)
      );

      const usuariosQuery = query(
        collection(db, 'usuarios'),
        orderBy('dataCriacao', 'desc'),
        limit(5)
      );

      const unsubscribeChamados = onSnapshot(chamadosQuery, (snapshot) => {
        const chamadosNotif = snapshot.docs.map(doc => ({
          id: `chamado-${doc.id}`,
          tipo: 'chamado_urgente',
          titulo: 'Chamado urgente',
          mensagem: doc.data().titulo,
          data: doc.data().dataCriacao?.toDate(),
          lida: false,
          link: '/admin/chamados',
          icone: <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
        }));

        setNotifications(prev => {
          const novas = [...chamadosNotif, ...prev.filter(n => n.tipo !== 'chamado_urgente')];
          return novas.slice(0, 20);
        });
      });

      const unsubscribeUsuarios = onSnapshot(usuariosQuery, (snapshot) => {
        const usuariosNotif = snapshot.docs.map(doc => ({
          id: `usuario-${doc.id}`,
          tipo: 'novo_usuario',
          titulo: 'Novo usuário cadastrado',
          mensagem: doc.data().nome,
          data: doc.data().dataCriacao?.toDate(),
          lida: false,
          link: '/admin/usuarios',
          icone: <UserPlusIcon className="w-5 h-5 text-green-400" />
        }));

        setNotifications(prev => {
          const novas = [...usuariosNotif, ...prev.filter(n => n.tipo !== 'novo_usuario')];
          return novas.slice(0, 20);
        });
      });

      unsubscribe = () => {
        unsubscribeChamados();
        unsubscribeUsuarios();
      };

    } else if (userData.role === 'dentista') {
      // Dentista: atualizações nos chamados
      const q = query(
        collection(db, 'chamados'),
        where('solicitanteId', '==', userData.uid),
        where('status', 'in', ['em_andamento', 'concluido']),
        orderBy('dataAtualizacao', 'desc'),
        limit(20)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const agora = new Date();
        const umDiaAtras = new Date(agora.setDate(agora.getDate() - 1));
        
        const notificacoes = snapshot.docs
          .filter(doc => {
            const data = doc.data().dataAtualizacao?.toDate();
            return data && data > umDiaAtras;
          })
          .map(doc => ({
            id: doc.id,
            tipo: doc.data().status === 'concluido' ? 'chamado_concluido' : 'chamado_atualizado',
            titulo: doc.data().status === 'concluido' ? 'Chamado concluído' : 'Chamado atualizado',
            mensagem: doc.data().titulo,
            data: doc.data().dataAtualizacao?.toDate(),
            lida: false,
            link: '/dentista/chamados',
            icone: doc.data().status === 'concluido' 
              ? <CheckCircleIcon className="w-5 h-5 text-green-400" />
              : <ClockIcon className="w-5 h-5 text-yellow-400" />
          }));

        setNotifications(notificacoes);
        setUnreadCount(notificacoes.length);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userData]);

  // Atualizar contador de não lidas
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.lida).length);
  }, [notifications]);

  const handleMarkAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, lida: true } : n
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, lida: true }))
    );
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification.id);
    navigate(notification.link);
    setShowNotifications(false);
  };

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
    },
    {
      id: 'ordem-servico',
      name: 'Ordem de serviço',
      icon: ChartBarIcon, 
      path: '/tecnico/OrdemServico',
      roles: ['tecnico']
    }
  ];

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
    return `${days} d atrás`;
  };

  return (
    <div className="min-h-screen bg-gray-800">
      {/* Header */}
      <header className="bg-gray-700 border-b border-gray-600 sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Botão do menu mobile */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-300 hover:bg-gray-700 mr-2"
              >
                {sidebarOpen ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </button>

              {/* Botão de colapsar sidebar (desktop) */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex p-2 rounded-md text-gray-300 hover:bg-gray-700 mr-2"
              >
                {sidebarCollapsed ? (
                  <ChevronRightIcon className="h-5 w-5" />
                ) : (
                  <ChevronLeftIcon className="h-5 w-5" />
                )}
              </button>
              
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-base">O</span>
                </div>
                <h1 className="text-lg font-bold text-white">Ortodonsist</h1>
              </div>
              
              {/* Badge de Role */}
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
              {/* Notificações - Agora com dropdown */}
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

                {/* Dropdown de Notificações */}
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
                                {notif.icone}
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

                    <div className="p-2 border-t border-gray-700">
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          navigate(`/${userData?.role}/chamados`);
                        }}
                        className="w-full text-center text-xs text-gray-400 hover:text-gray-300 py-1"
                      >
                        Ver todas as notificações
                      </button>
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

                {/* Dropdown do Usuário */}
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