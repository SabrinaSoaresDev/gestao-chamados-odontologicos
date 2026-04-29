import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

// Páginas de Login
import Login from './pages/Login';
import Register from './pages/Register';
import FirstAccessReset from './components/FirstAccessReset';

// Páginas do Admin
import AdminDashboard from './pages/Admin/Dashboard';
import AdminChamados from './pages/Admin/Chamados';
import AdminConfiguracoes from './pages/Admin/Configuracoes';
import Relatorios from './pages/Admin/Relatorios';
import AdminUsuarios from './pages/Admin/Usuarios';
import Patrimonio from './pages/Admin/Patrimonio';
import NovoChamadoPage from './components/Chamados/NovoChamadoModal';

// Páginas do Dentista
import DentistaDashboard from './pages/Dentistas/Dashboard';
import DentistaChamados from './pages/Dentistas/Chamados';

// Páginas do Técnico
import TecnicoDashboard from './pages/Tecnico/Dashboard';
import TecnicoChamados from './pages/Tecnico/Chamados';
import OrdemServico from './pages/Tecnico/OrdemServico';

// Componentes de Layout
import Layout from './components/Layout';

function PrivateRoute({ children, allowedRoles }) {
  const { userData } = useAuth();
  
  if (!userData) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

function AppRoutes() {
  const { userData } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/primeiro-acesso" element={<FirstAccessReset />} />
      
      {/* Rotas do Admin */}
      <Route path="/admin" element={
        <PrivateRoute allowedRoles={['admin']}>
          <Layout currentPage="dashboard">
            <AdminDashboard />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/admin/chamados" element={
        <PrivateRoute allowedRoles={['admin']}>
          <Layout currentPage="chamados">
            <AdminChamados />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/admin/patrimonio" element={
          <PrivateRoute allowedRoles={['admin']}>
            <Layout currentPage="patrimonio">
              <Patrimonio />
            </Layout>
          </PrivateRoute>
        } />
      <Route path="/admin/configuracoes" element={
        <PrivateRoute allowedRoles={['admin']}>
          <Layout currentPage="configuracoes">
            <AdminConfiguracoes />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/admin/novo-chamado" element={
        <PrivateRoute allowedRoles={['admin']}>
          <Layout>
            <NovoChamadoPage />
          </Layout>
        </PrivateRoute>
      } />
     
      <Route path="/admin/usuarios" element={
        <PrivateRoute allowedRoles={['admin']}>
          <Layout currentPage="usuarios">
            <AdminUsuarios />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/admin/relatorios" element={
        <PrivateRoute allowedRoles={['admin']}>
          <Layout currentPage="relatorios">
            <Relatorios />
          </Layout>
        </PrivateRoute>
      } />
      
      {/* Rotas do Dentista */}
      <Route path="/dentista" element={
        <PrivateRoute allowedRoles={['dentista']}>
          <Layout currentPage="dashboard">
            <DentistaDashboard />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/dentista/chamados" element={
        <PrivateRoute allowedRoles={['dentista']}>
          <Layout currentPage="chamados">
            <DentistaChamados />
          </Layout>
        </PrivateRoute>
      } />
      
      {/* Rotas do Técnico */}
      <Route path="/tecnico" element={
        <PrivateRoute allowedRoles={['tecnico']}>
          <Layout currentPage="dashboard">
            <TecnicoDashboard />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/tecnico/chamados" element={
        <PrivateRoute allowedRoles={['tecnico']}>
          <Layout currentPage="chamados">
            <TecnicoChamados />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/tecnico/OrdemServico" element={
        <PrivateRoute allowedRoles={['tecnico']}>
          <Layout currentPage="OrdemServico">
            <OrdemServico />
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;