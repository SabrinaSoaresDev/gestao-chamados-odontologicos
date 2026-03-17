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
  setDoc 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  EyeIcon, 
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function GerenciarUsuariosModal({ isOpen, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'dentista',
    ativo: true,
    observacoes: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasNumber: false,
    hasUpper: false,
    hasLower: false,
    hasSpecial: false
  });

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

  // Função para resetar o formulário
  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'dentista',
      ativo: true,
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
  };

  useEffect(() => {
  if (!isOpen) return;

  console.log('🔄 Iniciando listener no modal...');
  
  const q = query(collection(db, 'usuarios'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const usuariosData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('📦 Usuários carregados no modal:', usuariosData.length);
    setUsuarios(usuariosData);
  });

  return () => {
    console.log('🛑 Removendo listener do modal');
    unsubscribe();
  };
}, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Atualizar apenas no Firestore (não podemos atualizar senha/email no Auth sem reverificação)
        await updateDoc(doc(db, 'usuarios', editingUser.id), {
          nome: formData.nome,
          role: formData.role,
          ativo: formData.ativo,
          observacoes: formData.observacoes,
          dataAtualizacao: new Date()
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Validar senhas
        if (formData.password !== formData.confirmPassword) {
          toast.error('As senhas não conferem');
          setLoading(false);
          return;
        }

        if (passwordStrength.score < 2) {
          toast.error('Escolha uma senha mais forte');
          setLoading(false);
          return;
        }

        // 1. Criar usuário no Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const user = userCredential.user;

        // 2. Criar documento no Firestore com o mesmo UID
        await setDoc(doc(db, 'usuarios', user.uid), {
          uid: user.uid,
          nome: formData.nome,
          email: formData.email,
          role: formData.role,
          ativo: formData.ativo,
          observacoes: formData.observacoes || '',
          dataCriacao: new Date(),
          criadoPor: 'admin',
          ultimoAcesso: null
        });

        toast.success('Usuário criado com sucesso no Authentication e Firestore!');
      }

      setShowForm(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('Erro detalhado:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está cadastrado');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Senha muito fraca');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('E-mail inválido');
      } else {
        toast.error('Erro ao salvar usuário: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, userEmail) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      try {
        // Nota: Para excluir do Authentication, você precisaria de uma função Cloud
        // ou fazer isso manualmente no console. Por enquanto, só excluímos do Firestore.
        await deleteDoc(doc(db, 'usuarios', userId));
        toast.success('Usuário removido do Firestore. Para remover completamente, exclua também do Authentication no console do Firebase.');
      } catch (error) {
        console.error('Erro ao excluir:', error);
        toast.error('Erro ao excluir usuário');
      }
    }
  };

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('E-mail de redefinição de senha enviado!');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast.error('Erro ao enviar e-mail de redefinição');
    }
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
      observacoes: user.observacoes || ''
    });
    setShowForm(true);
  };

  const filteredUsers = usuarios.filter(user =>
    user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Gerenciar Usuários</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Barra de busca e botão novo */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingUser(null);
                resetForm();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlusIcon className="w-5 h-5" />
              Novo Usuário
            </button>
          </div>

          {/* Formulário de cadastro/edição */}
          {showForm && (
            <div className="mb-6 p-6 border-2 border-blue-200 rounded-xl bg-blue-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                {editingUser ? (
                  <>
                    <PencilIcon className="w-5 h-5 text-blue-600" />
                    Editar Usuário
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="w-5 h-5 text-blue-600" />
                    Novo Usuário
                  </>
                )}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Digite o nome completo"
                      disabled={loading}
                    />
                  </div>

                  {/* E-mail */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="email@exemplo.com"
                      disabled={editingUser || loading}
                    />
                    {!editingUser && (
                      <p className="text-xs text-gray-500 mt-1">
                        O usuário será criado no Authentication com esta senha
                      </p>
                    )}
                  </div>

                  {/* Senha (apenas para novo usuário) */}
                  {!editingUser && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
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
                            
                            <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                              <div className="flex items-center gap-1">
                                {passwordStrength.hasMinLength ? (
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <XCircleIcon className="w-3.5 h-3.5 text-gray-300" />
                                )}
                                <span>8+ caracteres</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {passwordStrength.hasNumber ? (
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <XCircleIcon className="w-3.5 h-3.5 text-gray-300" />
                                )}
                                <span>Números</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {passwordStrength.hasUpper ? (
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <XCircleIcon className="w-3.5 h-3.5 text-gray-300" />
                                )}
                                <span>Maiúscula</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {passwordStrength.hasLower ? (
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <XCircleIcon className="w-3.5 h-3.5 text-gray-300" />
                                )}
                                <span>Minúscula</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {passwordStrength.hasSpecial ? (
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <XCircleIcon className="w-3.5 h-3.5 text-gray-300" />
                                )}
                                <span>Especial</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirmar Senha */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirmar Senha <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required={!editingUser}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
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

                  {/* Perfil */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Perfil de Acesso <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      disabled={loading}
                    >
                      <option value="dentista">Dentista</option>
                      <option value="tecnico">Técnico</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="flex items-center h-10 gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value="true"
                          checked={formData.ativo === true}
                          onChange={() => setFormData({...formData, ativo: true})}
                          className="w-4 h-4 text-blue-600"
                          disabled={loading}
                        />
                        <span className="text-sm text-gray-700">Ativo</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value="false"
                          checked={formData.ativo === false}
                          onChange={() => setFormData({...formData, ativo: false})}
                          className="w-4 h-4 text-blue-600"
                          disabled={loading}
                        />
                        <span className="text-sm text-gray-700">Inativo</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    rows="2"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Observações adicionais sobre o usuário..."
                    disabled={loading}
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4 border-t border-blue-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (!editingUser && formData.password !== formData.confirmPassword)}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processando...
                      </>
                    ) : (
                      editingUser ? 'Atualizar Usuário' : 'Criar Usuário'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de usuários */}
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {user.nome?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{user.nome}</h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                        {user.role === 'admin' && 'Administrador'}
                        {user.role === 'tecnico' && 'Técnico'}
                        {user.role === 'dentista' && 'Dentista'}
                      </span>
                      {user.ativo ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <XCircleIcon className="w-3 h-3" />
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Editar usuário"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleResetPassword(user.email)}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                    title="Resetar senha"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(user.id, user.email)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Excluir usuário"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}