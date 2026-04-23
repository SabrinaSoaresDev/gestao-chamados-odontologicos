// src/components/FirstAccessReset.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore'; // Adicione getDoc
import toast from 'react-hot-toast';
import { 
  LockClosedIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import logo from '../assets/logo.png';

export default function FirstAccessReset() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasNumber: false,
    hasUpper: false,
    hasLower: false,
    hasSpecial: false
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const userEmail = location.state?.email || '';

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
    
    strength.score = score;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    checkPasswordStrength(password);
  };

  const getPasswordStrengthText = () => {
    const { score } = passwordStrength;
    if (score <= 2) return { text: 'Fraca', color: 'text-red-500' };
    if (score <= 3) return { text: 'Média', color: 'text-yellow-500' };
    if (score <= 4) return { text: 'Boa', color: 'text-blue-500' };
    return { text: 'Forte', color: 'text-green-500' };
  };

  const validateForm = () => {
    if (newPassword.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return false;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem');
      return false;
    }

    if (passwordStrength.score < 3) {
      toast.error('Por favor, escolha uma senha mais forte');
      return false;
    }

    return true;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const user = auth.currentUser;
      
      if (!user) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/login');
        return;
      }

      // Buscar dados do usuário para saber o role
      const userRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // Atualizar a senha no Firebase Auth
      await updatePassword(user, newPassword);
      
      // Atualizar o Firestore marcando que não é mais primeiro acesso
      await updateDoc(userRef, {
        primeiroAcesso: false,
        senhaAtualizadaEm: new Date(),
        ultimaAlteracaoSenha: new Date()
      });

      toast.success('Senha criada com sucesso! Redirecionando...');
      
      // ✅ CORRIGIDO: Redirecionar baseado no role do usuário
      setTimeout(() => {
        switch(userData.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'dentista':
            navigate('/dentista');
            break;
          case 'tecnico':
            navigate('/tecnico');
            break;
          default:
            navigate('/admin');
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, faça login novamente');
        navigate('/login');
      } else {
        toast.error('Erro ao criar nova senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  const strengthInfo = getPasswordStrengthText();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <img src={logo} alt="logo" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Primeiro Acesso</h2>
          <p className="text-gray-500 mt-2">Crie sua senha permanente</p>
          {userEmail && (
            <p className="text-sm text-gray-600 mt-2">
              Olá, <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nova Senha *
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={handlePasswordChange}
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                autoFocus
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

            {/* Força da senha */}
            {newPassword && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Força da senha:</span>
                  <span className={`text-sm font-medium ${strengthInfo.color}`}>
                    {strengthInfo.text}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full ${
                        level <= passwordStrength.score
                          ? level <= 2 ? 'bg-red-500'
                            : level <= 3 ? 'bg-yellow-500'
                            : level <= 4 ? 'bg-blue-500'
                            : 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center">
                    {passwordStrength.hasMinLength ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-gray-300 mr-1" />
                    )}
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className="flex items-center">
                    {passwordStrength.hasNumber ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-gray-300 mr-1" />
                    )}
                    <span>Números</span>
                  </div>
                  <div className="flex items-center">
                    {passwordStrength.hasUpper ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-gray-300 mr-1" />
                    )}
                    <span>Letra maiúscula</span>
                  </div>
                  <div className="flex items-center">
                    {passwordStrength.hasLower ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-gray-300 mr-1" />
                    )}
                    <span>Letra minúscula</span>
                  </div>
                  <div className="flex items-center">
                    {passwordStrength.hasSpecial ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-gray-300 mr-1" />
                    )}
                    <span>Caractere especial</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nova Senha *
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
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
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-sm text-red-500">As senhas não conferem</p>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start">
              <KeyIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Dicas de segurança:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use pelo menos 8 caracteres</li>
                  <li>Combine letras maiúsculas e minúsculas</li>
                  <li>Inclua números e caracteres especiais</li>
                  <li>Evite usar informações pessoais</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Criando senha...
              </>
            ) : (
              'Criar senha e acessar sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}