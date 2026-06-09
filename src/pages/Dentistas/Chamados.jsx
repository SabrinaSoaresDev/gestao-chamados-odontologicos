import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  UserCircleIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  StarIcon,
  MapPinIcon,
  VideoCameraIcon,
  PauseIcon,
  BuildingStorefrontIcon,
  CogIcon,
  BuildingOfficeIcon,
  TrashIcon,
  FilmIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import ChatDoChamado from '../../components/ChatDoChamado';

export default function DentistaChamados() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carregandoUnidade, setCarregandoUnidade] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showNovoChamadoModal, setShowNovoChamadoModal] = useState(false);
  const [showEditarChamadoModal, setShowEditarChamadoModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showAvaliarModal, setShowAvaliarModal] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [unidadeUsuario, setUnidadeUsuario] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [chamadoSelecionadoChat, setChamadoSelecionadoChat] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState({});
  
  // Estados para mídia
  const [midiaTipo, setMidiaTipo] = useState('foto');
  const [arquivosMidia, setArquivosMidia] = useState([]);
  
  const [formData, setFormData] = useState({
    titulo: '',
    equipamento: '',
    unidade: '',
    descricao: '',
    prioridade: 'media'
  });
  
  const [uploading, setUploading] = useState(false);
  const [avaliacao, setAvaliacao] = useState({
    nota: 5,
    comentario: ''
  });

  // Buscar a unidade do usuário
  useEffect(() => {
    const buscarUnidadeUsuario = async () => {
      if (!userData?.uid) {
        setCarregandoUnidade(false);
        return;
      }
      
      try {
        const userRef = doc(db, 'usuarios', userData.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userDados = userDoc.data();
          const unidade = userDados.unidade || '';
          setUnidadeUsuario(unidade);
          setFormData(prev => ({ ...prev, unidade: unidade }));
          
          if (!unidade) {
            toast.error('Sua conta não possui unidade cadastrada. Entre em contato com o administrador.');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar unidade:', error);
      } finally {
        setCarregandoUnidade(false);
      }
    };
    
    buscarUnidadeUsuario();
  }, [userData]);

  // Buscar chamados
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

  // Validar arquivo
  const validarArquivo = (file) => {
    const isFoto = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isFoto && !isVideo) {
      toast.error(`${file.name} não é uma imagem ou vídeo válido`);
      return false;
    }

    if (isFoto && file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} é muito grande (máx 10MB)`);
      return false;
    }
    
    if (isVideo && file.size > 50 * 1024 * 1024) {
      toast.error(`${file.name} é muito grande (máx 50MB)`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (arquivosMidia.length + files.length > 5) {
      toast.error('Máximo de 5 arquivos por chamado');
      return;
    }

    const novosArquivos = [];
    
    files.forEach(file => {
      if (validarArquivo(file)) {
        novosArquivos.push(file);
      }
    });

    setArquivosMidia(prev => [...prev, ...novosArquivos]);
  };

  const removerArquivo = (index) => {
    setArquivosMidia(prev => prev.filter((_, i) => i !== index));
  };

  const uploadArquivos = async () => {
    const fotosUrls = [];
    const videosUrls = [];
    
    for (const arquivo of arquivosMidia) {
      const isVideo = arquivo.type.startsWith('video/');
      const pasta = isVideo ? 'videos' : 'fotos';
      const storageRef = ref(storage, `chamados/${userData.uid}/${pasta}/${Date.now()}_${arquivo.name}`);
      await uploadBytes(storageRef, arquivo);
      const url = await getDownloadURL(storageRef);
      
      if (isVideo) {
        videosUrls.push(url);
      } else {
        fotosUrls.push(url);
      }
    }
    
    return { fotosUrls, videosUrls };
  };

  const handleSubmitNovoChamado = async (e) => {
    e.preventDefault();
    
    if (!unidadeUsuario) {
      toast.error('Unidade não identificada.');
      return;
    }
    
    setUploading(true);
    toast.loading('Processando...', { id: 'upload' });

    try {
      let fotosUrls = [];
      let videosUrls = [];
      
      if (arquivosMidia.length > 0) {
        const resultado = await uploadArquivos();
        fotosUrls = resultado.fotosUrls;
        videosUrls = resultado.videosUrls;
      }

      const chamadoData = {
        ...formData,
        unidade: unidadeUsuario,
        solicitanteId: userData.uid,
        solicitanteNome: userData.nome,
        status: 'aberto',
        fotos: fotosUrls,
        videos: videosUrls,
        dataCriacao: new Date(),
        historico: [{
          data: new Date(),
          acao: `Chamado criado${arquivosMidia.length > 0 ? ` com ${arquivosMidia.filter(f => f.type.startsWith('image/')).length} foto(s) e ${arquivosMidia.filter(f => f.type.startsWith('video/')).length} vídeo(s)` : ''}`,
          usuario: userData.nome,
          tipo: 'criacao'
        }]
      };
      
      await addDoc(collection(db, 'chamados'), chamadoData);
      toast.success('Chamado criado com sucesso!', { id: 'upload' });
      setShowNovoChamadoModal(false);
      setFormData({ titulo: '', equipamento: '', unidade: unidadeUsuario, descricao: '', prioridade: 'media' });
      setArquivosMidia([]);
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      toast.error('Erro ao criar chamado.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditarChamado = async (e) => {
    e.preventDefault();
    
    if (!selectedChamado) return;
    
    setUploading(true);
    toast.loading('Atualizando...', { id: 'edit' });

    try {
      const chamadoRef = doc(db, 'chamados', selectedChamado.id);
      
      await updateDoc(chamadoRef, {
        titulo: formData.titulo,
        equipamento: formData.equipamento,
        descricao: formData.descricao,
        prioridade: formData.prioridade,
        historico: [
          ...(selectedChamado.historico || []),
          {
            data: new Date(),
            acao: 'Chamado editado pelo solicitante',
            usuario: userData.nome,
            tipo: 'edicao'
          }
        ]
      });
      
      toast.success('Chamado atualizado com sucesso!', { id: 'edit' });
      setShowEditarChamadoModal(false);
      setSelectedChamado(null);
    } catch (error) {
      console.error('Erro ao editar chamado:', error);
      toast.error('Erro ao editar chamado.');
    } finally {
      setUploading(false);
    }
  };

  const abrirEditarChamado = (chamado) => {
    setSelectedChamado(chamado);
    setFormData({
      titulo: chamado.titulo || '',
      equipamento: chamado.equipamento || '',
      unidade: chamado.unidade || unidadeUsuario,
      descricao: chamado.descricao || '',
      prioridade: chamado.prioridade || 'media'
    });
    setShowEditarChamadoModal(true);
  };

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
        }
      });

      toast.success('Avaliação enviada!');
      setShowAvaliarModal(false);
      setAvaliacao({ nota: 5, comentario: '' });
    } catch (error) {
      console.error('Erro ao avaliar:', error);
      toast.error('Erro ao enviar avaliação');
    }
  };

  const handleCancelarChamado = async (chamadoId) => {
    if (!window.confirm('Cancelar este chamado?')) return;

    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      await updateDoc(chamadoRef, {
        status: 'cancelado',
        historico: [
          ...(chamados.find(c => c.id === chamadoId)?.historico || []),
          { data: new Date(), acao: 'Chamado cancelado', usuario: userData.nome, tipo: 'cancelamento' }
        ]
      });
      toast.success('Chamado cancelado!');
    } catch (error) {
      toast.error('Erro ao cancelar');
    }
  };

  // Componente MediaViewer
  const MediaViewer = ({ src, type }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
      return (
        <div className="relative group cursor-pointer" onClick={() => setIsOpen(true)}>
          {type === 'foto' ? (
            <img src={src} alt="Mídia do chamado" className="w-full h-24 object-cover rounded-lg" />
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
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]" onClick={() => setIsOpen(false)}>
        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
          <XMarkIcon className="w-8 h-8" />
        </button>
        {type === 'foto' ? (
          <img src={src} alt="Mídia ampliada" className="max-w-full max-h-full object-contain" />
        ) : (
          <video src={src} controls className="max-w-full max-h-full" autoPlay />
        )}
      </div>
    );
  };

  const filteredChamados = chamados.filter(chamado => {
    const matchesSearch = chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filtroStatus === 'todos' || chamado.status === filtroStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    andamento: chamados.filter(c => c.status === 'em_andamento').length,
    aguardandoPecas: chamados.filter(c => c.status === 'aguardando_pecas').length,
    emOficina: chamados.filter(c => c.status === 'em_oficina').length,
    emPausa: chamados.filter(c => c.status === 'em_pausa').length,
    concluidos: chamados.filter(c => c.status === 'concluido').length,
    cancelados: chamados.filter(c => c.status === 'cancelado').length
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'aguardando_pecas': return 'bg-orange-100 text-orange-800';
      case 'em_oficina': return 'bg-purple-100 text-purple-800';
      case 'em_pausa': return 'bg-gray-100 text-gray-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'aberto': return <ClockIcon className="w-4 h-4" />;
      case 'em_andamento': return <ArrowPathIcon className="w-4 h-4" />;
      case 'aguardando_pecas': return <CogIcon className="w-4 h-4" />;
      case 'em_oficina': return <BuildingStorefrontIcon className="w-4 h-4" />;
      case 'em_pausa': return <PauseIcon className="w-4 h-4" />;
      case 'concluido': return <CheckCircleIcon className="w-4 h-4" />;
      case 'cancelado': return <XMarkIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'aguardando_pecas': return 'Aguardando Peças';
      case 'em_oficina': return 'Em Oficina';
      case 'em_pausa': return 'Em Pausa';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getPrioridadeColor = (prioridade) => {
    switch(prioridade) {
      case 'emergencial': return 'bg-red-600 text-white';
      case 'alta': return 'bg-red-100 text-red-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'baixa': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('pt-BR');
  };

  if (loading || carregandoUnidade) {
    return (
      <div className="flex justify-center items-center h-96">
        <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Chamados</h1>
          <p className="text-gray-600">Acompanhe suas solicitações de manutenção</p>
        </div>
        <button
          onClick={() => setShowNovoChamadoModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Novo Chamado
        </button>
      </div>

      {/* Cards Estatísticas - VERSÃO CORRIGIDA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        <div className="bg-white rounded-lg p-3 shadow-sm border">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 shadow-sm border border-yellow-200">
          <div className="flex items-center justify-between">
            <ClockIcon className="w-4 h-4 text-yellow-500" />
            <p className="text-xl font-bold text-yellow-700">{stats.abertos}</p>
          </div>
          <p className="text-xs text-yellow-600 mt-1">Abertos</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <ArrowPathIcon className="w-4 h-4 text-blue-500" />
            <p className="text-xl font-bold text-blue-700">{stats.andamento}</p>
          </div>
          <p className="text-xs text-blue-600 mt-1">Andamento</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 shadow-sm border border-orange-200">
          <div className="flex items-center justify-between">
            <CogIcon className="w-4 h-4 text-orange-500" />
            <p className="text-xl font-bold text-orange-700">{stats.aguardandoPecas}</p>
          </div>
          <p className="text-xs text-orange-600 mt-1">Aguarda Peças</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <BuildingStorefrontIcon className="w-4 h-4 text-purple-500" />
            <p className="text-xl font-bold text-purple-700">{stats.emOficina}</p>
          </div>
          <p className="text-xs text-purple-600 mt-1">Em Oficina</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <PauseIcon className="w-4 h-4 text-gray-500" />
            <p className="text-xl font-bold text-gray-700">{stats.emPausa}</p>
          </div>
          <p className="text-xs text-gray-600 mt-1">Em Pausa</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 shadow-sm border border-green-200">
          <div className="flex items-center justify-between">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            <p className="text-xl font-bold text-green-700">{stats.concluidos}</p>
          </div>
          <p className="text-xs text-green-600 mt-1">Concluídos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título, equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm min-w-[180px]"
        >
          <option value="todos">Todos os status</option>
          <option value="aberto">Abertos</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="aguardando_pecas">Aguardando Peças</option>
          <option value="em_oficina">Em Oficina</option>
          <option value="em_pausa">Em Pausa</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {/* LISTA DE CHAMADOS - Desktop (tabela) */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Equipamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredChamados.map((chamado) => (
                <tr key={chamado.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">#{chamado.id?.slice(-6)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{chamado.titulo}</td>
                  <td className="px-4 py-3 text-sm">{chamado.equipamento}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(chamado.status)}`}>
                      {getStatusIcon(chamado.status)}
                      {getStatusText(chamado.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                      {chamado.prioridade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(chamado.dataCriacao)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedChamado(chamado); setShowDetalhesModal(true); }} className="text-blue-600 hover:text-blue-800">
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      {chamado.status === 'aberto' && (
                        <>
                          <button onClick={() => abrirEditarChamado(chamado)} className="text-green-600 hover:text-green-800">
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleCancelarChamado(chamado.id)} className="text-red-600 hover:text-red-800">
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {chamado.status === 'cancelado' && (
                        <button onClick={() => {
                          if (window.confirm('Reabrir este chamado?')) {
                            updateDoc(doc(db, 'chamados', chamado.id), {
                              status: 'aberto',
                              historico: [...(chamado.historico || []), { data: new Date(), acao: 'Chamado reaberto pelo solicitante', usuario: userData.nome }]
                            }).then(() => toast.success('Chamado reaberto!'));
                          }
                        }} className="text-orange-600 hover:text-orange-800">
                          <ArrowPathIcon className="w-5 h-5" />
                        </button>
                      )}
                      {chamado.status === 'concluido' && !chamado.avaliacao && (
                        <button onClick={() => { setSelectedChamado(chamado); setShowAvaliarModal(true); }} className="text-yellow-600 hover:text-yellow-800">
                          <StarIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button onClick={() => { setChamadoSelecionadoChat(chamado); setShowChatModal(true); }} className="text-purple-600 hover:text-purple-800 relative">
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
              ))}
              {filteredChamados.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Nenhum chamado encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredChamados.map((chamado) => (
          <div key={chamado.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#{chamado.id?.slice(-6)}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getStatusColor(chamado.status)}`}>
                  {getStatusIcon(chamado.status)}
                  {getStatusText(chamado.status)}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                  {chamado.prioridade}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedChamado(chamado); setShowDetalhesModal(true); }} className="text-blue-600">
                  <EyeIcon className="w-5 h-5" />
                </button>
                {chamado.status === 'aberto' && (
                  <>
                    <button onClick={() => abrirEditarChamado(chamado)} className="text-green-600">
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleCancelarChamado(chamado.id)} className="text-red-600">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
                {chamado.status === 'cancelado' && (
                  <button onClick={() => {
                    if (window.confirm('Reabrir este chamado?')) {
                      updateDoc(doc(db, 'chamados', chamado.id), {
                        status: 'aberto',
                        historico: [...(chamado.historico || []), { data: new Date(), acao: 'Chamado reaberto', usuario: userData.nome }]
                      }).then(() => toast.success('Chamado reaberto!'));
                    }
                  }} className="text-orange-600">
                    <ArrowPathIcon className="w-5 h-5" />
                  </button>
                )}
                {chamado.status === 'concluido' && !chamado.avaliacao && (
                  <button onClick={() => { setSelectedChamado(chamado); setShowAvaliarModal(true); }} className="text-yellow-600">
                    <StarIcon className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => { setChamadoSelecionadoChat(chamado); setShowChatModal(true); }} className="text-purple-600 relative">
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  {mensagensNaoLidas[chamado.id] > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {mensagensNaoLidas[chamado.id]}
                    </span>
                  )}
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 text-base mb-1">{chamado.titulo}</h3>
            <p className="text-sm text-gray-600 mb-2">{chamado.equipamento}</p>
            {chamado.unidade && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <MapPinIcon className="w-3 h-3" />
                {chamado.unidade}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <CalendarIcon className="w-3 h-3" />
              {formatDate(chamado.dataCriacao)}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <UserCircleIcon className="w-3 h-3" />
              {chamado.tecnicoNome || 'Aguardando técnico'}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <ChatBubbleLeftIcon className="w-3 h-3" />
              {chamado.historico?.length || 0} atualizações
            </div>
            {(chamado.fotos?.length > 0 || chamado.videos?.length > 0) && (
              <div className="mt-2 pt-2 border-t flex gap-3 text-xs">
                {chamado.fotos?.length > 0 && <span className="text-blue-500">📷 {chamado.fotos.length} foto(s)</span>}
                {chamado.videos?.length > 0 && <span className="text-purple-500">🎥 {chamado.videos.length} vídeo(s)</span>}
              </div>
            )}
            {chamado.historico && chamado.historico.length > 0 && (
              <div className="mt-2 pt-2 border-t text-xs text-gray-400">
                Última: {chamado.historico[chamado.historico.length - 1].acao}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL NOVO CHAMADO */}
      {showNovoChamadoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowNovoChamadoModal(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Novo Chamado</h2>
              <button onClick={() => setShowNovoChamadoModal(false)} className="text-gray-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitNovoChamado} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Unidade</label>
                <input type="text" value={unidadeUsuario} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-600" />
                <p className="text-xs text-green-600 mt-1">✓ Unidade vinculada ao seu cadastro</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Título do Chamado *</label>
                <input type="text" required value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: Cadeira odontológica com problema" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Equipamento *</label>
                <input type="text" required value={formData.equipamento} onChange={(e) => setFormData({...formData, equipamento: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: Cadeira OD-3000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição do Problema *</label>
                <textarea rows="4" required value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Descreva detalhadamente o problema..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prioridade</label>
                <select value={formData.prioridade} onChange={(e) => setFormData({...formData, prioridade: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="baixa">Baixa - Pode aguardar</option>
                  <option value="media">Média - Normal</option>
                  <option value="alta">Alta - Afeta o atendimento</option>
                  <option value="emergencial">Emergencial - Impossibilita atendimento</option>
                </select>
              </div>

              {/* Seção de upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Fotos e Vídeos (opcional)</label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setMidiaTipo('foto')} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${midiaTipo === 'foto' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <PhotoIcon className="w-4 h-4" />
                    Fotos
                  </button>
                  <button type="button" onClick={() => setMidiaTipo('video')} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${midiaTipo === 'video' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <FilmIcon className="w-4 h-4" />
                    Vídeos
                  </button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input type="file" multiple accept={midiaTipo === 'foto' ? "image/*" : "video/*"} onChange={handleFileChange} className="hidden" id="midia-upload" disabled={uploading} />
                  <label htmlFor="midia-upload" className="flex flex-col items-center cursor-pointer">
                    {midiaTipo === 'foto' ? (
                      <>
                        <PhotoIcon className="w-12 h-12 text-gray-400" />
                        <span className="text-sm text-gray-500 mt-2">Clique para adicionar fotos</span>
                        <span className="text-xs text-gray-400">PNG, JPG até 10MB (máx 5)</span>
                      </>
                    ) : (
                      <>
                        <FilmIcon className="w-12 h-12 text-gray-400" />
                        <span className="text-sm text-gray-500 mt-2">Clique para adicionar vídeos</span>
                        <span className="text-xs text-gray-400">MP4, MOV até 50MB (máx 5)</span>
                      </>
                    )}
                  </label>
                </div>
                {arquivosMidia.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Arquivos selecionados ({arquivosMidia.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {arquivosMidia.map((arquivo, index) => {
                        const isVideo = arquivo.type.startsWith('video/');
                        const tamanhoMB = (arquivo.size / (1024 * 1024)).toFixed(2);
                        return (
                          <div key={index} className="relative">
                            {isVideo ? (
                              <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center">
                                <FilmIcon className="w-8 h-8 text-white" />
                                <PlayIcon className="w-4 h-4 text-white absolute bottom-1 right-1" />
                              </div>
                            ) : (
                              <img src={URL.createObjectURL(arquivo)} alt={`Preview ${index}`} className="w-20 h-20 object-cover rounded-lg" />
                            )}
                            <button type="button" onClick={() => removerArquivo(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600" disabled={uploading}>
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                            <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1 rounded-b-lg">{tamanhoMB}MB</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNovoChamadoModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{uploading ? 'Enviando...' : 'Criar Chamado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CHAMADO */}
      {showEditarChamadoModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowEditarChamadoModal(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Editar Chamado</h2>
              <button onClick={() => setShowEditarChamadoModal(false)} className="text-gray-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditarChamado} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Unidade</label>
                <input type="text" value={unidadeUsuario} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input type="text" required value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Equipamento *</label>
                <input type="text" required value={formData.equipamento} onChange={(e) => setFormData({...formData, equipamento: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição *</label>
                <textarea rows="4" required value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prioridade</label>
                <select value={formData.prioridade} onChange={(e) => setFormData({...formData, prioridade: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="emergencial">Emergencial</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditarChamadoModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" disabled={uploading} className="px-4 py-2 bg-green-600 text-white rounded-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES COM MÍDIA */}
      {showDetalhesModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetalhesModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold">{selectedChamado.titulo}</h2>
                <p className="text-sm text-gray-500">#{selectedChamado.id}</p>
              </div>
              <button onClick={() => setShowDetalhesModal(false)} className="text-gray-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Status</p><span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedChamado.status)}`}>{getStatusIcon(selectedChamado.status)}{getStatusText(selectedChamado.status)}</span></div>
                <div><p className="text-xs text-gray-500">Prioridade</p><span className={`px-2 py-1 text-xs rounded-full ${getPrioridadeColor(selectedChamado.prioridade)}`}>{selectedChamado.prioridade}</span></div>
                <div><p className="text-xs text-gray-500">Equipamento</p><p className="font-medium">{selectedChamado.equipamento}</p></div>
                <div><p className="text-xs text-gray-500">Data</p><p>{formatDate(selectedChamado.dataCriacao)}</p></div>
                <div><p className="text-xs text-gray-500">Unidade</p><p>{selectedChamado.unidade}</p></div>
                <div><p className="text-xs text-gray-500">Técnico</p><p>{selectedChamado.tecnicoNome || 'Aguardando'}</p></div>
              </div>
              <div><p className="text-xs text-gray-500 mb-1">Descrição</p><div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-700">{selectedChamado.descricao}</p></div></div>

              {/* Fotos */}
              {selectedChamado.fotos && selectedChamado.fotos.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Fotos Anexadas</p>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedChamado.fotos.map((foto, index) => (
                      <MediaViewer key={index} src={foto} type="foto" />
                    ))}
                  </div>
                </div>
              )}

              {/* Vídeos */}
              {selectedChamado.videos && selectedChamado.videos.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Vídeos Anexados</p>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedChamado.videos.map((video, index) => (
                      <MediaViewer key={index} src={video} type="video" />
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico */}
              {selectedChamado.historico && selectedChamado.historico.length > 0 && (
                <div><p className="text-xs text-gray-500 mb-1">Histórico</p><div className="space-y-2 max-h-40 overflow-y-auto">{selectedChamado.historico.map((item, idx) => (<div key={idx} className="text-sm border-l-2 border-blue-300 pl-2 py-1"><p className="text-gray-700">{item.acao}</p><p className="text-xs text-gray-400">{formatDate(item.data?.toDate?.() || item.data)} - por {item.usuario}</p></div>))}</div></div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                {selectedChamado.status === 'concluido' && !selectedChamado.avaliacao && (<button onClick={() => {setShowDetalhesModal(false); setShowAvaliarModal(true);}} className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Avaliar</button>)}
                <button onClick={() => setShowDetalhesModal(false)} className="px-4 py-2 border rounded-lg">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AVALIAÇÃO */}
      {showAvaliarModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAvaliarModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b"><h2 className="text-xl font-bold">Avaliar Atendimento</h2></div>
            <div className="p-4 space-y-4">
              <div className="flex justify-center gap-2">
                {[1,2,3,4,5].map(nota => (
                  <button key={nota} onClick={() => setAvaliacao({...avaliacao, nota})}>
                    {nota <= avaliacao.nota ? <StarIconSolid className="w-8 h-8 text-yellow-400" /> : <StarIcon className="w-8 h-8 text-gray-300" />}
                  </button>
                ))}
              </div>
              <textarea rows="3" value={avaliacao.comentario} onChange={(e) => setAvaliacao({...avaliacao, comentario: e.target.value})} placeholder="Deixe seu comentário sobre o atendimento..." className="w-full px-3 py-2 border rounded-lg" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAvaliarModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button onClick={handleAvaliarChamado} className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Enviar Avaliação</button>
              </div>
            </div>
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
          onNovaMensagem={() => {}}
        />
      )}
    </div>
  );
}
