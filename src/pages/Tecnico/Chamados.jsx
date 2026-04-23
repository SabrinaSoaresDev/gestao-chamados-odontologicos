
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
  PlayIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function TecnicoChamados() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  
  // Modais
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [atualizacao, setAtualizacao] = useState('');
  const [fotosServico, setFotosServico] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const [finalizacao, setFinalizacao] = useState({
    descricao: '',
    pecasTrocadas: '',
    tempoGasto: '',
    observacoes: ''
  });

  // Estado para controlar a imagem ampliada (Lightbox)
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

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

  // Debug do estado da imagem
  useEffect(() => {
    if (imagemAmpliada) {
      console.log('🖼️ Imagem ampliada aberta');
    }
  }, [imagemAmpliada]);

  // Função para converter imagem para Base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Função para redimensionar imagem
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

  const handleUpdateStatus = async (chamadoId, newStatus) => {
    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      const chamado = chamados.find(c => c.id === chamadoId);
      await updateDoc(chamadoRef, {
        status: newStatus,
        ...(newStatus === 'em_andamento' && { dataInicio: new Date() }),
        historico: [
          ...(chamado?.historico || []),
          {
            data: new Date(),
            acao: `Status alterado para ${newStatus}`,
            usuario: userData.nome,
            tipo: 'status'
          }
        ]
      });
      toast.success('Status atualizado!');
      // Atualiza o estado local para refletir imediatamente na UI
      if (selectedChamado && selectedChamado.id === chamadoId) {
        setSelectedChamado({ ...selectedChamado, status: newStatus });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
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
      
      // Atualiza o selecionado localmente
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
          tempoGasto: finalizacao.tempoGasto,
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
        tempoGasto: '',
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

  const filteredChamados = chamados.filter(chamado => {
    const matchesSearch =
      chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.solicitanteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filtroStatus === 'todos' || chamado.status === filtroStatus;
    const matchesPrioridade = filtroPrioridade === 'todos' || chamado.prioridade === filtroPrioridade;
    return matchesSearch && matchesStatus && matchesPrioridade;
  });

  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    andamento: chamados.filter(c => c.status === 'em_andamento').length,
    concluidos: chamados.filter(c => c.status === 'concluido').length,
    pendentes: chamados.filter(c => c.status === 'aberto' || c.status === 'em_andamento').length
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

  const getStatusText = (status) => {
    switch(status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
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
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando seus chamados...</p>
        </div>
      </div>
    );
  }

  // Adicione este componente DENTRO do seu componente TecnicoChamados (antes do return)
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
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-blue-700 font-medium">
            {stats.pendentes} chamados pendentes
          </span>
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

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, equipamento, solicitante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os status</option>
            <option value="aberto">Abertos</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluídos</option>
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
        </div>
      </div>

      {/* Lista de Chamados */}
      <div className="space-y-4">
        {filteredChamados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-100">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WrenchScrewdriverIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum chamado encontrado</h3>
            <p className="text-gray-500 mb-6">Você não possui chamados atribuídos ou nenhum resultado corresponde à sua busca.</p>
          </div>
        ) : (
          filteredChamados.map((chamado) => (
            <div
              key={chamado.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer"
              onClick={() => {
                setSelectedChamado(chamado);
                setShowDetalhesModal(true);
              }}
            >
              <div className="p-6">
                {/* Header do Card */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">#{chamado.id.slice(-6)}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getStatusColor(chamado.status)}`}>
                        {getStatusIcon(chamado.status)}
                        {getStatusText(chamado.status)}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getPrioridadeColor(chamado.prioridade)}`}>
                        {chamado.prioridade === 'emergencial' && <ExclamationTriangleIcon className="w-3 h-3" />}
                        {chamado.prioridade}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{chamado.titulo}</h3>
                    <p className="text-sm text-gray-600">{chamado.equipamento}</p>
                     <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 bg-blue-50 inline-flex px-2 py-0.5 rounded-full">
                      <MapPinIcon className="w-3 h-3" />
                      {chamado.unidade || 'Unidade não informada'}
                    </div>
                  </div>
                  {chamado.status === 'aberto' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(chamado.id, 'em_andamento');
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Iniciar
                    </button>
                  )}
                  {chamado.status === 'em_andamento' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChamado(chamado);
                        setShowFinalizarModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Finalizar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div className="flex items-center text-gray-600">
                  <UserCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="font-medium mr-1">Solicitante:</span> {chamado.solicitanteNome}
                </div>
                <div className="flex items-center text-gray-600">
                  <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="font-medium mr-1">Aberto em:</span> {formatDate(chamado.dataCriacao)}
                </div>
                {/* ADICIONE ESTA LINHA PARA A UNIDADE */}
                <div className="flex items-center text-gray-600">
                  <MapPinIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="font-medium mr-1">Unidade:</span> {chamado.unidade || 'Não informada'}
                </div>
              </div>
                {chamado.historico && chamado.historico.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Última atualização:</span>{' '}
                      {chamado.historico[chamado.historico.length - 1].acao}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
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
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${getStatusColor(selectedChamado.status)}`}>
                {getStatusIcon(selectedChamado.status)}
                {getStatusText(selectedChamado.status)}
              </span>
              {/* Botões de ação... */}
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

        {/* Informações do Chamado */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Informações</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p><span className="text-gray-500">Título:</span> {selectedChamado.titulo}</p>
              <p><span className="text-gray-500">Equipamento:</span> {selectedChamado.equipamento}</p>
              <p><span className="text-gray-500">Data de abertura:</span> {formatDate(selectedChamado.dataCriacao)}</p>
              {selectedChamado.dataInicio && (
                <p><span className="text-gray-500">Início do atendimento:</span> {formatDate(selectedChamado.dataInicio)}</p>
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

        {/* UNIDADE - Corrigido e posicionado corretamente */}
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
          <MediaViewer 
            key={index} 
            src={imageSrc} 
            type="foto" 
          />
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
          <MediaViewer 
            key={index} 
            src={videoSrc} 
            type="video" 
          />
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
                    {selectedChamado.servicoRealizado.tempoGasto && (
                      <p><span className="font-medium">Tempo gasto:</span> {selectedChamado.servicoRealizado.tempoGasto}</p>
                    )}
                    {selectedChamado.servicoRealizado.observacoes && (
                      <p><span className="font-medium">Observações:</span> {selectedChamado.servicoRealizado.observacoes}</p>
                    )}
                    {/* Fotos do Serviço Realizado */}
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

              {/* Avaliação (se houver) */}
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nenhuma atualização no histórico</p>
                  )}
                </div>
              </div>

              {/* Adicionar Atualização (apenas se não concluído) */}
              {selectedChamado.status !== 'concluido' && (
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

      {/* Modal de Finalização */}
      {showFinalizarModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">Finalizar Chamado</h2>
              <button
                onClick={() => {
                  setShowFinalizarModal(false);
                  setFinalizacao({
                    descricao: '',
                    pecasTrocadas: '',
                    tempoGasto: '',
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
                  Tempo Gasto
                </label>
                <input
                  type="text"
                  value={finalizacao.tempoGasto}
                  onChange={(e) => setFinalizacao({...finalizacao, tempoGasto: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 2 horas e 30 minutos"
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
                      tempoGasto: '',
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

      {/* Modal de Imagem Ampliada (CORRIGIDO) */}
      {imagemAmpliada && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/95 transition-opacity duration-300"
          style={{ zIndex: 9999 }} // Garante que fique acima de tudo
          onClick={() => setImagemAmpliada(null)}
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar na imagem
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
    </div>
  );
}
