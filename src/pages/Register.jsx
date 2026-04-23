import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';
import { 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  PhoneIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function Register() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    registroProfissional: '', // CRO para dentistas
    especialidade: '',
    password: '',
    confirmPassword: '',
    role: 'dentista' // Perfil padrão
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasNumber: false,
    hasUpper: false,
    hasLower: false,
    hasSpecial: false
  });

  const navigate = useNavigate();

  // Especialidades para dentistas
  const especialidades = [
    'Clínico Geral',
    'Ortodontia',
    'Endodontia',
    'Periodontia',
    'Implantodontia',
    'Odontopediatria',
    'Estética',
    'Prótese',
    'Cirurgia',
    'Radiologia'
  ];

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

    // Calcular score
    let score = 0;
    if (strength.hasMinLength) score++;
    if (strength.hasNumber) score++;
    if (strength.hasUpper) score++;
    if (strength.hasLower) score++;
    if (strength.hasSpecial) score++;
    
    strength.score = score;
    setPasswordStrength(strength);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const getPasswordStrengthText = () => {
    const { score } = passwordStrength;
    if (score <= 2) return { text: 'Fraca', color: 'text-red-500' };
    if (score <= 3) return { text: 'Média', color: 'text-yellow-500' };
    if (score <= 4) return { text: 'Boa', color: 'text-blue-500' };
    return { text: 'Forte', color: 'text-green-500' };
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }

    if (!formData.email.trim()) {
      toast.error('E-mail é obrigatório');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error('E-mail inválido');
      return false;
    }

    if (formData.password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não conferem');
      return false;
    }

    if (passwordStrength.score < 3) {
      toast.error('Por favor, escolha uma senha mais forte');
      return false;
    }

    if (!aceiteTermos) {
      toast.error('Você precisa aceitar os termos de uso');
      return false;
    }

    return true;
  };

  async function handleSubmit(e) {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setLoading(true);

  try {
    // 1. Criar usuário no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );

    const user = userCredential.user;

    // 2. Criar perfil do usuário no Firestore
    const userData = {
      uid: user.uid,
      nome: formData.nome,
      email: formData.email,
      telefone: formData.telefone || '',
      registroProfissional: formData.registroProfissional || '',
      especialidade: formData.especialidade || '',
      role: formData.role,
      ativo: true,
      dataCriacao: new Date(),
      ultimoAcesso: new Date(),
      criadoPor: 'auto-cadastro',
      termosAceitos: aceiteTermos,
      dataTermos: new Date()
    };

    // Aguardar um pouco para o Firebase Auth processar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Tentar criar o documento com retry
    let retries = 3;
    while (retries > 0) {
      try {
        await setDoc(doc(db, 'usuarios', user.uid), userData);
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    toast.success('Cadastro realizado com sucesso!');
    setTimeout(() => navigate('/login'), 2000);

  } catch (error) {
    console.error('Erro no cadastro:', error);
    
    // Se falhou, deletar o usuário do Auth para manter consistência
    try {
      await auth.currentUser?.delete();
    } catch (deleteError) {
      console.error('Erro ao limpar usuário:', deleteError);
    }
    
    // Tratamento de erros...
    if (error.code === 'auth/email-already-in-use') {
      toast.error('Este e-mail já está cadastrado');
    } else if (error.code === 'auth/weak-password') {
      toast.error('Senha muito fraca');
    } else {
      toast.error('Erro ao realizar cadastro. Tente novamente.');
    }
  } finally {
    setLoading(false);
  }
}

  const strengthInfo = getPasswordStrengthText();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/login')}
            className="float-left flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-1" />
            Voltar
          </button>
          
          <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Criar Conta</h2>
          <p className="text-gray-500 mt-2">Cadastre-se no Ortodonsist</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome Completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="nome"
                required
                value={formData.nome}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mail *
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Registro Profissional (CRO) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registro Profissional (CRO)
            </label>
            <div className="relative">
              <IdentificationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="registroProfissional"
                value={formData.registroProfissional}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Ex: CRO-SP 12345"
              />
            </div>
          </div>

          {/* Especialidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialidade
            </label>
            <div className="relative">
              <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                name="especialidade"
                value={formData.especialidade}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none"
              >
                <option value="">Selecione uma especialidade</option>
                {especialidades.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha *
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
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
            {formData.password && (
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

          {/* Confirmar Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Senha *
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
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
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">As senhas não conferem</p>
            )}
          </div>

          {/* Termos de Uso */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                checked={aceiteTermos}
                onChange={(e) => setAceiteTermos(e.target.checked)}
                className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300"
                required
              />
            </div>
            <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
              Eu li e aceito os{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Termos de Uso
              </a>{' '}
              e{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Política de Privacidade
              </a>
            </label>
          </div>

          {/* Botão de Cadastro */}
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
                Cadastrando...
              </>
            ) : (
              'Criar Conta'
            )}
          </button>

          {/* Link para Login */}
          <p className="text-center text-sm text-gray-600">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Faça login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}