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
  PrinterIcon,
  PlusIcon,
  FilmIcon,
  PlayIcon,
  MapPinIcon,
  PauseIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import NovoChamadoModal from '../../components/Chamados/NovoChamadoModal';

export default function AdminChamados() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroUnidade, setFiltroUnidade] = useState('todos');
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNovoChamadoModal, setShowNovoChamadoModal] = useState(false);
  const [showPausaModal, setShowPausaModal] = useState(false);
  const [pausaMotivo, setPausaMotivo] = useState('');
  const [pausaTipo, setPausaTipo] = useState('');
  const [tecnicos, setTecnicos] = useState([]);
  const [atualizacao, setAtualizacao] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [selectedChamados, setSelectedChamados] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    inicio: '',
    fim: ''
  });
  const [unidades, setUnidades] = useState([]);

  // PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ========== COMPONENTE INTERNO MediaViewer ==========
  const MediaViewer = ({ src, type }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
      return (
        <div 
          className="relative group cursor-pointer"
          onClick={() => setIsOpen(true)}
        >
          {type === 'foto' ? (
            <img
              src={src}
              alt="Mídia do chamado"
              className="w-full h-24 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-24 bg-gray-800 rounded-lg flex items-center justify-center relative">
              <FilmIcon className="w-8 h-8 text-white opacity-80" />
              <PlayIcon className="w-4 h-4 text-white absolute bottom-1 right-1" />
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded-lg flex items-center justify-center">
            <EyeIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <XMarkIcon className="w-8 h-8" />
        </button>
        
        {type === 'foto' ? (
          <img
            src={src}
            alt="Mídia ampliada"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            src={src}
            controls
            className="max-w-full max-h-full"
            autoPlay
          />
        )}
      </div>
    );
  };
  // ========== FIM DO COMPONENTE MediaViewer ==========

  useEffect(() => {
    const chamadosQuery = query(
      collection(db, 'chamados'),
      orderBy('dataCriacao', 'desc')
    );
    
    const unsubscribeChamados = onSnapshot(chamadosQuery, (snapshot) => {
      const chamadosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate(),
        dataPausa: doc.data().dataPausa?.toDate(),
        dataOficina: doc.data().dataOficina?.toDate(),
        dataCancelamento: doc.data().dataCancelamento?.toDate(),
        dataConclusao: doc.data().dataConclusao?.toDate()
      }));
      setChamados(chamadosData);
      
      const unidadesUnicas = [...new Set(chamadosData.map(c => c.unidade).filter(Boolean))];
      setUnidades(unidadesUnicas);
      
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar chamados:', error);
      toast.error('Erro ao carregar chamados');
      setLoading(false);
    });

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

  // Função para formatar data corretamente
  const formatarData = (data) => {
    if (!data) return '-';
    try {
      const date = data instanceof Date ? data : data.toDate?.() || new Date(data);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return '-';
    }
  };

  const formatarDataHora = (data) => {
    if (!data) return '-';
    try {
      const date = data instanceof Date ? data : data.toDate?.() || new Date(data);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('pt-BR');
    } catch (error) {
      return '-';
    }
  };

  // Função para obter texto do status
  const getStatusText = (status) => {
    switch(status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'em_pausa': return 'Em Pausa';
      case 'em_oficina': return 'Em Oficina';
      case 'aguardando_pecas': return 'Aguardando Peças';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  // Função para abrir modal de pausa
  const openPausaModal = (chamado, tipo) => {
    setSelectedChamado(chamado);
    setPausaTipo(tipo);
    setShowPausaModal(true);
  };

  // Função para confirmar pausa
  const confirmarPausa = async () => {
    if (!pausaMotivo.trim()) {
      toast.error('Informe o motivo da pausa');
      return;
    }
    
    let novoStatus = '';
    switch(pausaTipo) {
      case 'pausa':
        novoStatus = 'em_pausa';
        break;
      case 'oficina':
        novoStatus = 'em_oficina';
        break;
      case 'pecas':
        novoStatus = 'aguardando_pecas';
        break;
      default:
        novoStatus = 'em_pausa';
    }
    
    await handleUpdateStatus(selectedChamado.id, novoStatus, pausaMotivo);
  };

  // Função para atualizar status com motivo
  const handleUpdateStatus = async (chamadoId, newStatus, motivo = null) => {
    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      const chamado = chamados.find(c => c.id === chamadoId);
      
      let acaoMsg = `Status alterado para ${getStatusText(newStatus)}`;
      
      if (newStatus === 'em_pausa' && motivo) {
        acaoMsg = `Chamado em PAUSA. Motivo: ${motivo}`;
      } else if (newStatus === 'em_oficina') {
        acaoMsg = `Equipamento enviado para OFICINA externa`;
      } else if (newStatus === 'aguardando_pecas') {
        acaoMsg = `Aguardando PEÇAS para continuar o serviço`;
      } else if (newStatus === 'cancelado' && motivo) {
        acaoMsg = `Chamado CANCELADO. Motivo: ${motivo}`;
      } else if (newStatus === 'concluido') {
        acaoMsg = `Chamado CONCLUÍDO`;
      }
      
      const updateData = {
        status: newStatus,
        historico: [
          ...(chamado?.historico || []),
          {
            data: new Date(),
            acao: acaoMsg,
            usuario: `${userData.nome} (Admin)`,
            tipo: 'status',
            ...(motivo && { motivo: motivo })
          }
        ]
      };
      
      if (newStatus === 'em_andamento' && !chamado?.dataInicio) {
        updateData.dataInicio = new Date();
      }
      
      if (newStatus === 'em_pausa') {
        updateData.dataPausa = new Date();
      }
      
      if (newStatus === 'em_oficina') {
        updateData.dataOficina = new Date();
      }
      
      if (newStatus === 'concluido') {
        updateData.dataConclusao = new Date();
      }
      
      if (newStatus === 'cancelado') {
        updateData.dataCancelamento = new Date();
        updateData.motivoCancelamento = motivo;
      }
      
      await updateDoc(chamadoRef, updateData);
      toast.success(`Status atualizado para ${getStatusText(newStatus)}!`);
      
      if (showPausaModal) {
        setShowPausaModal(false);
        setPausaMotivo('');
      }
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

 const handleAtribuirTecnico = async (chamadoId, tecnicoId, tecnicoNome) => {
  try {
    const chamadoRef = doc(db, 'chamados', chamadoId);
    const chamado = chamados.find(c => c.id === chamadoId);
    
    await updateDoc(chamadoRef, {
      tecnicoId,
      tecnicoNome,
      status: 'em_andamento',
      dataInicio: chamado?.dataInicio || new Date(),
      historico: [
        ...(chamado?.historico || []),
        {
          data: new Date(),
          acao: `Técnico ${tecnicoNome} atribuído ao chamado`,
          usuario: `${userData.nome} (Admin)`,
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
  const handleAddAtualizacao = async (chamadoId) => {
    if (!atualizacao.trim()) return;

    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      const chamado = chamados.find(c => c.id === chamadoId);
      
      await updateDoc(chamadoRef, {
        historico: [
          ...(chamado?.historico || []),
          {
            data: new Date(),
            acao: atualizacao,
            usuario: `${userData.nome} (Admin)`,
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
              acao: `Status alterado para ${getStatusText(newStatus)} (em lote pelo admin)`,
              usuario: `${userData.nome} (Admin)`,
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
    if (selectedChamados.length === currentItems.length) {
      setSelectedChamados([]);
    } else {
      setSelectedChamados(currentItems.map(c => c.id));
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
    const matchesUnidade = filtroUnidade === 'todos' || chamado.unidade === filtroUnidade;
    
    const matchesDateRange = 
      (!dateRange.inicio || new Date(chamado.dataCriacao) >= new Date(dateRange.inicio)) &&
      (!dateRange.fim || new Date(chamado.dataCriacao) <= new Date(dateRange.fim));
    
    return matchesSearch && matchesStatus && matchesPrioridade && matchesTecnico && matchesUnidade && matchesDateRange;
  });

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredChamados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredChamados.length / itemsPerPage);

  // Resetar para a primeira página quando os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroStatus, filtroPrioridade, filtroTecnico, filtroUnidade, dateRange]);

  // Estatísticas
  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    andamento: chamados.filter(c => c.status === 'em_andamento').length,
    concluidos: chamados.filter(c => c.status === 'concluido').length,
    urgentes: chamados.filter(c => c.prioridade === 'alta' || c.prioridade === 'emergencial').length,
    emPausa: chamados.filter(c => c.status === 'em_pausa').length,
    emOficina: chamados.filter(c => c.status === 'em_oficina').length,
    aguardandoPecas: chamados.filter(c => c.status === 'aguardando_pecas').length,
    cancelados: chamados.filter(c => c.status === 'cancelado').length
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'em_pausa': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'em_oficina': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'aguardando_pecas': return 'bg-red-100 text-red-800 border-red-200';
      case 'concluido': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelado': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'aberto': return <ClockIcon className="w-4 h-4" />;
      case 'em_andamento': return <ArrowPathIcon className="w-4 h-4" />;
      case 'em_pausa': return <PauseIcon className="w-4 h-4" />;
      case 'em_oficina': return <BuildingStorefrontIcon className="w-4 h-4" />;
      case 'aguardando_pecas': return <TruckIcon className="w-4 h-4" />;
      case 'concluido': return <CheckCircleIcon className="w-4 h-4" />;
      case 'cancelado': return <XCircleIcon className="w-4 h-4" />;
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
    const headers = ['ID', 'Título', 'Equipamento', 'Unidade', 'Solicitante', 'Status', 'Prioridade', 'Técnico', 'Data Criação', 'Data Conclusão'];
    const data = filteredChamados.map(c => [
      c.id.slice(-6),
      c.titulo,
      c.equipamento,
      c.unidade || 'Não informada',
      c.solicitanteNome,
      getStatusText(c.status),
      c.prioridade,
      c.tecnicoNome || 'Não atribuído',
      formatarData(c.dataCriacao),
      formatarData(c.dataConclusao)
    ]);

    const csv = [headers, ...data].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chamados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleAbrirNovoChamadoModal = () => {
    setShowNovoChamadoModal(true);
  };

  const handleFecharNovoChamadoModal = () => {
    setShowNovoChamadoModal(false);
  };

  // Componente de paginação
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    };

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
        
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
              <span className="font-medium">{Math.min(indexOfLastItem, filteredChamados.length)}</span> de{' '}
              <span className="font-medium">{filteredChamados.length}</span> resultados
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Anterior</span>
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {getPageNumbers().map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === page
                      ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Próxima</span>
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
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
            onClick={handleAbrirNovoChamadoModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Novo Chamado</span>
          </button>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Em Pausa</p>
          <p className="text-2xl font-bold text-orange-600">{stats.emPausa}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Em Oficina</p>
          <p className="text-2xl font-bold text-purple-600">{stats.emOficina}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Aguard. Peças</p>
          <p className="text-2xl font-bold text-red-600">{stats.aguardandoPecas}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Cancelados</p>
          <p className="text-2xl font-bold text-gray-600">{stats.cancelados}</p>
        </div>
      </div>

      {/* Barra de Ações em Lote */}
      {selectedChamados.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <span className="text-blue-700">
            <strong>{selectedChamados.length}</strong> chamados selecionados
          </span>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleBatchStatusUpdate('em_andamento')} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Iniciar</button>
            <button onClick={() => handleBatchStatusUpdate('em_pausa')} className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">Pausar</button>
            <button onClick={() => handleBatchStatusUpdate('em_oficina')} className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">Oficina</button>
            <button onClick={() => handleBatchStatusUpdate('aguardando_pecas')} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Aguardar Peças</button>
            <button onClick={() => handleBatchStatusUpdate('concluido')} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Concluir</button>
            <button onClick={() => handleBatchStatusUpdate('cancelado')} className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">Cancelar</button>
            <button onClick={() => setSelectedChamados([])} className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm">Limpar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-700">Filtros</h3>
          </div>
          <ChevronDownIcon className={`w-5 h-5 text-gray-500 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </div>
        
        {showFilters && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Buscar por título, equipamento, solicitante..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="todos">Todos os status</option>
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="em_pausa">Em Pausa</option>
                <option value="em_oficina">Em Oficina</option>
                <option value="aguardando_pecas">Aguardando Peças</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>

              <select value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="todos">Todas prioridades</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="emergencial">Emergencial</option>
              </select>

              <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="todos">Todas unidades</option>
                {unidades.map(unidade => (<option key={unidade} value={unidade}>{unidade}</option>))}
              </select>

              <select value={filtroTecnico} onChange={(e) => setFiltroTecnico(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="todos">Todos os técnicos</option>
                <option value="nao_atribuido">Não atribuído</option>
                {tecnicos.map(t => (<option key={t.id} value={t.id}>{t.nome}</option>))}
              </select>

              <button onClick={() => { setSearchTerm(''); setFiltroStatus('todos'); setFiltroPrioridade('todos'); setFiltroTecnico('todos'); setFiltroUnidade('todos'); setDateRange({ inicio: '', fim: '' }); }} className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">Limpar Filtros</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">Mostrando {filteredChamados.length} de {chamados.length} chamados</p>

      {/* Visualização em Tabela com Paginação */}
      {viewMode === 'table' ? (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input type="checkbox" checked={selectedChamados.length === currentItems.length && currentItems.length > 0} onChange={handleSelectAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chamado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map((chamado) => (
                    <tr key={chamado.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input type="checkbox" checked={selectedChamados.includes(chamado.id)} onChange={() => handleSelectChamado(chamado.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{chamado.titulo}</div>
                        <div className="text-xs text-gray-500">{chamado.equipamento}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{chamado.unidade || 'Não informada'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{chamado.solicitanteNome || 'Não informado'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getStatusColor(chamado.status)}`}>
                          {getStatusIcon(chamado.status)}
                          {getStatusText(chamado.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getPrioridadeColor(chamado.prioridade)}`}>
                          {chamado.prioridade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{chamado.tecnicoNome || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatarData(chamado.dataCriacao)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => { setSelectedChamado(chamado); setShowDetailsModal(true); }} className="text-blue-600 hover:text-blue-800">
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button onClick={() => { setSelectedChamado(chamado); setShowEditModal(true); }} className="text-green-600 hover:text-green-800">
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button onClick={() => { setSelectedChamado(chamado); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-800">
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
          <Pagination />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentItems.map((chamado) => (
              <div key={chamado.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-500">#{chamado.id.slice(-6)}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(chamado.status)}`}>{getStatusText(chamado.status)}</span>
                </div>
                <h3 className="font-medium text-gray-800 mb-1">{chamado.titulo}</h3>
                <p className="text-sm text-gray-500 mb-2">{chamado.equipamento}</p>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => { setSelectedChamado(chamado); setShowDetailsModal(true); }} className="text-blue-600 hover:text-blue-800"><EyeIcon className="w-5 h-5" /></button>
                  <button onClick={() => { setSelectedChamado(chamado); setShowEditModal(true); }} className="text-green-600 hover:text-green-800"><PencilIcon className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
          <Pagination />
        </>
      )}

      {/* Modal de Novo Chamado */}
      <NovoChamadoModal isOpen={showNovoChamadoModal} onClose={handleFecharNovoChamadoModal} solicitanteId={userData?.uid} solicitanteNome={userData?.nome} />

      {/* Modal de Detalhes - CORRIGIDO */}
      {showDetailsModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Detalhes do Chamado</h2>
                <p className="text-sm text-gray-500">#{selectedChamado.id.slice(-6)}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    value={selectedChamado.status} 
                    onChange={(e) => { 
                      const newStatus = e.target.value; 
                      if (newStatus === 'em_pausa' || newStatus === 'em_oficina' || newStatus === 'aguardando_pecas') { 
                        openPausaModal(selectedChamado, newStatus === 'em_pausa' ? 'pausa' : newStatus === 'em_oficina' ? 'oficina' : 'pecas'); 
                      } else { 
                        handleUpdateStatus(selectedChamado.id, newStatus); 
                        setSelectedChamado({...selectedChamado, status: newStatus}); 
                      } 
                    }} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="aberto">Aberto</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="em_pausa">Em Pausa</option>
                    <option value="em_oficina">Em Oficina</option>
                    <option value="aguardando_pecas">Aguardando Peças</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                  <span className={`inline-block px-3 py-2 rounded-lg ${getPrioridadeColor(selectedChamado.prioridade)}`}>
                    {selectedChamado.prioridade}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleUpdateStatus(selectedChamado.id, 'em_andamento')} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Iniciar</button>
                <button onClick={() => openPausaModal(selectedChamado, 'pausa')} className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">Pausar</button>
                <button onClick={() => openPausaModal(selectedChamado, 'oficina')} className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">Oficina</button>
                <button onClick={() => openPausaModal(selectedChamado, 'pecas')} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Aguardar Peças</button>
                <button onClick={() => handleUpdateStatus(selectedChamado.id, 'concluido')} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Concluir</button>
                <button onClick={() => handleUpdateStatus(selectedChamado.id, 'cancelado')} className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">Cancelar</button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Informações Gerais</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="text-gray-500">Título:</span> {selectedChamado.titulo}</p>
                    <p><span className="text-gray-500">Equipamento:</span> {selectedChamado.equipamento}</p>
                    <p><span className="text-gray-500">Solicitante:</span> {selectedChamado.solicitanteNome}</p>
                    <p><span className="text-gray-500">Data de Abertura:</span> {formatarDataHora(selectedChamado.dataCriacao)}</p>
                    {selectedChamado.dataConclusao && (
                      <p><span className="text-gray-500">Data de Conclusão:</span> {formatarDataHora(selectedChamado.dataConclusao)}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Unidade</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-5 h-5 text-gray-400" />
                      <p className="text-gray-700">{selectedChamado.unidade || 'Unidade não informada'}</p>
                    </div>
                  </div>
                </div>
              </div>

            {/* Técnico Responsável - COMPLETO COM ATRIBUIÇÃO */}
<div>
  <h3 className="font-medium text-gray-700 mb-2">Técnico Responsável</h3>
  <div className="bg-gray-50 p-4 rounded-lg">
    {selectedChamado.tecnicoNome ? (
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <UserCircleIcon className="w-8 h-8 text-gray-400" />
          <div>
            <p className="font-medium">{selectedChamado.tecnicoNome}</p>
            <p className="text-xs text-gray-500">Técnico responsável</p>
            {selectedChamado.dataInicio && (
              <p className="text-xs text-gray-400 mt-1">
                Início: {formatarDataHora(selectedChamado.dataInicio)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Deseja realmente remover este técnico do chamado?')) {
              const chamadoRef = doc(db, 'chamados', selectedChamado.id);
              updateDoc(chamadoRef, {
                tecnicoId: null,
                tecnicoNome: null,
                status: 'aberto',
                historico: [
                  ...(selectedChamado.historico || []),
                  {
                    data: new Date(),
                    acao: `Técnico ${selectedChamado.tecnicoNome} removido do chamado. Status voltou para Aberto.`,
                    usuario: `${userData.nome} (Admin)`,
                    tipo: 'atribuicao'
                  }
                ]
              }).then(() => {
                toast.success('Técnico removido com sucesso!');
                setSelectedChamado({
                  ...selectedChamado,
                  tecnicoId: null,
                  tecnicoNome: null,
                  status: 'aberto'
                });
              }).catch(error => {
                console.error('Erro ao remover técnico:', error);
                toast.error('Erro ao remover técnico');
              });
            }
          }}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Remover Técnico
        </button>
      </div>
    ) : (
      <div className="space-y-3">
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
        
        {tecnicos.length === 0 && (
          <p className="text-sm text-yellow-600">
            ⚠️ Nenhum técnico disponível. Cadastre técnicos na seção de usuários.
          </p>
        )}
      </div>
    )}
  </div>
</div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Descrição do Problema</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedChamado.descricao}</p>
                </div>
              </div>

              {selectedChamado.fotos && selectedChamado.fotos.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Fotos Anexadas</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedChamado.fotos.map((foto, index) => { 
                      const isBase64 = typeof foto === 'string' && foto.startsWith('data:image'); 
                      const imageSrc = isBase64 ? foto : foto; 
                      return (<MediaViewer key={index} src={imageSrc} type="foto" />); 
                    })}
                  </div>
                </div>
              )}

              {selectedChamado.videos && selectedChamado.videos.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Vídeos Anexados</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedChamado.videos.map((video, index) => { 
                      const videoSrc = typeof video === 'object' && video.data ? video.data : video; 
                      return (<MediaViewer key={index} src={videoSrc} type="video" />); 
                    })}
                  </div>
                </div>
              )}

              {selectedChamado.servicoRealizado && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Serviço Realizado</h3>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedChamado.servicoRealizado.descricao}</p>
                    {selectedChamado.servicoRealizado.pecasTrocadas && (
                      <p className="mt-2 text-sm"><span className="font-medium">Peças trocadas:</span> {selectedChamado.servicoRealizado.pecasTrocadas}</p>
                    )}
                    {selectedChamado.servicoRealizado.tempoGasto && (
                      <p className="mt-1 text-sm"><span className="font-medium">Tempo gasto:</span> {selectedChamado.servicoRealizado.tempoGasto}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedChamado.avaliacao && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Avaliação do Cliente</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Nota:</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(nota => (
                          <span key={nota} className={`text-xl ${nota <= selectedChamado.avaliacao.nota ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">({selectedChamado.avaliacao.nota}/5)</span>
                    </div>
                    {selectedChamado.avaliacao.comentario && (
                      <p className="text-gray-700">{selectedChamado.avaliacao.comentario}</p>
                    )}
                  </div>
                </div>
              )}

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
                              <span className="font-medium text-sm">{item.usuario}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatarDataHora(item.data?.toDate?.() || item.data)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">{item.acao}</p>
                          {item.motivo && <p className="text-xs text-orange-600 ml-6 mt-1">📝 Motivo: {item.motivo}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nenhuma atualização no histórico</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Adicionar Atualização</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={atualizacao} 
                    onChange={(e) => setAtualizacao(e.target.value)} 
                    placeholder="Digite sua atualização..." 
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    onKeyPress={(e) => { if (e.key === 'Enter') { handleAddAtualizacao(selectedChamado.id); } }} 
                  />
                  <button onClick={() => handleAddAtualizacao(selectedChamado.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pausa */}
      {showPausaModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {pausaTipo === 'pausa' && 'Pausar Chamado'}
                {pausaTipo === 'oficina' && 'Enviar para Oficina'}
                {pausaTipo === 'pecas' && 'Aguardar Peças'}
              </h2>
              <button onClick={() => { setShowPausaModal(false); setPausaMotivo(''); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Chamado: <strong>{selectedChamado.titulo}</strong></p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo *</label>
                <textarea 
                  rows="3" 
                  value={pausaMotivo} 
                  onChange={(e) => setPausaMotivo(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  placeholder={pausaTipo === 'pausa' ? "Ex: Aguardando autorização do cliente..." : pausaTipo === 'oficina' ? "Ex: Necessita de ferramenta especializada..." : "Ex: Peça em falta no estoque..."} 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => { setShowPausaModal(false); setPausaMotivo(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={confirmarPausa} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">Editar Chamado</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              try { 
                await updateDoc(doc(db, 'chamados', selectedChamado.id), { 
                  titulo: selectedChamado.titulo, 
                  equipamento: selectedChamado.equipamento, 
                  unidade: selectedChamado.unidade, 
                  descricao: selectedChamado.descricao, 
                  prioridade: selectedChamado.prioridade, 
                  historico: [...(selectedChamado.historico || []), { data: new Date(), acao: 'Chamado editado pelo administrador', usuario: `${userData.nome} (Admin)`, tipo: 'edicao' }] 
                }); 
                toast.success('Chamado atualizado com sucesso!'); 
                setShowEditModal(false); 
              } catch (error) { 
                toast.error('Erro ao atualizar chamado'); 
              } 
            }} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título do Chamado</label>
                  <input type="text" required value={selectedChamado.titulo} onChange={(e) => setSelectedChamado({...selectedChamado, titulo: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Equipamento</label>
                  <input type="text" required value={selectedChamado.equipamento} onChange={(e) => setSelectedChamado({...selectedChamado, equipamento: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidade</label>
                  <input type="text" value={selectedChamado.unidade || ''} onChange={(e) => setSelectedChamado({...selectedChamado, unidade: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Unidade do solicitante" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <textarea required rows="4" value={selectedChamado.descricao} onChange={(e) => setSelectedChamado({...selectedChamado, descricao: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                  <select value={selectedChamado.prioridade} onChange={(e) => setSelectedChamado({...selectedChamado, prioridade: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="emergencial">Emergencial</option>
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-white">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {showDeleteModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-gray-500 text-center mb-6">Tem certeza que deseja excluir o chamado "{selectedChamado.titulo}"? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={() => handleDeleteChamado(selectedChamado.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
