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
} from '@heroicons/react/24/outline';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Layout({ children }) {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Carregar notificações reais do Firebase
  useEffect(() => {
    if (!userData) return;

    if (userData.role === 'tecnico') {
      const q = query(
        collection(db, 'chamados'),
        where('tecnicoId', '==', userData.uid),
        where('status', '==', 'aberto')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.size);
      });
      return () => unsubscribe();
    }

    if (userData.role === 'admin') {
      const q = query(
        collection(db, 'chamados'),
        where('prioridade', 'in', ['alta', 'emergencial']),
        where('status', 'in', ['aberto', 'em_andamento'])
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.size);
      });
      return () => unsubscribe();
    }

    if (userData.role === 'dentista') {
      const q = query(
        collection(db, 'chamados'),
        where('solicitanteId', '==', userData.uid),
        where('status', 'in', ['em_andamento', 'concluido'])
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const agora = new Date();
        const umDiaAtras = new Date(agora.setDate(agora.getDate() - 1));
        const recentes = snapshot.docs.filter(doc => {
          const data = doc.data().dataAtualizacao?.toDate();
          return data && data > umDiaAtras;
        });
        setNotifications(recentes.length);
      });
      return () => unsubscribe();
    }
  }, [userData]);

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
  icon: BuildingOfficeIcon, // ou o ícone que preferir
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
                  <span className="text-white font-bold text-base">D</span>
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
              {/* Notificações */}
              <button className="p-2 rounded-md hover:bg-gray-700 relative">
                <BellIcon className="w-5 h-5 text-gray-300" />
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </button>
              
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

        {/* Main Content - CORRIGIDO */}
        <main className={`
          flex-1 p-6 min-w-0 transition-all duration-300 bg-white
          ${sidebarCollapsed }
        `}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}