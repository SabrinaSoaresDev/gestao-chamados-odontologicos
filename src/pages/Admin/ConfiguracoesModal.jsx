import React, { useState } from 'react';
import { 
  XMarkIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ConfiguracoesModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('geral');
  const [config, setConfig] = useState({
    empresa: 'DentalCare',
    emailNotificacoes: true,
    notificacoesPush: true,
    tempoMedioAlta: 2,
    tempoMedioMedia: 4,
    tempoMedioBaixa: 8,
    tema: 'light',
    idioma: 'pt-BR',
    horarioFuncionamento: {
      inicio: '08:00',
      fim: '18:00'
    },
    diasUteis: ['seg', 'ter', 'qua', 'qui', 'sex']
  });

  const tabs = [
    { id: 'geral', nome: 'Geral', icon: GlobeAltIcon },
    { id: 'notificacoes', nome: 'Notificações', icon: BellIcon },
    { id: 'prazos', nome: 'Prazos', icon: ClockIcon },
    { id: 'seguranca', nome: 'Segurança', icon: ShieldCheckIcon },
    { id: 'aparencia', nome: 'Aparência', icon: PaintBrushIcon }
  ];

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Configurações do Sistema</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex">
          {/* Sidebar de abas */}
          <div className="w-48 border-r border-gray-200 p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{tab.nome}</span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo da aba */}
          <div className="flex-1 p-6">
            {activeTab === 'geral' && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-800 mb-4">Configurações Gerais</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={config.empresa}
                    onChange={(e) => setConfig({...config, empresa: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idioma do Sistema
                  </label>
                  <select
                    value={config.idioma}
                    onChange={(e) => setConfig({...config, idioma: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horário de Funcionamento
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={config.horarioFuncionamento.inicio}
                      onChange={(e) => setConfig({
                        ...config, 
                        horarioFuncionamento: {
                          ...config.horarioFuncionamento,
                          inicio: e.target.value
                        }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-gray-500 self-center">até</span>
                    <input
                      type="time"
                      value={config.horarioFuncionamento.fim}
                      onChange={(e) => setConfig({
                        ...config, 
                        horarioFuncionamento: {
                          ...config.horarioFuncionamento,
                          fim: e.target.value
                        }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notificacoes' && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-800 mb-4">Configurações de Notificações</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-700">Notificações por E-mail</p>
                    <p className="text-sm text-gray-500">Receber alertas por e-mail</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.emailNotificacoes}
                      onChange={(e) => setConfig({...config, emailNotificacoes: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-700">Notificações Push</p>
                    <p className="text-sm text-gray-500">Alertas em tempo real no navegador</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.notificacoesPush}
                      onChange={(e) => setConfig({...config, notificacoesPush: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'prazos' && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-800 mb-4">Prazos de Atendimento (horas)</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgência Alta
                  </label>
                  <input
                    type="number"
                    value={config.tempoMedioAlta}
                    onChange={(e) => setConfig({...config, tempoMedioAlta: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="24"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgência Média
                  </label>
                  <input
                    type="number"
                    value={config.tempoMedioMedia}
                    onChange={(e) => setConfig({...config, tempoMedioMedia: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="48"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgência Baixa
                  </label>
                  <input
                    type="number"
                    value={config.tempoMedioBaixa}
                    onChange={(e) => setConfig({...config, tempoMedioBaixa: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="72"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}