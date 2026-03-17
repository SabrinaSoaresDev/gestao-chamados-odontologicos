import React, { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  where,
  orderBy,
  setDoc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword
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
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
  const [showAlterarSenhaModal, setShowAlterarSenhaModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Estados para o formulário
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'dentista',
    telefone: '',
    especialidade: '',
    unidade: '',
    observacoes: '',
    ativo: true
  });
  
  // Estados para alteração de senha
  const [senhaData, setSenhaData] = useState({
    novaSenha: '',
    confirmarNovaSenha: ''
  });
  
  // Estados para controle de visibilidade de senha
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarNovaSenha, setShowConfirmarNovaSenha] = useState(false);
  
  // Estado para força da senha
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasNumber: false,
    hasUpper: false,
    hasLower: false,
    hasSpecial: false
  });
  
  const [alterandoSenha, setAlterandoSenha] = useState(false);

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

  // Função para verificar força da senha
  const checkPasswordStrength = (password) => {
    const strength = {
      score: 0,
      hasMinLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    let score = 0;
    if (strength.hasMinLength) score++;
    if (strength.hasNumber) score++;
    if (strength.hasUpper) score++;
    if (strength.hasLower) score++;
    if (strength.hasSpecial) score++;
    
    strength.score = Math.min(4, score);
    setPasswordStrength(strength);
  };

  // Texto da força da senha
  const getPasswordStrengthText = () => {
    const { score } = passwordStrength;
    if (score <= 1) return { text: 'Fraca', color: 'text-red-500' };
    if (score <= 2) return { text: 'Média', color: 'text-yellow-500' };
    if (score <= 3) return { text: 'Boa', color: 'text-blue-500' };
    return { text: 'Forte', color: 'text-green-500' };
  };

  const strengthInfo = getPasswordStrengthText();

  // Carregar usuários em tempo real
  useEffect(() => {
    console.log('🔄 Iniciando listener de usuários...');
    
    const q = query(
      collection(db, 'usuarios'),
      orderBy('nome', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usuariosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('📦 Usuários carregados:', usuariosData.length);
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
  
  console.log('🚀 Iniciando handleSubmit...');
  console.log('👤 Admin atual:', auth.currentUser?.email);
  
  // Validar senhas
  if (formData.password !== formData.confirmPassword) {
    toast.error('As senhas não conferem');
    return;
  }

  if (passwordStrength.score < 2) {
    toast.error('Escolha uma senha mais forte');
    return;
  }

  setLoading(true);

  try {
    if (editingUser) {
      // Editar usuário existente (continua igual)
      await updateDoc(doc(db, 'usuarios', editingUser.id), {
        nome: formData.nome,
        role: formData.role,
        ativo: formData.ativo,
        telefone: formData.telefone,
        unidade: formData.unidade || "",
        especialidade: formData.especialidade,
        observacoes: formData.observacoes,
        dataAtualizacao: new Date()
      });
      
      toast.success('Usuário atualizado com sucesso!');
      setShowModal(false);
      resetForm();
      
    } else {
      console.log('🆕 Criando novo usuário...');

      // 1. Criar documento TEMPORÁRIO no Firestore (como admin)
      const tempUid = `temp_${Date.now()}`;
      
      const userData = {
        uid: tempUid,
        nome: formData.nome,
        email: formData.email,
        role: formData.role,
        ativo: formData.ativo,
        telefone: formData.telefone || '',
        unidade: formData.unidade || "",
        especialidade: formData.especialidade || '',
        observacoes: formData.observacoes || '',
        dataCriacao: new Date(),
        criadoPor: auth.currentUser?.uid,
        status: 'pendente',
        ultimoAcesso: null
      };

      console.log('📝 Criando documento temporário:', userData);
      await setDoc(doc(db, 'usuarios', tempUid), userData);
      console.log('✅ Documento temporário criado');

      // 2. Criar no Authentication (ISSO VAI DESLOGAR O ADMIN)
      console.log('📧 Criando usuário no Auth:', formData.email);
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      const novoUsuario = userCredential.user;
      console.log('✅ Usuário criado no Auth. UID:', novoUsuario.uid);

      // 3. LOGIN NOVAMENTE como admin (vamos precisar da senha)
      const adminEmail = auth.currentUser?.email; // Isso agora é o email do NOVO usuário
      const adminOriginal = prompt("Digite o EMAIL do administrador para voltar:");
      
      if (!adminOriginal) {
        toast.error('Operação cancelada');
        setLoading(false);
        return;
      }

      const adminSenha = prompt("Digite a SENHA do administrador:");
      if (!adminSenha) {
        toast.error('Operação cancelada');
        setLoading(false);
        return;
      }

      // Fazer login novamente como admin
      await signInWithEmailAndPassword(auth, adminOriginal, adminSenha);
      console.log('✅ Admin logado novamente');

      // 4. Agora sim, criar o documento DEFINITIVO (como admin)
      await setDoc(doc(db, 'usuarios', novoUsuario.uid), {
        ...userData,
        uid: novoUsuario.uid,
        status: 'ativo',
        dataCriacao: new Date()
      });

      // 5. Remover o documento temporário
      await deleteDoc(doc(db, 'usuarios', tempUid));
      
      console.log('✅ Usuário criado com sucesso!');
      toast.success('Usuário criado com sucesso!');
      
      setShowModal(false);
      resetForm();
    }

  } catch (error) {
    console.error('❌ ERRO:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      toast.error('Este e-mail já está cadastrado');
    } else if (error.code === 'auth/weak-password') {
      toast.error('Senha muito fraca');
    } else if (error.code === 'auth/invalid-email') {
      toast.error('E-mail inválido');
    } else if (error.code === 'auth/wrong-password') {
      toast.error('Senha do administrador incorreta');
    } else {
      toast.error('Erro ao criar usuário: ' + error.message);
    }
  } finally {
    setLoading(false);
  }
};

  // Função para alterar senha do usuário
  const handleAlterarSenha = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    if (senhaData.novaSenha !== senhaData.confirmarNovaSenha) {
      toast.error('As senhas não conferem');
      return;
    }

    if (senhaData.novaSenha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    setAlterandoSenha(true);

    try {
      await sendPasswordResetEmail(auth, selectedUser.email);
      toast.success('Email de redefinição de senha enviado para o usuário!');
      
      setShowAlterarSenhaModal(false);
      setSenhaData({ novaSenha: '', confirmarNovaSenha: '' });
      
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha. Tente o reset por email.');
    } finally {
      setAlterandoSenha(false);
    }
  };

  const handleDelete = async (userId, userEmail) => {
  if (!window.confirm(`Tem certeza que deseja excluir ${userEmail}?`)) {
    return;
  }

  try {
    // Excluir do Firestore (sempre funciona)
    await deleteDoc(doc(db, 'usuarios', userId));
    
    // Para exclusão do Auth, dar instruções
    toast.success(
      <div>
        <p>✅ Usuário removido do Firestore!</p>
        <p className="text-xs mt-2">
          Para remover também do Authentication, acesse:
          <br />
          <a 
            href="https://console.firebase.google.com/project/gestao-chamados-odontologicos/authentication/users" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Console do Firebase → Authentication
          </a>
        </p>
      </div>,
      { duration: 8000 }
    );

  } catch (error) {
    console.error('Erro:', error);
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
      password: '',
      confirmPassword: '',
      role: 'dentista',
      ativo: true,
      telefone: '',
      unidade: '',
      especialidade: '',
      observacoes: ''
    });
    setPasswordStrength({
      score: 0,
      hasMinLength: false,
      hasNumber: false,
      hasUpper: false,
      hasLower: false,
      hasSpecial: false
    });
    setEditingUser(null);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'dentista',
      ativo: user.ativo !== undefined ? user.ativo : true,
      telefone: user.telefone || '',
      especialidade: user.especialidade || '',
      unidade: user.unidade || '',
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
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
                      <span className="text-sm text-gray-600">{user.unidade || '-'}</span>
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
                          onClick={() => {
                            setSelectedUser(user);
                            setShowAlterarSenhaModal(true);
                          }}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          title="Alterar Senha"
                        >
                          <KeyIcon className="w-5 h-5" />
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
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={editingUser || loading}
                  />
                  {!editingUser && (
                    <p className="text-xs text-gray-500 mt-1">
                      O usuário será criado no Authentication com esta senha
                    </p>
                  )}
                </div>

                {/* Campos de senha (apenas para novo usuário) */}
                {!editingUser && (
                  <>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Senha <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required={!editingUser}
                          value={formData.password}
                          onChange={(e) => {
                            setFormData({...formData, password: e.target.value});
                            checkPasswordStrength(e.target.value);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                          placeholder="••••••••"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      
                      {/* Indicador de força da senha */}
                      {formData.password && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Força da senha:</span>
                            <span className={`text-xs font-medium ${strengthInfo.color}`}>
                              {strengthInfo.text}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={`h-1.5 flex-1 rounded-full transition-all ${
                                  level <= passwordStrength.score
                                    ? level <= 2 ? 'bg-red-500'
                                      : level <= 3 ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Senha <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required={!editingUser}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                          placeholder="••••••••"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                          As senhas não conferem
                        </p>
                      )}
                    </div>
                  </>
                )}

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
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={formData.unidade}
                    onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: UBS Centro"
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
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
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || (!editingUser && formData.password !== formData.confirmPassword)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    editingUser ? 'Atualizar' : 'Criar Usuário'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alterar Senha */}
      {showAlterarSenhaModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Alterar Senha</h3>
              <button
                onClick={() => {
                  setShowAlterarSenhaModal(false);
                  setSenhaData({ novaSenha: '', confirmarNovaSenha: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAlterarSenha} className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  Alterando senha para: <span className="font-semibold">{selectedUser.nome}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNovaSenha ? "text" : "password"}
                    required
                    value={senhaData.novaSenha}
                    onChange={(e) => {
                      setSenhaData({...senhaData, novaSenha: e.target.value});
                      checkPasswordStrength(e.target.value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="••••••••"
                    disabled={alterandoSenha}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNovaSenha ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmarNovaSenha ? "text" : "password"}
                    required
                    value={senhaData.confirmarNovaSenha}
                    onChange={(e) => setSenhaData({...senhaData, confirmarNovaSenha: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="••••••••"
                    disabled={alterandoSenha}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmarNovaSenha(!showConfirmarNovaSenha)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmarNovaSenha ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {senhaData.confirmarNovaSenha && senhaData.novaSenha !== senhaData.confirmarNovaSenha && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    As senhas não conferem
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-700">
                  Será enviado um email de redefinição de senha para o usuário.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAlterarSenhaModal(false);
                    setSenhaData({ novaSenha: '', confirmarNovaSenha: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={alterandoSenha}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={alterandoSenha || !senhaData.novaSenha || senhaData.novaSenha !== senhaData.confirmarNovaSenha}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {alterandoSenha ? 'Enviando...' : 'Enviar Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhesModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
                  <p className="text-xs text-gray-500 mb-1">Unidade</p>
                  <p className="font-medium text-gray-800">{selectedUser.unidade || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Especialidade</p>
                  <p className="font-medium text-gray-800">{selectedUser.especialidade || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Cadastro</p>
                  <p className="font-medium text-gray-800">
                    {selectedUser.dataCriacao?.toDate().toLocaleDateString('pt-BR') || '-'}
                  </p>
                </div>
              </div>

              {selectedUser.observacoes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Observações</p>
                  <p className="text-sm text-gray-700">{selectedUser.observacoes}</p>
                </div>
              )}

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