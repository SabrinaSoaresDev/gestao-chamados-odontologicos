import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  where,
  deleteDoc
} from 'firebase/firestore';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  UserCircleIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  PhotoIcon,
  PaperClipIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  UserPlusIcon,
  DocumentArrowDownIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AdminChamados() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  const [atualizacao, setAtualizacao] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'cards'
  const [selectedChamados, setSelectedChamados] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    inicio: '',
    fim: ''
  });

  useEffect(() => {
    // Carregar chamados em tempo real
    const chamadosQuery = query(
      collection(db, 'chamados'),
      orderBy('dataCriacao', 'desc')
    );
    
    const unsubscribeChamados = onSnapshot(chamadosQuery, (snapshot) => {
      const chamadosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate()
      }));
      setChamados(chamadosData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar chamados:', error);
      toast.error('Erro ao carregar chamados');
      setLoading(false);
    });

    // Carregar técnicos
    const tecnicosQuery = query(
      collection(db, 'usuarios'),
      where('role', '==', 'tecnico'),
      where('ativo', '==', true)
    );
    
    const unsubscribeTecnicos = onSnapshot(tecnicosQuery, (snapshot) => {
      const tecnicosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTecnicos(tecnicosData);
    });

    return () => {
      unsubscribeChamados();
      unsubscribeTecnicos();
    };
  }, []);

  const handleAtribuirTecnico = async (chamadoId, tecnicoId, tecnicoNome) => {
    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      await updateDoc(chamadoRef, {
        tecnicoId,
        tecnicoNome,
        status: 'em_andamento',
        historico: [
          ...(chamados.find(c => c.id === chamadoId)?.historico || []),
          {
            data: new Date(),
            acao: `Técnico ${tecnicoNome} atribuído ao chamado`,
            usuario: userData.nome,
            tipo: 'atribuicao'
          }
        ]
      });
      toast.success('Técnico atribuído com sucesso!');
    } catch (error) {
      console.error('Erro ao atribuir técnico:', error);
      toast.error('Erro ao atribuir técnico');
    }
  };

  const handleUpdateStatus = async (chamadoId, newStatus) => {
    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      await updateDoc(chamadoRef, {
        status: newStatus,
        ...(newStatus === 'concluido' && { dataConclusao: new Date() }),
        historico: [
          ...(chamados.find(c => c.id === chamadoId)?.historico || []),
          {
            data: new Date(),
            acao: `Status alterado para ${newStatus}`,
            usuario: userData.nome,
            tipo: 'status'
          }
        ]
      });
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleAddAtualizacao = async (chamadoId) => {
    if (!atualizacao.trim()) return;

    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      await updateDoc(chamadoRef, {
        historico: [
          ...(chamados.find(c => c.id === chamadoId)?.historico || []),
          {
            data: new Date(),
            acao: atualizacao,
            usuario: userData.nome,
            tipo: 'comentario'
          }
        ]
      });
      setAtualizacao('');
      toast.success('Atualização adicionada!');
    } catch (error) {
      console.error('Erro ao adicionar atualização:', error);
      toast.error('Erro ao adicionar atualização');
    }
  };

  const handleDeleteChamado = async (chamadoId) => {
    try {
      await deleteDoc(doc(db, 'chamados', chamadoId));
      toast.success('Chamado excluído com sucesso!');
      setShowDeleteModal(false);
      setSelectedChamado(null);
    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      toast.error('Erro ao excluir chamado');
    }
  };

  const handleBatchStatusUpdate = async (newStatus) => {
    if (selectedChamados.length === 0) {
      toast.error('Selecione pelo menos um chamado');
      return;
    }

    try {
      const promises = selectedChamados.map(id => 
        updateDoc(doc(db, 'chamados', id), {
          status: newStatus,
          historico: [
            ...(chamados.find(c => c.id === id)?.historico || []),
            {
              data: new Date(),
              acao: `Status alterado para ${newStatus} (em lote)`,
              usuario: userData.nome,
              tipo: 'status'
            }
          ]
        })
      );
      
      await Promise.all(promises);
      toast.success(`${selectedChamados.length} chamados atualizados!`);
      setSelectedChamados([]);
    } catch (error) {
      console.error('Erro na atualização em lote:', error);
      toast.error('Erro ao atualizar chamados');
    }
  };

  const handleSelectAll = () => {
    if (selectedChamados.length === filteredChamados.length) {
      setSelectedChamados([]);
    } else {
      setSelectedChamados(filteredChamados.map(c => c.id));
    }
  };

  const handleSelectChamado = (id) => {
    setSelectedChamados(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filtros
  const filteredChamados = chamados.filter(chamado => {
    const matchesSearch = 
      chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.solicitanteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filtroStatus === 'todos' || chamado.status === filtroStatus;
    const matchesPrioridade = filtroPrioridade === 'todos' || chamado.prioridade === filtroPrioridade;
    const matchesTecnico = filtroTecnico === 'todos' || chamado.tecnicoId === filtroTecnico;
    
    const matchesDateRange = 
      (!dateRange.inicio || new Date(chamado.dataCriacao) >= new Date(dateRange.inicio)) &&
      (!dateRange.fim || new Date(chamado.dataCriacao) <= new Date(dateRange.fim));
    
    return matchesSearch && matchesStatus && matchesPrioridade && matchesTecnico && matchesDateRange;
  });

  // Estatísticas
  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    andamento: chamados.filter(c => c.status === 'em_andamento').length,
    concluidos: chamados.filter(c => c.status === 'concluido').length,
    urgentes: chamados.filter(c => c.prioridade === 'alta' || c.prioridade === 'emergencial').length
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concluido': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'aberto': return <ClockIcon className="w-4 h-4" />;
      case 'em_andamento': return <ArrowPathIcon className="w-4 h-4" />;
      case 'concluido': return <CheckCircleIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPrioridadeColor = (prioridade) => {
    switch(prioridade) {
      case 'alta':
      case 'emergencial':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baixa':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPrioridadeIcon = (prioridade) => {
    switch(prioridade) {
      case 'emergencial':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Título', 'Equipamento', 'Solicitante', 'Status', 'Prioridade', 'Técnico', 'Data Criação', 'Data Conclusão'];
    const data = filteredChamados.map(c => [
      c.id.slice(-6),
      c.titulo,
      c.equipamento,
      c.solicitanteNome,
      c.status,
      c.prioridade,
      c.tecnicoNome || 'Não atribuído',
      c.dataCriacao?.toLocaleDateString('pt-BR'),
      c.dataConclusao?.toLocaleDateString('pt-BR') || ''
    ]);

    const csv = [headers, ...data].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chamados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando chamados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gerenciar Chamados</h1>
          <p className="text-gray-600">Visualize e gerencie todos os chamados do sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <DocumentArrowDownIcon className="w-5 h-5 text-gray-600" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            {viewMode === 'table' ? 'Cards' : 'Tabela'}
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Abertos</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.abertos}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Em Andamento</p>
          <p className="text-2xl font-bold text-blue-600">{stats.andamento}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Concluídos</p>
          <p className="text-2xl font-bold text-green-600">{stats.concluidos}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Urgentes</p>
          <p className="text-2xl font-bold text-red-600">{stats.urgentes}</p>
        </div>
      </div>

      {/* Barra de Ações em Lote */}
      {selectedChamados.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <span className="text-blue-700">
            <strong>{selectedChamados.length}</strong> chamados selecionados
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBatchStatusUpdate('em_andamento')}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Iniciar
            </button>
            <button
              onClick={() => handleBatchStatusUpdate('concluido')}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Concluir
            </button>
            <button
              onClick={() => setSelectedChamados([])}
              className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div 
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-700">Filtros</h3>
          </div>
          <ChevronDownIcon className={`w-5 h-5 text-gray-500 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </div>
        
        {showFilters && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            {/* Busca */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título, equipamento, solicitante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os status</option>
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
              </select>

              <select
                value={filtroPrioridade}
                onChange={(e) => setFiltroPrioridade(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todas prioridades</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="emergencial">Emergencial</option>
              </select>

              <select
                value={filtroTecnico}
                onChange={(e) => setFiltroTecnico(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os técnicos</option>
                <option value="nao_atribuido">Não atribuído</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSearchTerm('');
                  setFiltroStatus('todos');
                  setFiltroPrioridade('todos');
                  setFiltroTecnico('todos');
                  setDateRange({ inicio: '', fim: '' });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpar Filtros
              </button>
            </div>

            {/* Filtro de Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={dateRange.inicio}
                  onChange={(e) => setDateRange({...dateRange, inicio: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data Final</label>
                <input
                  type="date"
                  value={dateRange.fim}
                  onChange={(e) => setDateRange({...dateRange, fim: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resultado da Busca */}
      <p className="text-sm text-gray-500">
        Mostrando {filteredChamados.length} de {chamados.length} chamados
      </p>

      {/* Visualização em Tabela */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedChamados.length === filteredChamados.length && filteredChamados.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chamado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredChamados.map((chamado) => (
                  <tr key={chamado.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedChamados.includes(chamado.id)}
                        onChange={() => handleSelectChamado(chamado.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      #{chamado.id.slice(-6)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{chamado.titulo}</div>
                      <div className="text-xs text-gray-500">{chamado.equipamento}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <UserCircleIcon className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{chamado.solicitanteNome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getStatusColor(chamado.status)}`}>
                        {getStatusIcon(chamado.status)}
                        {chamado.status === 'aberto' && 'Aberto'}
                        {chamado.status === 'em_andamento' && 'Em Andamento'}
                        {chamado.status === 'concluido' && 'Concluído'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getPrioridadeColor(chamado.prioridade)}`}>
                        {getPrioridadeIcon(chamado.prioridade)}
                        {chamado.prioridade}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {chamado.tecnicoNome ? (
                        <span className="text-sm text-gray-900">{chamado.tecnicoNome}</span>
                      ) : (
                        <select
                          onChange={(e) => {
                            const tecnico = tecnicos.find(t => t.id === e.target.value);
                            if (tecnico) {
                              handleAtribuirTecnico(chamado.id, tecnico.id, tecnico.nome);
                            }
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                          value=""
                        >
                          <option value="" disabled>Atribuir</option>
                          {tecnicos.map(t => (
                            <option key={t.id} value={t.id}>{t.nome}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(chamado.dataCriacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedChamado(chamado);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Visualizar"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedChamado(chamado);
                            setShowEditModal(true);
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Editar"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedChamado(chamado);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visualização em Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChamados.map((chamado) => (
            <div key={chamado.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedChamados.includes(chamado.id)}
                      onChange={() => handleSelectChamado(chamado.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500">#{chamado.id.slice(-6)}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(chamado.status)}`}>
                      {chamado.status === 'aberto' && 'Aberto'}
                      {chamado.status === 'em_andamento' && 'Em Andamento'}
                      {chamado.status === 'concluido' && 'Concluído'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                      {chamado.prioridade}
                    </span>
                  </div>
                </div>
                <h3 className="font-medium text-gray-800 mb-1">{chamado.titulo}</h3>
                <p className="text-sm text-gray-500">{chamado.equipamento}</p>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex items-center text-sm">
                  <UserCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{chamado.solicitanteNome}</span>
                </div>
                <div className="flex items-center text-sm">
                  <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {new Date(chamado.dataCriacao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <WrenchScrewdriverIcon className="w-4 h-4 text-gray-400 mr-2" />
                  {chamado.tecnicoNome ? (
                    <span className="text-gray-600">{chamado.tecnicoNome}</span>
                  ) : (
                    <select
                      onChange={(e) => {
                        const tecnico = tecnicos.find(t => t.id === e.target.value);
                        if (tecnico) {
                          handleAtribuirTecnico(chamado.id, tecnico.id, tecnico.nome);
                        }
                      }}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      value=""
                    >
                      <option value="" disabled>Atribuir técnico</option>
                      {tecnicos.map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedChamado(chamado);
                    setShowDetailsModal(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Visualizar"
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedChamado(chamado);
                    setShowEditModal(true);
                  }}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                  title="Editar"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedChamado(chamado);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Excluir"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedChamado && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Detalhes do Chamado</h2>
                <p className="text-sm text-gray-500">#{selectedChamado.id.slice(-6)}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status e Prioridade */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={selectedChamado.status}
                    onChange={(e) => {
                      handleUpdateStatus(selectedChamado.id, e.target.value);
                      setSelectedChamado({
                        ...selectedChamado,
                        status: e.target.value
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="aberto">Aberto</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                  <span className={`inline-block px-3 py-2 rounded-lg ${getPrioridadeColor(selectedChamado.prioridade)}`}>
                    {selectedChamado.prioridade}
                  </span>
                </div>
              </div>

              {/* Informações do Chamado */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Informações Gerais</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="text-gray-500">Título:</span> {selectedChamado.titulo}</p>
                    <p><span className="text-gray-500">Equipamento:</span> {selectedChamado.equipamento}</p>
                    <p><span className="text-gray-500">Solicitante:</span> {selectedChamado.solicitanteNome}</p>
                    <p><span className="text-gray-500">Data de Abertura:</span> {new Date(selectedChamado.dataCriacao).toLocaleString('pt-BR')}</p>
                    {selectedChamado.dataConclusao && (
                      <p><span className="text-gray-500">Data de Conclusão:</span> {new Date(selectedChamado.dataConclusao).toLocaleString('pt-BR')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Técnico Responsável</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedChamado.tecnicoNome ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCircleIcon className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="font-medium">{selectedChamado.tecnicoNome}</p>
                            <p className="text-xs text-gray-500">Técnico responsável</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAtribuirTecnico(selectedChamado.id, null, null)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <select
                        onChange={(e) => {
                          const tecnico = tecnicos.find(t => t.id === e.target.value);
                          if (tecnico) {
                            handleAtribuirTecnico(selectedChamado.id, tecnico.id, tecnico.nome);
                            setSelectedChamado({
                              ...selectedChamado,
                              tecnicoId: tecnico.id,
                              tecnicoNome: tecnico.nome
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value=""
                      >
                        <option value="" disabled>Selecionar técnico</option>
                        {tecnicos.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Descrição do Problema</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedChamado.descricao}</p>
                </div>
              </div>

              {/* Fotos */}
              {selectedChamado.fotos && selectedChamado.fotos.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Fotos Anexadas</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedChamado.fotos.map((foto, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer"
                          onClick={() => window.open(foto, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded-lg flex items-center justify-center">
                          <EyeIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Histórico de Atualizações</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  {selectedChamado.historico && selectedChamado.historico.length > 0 ? (
                    <div className="space-y-3">
                      {selectedChamado.historico.map((item, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              {item.tipo === 'status' && <ArrowPathIcon className="w-4 h-4 text-blue-500" />}
                              {item.tipo === 'atribuicao' && <UserPlusIcon className="w-4 h-4 text-green-500" />}
                              {item.tipo === 'comentario' && <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />}
                              <span className="font-medium text-sm">{item.usuario}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(item.data?.toDate?.() || item.data).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">{item.acao}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nenhuma atualização no histórico</p>
                  )}
                </div>
              </div>

              {/* Adicionar Atualização */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Adicionar Atualização</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={atualizacao}
                    onChange={(e) => setAtualizacao(e.target.value)}
                    placeholder="Digite sua atualização..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddAtualizacao(selectedChamado.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleAddAtualizacao(selectedChamado.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedChamado && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Editar Chamado</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const chamadoRef = doc(db, 'chamados', selectedChamado.id);
                await updateDoc(chamadoRef, {
                  titulo: selectedChamado.titulo,
                  equipamento: selectedChamado.equipamento,
                  descricao: selectedChamado.descricao,
                  prioridade: selectedChamado.prioridade,
                  historico: [
                    ...(selectedChamado.historico || []),
                    {
                      data: new Date(),
                      acao: 'Chamado editado pelo administrador',
                      usuario: userData.nome,
                      tipo: 'edicao'
                    }
                  ]
                });
                toast.success('Chamado atualizado com sucesso!');
                setShowEditModal(false);
              } catch (error) {
                toast.error('Erro ao atualizar chamado');
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Chamado
                </label>
                <input
                  type="text"
                  required
                  value={selectedChamado.titulo}
                  onChange={(e) => setSelectedChamado({
                    ...selectedChamado,
                    titulo: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipamento
                </label>
                <input
                  type="text"
                  required
                  value={selectedChamado.equipamento}
                  onChange={(e) => setSelectedChamado({
                    ...selectedChamado,
                    equipamento: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  required
                  rows="4"
                  value={selectedChamado.descricao}
                  onChange={(e) => setSelectedChamado({
                    ...selectedChamado,
                    descricao: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade
                </label>
                <select
                  value={selectedChamado.prioridade}
                  onChange={(e) => setSelectedChamado({
                    ...selectedChamado,
                    prioridade: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="emergencial">Emergencial</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {showDeleteModal && selectedChamado && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Tem certeza que deseja excluir o chamado "{selectedChamado.titulo}"? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteChamado(selectedChamado.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}