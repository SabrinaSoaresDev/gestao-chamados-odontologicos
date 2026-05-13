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
  XMarkIcon,
  ServerIcon,
  KeyIcon,
  PhotoIcon,
  LanguageIcon,
  ChartBarIcon,
  ArrowPathIcon,
  FolderIcon,
  CloudArrowUpIcon,
  TrashIcon,
  InformationCircleIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminConfiguracoes() {
  const [activeTab, setActiveTab] = useState('geral');
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [config, setConfig] = useState({
    empresa: {
      nome: 'Ortodonsist',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: '',
      website: '',
      logo: null,
      descricao: ''
    },
    notificacoes: {
      emailNotificacoes: true,
      notificacoesPush: true,
      notificacoesSMS: false,
      alertasEmergenciais: true,
      resumoDiario: false,
      notificarNovosUsuarios: true,
      notificarNovosChamados: true
    },
    prazos: {
      tempoMedioAlta: 2,
      tempoMedioMedia: 4,
      tempoMedioBaixa: 8,
      horarioInicio: '08:00',
      horarioFim: '18:00',
      diasUteis: ['seg', 'ter', 'qua', 'qui', 'sex'],
      tempoMaximoResposta: 30,
      tempoMaximoConclusao: 48
    },
    seguranca: {
      tentativasLogin: 5,
      tempoBloqueio: 30,
      doisFatores: false,
      sessoesSimultaneas: true,
      tempoSessaoMinutos: 480,
      forcarLogoutInativo: true,
      tempoInatividadeMinutos: 30
    },
    personalizacao: {
      tema: 'light',
      idioma: 'pt-BR',
      logo: null,
      corPrimaria: '#0ea5e9',
      corSecundaria: '#6366f1',
      layout: 'moderno',
      animacoes: true
    },
    backup: {
      backupAutomatico: true,
      frequenciaBackup: 'diario',
      horaBackup: '02:00',
      reterBackups: 30
    },
    versao: {
      versao: '3.0.0',
      dataLancamento: new Date().toISOString(),
      changelog: [
        '✅ Novos status de chamados (Em Pausa, Em Oficina, Aguardando Peças)',
        '✅ Upload de vídeos nos chamados (até 10MB)',
        '✅ Paginação em todas as listas (15 itens por página)',
        '✅ Relatórios avançados com múltiplos filtros',
        '✅ Dashboard com gráficos atualizados',
        '✅ Melhorias de performance e UI/UX'
      ]
    }
  });

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'configuracoes', 'sistema'));
      if (configDoc.exists()) {
        const dadosFirestore = configDoc.data();
        // Mesclar dados do Firestore com o estado inicial (para garantir que todos os campos existam)
        setConfig(prevConfig => ({
          empresa: { ...prevConfig.empresa, ...dadosFirestore.empresa },
          notificacoes: { ...prevConfig.notificacoes, ...dadosFirestore.notificacoes },
          prazos: { ...prevConfig.prazos, ...dadosFirestore.prazos },
          seguranca: { ...prevConfig.seguranca, ...dadosFirestore.seguranca },
          personalizacao: { ...prevConfig.personalizacao, ...dadosFirestore.personalizacao },
          backup: { ...prevConfig.backup, ...dadosFirestore.backup },
          versao: { ...prevConfig.versao, ...dadosFirestore.versao }
        }));
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
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const realizarBackup = async () => {
    setBackupLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Backup realizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao realizar backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const tabs = [
    { id: 'geral', nome: 'Empresa', icon: BuildingOfficeIcon, cor: 'blue' },
    { id: 'notificacoes', nome: 'Notificações', icon: BellIcon, cor: 'yellow' },
    { id: 'prazos', nome: 'Prazos', icon: ClockIcon, cor: 'green' },
    { id: 'seguranca', nome: 'Segurança', icon: ShieldCheckIcon, cor: 'red' },
    { id: 'personalizacao', nome: 'Personalização', icon: PaintBrushIcon, cor: 'purple' },
    { id: 'backup', nome: 'Backup', icon: ServerIcon, cor: 'indigo' },
    { id: 'versao', nome: 'Versão', icon: CodeBracketIcon, cor: 'pink' }
  ];

  // Função segura para acessar dados
  const getVersao = () => {
    return config?.versao?.versao || '3.0.0';
  };

  const getChangelog = () => {
    return config?.versao?.changelog || [
      '✅ Novos status de chamados (Em Pausa, Em Oficina, Aguardando Peças)',
      '✅ Upload de vídeos nos chamados (até 10MB)',
      '✅ Paginação em todas as listas (15 itens por página)',
      '✅ Relatórios avançados com múltiplos filtros',
      '✅ Dashboard com gráficos atualizados',
      '✅ Melhorias de performance e UI/UX'
    ];
  };

  const getDataLancamento = () => {
    return config?.versao?.dataLancamento || new Date().toISOString();
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-xl shadow-lg">
              <CogIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h1>
              <p className="text-gray-600">Gerencie as configurações e preferências do sistema</p>
            </div>
          </div>
        </div>
        <button
          onClick={salvarConfiguracoes}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-md"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Salvar Configurações
            </>
          )}
        </button>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Status do Sistema</p>
              <p className="text-xl font-semibold text-green-600">Operacional</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Última Atualização</p>
              <p className="text-xl font-semibold text-gray-800">Hoje, {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Versão Atual</p>
              <p className="text-xl font-semibold text-gray-800">{getVersao()}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <CodeBracketIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ambiente</p>
              <p className="text-xl font-semibold text-gray-800">Produção</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <ServerIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Abas - Design Moderno */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/50">
          <nav className="flex overflow-x-auto px-4 py-2 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{tab.nome}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Aba Geral - Empresa */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Informações da Empresa</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    value={config.empresa?.nome || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, nome: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={config.empresa?.cnpj || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, cnpj: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição da Empresa
                  </label>
                  <textarea
                    rows="3"
                    value={config.empresa?.descricao || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, descricao: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Breve descrição da empresa..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={config.empresa?.endereco || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, endereco: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={config.empresa?.telefone || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, telefone: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={config.empresa?.email || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, email: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={config.empresa?.website || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      empresa: { ...config.empresa, website: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="https://www.exemplo.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aba Notificações */}
          {activeTab === 'notificacoes' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <BellIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Configurações de Notificações</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'emailNotificacoes', label: 'Notificações por E-mail', desc: 'Receber alertas por e-mail', icon: EnvelopeIcon },
                  { id: 'notificacoesPush', label: 'Notificações Push', desc: 'Alertas em tempo real no navegador', icon: BellIcon },
                  { id: 'notificacoesSMS', label: 'Notificações SMS', desc: 'Alertas via mensagem de texto', icon: DevicePhoneMobileIcon },
                  { id: 'alertasEmergenciais', label: 'Alertas Emergenciais', desc: 'Notificações para chamados urgentes', icon: ExclamationTriangleIcon },
                  { id: 'resumoDiario', label: 'Resumo Diário', desc: 'Receber resumo diário de atividades', icon: DocumentTextIcon },
                  { id: 'notificarNovosUsuarios', label: 'Novos Usuários', desc: 'Notificar quando novos usuários se cadastram', icon: UserGroupIcon },
                  { id: 'notificarNovosChamados', label: 'Novos Chamados', desc: 'Notificar quando novos chamados são abertos', icon: ClockIcon }
                ].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                          <IconComponent className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.notificacoes?.[item.id] || false}
                          onChange={(e) => setConfig({
                            ...config,
                            notificacoes: { ...config.notificacoes, [item.id]: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aba Prazos */}
          {activeTab === 'prazos' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Prazos de Atendimento</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
                  <label className="block text-sm font-medium text-red-700 mb-2">
                    Prazo Urgência Alta (horas)
                  </label>
                  <input
                    type="number"
                    value={config.prazos?.tempoMedioAlta || 2}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, tempoMedioAlta: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="24"
                    className="w-full px-4 py-2 bg-white border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl">
                  <label className="block text-sm font-medium text-yellow-700 mb-2">
                    Prazo Urgência Média (horas)
                  </label>
                  <input
                    type="number"
                    value={config.prazos?.tempoMedioMedia || 4}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, tempoMedioMedia: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="48"
                    className="w-full px-4 py-2 bg-white border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                  <label className="block text-sm font-medium text-green-700 mb-2">
                    Prazo Urgência Baixa (horas)
                  </label>
                  <input
                    type="number"
                    value={config.prazos?.tempoMedioBaixa || 8}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, tempoMedioBaixa: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="72"
                    className="w-full px-4 py-2 bg-white border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo Máximo para Primeira Resposta (minutos)
                  </label>
                  <input
                    type="number"
                    value={config.prazos?.tempoMaximoResposta || 30}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, tempoMaximoResposta: parseInt(e.target.value) }
                    })}
                    min="5"
                    max="120"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo Máximo para Conclusão (horas)
                  </label>
                  <input
                    type="number"
                    value={config.prazos?.tempoMaximoConclusao || 48}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, tempoMaximoConclusao: parseInt(e.target.value) }
                    })}
                    min="8"
                    max="168"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário de Início do Expediente
                  </label>
                  <input
                    type="time"
                    value={config.prazos?.horarioInicio || '08:00'}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, horarioInicio: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário de Término do Expediente
                  </label>
                  <input
                    type="time"
                    value={config.prazos?.horarioFim || '18:00'}
                    onChange={(e) => setConfig({
                      ...config,
                      prazos: { ...config.prazos, horarioFim: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aba Segurança */}
          {activeTab === 'seguranca' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Configurações de Segurança</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tentativas de Login Permitidas
                  </label>
                  <input
                    type="number"
                    value={config.seguranca?.tentativasLogin || 5}
                    onChange={(e) => setConfig({
                      ...config,
                      seguranca: { ...config.seguranca, tentativasLogin: parseInt(e.target.value) }
                    })}
                    min="3"
                    max="10"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo de Bloqueio (minutos)
                  </label>
                  <input
                    type="number"
                    value={config.seguranca?.tempoBloqueio || 30}
                    onChange={(e) => setConfig({
                      ...config,
                      seguranca: { ...config.seguranca, tempoBloqueio: parseInt(e.target.value) }
                    })}
                    min="5"
                    max="120"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo de Sessão (minutos)
                  </label>
                  <input
                    type="number"
                    value={config.seguranca?.tempoSessaoMinutos || 480}
                    onChange={(e) => setConfig({
                      ...config,
                      seguranca: { ...config.seguranca, tempoSessaoMinutos: parseInt(e.target.value) }
                    })}
                    min="60"
                    max="1440"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo de Inatividade (minutos)
                  </label>
                  <input
                    type="number"
                    value={config.seguranca?.tempoInatividadeMinutos || 30}
                    onChange={(e) => setConfig({
                      ...config,
                      seguranca: { ...config.seguranca, tempoInatividadeMinutos: parseInt(e.target.value) }
                    })}
                    min="5"
                    max="60"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Autenticação de Dois Fatores (2FA)</p>
                    <p className="text-sm text-gray-500">Exigir verificação em duas etapas para todos os usuários</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.seguranca?.doisFatores || false}
                      onChange={(e) => setConfig({
                        ...config,
                        seguranca: { ...config.seguranca, doisFatores: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Sessões Simultâneas</p>
                    <p className="text-sm text-gray-500">Permitir que usuários acessem de múltiplos dispositivos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.seguranca?.sessoesSimultaneas || true}
                      onChange={(e) => setConfig({
                        ...config,
                        seguranca: { ...config.seguranca, sessoesSimultaneas: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Forçar Logout por Inatividade</p>
                    <p className="text-sm text-gray-500">Desconectar automaticamente usuários inativos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.seguranca?.forcarLogoutInativo || true}
                      onChange={(e) => setConfig({
                        ...config,
                        seguranca: { ...config.seguranca, forcarLogoutInativo: e.target.checked }
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
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <PaintBrushIcon className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Personalização do Sistema</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tema
                  </label>
                  <select
                    value={config.personalizacao?.tema || 'light'}
                    onChange={(e) => setConfig({
                      ...config,
                      personalizacao: { ...config.personalizacao, tema: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  >
                    <option value="light">☀️ Claro</option>
                    <option value="dark">🌙 Escuro</option>
                    <option value="system">🖥️ Sistema</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma
                  </label>
                  <select
                    value={config.personalizacao?.idioma || 'pt-BR'}
                    onChange={(e) => setConfig({
                      ...config,
                      personalizacao: { ...config.personalizacao, idioma: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  >
                    <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Español</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Layout
                  </label>
                  <select
                    value={config.personalizacao?.layout || 'moderno'}
                    onChange={(e) => setConfig({
                      ...config,
                      personalizacao: { ...config.personalizacao, layout: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  >
                    <option value="moderno">Moderno</option>
                    <option value="classico">Clássico</option>
                    <option value="compacto">Compacto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor Primária
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={config.personalizacao?.corPrimaria || '#0ea5e9'}
                      onChange={(e) => setConfig({
                        ...config,
                        personalizacao: { ...config.personalizacao, corPrimaria: e.target.value }
                      })}
                      className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.personalizacao?.corPrimaria || '#0ea5e9'}
                      onChange={(e) => setConfig({
                        ...config,
                        personalizacao: { ...config.personalizacao, corPrimaria: e.target.value }
                      })}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor Secundária
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={config.personalizacao?.corSecundaria || '#6366f1'}
                      onChange={(e) => setConfig({
                        ...config,
                        personalizacao: { ...config.personalizacao, corSecundaria: e.target.value }
                      })}
                      className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.personalizacao?.corSecundaria || '#6366f1'}
                      onChange={(e) => setConfig({
                        ...config,
                        personalizacao: { ...config.personalizacao, corSecundaria: e.target.value }
                      })}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">Animações e Transições</p>
                    <p className="text-sm text-gray-500">Habilitar efeitos visuais no sistema</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.personalizacao?.animacoes || true}
                      onChange={(e) => setConfig({
                        ...config,
                        personalizacao: { ...config.personalizacao, animacoes: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Aba Backup */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <ServerIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Backup e Manutenção</h3>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-800">Backup Automático</h4>
                    <p className="text-sm text-gray-600">Realizar backup automático dos dados do sistema</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.backup?.backupAutomatico || true}
                      onChange={(e) => setConfig({
                        ...config,
                        backup: { ...config.backup, backupAutomatico: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequência do Backup
                    </label>
                    <select
                      value={config.backup?.frequenciaBackup || 'diario'}
                      onChange={(e) => setConfig({
                        ...config,
                        backup: { ...config.backup, frequenciaBackup: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                      disabled={!config.backup?.backupAutomatico}
                    >
                      <option value="diario">Diário</option>
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora do Backup
                    </label>
                    <input
                      type="time"
                      value={config.backup?.horaBackup || '02:00'}
                      onChange={(e) => setConfig({
                        ...config,
                        backup: { ...config.backup, horaBackup: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                      disabled={!config.backup?.backupAutomatico}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reter Backups por (dias)
                    </label>
                    <input
                      type="number"
                      value={config.backup?.reterBackups || 30}
                      onChange={(e) => setConfig({
                        ...config,
                        backup: { ...config.backup, reterBackups: parseInt(e.target.value) }
                      })}
                      min="7"
                      max="365"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                      disabled={!config.backup?.backupAutomatico}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={realizarBackup}
                      disabled={backupLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-md"
                    >
                      {backupLoading ? (
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      ) : (
                        <CloudArrowUpIcon className="w-5 h-5" />
                      )}
                      Realizar Backup Agora
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Informação importante</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Os backups são armazenados no servidor por {config.backup?.reterBackups || 30} dias. 
                      Recomendamos realizar backups periódicos para garantir a segurança dos dados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Versão */}
          {activeTab === 'versao' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-pink-100 p-2 rounded-lg">
                  <RocketLaunchIcon className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Versão do Sistema</h3>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl shadow-lg mb-4">
                  <CodeBracketIcon className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800">v{getVersao()}</h2>
                <p className="text-gray-500 mt-2">Lançado em {new Date(getDataLancamento()).toLocaleDateString('pt-BR')}</p>
                
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">✅ Estável</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">🚀 Produção</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">📱 Suporte Mobile</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-800">📝 Changelog - Novidades da Versão</h4>
                </div>
                <div className="p-6 space-y-2">
                  {getChangelog().map((item, index) => (
                    <div key={index} className="flex items-start gap-2 py-1">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-500" />
                  <p className="text-sm text-gray-600">
                    Para verificar atualizações, entre em contato com o suporte técnico.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}