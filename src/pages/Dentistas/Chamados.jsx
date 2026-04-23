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
  StarIcon,
  MapPinIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

export default function DentistaChamados() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showNovoChamadoModal, setShowNovoChamadoModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showAvaliarModal, setShowAvaliarModal] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [unidadeUsuario, setUnidadeUsuario] = useState('');
  
  const [formData, setFormData] = useState({
    titulo: '',
    equipamento: '',
    unidade: '', // ← Será preenchido automaticamente
    descricao: '',
    prioridade: 'media',
    fotos: [],
    videos: []
  });
  
  const [fotos, setFotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [avaliacao, setAvaliacao] = useState({
    nota: 5,
    comentario: ''
  });

  // Buscar a unidade do usuário no Firestore
  useEffect(() => {
    const buscarUnidadeUsuario = async () => {
      if (userData?.uid) {
        try {
          const userRef = doc(db, 'usuarios', userData.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const unidade = userDoc.data().unidade || '';
            setUnidadeUsuario(unidade);
            // Preencher automaticamente a unidade no formData
            setFormData(prev => ({ ...prev, unidade: unidade }));
          }
        } catch (error) {
          console.error('Erro ao buscar unidade do usuário:', error);
        }
      }
    };
    
    buscarUnidadeUsuario();
  }, [userData]);

  useEffect(() => {
    if (!userData) return;

    // Carregar chamados do dentista
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

  const handleSubmitNovoChamado = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Upload das fotos
      const fotosUrls = [];
      for (const foto of fotos) {
        const storageRef = ref(storage, `chamados/${userData.uid}/${Date.now()}_${foto.name}`);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        fotosUrls.push(url);
      }

      // Criar chamado com a unidade
      await addDoc(collection(db, 'chamados'), {
        ...formData,
        unidade: unidadeUsuario, // ← Usando a unidade do usuário
        solicitanteId: userData.uid,
        solicitanteNome: userData.nome,
        status: 'aberto',
        fotos: fotosUrls,
        dataCriacao: new Date(),
        historico: [{
          data: new Date(),
          acao: 'Chamado criado',
          usuario: userData.nome,
          tipo: 'criacao'
        }]
      });

      toast.success('Chamado criado com sucesso!');
      setShowNovoChamadoModal(false);
      setFormData({ 
        titulo: '', 
        equipamento: '', 
        unidade: unidadeUsuario, 
        descricao: '', 
        prioridade: 'media' 
      });
      setFotos([]);
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      toast.error('Erro ao criar chamado. Tente novamente.');
    } finally {
      setUploading(false);
    }
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

  const filteredChamados = chamados.filter(chamado => {
    const matchesSearch = 
      chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filtroStatus === 'todos' || chamado.status === filtroStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Estatísticas
  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    andamento: chamados.filter(c => c.status === 'em_andamento').length,
    concluidos: chamados.filter(c => c.status === 'concluido').length,
    cancelados: chamados.filter(c => c.status === 'cancelado').length
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concluido': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelado': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Chamados</h1>
          <p className="text-gray-600">Acompanhe e gerencie suas solicitações de manutenção</p>
          {unidadeUsuario && (
            <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-flex">
              <MapPinIcon className="w-4 h-4" />
              Unidade: {unidadeUsuario}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowNovoChamadoModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
        >
          <PlusIcon className="w-5 h-5" />
          Novo Chamado
        </button>
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
              placeholder="Buscar por título, equipamento..."
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
            <option value="cancelado">Cancelados</option>
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
            <p className="text-gray-500 mb-6">Você ainda não possui chamados ou nenhum resultado corresponde à sua busca.</p>
            <button
              onClick={() => setShowNovoChamadoModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Criar Primeiro Chamado
            </button>
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
                    {chamado.unidade && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <MapPinIcon className="w-3 h-3" />
                        {chamado.unidade}
                      </div>
                    )}
                  </div>
                  
                  {/* Avaliação (se concluído) */}
                  {chamado.status === 'concluido' && !chamado.avaliacao && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChamado(chamado);
                        setShowAvaliarModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm"
                    >
                      <StarIcon className="w-4 h-4" />
                      Avaliar
                    </button>
                  )}
                  {chamado.avaliacao && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                      <StarIconSolid className="w-4 h-4" />
                      <span className="text-sm font-medium">{chamado.avaliacao.nota}</span>
                    </div>
                  )}
                </div>

                {/* Informações */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                    {formatDate(chamado.dataCriacao)}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <UserCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                    {chamado.tecnicoNome || 'Aguardando técnico'}
                  </div>

                  <div className="flex items-center text-gray-600">
                    <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mr-2" />
                    {chamado.historico?.length || 0} atualizações
                  </div>
                </div>

                {/* Última atualização */}
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

      {/* Modal Novo Chamado */}
      {showNovoChamadoModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">Novo Chamado</h2>
              <button
                onClick={() => setShowNovoChamadoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitNovoChamado} className="p-6 space-y-4">
              {/* Unidade (somente leitura) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidade *
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={unidadeUsuario || 'Carregando...'}
                    disabled
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Unidade vinculada ao seu cadastro
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Chamado *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Cadeira odontológica com problema"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipamento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.equipamento}
                  onChange={(e) => setFormData({...formData, equipamento: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Cadeira OD-3000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Problema *
                </label>
                <textarea
                  required
                  rows="4"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva detalhadamente o problema..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade
                </label>
                <select
                  value={formData.prioridade}
                  onChange={(e) => setFormData({...formData, prioridade: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baixa">Baixa - Pode aguardar</option>
                  <option value="media">Média - Normal</option>
                  <option value="alta">Alta - Afeta o atendimento</option>
                  <option value="emergencial">Emergencial - Impossibilita atendimento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fotos (opcional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setFotos([...e.target.files])}
                    className="hidden"
                    id="fotos-upload"
                  />
                  <label
                    htmlFor="fotos-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <PhotoIcon className="w-12 h-12 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-2">
                      Clique para adicionar fotos
                    </span>
                    <span className="text-xs text-gray-400">
                      PNG, JPG até 10MB cada
                    </span>
                  </label>
                </div>
                {fotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from(fotos).map((foto, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(foto)}
                          alt={`Preview ${index}`}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newFotos = Array.from(fotos);
                            newFotos.splice(index, 1);
                            setFotos(newFotos);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNovoChamadoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Criar Chamado'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Chamado */}
      {showDetalhesModal && selectedChamado && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${getStatusColor(selectedChamado.status)}`}>
                    {getStatusIcon(selectedChamado.status)}
                    {getStatusText(selectedChamado.status)}
                  </span>
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
                    <p><span className="text-gray-500">Data:</span> {formatDate(selectedChamado.dataCriacao)}</p>
                  </div>
                </div>

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
              </div>

              {/* Descrição */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Descrição do Problema</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedChamado.descricao}</p>
                </div>
              </div>

              {/* Mídia Anexada (Fotos) */}
              {selectedChamado.fotos?.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Fotos Anexadas</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedChamado.fotos.map((foto, index) => {
                      const isBase64 = typeof foto === 'string' && foto.startsWith('data:image');
                      const imageSrc = isBase64 ? foto : foto;
                      
                      return (
                        <div key={index} className="relative group">
                          <img
                            src={imageSrc}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg cursor-pointer"
                            onClick={() => {
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100]';
                              modal.onclick = () => modal.remove();
                              
                              const img = document.createElement('img');
                              img.src = imageSrc;
                              img.className = 'max-w-full max-h-full object-contain';
                              
                              modal.appendChild(img);
                              document.body.appendChild(modal);
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

              {/* Serviço Realizado (se concluído) */}
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

              {/* Avaliação */}
              {selectedChamado.avaliacao && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Sua Avaliação</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((nota) => (
                        <StarIconSolid
                          key={nota}
                          className={`w-5 h-5 ${
                            nota <= selectedChamado.avaliacao.nota
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {selectedChamado.avaliacao.comentario && (
                      <p className="text-gray-600">{selectedChamado.avaliacao.comentario}</p>
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
                              {item.tipo === 'criacao' && <PlusIcon className="w-4 h-4 text-green-500" />}
                              {item.tipo === 'status' && <ArrowPathIcon className="w-4 h-4 text-blue-500" />}
                              {item.tipo === 'atribuicao' && <UserCircleIcon className="w-4 h-4 text-purple-500" />}
                              {item.tipo === 'comentario' && <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />}
                              {item.tipo === 'cancelamento' && <XMarkIcon className="w-4 h-4 text-red-500" />}
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

              {/* Botões de Ação */}
              {selectedChamado.status === 'aberto' && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleCancelarChamado(selectedChamado.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Cancelar Chamado
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avaliação */}
      {showAvaliarModal && selectedChamado && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Avaliar Atendimento</h2>
              <button
                onClick={() => setShowAvaliarModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Como você avalia o atendimento do chamado "{selectedChamado.titulo}"?
              </p>

              {/* Estrelas */}
              <div className="flex justify-center gap-2 py-4">
                {[1, 2, 3, 4, 5].map((nota) => (
                  <button
                    key={nota}
                    type="button"
                    onClick={() => setAvaliacao({...avaliacao, nota})}
                    className="focus:outline-none"
                  >
                    {nota <= avaliacao.nota ? (
                      <StarIconSolid className="w-8 h-8 text-yellow-400 hover:text-yellow-500 transition" />
                    ) : (
                      <StarIcon className="w-8 h-8 text-gray-300 hover:text-yellow-400 transition" />
                    )}
                  </button>
                ))}
              </div>

              {/* Comentário */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentário (opcional)
                </label>
                <textarea
                  rows="3"
                  value={avaliacao.comentario}
                  onChange={(e) => setAvaliacao({...avaliacao, comentario: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Conte-nos mais sobre sua experiência..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAvaliarModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAvaliarChamado}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Enviar Avaliação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}