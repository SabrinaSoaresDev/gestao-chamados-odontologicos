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
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
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
  PhoneIcon,
  MapPinIcon,
  PlusCircleIcon,
  FilmIcon,
  PlayIcon,
  PauseIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import ChatDoChamado from '../../components/ChatDoChamado'; // Import do chat
import toast from 'react-hot-toast';

export default function TecnicoChamados() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    inicio: '',
    fim: ''
  });
  
  // Chat states
  const [showChatModal, setShowChatModal] = useState(false);
  const [chamadoSelecionadoChat, setChamadoSelecionadoChat] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState({});
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Modais
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showPausaModal, setShowPausaModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [atualizacao, setAtualizacao] = useState('');
  const [fotosServico, setFotosServico] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const [pausaMotivo, setPausaMotivo] = useState('');
  const [pausaTipo, setPausaTipo] = useState('');
  const [cancelarMotivo, setCancelarMotivo] = useState('');
  
  const [finalizacao, setFinalizacao] = useState({
    descricao: '',
    pecasTrocadas: '',
    observacoes: ''
  });

  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  // Buscar chamados
  useEffect(() => {
    if (!userData) return;
    const q = query(
      collection(db, 'chamados'),
      where('tecnicoId', '==', userData.uid),
      orderBy('dataCriacao', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chamadosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate()
      }));
      setChamados(chamadosData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar chamados:', error);
      toast.error('Erro ao carregar seus chamados');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userData]);

  // Buscar mensagens não lidas
  useEffect(() => {
    if (!chamados.length) return;
    
    const unsubscribes = [];
    
    chamados.forEach(chamado => {
      const chatCollection = `mensagens_chamado_${chamado.id}`;
      const q = query(
        collection(db, chatCollection),
        where('lida', '==', false),
        where('remetenteId', '!=', userData?.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMensagensNaoLidas(prev => ({
          ...prev,
          [chamado.id]: snapshot.size
        }));
      });
      
      unsubscribes.push(unsubscribe);
    });
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [chamados]);

  // Listener para abrir chat via evento
  useEffect(() => {
    const handleAbrirChat = (event) => {
      const { chamadoId } = event.detail;
      const chamado = chamados.find(c => c.id === chamadoId);
      if (chamado) {
        setChamadoSelecionadoChat(chamado);
        setShowChatModal(true);
      }
    };

    window.addEventListener('abrirChat', handleAbrirChat);
    return () => window.removeEventListener('abrirChat', handleAbrirChat);
  }, [chamados]);


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroStatus, filtroPrioridade, dateRange]);

  // Funções de imagem
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const resizeImage = (base64Str, maxWidth = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth * height) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
    });
  };

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
    }
    
    const updateData = {
      status: newStatus,
      historico: [
        ...(chamado?.historico || []),
        {
          data: new Date(),
          acao: acaoMsg,
          usuario: userData.nome,
          tipo: 'status',
          ...(motivo && { motivo: motivo })
        }
      ]
    };
    
    // Verificar se deve adicionar dataInicio (apenas se não existir)
    if (newStatus === 'em_andamento' && !chamado?.dataInicio) {
      updateData.dataInicio = new Date(); // Usando Date() em vez de Timestamp
      console.log('📅 Data de início registrada:', updateData.dataInicio);
    }
    
    if (newStatus === 'concluido') {
      updateData.dataConclusao = new Date();
    }
    
    if (newStatus === 'cancelado') {
      updateData.dataCancelamento = new Date();
      updateData.motivoCancelamento = motivo;
    }
    
    await updateDoc(chamadoRef, updateData);
    toast.success(`Chamado ${getStatusText(newStatus)}!`);
    
    if (selectedChamado && selectedChamado.id === chamadoId) {
      setSelectedChamado({ ...selectedChamado, ...updateData });
    }
    
    setShowPausaModal(false);
    setShowCancelarModal(false);
    setPausaMotivo('');
    setCancelarMotivo('');
    
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    toast.error('Erro ao atualizar status');
  }
};
  
  const openPausaModal = (chamado, tipo) => {
    setSelectedChamado(chamado);
    setPausaTipo(tipo);
    setShowPausaModal(true);
  };
  
  const openCancelarModal = (chamado) => {
    setSelectedChamado(chamado);
    setShowCancelarModal(true);
  };
  
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
  
  const confirmarCancelamento = async () => {
    if (!cancelarMotivo.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    await handleUpdateStatus(selectedChamado.id, 'cancelado', cancelarMotivo);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + fotosServico.length > 5) {
      toast.error('Máximo de 5 fotos por serviço');
      return;
    }
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      if (!isValid) {
        toast.error(`${file.name} não é uma imagem válida`);
      }
      return isValid;
    });
    const validSizeFiles = validFiles.filter(file => {
      const isValid = file.size <= 500 * 1024;
      if (!isValid) {
        toast.error(`${file.name} é muito grande (máx 500KB)`);
      }
      return isValid;
    });
    setFotosServico(prev => [...prev, ...validSizeFiles]);
  };

  const removeFoto = (index) => {
    setFotosServico(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAtualizacao = async (chamadoId) => {
    if (!atualizacao.trim()) {
      toast.error('Digite uma atualização');
      return;
    }
    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      const chamado = chamados.find(c => c.id === chamadoId);
      await updateDoc(chamadoRef, {
        historico: [
          ...(chamado?.historico || []),
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
      
      if (selectedChamado && selectedChamado.id === chamadoId) {
         const novoHistorico = [
            ...(selectedChamado?.historico || []),
            { data: new Date(), acao: atualizacao, usuario: userData.nome, tipo: 'comentario' }
         ];
         setSelectedChamado({ ...selectedChamado, historico: novoHistorico });
      }

    } catch (error) {
      console.error('Erro ao adicionar atualização:', error);
      toast.error('Erro ao adicionar atualização');
    }
  };

  const handleFinalizarChamado = async () => {
    if (!selectedChamado) return;
    if (!finalizacao.descricao.trim()) {
      toast.error('Descreva o serviço realizado');
      return;
    }
    setUploading(true);
    toast.loading('Processando informações...', { id: 'finalizar' });
    try {
      let fotosServicoUrls = [];
      if (fotosServico.length > 0) {
        for (let i = 0; i < fotosServico.length; i++) {
          const foto = fotosServico[i];
          let base64 = await convertToBase64(foto);
          if (base64.length > 300 * 1024) {
            base64 = await resizeImage(base64, 600);
          }
          fotosServicoUrls.push(base64);
        }
      }
      const chamadoRef = doc(db, 'chamados', selectedChamado.id);
      await updateDoc(chamadoRef, {
        status: 'concluido',
        dataConclusao: new Date(),
        servicoRealizado: {
          descricao: finalizacao.descricao,
          pecasTrocadas: finalizacao.pecasTrocadas,
          observacoes: finalizacao.observacoes,
          fotos: fotosServicoUrls,
          finalizadoPor: userData.nome,
          data: new Date()
        },
        historico: [
          ...(selectedChamado.historico || []),
          {
            data: new Date(),
            acao: `Chamado finalizado: ${finalizacao.descricao}`,
            usuario: userData.nome,
            tipo: 'conclusao'
          }
        ]
      });
      toast.success('Chamado finalizado com sucesso!', { id: 'finalizar' });
      setShowFinalizarModal(false);
      setFinalizacao({
        descricao: '',
        pecasTrocadas: '',
        observacoes: ''
      });
      setFotosServico([]);
      setSelectedChamado(null);
      setShowDetalhesModal(false);
    } catch (error) {
      console.error('Erro ao finalizar chamado:', error);
      toast.error('Erro ao finalizar chamado', { id: 'finalizar' });
    } finally {
      setUploading(false);
    }
  };

  // Filtros
  const filteredChamados = chamados.filter(chamado => {
    const matchesSearch =
      chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.solicitanteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.unidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filtroStatus === 'todos' || chamado.status === filtroStatus;
    const matchesPrioridade = filtroPrioridade === 'todos' || chamado.prioridade === filtroPrioridade;
    
    const matchesDateRange = 
      (!dateRange.inicio || new Date(chamado.dataCriacao) >= new Date(dateRange.inicio)) &&
      (!dateRange.fim || new Date(chamado.dataCriacao) <= new Date(dateRange.fim));
    
    return matchesSearch && matchesStatus && matchesPrioridade && matchesDateRange;
  });

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredChamados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredChamados.length / itemsPerPage);

  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    andamento: chamados.filter(c => c.status === 'em_andamento').length,
    concluidos: chamados.filter(c => c.status === 'concluido').length,
    pausados: chamados.filter(c => c.status === 'em_pausa').length,
    oficina: chamados.filter(c => c.status === 'em_oficina').length,
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

 const formatDate = (date) => {
  if (!date) return '';
  
  // Se for Timestamp do Firestore (objeto com toDate)
  if (date && typeof date === 'object' && date.toDate && typeof date.toDate === 'function') {
    try {
      const d = date.toDate();
      if (isNaN(d.getTime())) return 'Data inválida';
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao converter Timestamp:', error);
      return 'Data inválida';
    }
  }
  
  // Se for Date object
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Se for string ou número
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Data inválida';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

  // Limpar filtros
  const limparFiltros = () => {
    setSearchTerm('');
    setFiltroStatus('todos');
    setFiltroPrioridade('todos');
    setDateRange({ inicio: '', fim: '' });
    toast.success('Filtros limpos');
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
          <p className="text-gray-500">Carregando seus chamados...</p>
        </div>
      </div>
    );
  }

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
      <div 
        className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]"
        onClick={() => setIsOpen(false)}
      >
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Chamados</h1>
          <p className="text-gray-600">Acompanhe e gerencie os chamados atribuídos a você</p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-7">
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg sm:text-xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Abertos</p>
          <p className="text-lg sm:text-xl font-bold text-yellow-600">{stats.abertos}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Andamento</p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">{stats.andamento}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Pausa</p>
          <p className="text-lg sm:text-xl font-bold text-orange-600">{stats.pausados}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Oficina</p>
          <p className="text-lg sm:text-xl font-bold text-purple-600">{stats.oficina}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Peças</p>
          <p className="text-lg sm:text-xl font-bold text-red-600">{stats.aguardandoPecas}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Concluídos</p>
          <p className="text-lg sm:text-xl font-bold text-green-600">{stats.concluidos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between text-gray-700 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5" />
            <span className="font-medium">Filtros</span>
            {(filtroStatus !== 'todos' || filtroPrioridade !== 'todos' || searchTerm || dateRange.inicio || dateRange.fim) && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Ativo</span>
            )}
          </div>
          <ChevronDownIcon className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título, equipamento, solicitante, unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="todos">Todos os status</option>
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="em_pausa">Em Pausa</option>
                <option value="em_oficina">Em Oficina</option>
                <option value="aguardando_pecas">Aguardando Peças</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>

              <select
                value={filtroPrioridade}
                onChange={(e) => setFiltroPrioridade(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="todos">Todas prioridades</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="emergencial">Emergencial</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={dateRange.inicio}
                  onChange={(e) => setDateRange({...dateRange, inicio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data Final</label>
                <input
                  type="date"
                  value={dateRange.fim}
                  onChange={(e) => setDateRange({...dateRange, fim: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={limparFiltros}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resultado da Busca */}
      <p className="text-sm text-gray-500">
        Mostrando {filteredChamados.length} chamados
      </p>

      {/* LISTAGEM - Desktop: Tabela | Mobile/Tablet: Cards Grid */}
      
      {/* Desktop (LG+): Tabela */}
<div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chamado</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {currentItems.length === 0 ? (
          <tr>
            <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
              Nenhum chamado encontrado
            </td>
          </tr>
        ) : (
          currentItems.map((chamado) => (
            <tr key={chamado.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-500">#{chamado.id.slice(-6)}</td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{chamado.titulo}</div>
                <div className="text-xs text-gray-500">{chamado.equipamento}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{chamado.unidade || '-'}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{chamado.solicitanteNome}</td>
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
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(chamado.dataCriacao).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  {/* Botão Visualizar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChamado(chamado);
                      setShowDetalhesModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                    title="Visualizar"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  
                  {/* Botão Chat - NOVO */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChamadoSelecionadoChat(chamado);
                      setShowChatModal(true);
                    }}
                    className="text-purple-600 hover:text-purple-800 relative"
                    title="Chat"
                  >
                    <ChatBubbleLeftIcon className="w-5 h-5" />
                    {mensagensNaoLidas[chamado.id] > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {mensagensNaoLidas[chamado.id]}
                      </span>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
  <Pagination />
</div>

     {/* Mobile/Tablet (abaixo de LG): Cards em Grid */}
<div className="lg:hidden">
  {currentItems.length === 0 ? (
    <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
      <WrenchScrewdriverIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-500">Nenhum chamado encontrado</p>
    </div>
  ) : (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentItems.map((chamado) => (
          <div
            key={chamado.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-3"
          >
            {/* Cabeçalho do card */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">#{chamado.id.slice(-6)}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(chamado.status)}`}>
                  {getStatusText(chamado.status)}
                </span>
              </div>
              <div className="flex gap-1">
                <span className={`px-2 py-0.5 text-xs rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                  {chamado.prioridade}
                </span>
              </div>
            </div>
            
            {/* Título e equipamento */}
            <h3 className="font-medium text-gray-800 text-sm mb-1 line-clamp-2">{chamado.titulo}</h3>
            <p className="text-xs text-gray-500 mb-2">{chamado.equipamento}</p>
            
            {/* Unidade - destaque visual */}
            <div className="flex items-center gap-1 mb-3">
              <MapPinIcon className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-600 font-medium truncate">
                {chamado.unidade || 'Unidade não informada'}
              </span>
            </div>
            
            {/* Botões de ação rápidos - linha 1 */}
            <div className="flex gap-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
              {/* Botão Visualizar */}
              <button
                onClick={() => {
                  setSelectedChamado(chamado);
                  setShowDetalhesModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium"
              >
                <EyeIcon className="w-3 h-3" />
                Ver
              </button>
              
              {/* Botão Chat - NOVO */}
              <button
                onClick={() => {
                  setChamadoSelecionadoChat(chamado);
                  setShowChatModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium relative"
              >
                <ChatBubbleLeftIcon className="w-3 h-3" />
                Chat
                {mensagensNaoLidas[chamado.id] > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {mensagensNaoLidas[chamado.id]}
                  </span>
                )}
              </button>
            </div>

            {/* Botões de ação de status - linha 2 (apenas se aplicável) */}
            <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              {chamado.status === 'aberto' && (
                <button
                  onClick={() => handleUpdateStatus(chamado.id, 'em_andamento')}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium"
                >
                  <ArrowPathIcon className="w-3 h-3" />
                  Iniciar
                </button>
              )}
              
              {chamado.status === 'em_andamento' && (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => openPausaModal(chamado, 'pausa')}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium"
                  >
                    <PauseIcon className="w-3 h-3" />
                    Pausar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedChamado(chamado);
                      setShowFinalizarModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium"
                  >
                    <CheckCircleIcon className="w-3 h-3" />
                    Finalizar
                  </button>
                </div>
              )}
              
              {(chamado.status === 'em_pausa' || chamado.status === 'em_oficina' || chamado.status === 'aguardando_pecas') && (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleUpdateStatus(chamado.id, 'em_andamento')}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium"
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                    Retomar
                  </button>
                  <button
                    onClick={() => openCancelarModal(chamado)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium"
                  >
                    <XCircleIcon className="w-3 h-3" />
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <Pagination />
    </>
  )}
</div>
      {/* Modal Detalhes do Chamado */}
      {showDetalhesModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Detalhes do Chamado</h2>
                <p className="text-sm text-gray-500">#{selectedChamado.id.slice(-6)}</p>
              </div>
              <button
                onClick={() => setShowDetalhesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status e Prioridade */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${getStatusColor(selectedChamado.status)}`}>
                      {getStatusIcon(selectedChamado.status)}
                      {getStatusText(selectedChamado.status)}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Prioridade</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${getPrioridadeColor(selectedChamado.prioridade)}`}>
                    {selectedChamado.prioridade === 'emergencial' && <ExclamationTriangleIcon className="w-4 h-4" />}
                    {selectedChamado.prioridade}
                  </span>
                </div>
              </div>

              {/* Botões de ação no modal */}
              <div className="flex gap-2 flex-wrap">
                {selectedChamado.status === 'aberto' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedChamado.id, 'em_andamento')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                    Iniciar Atendimento
                  </button>
                )}
                
                {selectedChamado.status === 'em_andamento' && (
                  <>
                    <button
                      onClick={() => openPausaModal(selectedChamado, 'pausa')}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <PauseIcon className="w-5 h-5" />
                      Pausar Chamado
                    </button>
                    <button
                      onClick={() => openPausaModal(selectedChamado, 'oficina')}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <BuildingStorefrontIcon className="w-5 h-5" />
                      Enviar para Oficina
                    </button>
                    <button
                      onClick={() => openPausaModal(selectedChamado, 'pecas')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <TruckIcon className="w-5 h-5" />
                      Aguardar Peças
                    </button>
                    <button
                      onClick={() => setShowFinalizarModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Finalizar Chamado
                    </button>
                  </>
                )}
                
                {(selectedChamado.status === 'em_pausa' || selectedChamado.status === 'em_oficina' || selectedChamado.status === 'aguardando_pecas') && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedChamado.id, 'em_andamento')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      Retomar Atendimento
                    </button>
                    <button
                      onClick={() => openCancelarModal(selectedChamado)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      Cancelar Chamado
                    </button>
                  </>
                )}
              </div>

             {/* Informações do Chamado */}
<div className="grid grid-cols-2 gap-6">
  <div>
    <h3 className="font-medium text-gray-700 mb-2">Informações</h3>
    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
      <p><span className="text-gray-500">Título:</span> {selectedChamado.titulo}</p>
      <p><span className="text-gray-500">Equipamento:</span> {selectedChamado.equipamento}</p>
      <p><span className="text-gray-500">Data de abertura:</span> {formatDate(selectedChamado.dataCriacao)}</p>
      {selectedChamado.dataInicio && !isNaN(new Date(selectedChamado.dataInicio).getTime()) && (
        <p><span className="text-gray-500">Início do atendimento:</span> {formatDate(selectedChamado.dataInicio)}</p>
      )}
      {selectedChamado.dataCancelamento && !isNaN(new Date(selectedChamado.dataCancelamento).getTime()) && (
        <p><span className="text-gray-500">Data cancelamento:</span> {formatDate(selectedChamado.dataCancelamento)}</p>
      )}
      {selectedChamado.motivoCancelamento && (
        <p><span className="text-gray-500">Motivo cancelamento:</span> {selectedChamado.motivoCancelamento}</p>
      )}
    </div>
  </div>
  <div>
    <h3 className="font-medium text-gray-700 mb-2">Solicitante</h3>
    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
      <p><span className="text-gray-500">Nome:</span> {selectedChamado.solicitanteNome}</p>
    </div>
  </div>
</div>

              {/* Unidade */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Unidade</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                    <p className="text-gray-700">
                      {selectedChamado.unidade || 'Unidade não informada'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Descrição do Problema */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Descrição do Problema</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedChamado.descricao}</p>
                </div>
              </div>

              {/* Fotos do Problema */}
              {selectedChamado.fotos && selectedChamado.fotos.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Fotos do Problema</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedChamado.fotos.map((foto, index) => {
                      const isBase64 = typeof foto === 'string' && foto.startsWith('data:image');
                      const imageSrc = isBase64 ? foto : foto;
                      return (
                        <MediaViewer key={index} src={imageSrc} type="foto" />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vídeos do Problema */}
              {selectedChamado.videos && selectedChamado.videos.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Vídeos do Problema</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedChamado.videos.map((video, index) => {
                      const videoSrc = typeof video === 'object' && video.data ? video.data : video;
                      return (
                        <MediaViewer key={index} src={videoSrc} type="video" />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Serviço Realizado (se concluído) */}
              {selectedChamado.servicoRealizado && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Serviço Realizado</h3>
                  <div className="bg-green-50 p-4 rounded-lg space-y-3">
                    <p><span className="font-medium">Descrição:</span> {selectedChamado.servicoRealizado.descricao}</p>
                    {selectedChamado.servicoRealizado.pecasTrocadas && (
                      <p><span className="font-medium">Peças trocadas:</span> {selectedChamado.servicoRealizado.pecasTrocadas}</p>
                    )}
                    
                    {selectedChamado.servicoRealizado.observacoes && (
                      <p><span className="font-medium">Observações:</span> {selectedChamado.servicoRealizado.observacoes}</p>
                    )}
                    {selectedChamado.servicoRealizado.fotos && selectedChamado.servicoRealizado.fotos.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium mb-2">Fotos do Serviço:</p>
                        <div className="grid grid-cols-4 gap-4">
                          {selectedChamado.servicoRealizado.fotos.map((foto, index) => {
                            const isBase64 = typeof foto === 'string' && foto.startsWith('data:image');
                            const imageSrc = isBase64 ? foto : foto;
                            return (
                              <div key={index} className="relative group">
                                <img
                                  src={imageSrc}
                                  alt={`Foto serviço ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImagemAmpliada(imageSrc);
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded-lg flex items-center justify-center">
                                  <EyeIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Finalizado por {selectedChamado.servicoRealizado.finalizadoPor} em {formatDate(selectedChamado.dataConclusao)}
                    </p>
                  </div>
                </div>
              )}

              {/* Avaliação */}
              {selectedChamado.avaliacao && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Avaliação do Cliente</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Nota:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((nota) => (
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
                              {item.tipo === 'criacao' && <WrenchScrewdriverIcon className="w-4 h-4 text-green-500" />}
                              {item.tipo === 'status' && <ArrowPathIcon className="w-4 h-4 text-blue-500" />}
                              {item.tipo === 'comentario' && <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />}
                              {item.tipo === 'conclusao' && <CheckCircleIconSolid className="w-4 h-4 text-green-500" />}
                              <span className="font-medium text-sm">{item.usuario}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(item.data?.toDate?.() || item.data)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">{item.acao}</p>
                          {item.motivo && (
                            <p className="text-xs text-orange-600 ml-6 mt-1">Motivo: {item.motivo}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nenhuma atualização no histórico</p>
                  )}
                </div>
              </div>

              {/* Adicionar Atualização */}
              {selectedChamado.status !== 'concluido' && selectedChamado.status !== 'cancelado' && (
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
              )}
            </div>
          </div>
        </div>
      )}

     {/* Modal de Finalização - Aumente o z-index */}
{showFinalizarModal && selectedChamado && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]"> {/* Mude de z-40 para z-[200] */}
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
        <h2 className="text-xl font-bold text-gray-800">Finalizar Chamado</h2>
        <button
          onClick={() => {
            setShowFinalizarModal(false);
            setFinalizacao({
              descricao: '',
              pecasTrocadas: '',
              observacoes: ''
            });
            setFotosServico([]);
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Registre as informações do serviço realizado para o chamado: <strong>{selectedChamado.titulo}</strong>
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição do Serviço Realizado *
          </label>
          <textarea
            required
            rows="3"
            value={finalizacao.descricao}
            onChange={(e) => setFinalizacao({...finalizacao, descricao: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Descreva detalhadamente o serviço realizado..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Peças Trocadas (se houver)
          </label>
          <input
            type="text"
            value={finalizacao.pecasTrocadas}
            onChange={(e) => setFinalizacao({...finalizacao, pecasTrocadas: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Filtro, resistência, motor..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações Adicionais
          </label>
          <textarea
            rows="2"
            value={finalizacao.observacoes}
            onChange={(e) => setFinalizacao({...finalizacao, observacoes: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Observações relevantes sobre o serviço..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fotos do Serviço Realizado (opcional - máximo 5)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="fotos-servico-upload"
              disabled={uploading}
            />
            <label
              htmlFor="fotos-servico-upload"
              className="flex flex-col items-center cursor-pointer"
            >
              <PlusCircleIcon className="w-12 h-12 text-gray-400" />
              <span className="text-sm text-gray-500 mt-2">
                Clique para adicionar fotos do serviço
              </span>
              <span className="text-xs text-gray-400">
                PNG, JPG até 500KB cada (máx 5 fotos)
              </span>
            </label>
          </div>
          {fotosServico.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                {fotosServico.length} foto(s) selecionada(s)
              </p>
              <div className="flex flex-wrap gap-2">
                {fotosServico.map((foto, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(foto)}
                      alt={`Preview ${index}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      disabled={uploading}
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1 rounded-b-lg">
                      {(foto.size / 1024).toFixed(0)}KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {uploading && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            <span>Processando informações...</span>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => {
              setShowFinalizarModal(false);
              setFinalizacao({
                descricao: '',
                pecasTrocadas: '',
                observacoes: ''
              });
              setFotosServico([]);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={uploading}
          >
            Cancelar
          </button>
          <button
            onClick={handleFinalizarChamado}
            disabled={uploading || !finalizacao.descricao.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              'Finalizar Chamado'
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Modal de Pausa/Oficina/Peças */}
      {showPausaModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {pausaTipo === 'pausa' && 'Pausar Chamado'}
                {pausaTipo === 'oficina' && 'Enviar para Oficina'}
                {pausaTipo === 'pecas' && 'Aguardar Peças'}
              </h2>
              <button
                onClick={() => {
                  setShowPausaModal(false);
                  setPausaMotivo('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Chamado: <strong>{selectedChamado.titulo}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo *
                </label>
                <textarea
                  rows="3"
                  value={pausaMotivo}
                  onChange={(e) => setPausaMotivo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    pausaTipo === 'pausa' ? "Ex: Aguardando autorização do cliente, problema complexo..." :
                    pausaTipo === 'oficina' ? "Ex: Necessita de ferramenta especializada, serviço terceirizado..." :
                    "Ex: Peça em falta no estoque, aguardando entrega..."
                  }
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPausaModal(false);
                    setPausaMotivo('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarPausa}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento */}
      {showCancelarModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Cancelar Chamado</h2>
              <button
                onClick={() => {
                  setShowCancelarModal(false);
                  setCancelarMotivo('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Tem certeza que deseja cancelar o chamado: <strong>{selectedChamado.titulo}</strong>?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo do Cancelamento *
                </label>
                <textarea
                  rows="3"
                  value={cancelarMotivo}
                  onChange={(e) => setCancelarMotivo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Cliente desistiu, problema resolvido por terceiros, equipamento obsoleto..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCancelarModal(false);
                    setCancelarMotivo('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmarCancelamento}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagem Ampliada */}
      {imagemAmpliada && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/95 transition-opacity duration-300"
          style={{ zIndex: 9999 }}
          onClick={() => setImagemAmpliada(null)}
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imagemAmpliada}
              alt="Imagem ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setImagemAmpliada(null)}
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-3 hover:bg-red-600 transition shadow-lg"
              title="Fechar"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
      {/* Modal do Chat */}
{showChatModal && chamadoSelecionadoChat && (
  <ChatDoChamado
    chamado={chamadoSelecionadoChat}
    onClose={() => {
      setShowChatModal(false);
      setChamadoSelecionadoChat(null);
    }}
    onNovaMensagem={() => {
      // Atualizar contador de mensagens não lidas
    }}
  />
)}
    </div>
  );
}