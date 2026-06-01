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
  TrashIcon
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
  const [midiaAmpliada, setMidiaAmpliada] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
const [chamadoSelecionadoChat, setChamadoSelecionadoChat] = useState(null);
const [mensagensNaoLidas, setMensagensNaoLidas] = useState({});
  
  const [formData, setFormData] = useState({
    titulo: '',
    equipamento: '',
    unidade: '',
    descricao: '',
    prioridade: 'media'
  });
  
  const [fotos, setFotos] = useState([]);
  const [videos, setVideos] = useState([]);
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

// Buscar mensagens não lidas para cada chamado
useEffect(() => {
  if (!chamados.length) return;
  
  const unsubscribes = [];
  
  chamados.forEach(chamado => {
    // USAR O MESMO NOME DO ChatDoChamado
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

  // Criar novo chamado
  const handleSubmitNovoChamado = async (e) => {
    e.preventDefault();
    
    if (!unidadeUsuario) {
      toast.error('Unidade não identificada.');
      return;
    }
    
    setUploading(true);
    toast.loading('Processando...', { id: 'upload' });

    try {
      const fotosUrls = [];
      for (const foto of fotos) {
        const storageRef = ref(storage, `chamados/${userData.uid}/fotos/${Date.now()}_${foto.name}`);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        fotosUrls.push(url);
      }

      const chamadoData = {
        ...formData,
        unidade: unidadeUsuario,
        solicitanteId: userData.uid,
        solicitanteNome: userData.nome,
        status: 'aberto',
        fotos: fotosUrls,
        videos: videos,
        dataCriacao: new Date(),
        historico: [{
          data: new Date(),
          acao: 'Chamado criado',
          usuario: userData.nome,
          tipo: 'criacao'
        }]
      };
      
      await addDoc(collection(db, 'chamados'), chamadoData);
      toast.success('Chamado criado com sucesso!', { id: 'upload' });
      setShowNovoChamadoModal(false);
      setFormData({ titulo: '', equipamento: '', unidade: unidadeUsuario, descricao: '', prioridade: 'media' });
      setFotos([]);
      setVideos([]);
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      toast.error('Erro ao criar chamado.');
    } finally {
      setUploading(false);
    }
  };

  // Editar chamado
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

  // Abrir modal de edição
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

  const filteredChamados = chamados.filter(chamado => {
    const matchesSearch = chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filtroStatus === 'todos' || chamado.status === filtroStatus;
    return matchesSearch && matchesStatus;
  });

  // Estatísticas com TODOS os status
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

      {/* Cards Estatísticas - COM TODOS OS STATUS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        <div className="bg-white rounded-lg p-3 shadow-sm border">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold">{stats.total}</p>
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
          <option value="todos">📋 Todos os status</option>
          <option value="aberto">🟡 Abertos</option>
          <option value="em_andamento">🔵 Em Andamento</option>
          <option value="aguardando_pecas">🟠 Aguardando Peças</option>
          <option value="em_oficina">🟣 Em Oficina</option>
          <option value="em_pausa">⚪ Em Pausa</option>
          <option value="concluido">🟢 Concluídos</option>
          <option value="cancelado">🔴 Cancelados</option>
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
                    <button
                      onClick={() => {
                        setSelectedChamado(chamado);
                        setShowDetalhesModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Visualizar"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    {chamado.status === 'aberto' && (
                      <>
                        <button
                          onClick={() => abrirEditarChamado(chamado)}
                          className="text-green-600 hover:text-green-800"
                          title="Editar"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleCancelarChamado(chamado.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Cancelar"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {chamado.status === 'cancelado' && (
                      <button
                        onClick={() => {
                          if (window.confirm('Reabrir este chamado?')) {
                            updateDoc(doc(db, 'chamados', chamado.id), {
                              status: 'aberto',
                              historico: [...(chamado.historico || []), { data: new Date(), acao: 'Chamado reaberto pelo solicitante', usuario: userData.nome }]
                            }).then(() => toast.success('Chamado reaberto!'));
                          }
                        }}
                        className="text-orange-600 hover:text-orange-800"
                        title="Reabrir"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                      </button>
                    )}
                    {chamado.status === 'concluido' && !chamado.avaliacao && (
                      <button
                        onClick={() => {
                          setSelectedChamado(chamado);
                          setShowAvaliarModal(true);
                        }}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Avaliar"
                      >
                        <StarIcon className="w-5 h-5" />
                      </button>
                    )}
                    {/* Botão de Chat - sempre visível */}
                    <button
                      onClick={() => {
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
            {/* Header do Card */}
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
                <button
                  onClick={() => {
                    setSelectedChamado(chamado);
                    setShowDetalhesModal(true);
                  }}
                  className="text-blue-600"
                  title="Detalhes"
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                {chamado.status === 'aberto' && (
                  <>
                    <button
                      onClick={() => abrirEditarChamado(chamado)}
                      className="text-green-600"
                      title="Editar"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleCancelarChamado(chamado.id)}
                      className="text-red-600"
                      title="Cancelar"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                    <button
  onClick={() => {
    setChamadoSelecionadoChat(chamado);
    setShowChatModal(true);
  }}
  className="text-purple-600 relative"
  title="Chat"
>
  <ChatBubbleLeftIcon className="w-5 h-5" />
  {mensagensNaoLidas[chamado.id] > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
      {mensagensNaoLidas[chamado.id]}
    </span>
  )}
</button> 
                  </>
                )}
                {chamado.status === 'cancelado' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Reabrir este chamado?')) {
                        updateDoc(doc(db, 'chamados', chamado.id), {
                          status: 'aberto',
                          historico: [...(chamado.historico || []), { data: new Date(), acao: 'Chamado reaberto', usuario: userData.nome }]
                        }).then(() => toast.success('Chamado reaberto!'));
                      }
                    }}
                    className="text-orange-600"
                    title="Reabrir"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                  </button>
                )}
                {chamado.status === 'concluido' && !chamado.avaliacao && (
                  <button
                    onClick={() => {
                      setSelectedChamado(chamado);
                      setShowAvaliarModal(true);
                    }}
                    className="text-yellow-600"
                    title="Avaliar"
                  >
                    <StarIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Título e Equipamento */}
            <h3 className="font-semibold text-gray-800 text-base mb-1">{chamado.titulo}</h3>
            <p className="text-sm text-gray-600 mb-2">{chamado.equipamento}</p>
            
            {/* Unidade */}
            {chamado.unidade && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <MapPinIcon className="w-3 h-3" />
                {chamado.unidade}
              </div>
            )}

            {/* Data */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <CalendarIcon className="w-3 h-3" />
              {formatDate(chamado.dataCriacao)}
            </div>

            {/* Técnico */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <UserCircleIcon className="w-3 h-3" />
              {chamado.tecnicoNome || 'Aguardando técnico'}
            </div>

            {/* Atualizações */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <ChatBubbleLeftIcon className="w-3 h-3" />
              {chamado.historico?.length || 0} atualizações
            </div>

            {/* Motivo da Pausa */}
            {chamado.status === 'em_pausa' && chamado.motivoPausa && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                ⏸️ Motivo: {chamado.motivoPausa}
              </div>
            )}

            {/* Peças Necessárias */}
            {chamado.status === 'aguardando_pecas' && chamado.pecasNecessarias && (
              <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-700">
                🔧 Peças: {chamado.pecasNecessarias}
              </div>
            )}

            {/* Mídia */}
            {(chamado.fotos?.length > 0 || chamado.videos?.length > 0) && (
              <div className="mt-2 pt-2 border-t flex gap-3 text-xs">
                {chamado.fotos?.length > 0 && (
                  <span className="text-blue-500">📷 {chamado.fotos.length} foto(s)</span>
                )}
                {chamado.videos?.length > 0 && (
                  <span className="text-purple-500">🎥 {chamado.videos.length} vídeo(s)</span>
                )}
              </div>
            )}

            {/* Última atualização */}
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
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNovoChamadoModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Criar Chamado</button>
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

      {/* MODAL DETALHES */}
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
              {selectedChamado.motivoPausa && (<div><p className="text-xs text-gray-500 mb-1">Motivo da Pausa</p><div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-700">{selectedChamado.motivoPausa}</p></div></div>)}
              {selectedChamado.pecasNecessarias && (<div><p className="text-xs text-gray-500 mb-1">Peças Necessárias</p><div className="bg-orange-50 p-3 rounded-lg"><p className="text-orange-700">{selectedChamado.pecasNecessarias}</p>{selectedChamado.previsaoPecas && <p className="text-xs text-orange-600 mt-1">⏱️ Previsão: {selectedChamado.previsaoPecas}</p>}</div></div>)}
              {selectedChamado.solucao && (<div><p className="text-xs text-gray-500 mb-1">Solução</p><div className="bg-green-50 p-3 rounded-lg"><p className="text-gray-700">{selectedChamado.solucao}</p></div></div>)}
              {selectedChamado.avaliacao && (<div><p className="text-xs text-gray-500 mb-1">Avaliação</p><div className="bg-gray-50 p-3 rounded-lg"><div className="flex items-center gap-1 mb-1">{[...Array(5)].map((_, i) => (<StarIconSolid key={i} className={`w-4 h-4 ${i < selectedChamado.avaliacao.nota ? 'text-yellow-400' : 'text-gray-300'}`} />))}</div><p className="text-gray-600">{selectedChamado.avaliacao.comentario}</p></div></div>)}
              {selectedChamado.historico && selectedChamado.historico.length > 0 && (<div><p className="text-xs text-gray-500 mb-1">Histórico</p><div className="space-y-2 max-h-40 overflow-y-auto">{selectedChamado.historico.map((item, idx) => (<div key={idx} className="text-sm border-l-2 border-blue-300 pl-2 py-1"><p className="text-gray-700">{item.acao}</p><p className="text-xs text-gray-400">{formatDate(item.data?.toDate?.() || item.data)} - por {item.usuario}</p></div>))}</div></div>)}
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
              <div className="flex justify-center gap-2">{ [1,2,3,4,5].map(nota => (<button key={nota} onClick={() => setAvaliacao({...avaliacao, nota})}>{nota <= avaliacao.nota ? <StarIconSolid className="w-8 h-8 text-yellow-400" /> : <StarIcon className="w-8 h-8 text-gray-300" />}</button>)) }</div>
              <textarea rows="3" value={avaliacao.comentario} onChange={(e) => setAvaliacao({...avaliacao, comentario: e.target.value})} placeholder="Deixe seu comentário sobre o atendimento..." className="w-full px-3 py-2 border rounded-lg" />
              <div className="flex justify-end gap-3"><button onClick={() => setShowAvaliarModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button><button onClick={handleAvaliarChamado} className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Enviar Avaliação</button></div>
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
    onNovaMensagem={() => {
      // Atualizar contador de mensagens não lidas
    }}
  />
)}
    </div>
  );
}