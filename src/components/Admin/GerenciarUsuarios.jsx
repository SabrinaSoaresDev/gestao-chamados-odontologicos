import React, { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  where,
  orderBy
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function GerenciarUsuarios() {
  const { userData } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRole, setFiltroRole] = useState('todos');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    role: 'dentista',
    ativo: true,
    telefone: '',
    especialidade: '',
    observacoes: ''
  });

  // Opções de roles
  const roles = [
    { value: 'admin', label: 'Administrador', icon: ShieldCheckIcon, color: 'purple' },
    { value: 'tecnico', label: 'Técnico', icon: WrenchScrewdriverIcon, color: 'blue' },
    { value: 'dentista', label: 'Dentista', icon: UserGroupIcon, color: 'green' }
  ];

  // Especialidades para técnicos/dentistas
  const especialidades = {
    tecnico: [
      'Manutenção Preventiva',
      'Manutenção Corretiva',
      'Equipamentos Odontológicos',
      'Compressores',
      'Autoclaves',
      'Raio-X',
      'Geral'
    ],
    dentista: [
      'Clínico Geral',
      'Ortodontia',
      'Endodontia',
      'Periodontia',
      'Implantodontia',
      'Odontopediatria',
      'Estética'
    ]
  };

  useEffect(() => {
    // Carregar usuários em tempo real
    const q = query(
      collection(db, 'usuarios'),
      orderBy('nome', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usuariosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(usuariosData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Editar usuário existente
        await updateDoc(doc(db, 'usuarios', editingUser.id), {
          ...formData,
          dataAtualizacao: new Date()
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário no Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          'senha123' // Senha temporária - pode ser gerada aleatoriamente
        );

        // Criar usuário no Firestore
        await addDoc(collection(db, 'usuarios'), {
          uid: userCredential.user.uid,
          ...formData,
          dataCriacao: new Date(),
          criadoPor: userData?.uid,
          senhaTemporaria: true // Marcar que precisa trocar a senha
        });

        // Enviar email para definir senha
        await sendPasswordResetEmail(auth, formData.email);
        
        toast.success('Usuário criado! Um email foi enviado para definir a senha.');
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este email já está em uso');
      } else {
        toast.error('Erro ao salvar usuário');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'usuarios', userId));
      toast.success('Usuário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleToggleAtivo = async (user) => {
    try {
      await updateDoc(doc(db, 'usuarios', user.id), {
        ativo: !user.ativo,
        dataAtualizacao: new Date()
      });
      toast.success(`Usuário ${user.ativo ? 'desativado' : 'ativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleResetSenha = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Email de recuperação enviado!');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast.error('Erro ao enviar email de recuperação');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      role: 'dentista',
      ativo: true,
      telefone: '',
      especialidade: '',
      observacoes: ''
    });
    setEditingUser(null);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome || '',
      email: user.email || '',
      role: user.role || 'dentista',
      ativo: user.ativo !== undefined ? user.ativo : true,
      telefone: user.telefone || '',
      especialidade: user.especialidade || '',
      observacoes: user.observacoes || ''
    });
    setShowModal(true);
  };

  // Filtrar usuários
  const filteredUsers = usuarios.filter(user => {
    const matchesSearch = 
      user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.telefone?.includes(searchTerm);
    
    const matchesRole = filtroRole === 'todos' || user.role === filtroRole;
    const matchesAtivo = filtroAtivo === 'todos' || 
      (filtroAtivo === 'ativos' && user.ativo) || 
      (filtroAtivo === 'inativos' && !user.ativo);
    
    return matchesSearch && matchesRole && matchesAtivo;
  });

  // Estatísticas
  const stats = {
    total: usuarios.length,
    admins: usuarios.filter(u => u.role === 'admin').length,
    tecnicos: usuarios.filter(u => u.role === 'tecnico').length,
    dentistas: usuarios.filter(u => u.role === 'dentista').length,
    ativos: usuarios.filter(u => u.ativo).length,
    inativos: usuarios.filter(u => !u.ativo).length
  };

  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || roles[2];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h2>
          <p className="text-gray-600">Cadastre e gerencie os usuários do sistema</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlusIcon className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm p-4 border border-purple-100">
          <p className="text-xs text-purple-600">Admins</p>
          <p className="text-xl font-bold text-purple-700">{stats.admins}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm p-4 border border-blue-100">
          <p className="text-xs text-blue-600">Técnicos</p>
          <p className="text-xl font-bold text-blue-700">{stats.tecnicos}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4 border border-green-100">
          <p className="text-xs text-green-600">Dentistas</p>
          <p className="text-xl font-bold text-green-700">{stats.dentistas}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4 border border-green-100">
          <p className="text-xs text-green-600">Ativos</p>
          <p className="text-xl font-bold text-green-700">{stats.ativos}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-4 border border-red-100">
          <p className="text-xs text-red-600">Inativos</p>
          <p className="text-xl font-bold text-red-700">{stats.inativos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filtroRole}
            onChange={(e) => setFiltroRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os perfis</option>
            <option value="admin">Administradores</option>
            <option value="tecnico">Técnicos</option>
            <option value="dentista">Dentistas</option>
          </select>
          <select
            value={filtroAtivo}
            onChange={(e) => setFiltroAtivo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os status</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especialidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const RoleIcon = getRoleInfo(user.role).icon;
                const roleColor = getRoleInfo(user.role).color;
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${roleColor}-100`}>
                          <RoleIcon className={`w-5 h-5 text-${roleColor}-600`} />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{user.nome}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full bg-${roleColor}-100 text-${roleColor}-700`}>
                        {getRoleInfo(user.role).label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.telefone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="w-4 h-4 text-gray-400 mr-1" />
                          {user.telefone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{user.especialidade || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {user.ativo ? (
                        <span className="flex items-center text-sm text-green-600">
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Ativo
                        </span>
                      ) : (
                        <span className="flex items-center text-sm text-red-600">
                          <XCircleIcon className="w-4 h-4 mr-1" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetalhesModal(true);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Ver detalhes"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Editar"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleToggleAtivo(user)}
                          className={`p-1 rounded ${
                            user.ativo 
                              ? 'text-yellow-600 hover:bg-yellow-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {user.ativo ? (
                            <XCircleIcon className="w-5 h-5" />
                          ) : (
                            <CheckCircleIcon className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleResetSenha(user.email)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          title="Resetar senha"
                        >
                          <EnvelopeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={editingUser}
                  />
                  {!editingUser && (
                    <p className="text-xs text-gray-500 mt-1">
                      Uma senha temporária será enviada por email
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Perfil de Acesso *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => {
                      setFormData({
                        ...formData, 
                        role: e.target.value,
                        especialidade: '' // Reset especialidade ao mudar role
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Especialidade
                  </label>
                  <select
                    value={formData.especialidade}
                    onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma especialidade</option>
                    {formData.role && especialidades[formData.role]?.map(esp => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    rows="3"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações adicionais sobre o usuário..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Usuário ativo</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar Usuário')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhesModal && selectedUser && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Detalhes do Usuário</h3>
              <button
                onClick={() => setShowDetalhesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Perfil */}
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-${getRoleInfo(selectedUser.role).color}-100`}>
                  {React.createElement(getRoleInfo(selectedUser.role).icon, {
                    className: `w-8 h-8 text-${getRoleInfo(selectedUser.role).color}-600`
                  })}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">{selectedUser.nome}</h4>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Perfil</p>
                  <p className="font-medium text-gray-800">
                    {getRoleInfo(selectedUser.role).label}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {selectedUser.ativo ? (
                    <p className="font-medium text-green-600">Ativo</p>
                  ) : (
                    <p className="font-medium text-red-600">Inativo</p>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Telefone</p>
                  <p className="font-medium text-gray-800">{selectedUser.telefone || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Especialidade</p>
                  <p className="font-medium text-gray-800">{selectedUser.especialidade || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Data de Cadastro</p>
                  <p className="font-medium text-gray-800">
                    {selectedUser.dataCriacao?.toDate().toLocaleDateString('pt-BR') || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Último Acesso</p>
                  <p className="font-medium text-gray-800">
                    {selectedUser.ultimoAcesso?.toDate().toLocaleString('pt-BR') || 'Nunca acessou'}
                  </p>
                </div>
              </div>

              {/* Observações */}
              {selectedUser.observacoes && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Observações</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedUser.observacoes}</p>
                  </div>
                </div>
              )}

              {/* Ações Rápidas */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetalhesModal(false);
                    handleEdit(selectedUser);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Editar Usuário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}