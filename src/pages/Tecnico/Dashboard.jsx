import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  WrenchScrewdriverIcon,
  PhotoIcon,
  ChatBubbleLeftIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserCircleIcon,
  CalendarIcon,
  StarIcon,
  XMarkIcon,
  PhoneIcon,
  MapPinIcon,
  ChevronDownIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function TecnicoDashboard() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [filteredChamados, setFilteredChamados] = useState([]);
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [atualizacao, setAtualizacao] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [finalizacao, setFinalizacao] = useState({
    descricao: '',
    pecasTrocadas: '',
    tempoGasto: '',
    observacoes: ''
  });

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
      setFilteredChamados(chamadosData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar chamados:', error);
      toast.error('Erro ao carregar chamados');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  // Filtrar chamados
  useEffect(() => {
    let filtered = chamados;
    
    if (searchTerm) {
      filtered = filtered.filter(chamado =>
        chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.solicitanteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filtroStatus !== 'todos') {
      filtered = filtered.filter(chamado => chamado.status === filtroStatus);
    }
    
    if (filtroPrioridade !== 'todos') {
      filtered = filtered.filter(chamado => chamado.prioridade === filtroPrioridade);
    }
    
    setFilteredChamados(filtered);
  }, [searchTerm, filtroStatus, filtroPrioridade, chamados]);

  const handleStatusChange = async (chamadoId, newStatus) => {
    try {
      const chamadoRef = doc(db, 'chamados', chamadoId);
      await updateDoc(chamadoRef, {
        status: newStatus,
        ...(newStatus === 'em_andamento' && { dataInicio: new Date() }),
        historico: arrayUnion({
          data: new Date(),
          acao: `Status alterado para ${newStatus}`,
          usuario: userData.nome,
          tipo: 'status'
        })
      });
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
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
      await updateDoc(chamadoRef, {
        historico: arrayUnion({
          data: new Date(),
          acao: atualizacao,
          usuario: userData.nome,
          tipo: 'comentario'
        })
      });
      setAtualizacao('');
      toast.success('Atualização adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar atualização');
    }
  };

  const handleFinalizarChamado = async () => {
    if (!selectedChamado) return;
    
    if (!finalizacao.descricao.trim()) {
      toast.error('Descreva o serviço realizado');
      return;
    }

    try {
      const chamadoRef = doc(db, 'chamados', selectedChamado.id);
      
      await updateDoc(chamadoRef, {
        status: 'concluido',
        dataConclusao: new Date(),
        servicoRealizado: {
          descricao: finalizacao.descricao,
          pecasTrocadas: finalizacao.pecasTrocadas,
          tempoGasto: finalizacao.tempoGasto,
          observacoes: finalizacao.observacoes,
          finalizadoPor: userData.nome,
          data: new Date()
        },
        historico: arrayUnion({
          data: new Date(),
          acao: `Chamado finalizado: ${finalizacao.descricao}`,
          usuario: userData.nome,
          tipo: 'conclusao'
        })
      });

      toast.success('Chamado finalizado com sucesso!');
      setShowFinalizarModal(false);
      setFinalizacao({
        descricao: '',
        pecasTrocadas: '',
        tempoGasto: '',
        observacoes: ''
      });
    } catch (error) {
      toast.error('Erro ao finalizar chamado');
    }
  };

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
      case 'aberto': return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'em_andamento': return <ArrowPathIcon className="w-5 h-5 text-blue-500" />;
      case 'concluido': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard do Técnico</h1>
          <p className="text-gray-600">Olá, {userData?.nome}! Aqui estão seus chamados</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-blue-700 font-medium">
            {stats.abertos + stats.andamento} chamados pendentes
          </span>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-4 border border-yellow-100">
          <p className="text-sm text-yellow-600">Abertos</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.abertos}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm p-4 border border-blue-100">
          <p className="text-sm text-blue-600">Em Andamento</p>
          <p className="text-2xl font-bold text-blue-700">{stats.andamento}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4 border border-green-100">
          <p className="text-sm text-green-600">Concluídos</p>
          <p className="text-2xl font-bold text-green-700">{stats.concluidos}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-4 border border-red-100">
          <p className="text-sm text-red-600">Urgentes</p>
          <p className="text-2xl font-bold text-red-700">{stats.urgentes}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar chamados..."
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

      {/* Grid de Chamados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChamados.map((chamado) => (
          <div
            key={chamado.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer"
            onClick={() => {
              setSelectedChamado(chamado);
              setShowDetailsModal(true);
            }}
          >
            <div className="p-4">
              {/* Header do Card */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(chamado.status)}
                  <span className="text-xs text-gray-500">#{chamado.id.slice(-6)}</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                  {chamado.prioridade}
                </span>
              </div>

              {/* Título e Equipamento */}
              <h3 className="font-semibold text-gray-800 mb-1">{chamado.titulo}</h3>
              <p className="text-sm text-gray-600 mb-3">{chamado.equipamento}</p>

              {/* Informações do Solicitante */}
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <UserCircleIcon className="w-4 h-4 mr-1" />
                {chamado.solicitanteNome}
              </div>

              {/* Data */}
              <div className="flex items-center text-sm text-gray-500 mb-3">
                <CalendarIcon className="w-4 h-4 mr-1" />
                {formatDate(chamado.dataCriacao)}
              </div>

              {/* Status e Botões */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(chamado.status)}`}>
                  {getStatusText(chamado.status)}
                </span>
                
                {chamado.status === 'aberto' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(chamado.id, 'em_andamento');
                    }}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                  >
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
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                  >
                    Finalizar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredChamados.length === 0 && (
          <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center border border-gray-100">
            <WrenchScrewdriverIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum chamado encontrado</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Nenhum resultado para sua busca' : 'Você não possui chamados atribuídos'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedChamado && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
              {/* Status e Ações */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-2">Status</p>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(selectedChamado.status)}`}>
                      {getStatusIcon(selectedChamado.status)}
                      {getStatusText(selectedChamado.status)}
                    </span>
                    
                    {selectedChamado.status === 'aberto' && (
                      <button
                        onClick={() => {
                          handleStatusChange(selectedChamado.id, 'em_andamento');
                          setSelectedChamado({...selectedChamado, status: 'em_andamento'});
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Iniciar Atendimento
                      </button>
                    )}
                    
                    {selectedChamado.status === 'em_andamento' && (
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          setShowFinalizarModal(true);
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Finalizar Chamado
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Prioridade</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getPrioridadeColor(selectedChamado.prioridade)}`}>
                    {selectedChamado.prioridade === 'emergencial' && <ExclamationTriangleIcon className="w-4 h-4" />}
                    {selectedChamado.prioridade}
                  </span>
                </div>
              </div>

              {/* Informações do Chamado */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3">Informações Gerais</h3>
                  <div className="space-y-2">
                    <p><span className="text-gray-500">Título:</span> {selectedChamado.titulo}</p>
                    <p><span className="text-gray-500">Equipamento:</span> {selectedChamado.equipamento}</p>
                    <p><span className="text-gray-500">Abertura:</span> {formatDate(selectedChamado.dataCriacao)}</p>
                    {selectedChamado.dataInicio && (
                      <p><span className="text-gray-500">Início:</span> {formatDate(selectedChamado.dataInicio)}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3">Solicitante</h3>
                  <div className="flex items-start gap-3">
                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                    <div>
                      <p className="font-medium">{selectedChamado.solicitanteNome}</p>
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

              {/* Fotos do Problema */}
              {selectedChamado.fotos && selectedChamado.fotos.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Fotos do Problema</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedChamado.fotos.map((foto, index) => (
                      <img
                        key={index}
                        src={foto}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75"
                        onClick={() => window.open(foto, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Serviço Realizado (se concluído) */}
              {selectedChamado.servicoRealizado && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Serviço Realizado</h3>
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
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
                  </div>
                </div>
              )}

              {/* Avaliação (se houver) */}
              {selectedChamado.avaliacao && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Avaliação do Cliente</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((nota) => (
                          <span key={nota}>
                            {nota <= selectedChamado.avaliacao.nota ? (
                              <StarIconSolid className="w-5 h-5 text-yellow-400" />
                            ) : (
                              <StarIcon className="w-5 h-5 text-gray-300" />
                            )}
                          </span>
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
                              {item.tipo === 'criacao' && <DocumentTextIcon className="w-4 h-4 text-green-500" />}
                              {item.tipo === 'status' && <ArrowPathIcon className="w-4 h-4 text-blue-500" />}
                              {item.tipo === 'comentario' && <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500" />}
                              {item.tipo === 'conclusao' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
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

              {/* Adicionar Atualização */}
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
        <div className="fixed inset-0  modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
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
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Registre as informações do serviço realizado para: <strong>{selectedChamado.titulo}</strong>
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
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalizarChamado}
                  disabled={!finalizacao.descricao.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Finalizar Chamado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}