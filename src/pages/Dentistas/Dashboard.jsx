import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  doc,
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  UserCircleIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  StarIcon,
  XMarkIcon,
  FunnelIcon,
  DocumentTextIcon,
  PhoneIcon,
  ChartBarIcon,
  BoltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import NovoChamadoModal from '../../components/Chamados/NovoChamadoModal';

export default function DentistaDashboard() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [filteredChamados, setFilteredChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAvaliarModal, setShowAvaliarModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [avaliacao, setAvaliacao] = useState({
    nota: 5,
    comentario: ''
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'

  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, 'chamados'),
      where('solicitanteId', '==', userData.uid),
      orderBy('dataCriacao', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chamadosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate()
      }));
      setChamados(chamadosData);
      setFilteredChamados(chamadosData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar chamados:', error);
      toast.error('Erro ao carregar seus chamados');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  useEffect(() => {
    let filtered = chamados;
    
    if (searchTerm) {
      filtered = filtered.filter(chamado =>
        chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'todos') {
      filtered = filtered.filter(chamado => chamado.status === filterStatus);
    }

    if (filterPrioridade !== 'todos') {
      filtered = filtered.filter(chamado => chamado.prioridade === filterPrioridade);
    }
    
    setFilteredChamados(filtered);
  }, [searchTerm, filterStatus, filterPrioridade, chamados]);

  const handleAvaliarChamado = async () => {
    if (!selectedChamado) return;

    try {
      const chamadoRef = doc(db, 'chamados', selectedChamado.id);
      await updateDoc(chamadoRef, {
        avaliacao: {
          nota: avaliacao.nota,
          comentario: avaliacao.comentario,
          data: new Date(),
          avaliador: userData.nome
        },
        historico: [
          ...(selectedChamado.historico || []),
          {
            data: new Date(),
            acao: `Chamado avaliado com nota ${avaliacao.nota}`,
            usuario: userData.nome,
            tipo: 'avaliacao'
          }
        ]
      });

      toast.success('Avaliação enviada com sucesso!');
      setShowAvaliarModal(false);
      setAvaliacao({ nota: 5, comentario: '' });
    } catch (error) {
      console.error('Erro ao avaliar chamado:', error);
      toast.error('Erro ao enviar avaliação');
    }
  };

  const handleCancelarChamado = async (chamadoId) => {
    if (!window.confirm('Tem certeza que deseja cancelar este chamado?')) return;

    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      await updateDoc(chamadoRef, {
        status: 'cancelado',
        historico: [
          ...(chamados.find(c => c.id === chamadoId)?.historico || []),
          {
            data: new Date(),
            acao: 'Chamado cancelado pelo solicitante',
            usuario: userData.nome,
            tipo: 'cancelamento'
          }
        ]
      });

      toast.success('Chamado cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar chamado:', error);
      toast.error('Erro ao cancelar chamado');
    }
  };

  // Estatísticas
  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    andamento: chamados.filter(c => c.status === 'em_andamento').length,
    concluidos: chamados.filter(c => c.status === 'concluido').length,
    cancelados: chamados.filter(c => c.status === 'cancelado').length,
    urgentes: chamados.filter(c => c.prioridade === 'alta' || c.prioridade === 'emergencial').length,
    tempoMedio: calcularTempoMedio()
  };

  function calcularTempoMedio() {
    const concluidos = chamados.filter(c => c.status === 'concluido' && c.dataCriacao && c.dataConclusao);
    if (concluidos.length === 0) return 0;
    
    const totalHoras = concluidos.reduce((acc, c) => {
      const diff = (c.dataConclusao - c.dataCriacao) / (1000 * 60 * 60);
      return acc + diff;
    }, 0);
    
    return (totalHoras / concluidos.length).toFixed(1);
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'aberto': return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
      case 'em_andamento': return 'bg-gradient-to-r from-blue-400 to-blue-500 text-white';
      case 'concluido': return 'bg-gradient-to-r from-green-400 to-green-500 text-white';
      case 'cancelado': return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'aberto': return <ClockIcon className="w-4 h-4" />;
      case 'em_andamento': return <ArrowPathIcon className="w-4 h-4" />;
      case 'concluido': return <CheckCircleIcon className="w-4 h-4" />;
      case 'cancelado': return <XMarkIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getPrioridadeColor = (prioridade) => {
    switch(prioridade) {
      case 'alta':
      case 'emergencial':
        return 'bg-gradient-to-r from-red-400 to-red-500 text-white';
      case 'media':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
      case 'baixa':
        return 'bg-gradient-to-r from-green-400 to-green-500 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <p className="text-gray-500 font-medium">Carregando seu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com saudação personalizada */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Olá, Dr(a). {userData?.nome?.split(' ')[0]}! </h1>
            <p className="text-blue-100">Bem-vindo(a) ao seu painel de chamados</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition transform hover:scale-105 shadow-lg font-semibold"
          >
            <PlusIcon className="w-5 h-5" />
            Novo Chamado
          </button>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm text-blue-200">Taxa de Resolução</p>
            <p className="text-2xl font-bold">
              {stats.total > 0 ? ((stats.concluidos / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm text-blue-200">Tempo Médio</p>
            <p className="text-2xl font-bold">{stats.tempoMedio}h</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm text-blue-200">Satisfação</p>
            <p className="text-2xl font-bold">
              {chamados.filter(c => c.avaliacao).length > 0 
                ? (chamados.filter(c => c.avaliacao).reduce((acc, c) => acc + c.avaliacao.nota, 0) / chamados.filter(c => c.avaliacao).length).toFixed(1)
                : '0.0'}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm text-blue-200">Ativos</p>
            <p className="text-2xl font-bold">{stats.abertos + stats.andamento}</p>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas Detalhadas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-800">{stats.total}</span>
          </div>
          <p className="text-sm text-gray-600">Total de Chamados</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-yellow-600">{stats.abertos}</span>
          </div>
          <p className="text-sm text-gray-600">Abertos</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-yellow-500 rounded-full" style={{ width: `${(stats.abertos / stats.total) * 100 || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowPathIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-600">{stats.andamento}</span>
          </div>
          <p className="text-sm text-gray-600">Em Andamento</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-blue-500 rounded-full" style={{ width: `${(stats.andamento / stats.total) * 100 || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.concluidos}</span>
          </div>
          <p className="text-sm text-gray-600">Concluídos</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-green-500 rounded-full" style={{ width: `${(stats.concluidos / stats.total) * 100 || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-red-600">{stats.urgentes}</span>
          </div>
          <p className="text-sm text-gray-600">Urgentes</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-red-500 rounded-full" style={{ width: `${(stats.urgentes / stats.total) * 100 || 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, equipamento ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="todos">Todos Status</option>
              <option value="aberto">Abertos</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>

            <select
              value={filterPrioridade}
              onChange={(e) => setFilterPrioridade(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="todos">Todas Prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="emergencial">Emergencial</option>
            </select>

            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid/Lista de Chamados */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChamados.map((chamado) => (
            <div
              key={chamado.id}
              className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
              onClick={() => {
                setSelectedChamado(chamado);
                setShowDetailsModal(true);
              }}
            >
              <div className="p-5">
                {/* Header com prioridade e ID */}
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPrioridadeColor(chamado.prioridade)}`}>
                    {chamado.prioridade}
                  </span>
                  <span className="text-xs text-gray-400">#{chamado.id?.slice(-6)}</span>
                </div>

                {/* Título e Equipamento */}
                <h3 className="font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition">
                  {chamado.titulo}
                </h3>
                <p className="text-sm text-gray-500 mb-3">{chamado.equipamento}</p>

                {/* Informações do Técnico e Data */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <UserCircleIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {chamado.tecnicoNome || (
                      <span className="text-yellow-600">Aguardando técnico</span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {formatDate(chamado.dataCriacao)}
                  </div>
                </div>

                {/* Footer com Status e Avaliação */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(chamado.status)}`}>
                    {getStatusIcon(chamado.status)}
                    {getStatusText(chamado.status)}
                  </span>
                  
                  {chamado.status === 'concluido' && !chamado.avaliacao && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChamado(chamado);
                        setShowAvaliarModal(true);
                      }}
                      className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full hover:bg-yellow-200 transition"
                    >
                      <StarIcon className="w-3 h-3" />
                      Avaliar
                    </button>
                  )}
                  
                  {chamado.avaliacao && (
                    <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      <StarIconSolid className="w-3 h-3" />
                      {chamado.avaliacao.nota}/5
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Chamado</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Prioridade</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Técnico</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Avaliação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredChamados.map((chamado) => (
                <tr 
                  key={chamado.id} 
                  className="hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => {
                    setSelectedChamado(chamado);
                    setShowDetailsModal(true);
                  }}
                >
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">#{chamado.id?.slice(-6)}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{chamado.titulo}</p>
                    <p className="text-xs text-gray-500">{chamado.equipamento}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(chamado.status)}`}>
                      {getStatusIcon(chamado.status)}
                      {getStatusText(chamado.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPrioridadeColor(chamado.prioridade)}`}>
                      {chamado.prioridade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {chamado.tecnicoNome || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(chamado.dataCriacao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    {chamado.avaliacao ? (
                      <div className="flex items-center gap-1 text-sm">
                        <StarIconSolid className="w-4 h-4 text-yellow-400" />
                        <span>{chamado.avaliacao.nota}/5</span>
                      </div>
                    ) : chamado.status === 'concluido' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChamado(chamado);
                          setShowAvaliarModal(true);
                        }}
                        className="text-xs text-yellow-600 hover:text-yellow-800"
                      >
                        Avaliar
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredChamados.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <WrenchScrewdriverIcon className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum chamado encontrado</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchTerm 
              ? 'Nenhum resultado corresponde à sua busca. Tente outros termos.'
              : 'Você ainda não possui chamados. Crie seu primeiro chamado para começar.'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg font-semibold"
          >
            <PlusIcon className="w-5 h-5" />
            {searchTerm ? 'Novo Chamado' : 'Criar Primeiro Chamado'}
          </button>
        </div>
      )}

      {/* Modais (mantidos iguais) */}
      {showDetailsModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          {/* ... conteúdo do modal de detalhes (igual ao anterior) ... */}
        </div>
      )}

      {showAvaliarModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          {/* ... conteúdo do modal de avaliação (igual ao anterior) ... */}
        </div>
      )}

      <NovoChamadoModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        solicitanteId={userData?.uid}
        solicitanteNome={userData?.nome}
      />
    </div>
  );
}