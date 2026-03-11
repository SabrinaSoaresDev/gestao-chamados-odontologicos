import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  ClockIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminConfiguracoes() {
  const [activeTab, setActiveTab] = useState('geral');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    // Informações da empresa
    empresa: {
      nome: 'DentalCare',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: '',
      website: ''
    },
    // Configurações de notificação
    notificacoes: {
      emailNotificacoes: true,
        notificacoesPush: true,
        notificacoesSMS: false,
        alertasEmergenciais: true,
        resumoDiario: false
      },
      // Prazos de atendimento
      prazos: {
        tempoMedioAlta: 2,
        tempoMedioMedia: 4,
        tempoMedioBaixa: 8,
        horarioInicio: '08:00',
        horarioFim: '18:00',
        diasUteis: ['seg', 'ter', 'qua', 'qui', 'sex']
      },
      // Configurações de segurança
      seguranca: {
        tentativasLogin: 5,
        tempoBloqueio: 30,
        doisFatores: false,
        sessoesSimultaneas: true
      },
      // Personalização
      personalizacao: {
        tema: 'light',
        idioma: 'pt-BR',
        logo: null,
        corPrimaria: '#0ea5e9'
      }
    });

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'configuracoes', 'sistema'));
      if (configDoc.exists()) {
        setConfig(configDoc.data());
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const salvarConfiguracoes = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'sistema'), config);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'geral', nome: 'Empresa', icon: BuildingOfficeIcon },
    { id: 'notificacoes', nome: 'Notificações', icon: BellIcon },
    { id: 'prazos', nome: 'Prazos', icon: ClockIcon },
    { id: 'seguranca', nome: 'Segurança', icon: ShieldCheckIcon },
    { id: 'personalizacao', nome: 'Personalização', icon: PaintBrushIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h1>
          <p className="text-gray-600">Gerencie as configurações e preferências do sistema</p>
        </div>
        <button
          onClick={salvarConfiguracoes}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Status do Sistema</p>
              <p className="text-lg font-semibold text-green-600">Operacional</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Última Atualização</p>
              <p className="text-lg font-semibold text-gray-800">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Versão</p>
              <p className="text-lg font-semibold text-gray-800">2.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.nome}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Aba Geral - Empresa */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">Informações da Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={config.empresa.nome}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, nome: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={config.empresa.cnpj}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, cnpj: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={config.empresa.endereco}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, endereco: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={config.empresa.telefone}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, telefone: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={config.empresa.email}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, email: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={config.empresa.website}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, website: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.exemplo.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aba Notificações */}
          {activeTab === 'notificacoes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">Configurações de Notificações</h3>
              <div className="space-y-4">
                {[
                  { id: 'emailNotificacoes', label: 'Notificações por E-mail', desc: 'Receber alertas por e-mail' },
                  { id: 'notificacoesPush', label: 'Notificações Push', desc: 'Alertas em tempo real no navegador' },
                  { id: 'notificacoesSMS', label: 'Notificações SMS', desc: 'Alertas via mensagem de texto' },
                  { id: 'alertasEmergenciais', label: 'Alertas Emergenciais', desc: 'Notificações para chamados urgentes' },
                  { id: 'resumoDiario', label: 'Resumo Diário', desc: 'Receber resumo diário de atividades' }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-700">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.notificacoes[item.id]}
                        onChange={(e) => setConfig({
                          ...config,
                          notificacoes: { ...config.notificacoes, [item.id]: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aba Prazos */}
          {activeTab === 'prazos' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">Prazos de Atendimento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prazo Urgência Alta (horas)
                  </label>
                  <input
                    type="number"
                    value={config.prazos.tempoMedioAlta}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, tempoMedioAlta: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="24"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prazo Urgência Média (horas)
                  </label>
                  <input
                    type="number"
                    value={config.prazos.tempoMedioMedia}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, tempoMedioMedia: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="48"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prazo Urgência Baixa (horas)
                  </label>
                  <input
                    type="number"
                    value={config.prazos.tempoMedioBaixa}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, tempoMedioBaixa: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="72"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={config.prazos.horarioInicio}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, horarioInicio: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário de Término
                  </label>
                  <input
                    type="time"
                    value={config.prazos.horarioFim}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, horarioFim: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aba Segurança */}
          {activeTab === 'seguranca' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">Configurações de Segurança</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tentativas de Login Permitidas
                  </label>
                  <input
                    type="number"
                    value={config.seguranca.tentativasLogin}
                    onChange={(e) => setConfig({
                      ...config,
                      seguranca: { ...config.seguranca, tentativasLogin: parseInt(e.target.value) }
                    })}
                    min="3"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo de Bloqueio (minutos)
                  </label>
                  <input
                    type="number"
                    value={config.seguranca.tempoBloqueio}
                    onChange={(e) => setConfig({
                      ...config,
                      seguranca: { ...config.seguranca, tempoBloqueio: parseInt(e.target.value) }
                    })}
                    min="5"
                    max="120"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-700">Autenticação de Dois Fatores</p>
                    <p className="text-sm text-gray-500">Exigir 2FA para todos os usuários</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.seguranca.doisFatores}
                      onChange={(e) => setConfig({
                        ...config,
                        seguranca: { ...config.seguranca, doisFatores: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Aba Personalização */}
          {activeTab === 'personalizacao' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">Personalização</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tema
                  </label>
                  <select
                    value={config.personalizacao.tema}
                    onChange={(e) => setConfig({
                      ...config,
                      personalizacao: { ...config.personalizacao, tema: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                    <option value="system">Sistema</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select
                    value={config.personalizacao.idioma}
                    onChange={(e) => setConfig({
                      ...config,
                      personalizacao: { ...config.personalizacao, idioma: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor Primária
                  </label>
                  <input
                    type="color"
                    value={config.personalizacao.corPrimaria}
                    onChange={(e) => setConfig({
                      ...config,
                      personalizacao: { ...config.personalizacao, corPrimaria: e.target.value }
                    })}
                    className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}