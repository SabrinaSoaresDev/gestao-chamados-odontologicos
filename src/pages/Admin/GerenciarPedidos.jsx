import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  orderBy
} from 'firebase/firestore';
import { 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserIcon,
  ShoppingCartIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function GerenciarPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroUnidade, setFiltroUnidade] = useState('todas');
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [quantidadesEntregues, setQuantidadesEntregues] = useState({});
  const [editandoItens, setEditandoItens] = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Carregar pedidos
  useEffect(() => {
    const q = query(collection(db, 'pedidos'), orderBy('dataPedido', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pedidosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataPedido: doc.data().dataPedido?.toDate(),
        dataEntrega: doc.data().dataEntrega?.toDate()
      }));
      setPedidos(pedidosData);
      setFilteredPedidos(pedidosData);
      setLoading(false);
      
      const unidadesUnicas = [...new Set(pedidosData.map(p => p.unidade).filter(Boolean))];
      setUnidades(unidadesUnicas);
    });
    return () => unsubscribe();
  }, []);

  // Filtrar pedidos
  useEffect(() => {
    let filtered = pedidos;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.dentistaNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.unidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filtroStatus !== 'todos') {
      filtered = filtered.filter(p => p.status === filtroStatus);
    }
    if (filtroUnidade !== 'todas') {
      filtered = filtered.filter(p => p.unidade === filtroUnidade);
    }
    setFilteredPedidos(filtered);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  }, [searchTerm, filtroStatus, filtroUnidade, pedidos]);

  // Paginação - calcular índices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPedidos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);

  // Funções de paginação
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  // Atualizar status do pedido
  const handleAtualizarStatus = async (pedidoId, novoStatus) => {
    try {
      const pedido = pedidos.find(p => p.id === pedidoId);
      
      await updateDoc(doc(db, 'pedidos', pedidoId), {
        status: novoStatus,
        ...(novoStatus === 'entregue' && { dataEntrega: new Date() }),
        historico: [
          ...(pedido?.historico || []),
          { 
            data: new Date(), 
            acao: `Status alterado para ${novoStatus}`, 
            usuario: 'Admin',
            tipo: 'status'
          }
        ]
      });
      
      const mensagens = {
        aprovado: 'Pedido aprovado com sucesso!',
        entregue: 'Pedido marcado como entregue!',
        cancelado: 'Pedido cancelado!'
      };
      
      toast.success(mensagens[novoStatus] || 'Status atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Adicionar observação ao histórico
  const handleAdicionarObservacao = async (pedidoId, observacao) => {
    if (!observacao.trim()) {
      toast.error('Digite uma observação');
      return;
    }
    
    try {
      const pedido = pedidos.find(p => p.id === pedidoId);
      await updateDoc(doc(db, 'pedidos', pedidoId), {
        observacoesAdmin: observacao,
        historico: [
          ...(pedido?.historico || []),
          { 
            data: new Date(), 
            acao: `Observação: ${observacao}`,
            usuario: 'Admin',
            tipo: 'observacao'
          }
        ]
      });
      toast.success('Observação adicionada ao histórico!');
      setNovaObservacao('');
      if (selectedPedido && selectedPedido.id === pedidoId) {
        setSelectedPedido({ ...selectedPedido, observacoesAdmin: observacao });
      }
    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
      toast.error('Erro ao adicionar observação');
    }
  };

  // Atualizar quantidade entregue
  const handleAtualizarQuantidadeEntregue = async (pedidoId, itemIndex, quantidade) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    const novosItens = [...pedido.itens];
    const quantidadeAnterior = novosItens[itemIndex].quantidadeEntregue || 0;
    novosItens[itemIndex] = { ...novosItens[itemIndex], quantidadeEntregue: quantidade };
    
    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), {
        itens: novosItens,
        historico: [
          ...(pedido.historico || []),
          { 
            data: new Date(), 
            acao: `Quantidade do item "${novosItens[itemIndex].produtoNome}" alterada de ${quantidadeAnterior} para ${quantidade}`,
            usuario: 'Admin',
            tipo: 'quantidade'
          }
        ]
      });
      toast.success('Quantidade atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar quantidade');
    }
  };

  // Atualizar múltiplas quantidades
  const handleAtualizarMultiplasQuantidades = async () => {
    if (!selectedPedido) return;
    
    const pedido = selectedPedido;
    const novosItens = [...pedido.itens];
    let alterado = false;
    let alteracoes = [];
    
    novosItens.forEach((item, index) => {
      const novaQuantidade = quantidadesEntregues[index] || 0;
      if (novaQuantidade !== (item.quantidadeEntregue || 0)) {
        alteracoes.push(`${item.produtoNome}: ${item.quantidadeEntregue || 0} → ${novaQuantidade}`);
        novosItens[index] = { ...item, quantidadeEntregue: novaQuantidade };
        alterado = true;
      }
    });
    
    if (!alterado) {
      toast.info('Nenhuma alteração');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'pedidos', selectedPedido.id), {
        itens: novosItens,
        historico: [
          ...(pedido.historico || []),
          { 
            data: new Date(), 
            acao: `Quantidades atualizadas: ${alteracoes.join('; ')}`,
            usuario: 'Admin',
            tipo: 'quantidade'
          }
        ]
      });
      toast.success('Quantidades atualizadas!');
      setEditandoItens(false);
      setSelectedPedido({ ...selectedPedido, itens: novosItens });
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  // Excluir pedido
  const handleExcluirPedido = async (pedidoId) => {
    if (!window.confirm('⚠️ Tem certeza que deseja excluir este pedido?')) return;
    
    try {
      await deleteDoc(doc(db, 'pedidos', pedidoId));
      toast.success('Pedido excluído!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  // Reabrir pedido
  const handleReabrirPedido = async (pedidoId) => {
    if (!window.confirm('Deseja reabrir este pedido?')) return;
    
    try {
      const pedido = pedidos.find(p => p.id === pedidoId);
      await updateDoc(doc(db, 'pedidos', pedidoId), {
        status: 'pendente',
        historico: [
          ...(pedido?.historico || []),
          { 
            data: new Date(), 
            acao: 'Pedido reaberto pelo administrador',
            usuario: 'Admin',
            tipo: 'reabertura'
          }
        ]
      });
      toast.success('Pedido reaberto!');
    } catch (error) {
      toast.error('Erro ao reabrir');
    }
  };

  // Exportar CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Solicitante', 'Unidade', 'Tipo', 'Status', 'Itens', 'Data Pedido', 'Data Entrega'];
    const data = filteredPedidos.map(p => [
      p.id.slice(-6),
      p.dentistaNome,
      p.unidade,
      p.tipo === 'mensal' ? 'Mensal' : 'Avulso',
      p.status,
      p.itens.map(i => `${i.produtoNome}: ${i.quantidadeEntregue || 0}/${i.quantidade}`).join('; '),
      p.dataPedido ? new Date(p.dataPedido).toLocaleDateString('pt-BR') : '-',
      p.dataEntrega ? new Date(p.dataEntrega).toLocaleDateString('pt-BR') : '-'
    ]);
    
    const csv = [headers, ...data].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Exportado!');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'aprovado': return 'bg-blue-100 text-blue-800';
      case 'entregue': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pendente': return <ClockIcon className="w-4 h-4" />;
      case 'aprovado': return <CheckCircleIcon className="w-4 h-4" />;
      case 'entregue': return <TruckIcon className="w-4 h-4" />;
      case 'cancelado': return <XCircleIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pendente': return 'Pendente';
      case 'aprovado': return 'Aprovado';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getHistoricoIcon = (tipo) => {
    switch(tipo) {
      case 'status': return <ArrowPathIcon className="w-4 h-4 text-blue-500" />;
      case 'quantidade': return <PencilIcon className="w-4 h-4 text-green-500" />;
      case 'observacao': return <ChatBubbleLeftIcon className="w-4 h-4 text-purple-500" />;
      case 'reabertura': return <ArrowPathIcon className="w-4 h-4 text-orange-500" />;
      default: return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const stats = {
    total: pedidos.length,
    pendentes: pedidos.filter(p => p.status === 'pendente').length,
    aprovados: pedidos.filter(p => p.status === 'aprovado').length,
    entregues: pedidos.filter(p => p.status === 'entregue').length,
    cancelados: pedidos.filter(p => p.status === 'cancelado').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Pedidos de Materiais</h1>
          <p className="text-sm text-gray-600">Gerencie os pedidos dos dentistas</p>
        </div>
        <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm sm:text-base w-full sm:w-auto justify-center">
          <DocumentArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          Exportar
        </button>
      </div>

      {/* Cards - Responsivo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
        <div className="bg-white rounded-lg p-3 sm:p-4 border">
          <p className="text-xs sm:text-sm text-gray-500">Total</p>
          <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 border border-yellow-200">
          <p className="text-xs sm:text-sm text-yellow-600">Pendentes</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-700">{stats.pendentes}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
          <p className="text-xs sm:text-sm text-blue-600">Aprovados</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-700">{stats.aprovados}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
          <p className="text-xs sm:text-sm text-green-600">Entregues</p>
          <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.entregues}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
          <p className="text-xs sm:text-sm text-red-600">Cancelados</p>
          <p className="text-xl sm:text-2xl font-bold text-red-700">{stats.cancelados}</p>
        </div>
      </div>

      {/* Filtros - Versão Responsiva */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por dentista, unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 py-2 border rounded-lg text-sm sm:text-base"
          />
        </div>

        <button
          onClick={() => setFiltrosAbertos(!filtrosAbertos)}
          className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg sm:hidden"
        >
          <span className="text-sm font-medium text-gray-600">Filtros</span>
          <svg className={`w-5 h-5 transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className={`${filtrosAbertos ? 'block' : 'hidden'} sm:flex sm:flex-row gap-3 mt-3 sm:mt-0`}>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm sm:text-base mb-2 sm:mb-0"
          >
            <option value="todos">📋 Todos os status</option>
            <option value="pendente">🟡 Pendentes</option>
            <option value="aprovado">🔵 Aprovados</option>
            <option value="entregue">🟢 Entregues</option>
            <option value="cancelado">🔴 Cancelados</option>
          </select>

          <select
            value={filtroUnidade}
            onChange={(e) => setFiltroUnidade(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm sm:text-base"
          >
            <option value="todas">🏢 Todas unidades</option>
            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* TABELA - Desktop com Paginação */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Solicitante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Unidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Itens</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Data Pedido</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Data Entrega</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">#{pedido.id?.slice(-6)}</td>
                  <td className="px-4 py-3 text-sm">{pedido.dentistaNome || '-'}</td>
                  <td className="px-4 py-3 text-sm">{pedido.unidade || '-'}</td>
                  <td className="px-4 py-3 text-sm">{pedido.tipo === 'mensal' ? '📅 Mensal' : '📦 Avulso'}</td>
                  <td className="px-4 py-3 text-sm">{pedido.itens?.length || 0} produtos</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(pedido.status)}`}>
                      {getStatusIcon(pedido.status)}
                      {getStatusText(pedido.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(pedido.dataPedido)}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(pedido.dataEntrega)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPedido(pedido);
                          setQuantidadesEntregues(pedido.itens?.reduce((acc, i, idx) => ({ ...acc, [idx]: i.quantidadeEntregue || 0 }), {}) || {});
                          setShowDetalhesModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Visualizar"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      {pedido.status === 'pendente' && (
                        <>
                          <button onClick={() => handleAtualizarStatus(pedido.id, 'aprovado')} className="text-green-600 hover:text-green-800" title="Aprovar">
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleAtualizarStatus(pedido.id, 'cancelado')} className="text-red-600 hover:text-red-800" title="Cancelar">
                            <XCircleIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {pedido.status === 'aprovado' && (
                        <button onClick={() => handleAtualizarStatus(pedido.id, 'entregue')} className="text-blue-600 hover:text-blue-800" title="Marcar entregue">
                          <TruckIcon className="w-5 h-5" />
                        </button>
                      )}
                      {pedido.status === 'cancelado' && (
                        <button onClick={() => handleReabrirPedido(pedido.id)} className="text-orange-600 hover:text-orange-800" title="Reabrir">
                          <ArrowPathIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button onClick={() => handleExcluirPedido(pedido.id)} className="text-red-600 hover:text-red-800" title="Excluir">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPedidos.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS - Mobile com Paginação */}
      <div className="md:hidden space-y-4">
        {currentItems.map((pedido) => (
          <div key={pedido.id} className="bg-white rounded-lg shadow-sm border p-4">
            {/* Header do Card */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    #{pedido.id?.slice(-6)}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getStatusColor(pedido.status)}`}>
                    {getStatusIcon(pedido.status)}
                    {getStatusText(pedido.status)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {pedido.tipo === 'mensal' ? '📅 Mensal' : '📦 Avulso'}
                  </span>
                </div>
                <p className="font-medium text-gray-800">{pedido.dentistaNome}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedPedido(pedido);
                    setQuantidadesEntregues(pedido.itens?.reduce((acc, i, idx) => ({ ...acc, [idx]: i.quantidadeEntregue || 0 }), {}) || {});
                    setShowDetalhesModal(true);
                  }}
                  className="text-blue-600"
                  title="Detalhes"
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                {pedido.status === 'pendente' && (
                  <>
                    <button onClick={() => handleAtualizarStatus(pedido.id, 'aprovado')} className="text-green-600" title="Aprovar">
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleAtualizarStatus(pedido.id, 'cancelado')} className="text-red-600" title="Cancelar">
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </>
                )}
                {pedido.status === 'aprovado' && (
                  <button onClick={() => handleAtualizarStatus(pedido.id, 'entregue')} className="text-blue-600" title="Marcar entregue">
                    <TruckIcon className="w-5 h-5" />
                  </button>
                )}
                {pedido.status === 'cancelado' && (
                  <button onClick={() => handleReabrirPedido(pedido.id)} className="text-orange-600" title="Reabrir">
                    <ArrowPathIcon className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => handleExcluirPedido(pedido.id)} className="text-red-600" title="Excluir">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Informações do Card */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BuildingOfficeIcon className="w-4 h-4" />
                {pedido.unidade}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserIcon className="w-4 h-4" />
                {pedido.dentistaNome}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ShoppingCartIcon className="w-4 h-4" />
                {pedido.itens?.length || 0} produtos - Total: {pedido.itens?.reduce((acc, i) => acc + i.quantidade, 0)} unidades
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon className="w-4 h-4" />
                {formatDate(pedido.dataPedido)}
              </div>
              {pedido.dataEntrega && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <TruckIcon className="w-4 h-4" />
                  Entregue em: {formatDate(pedido.dataEntrega)}
                </div>
              )}
            </div>

            {/* Lista rápida de produtos */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500 mb-2">Produtos:</p>
              <div className="space-y-1">
                {pedido.itens?.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="text-xs flex justify-between">
                    <span className="text-gray-600">{item.produtoNome}</span>
                    <span className="font-medium">{item.quantidade} unid. (entregue: {item.quantidadeEntregue || 0})</span>
                  </div>
                ))}
                {pedido.itens?.length > 2 && (
                  <p className="text-xs text-gray-400">+ {pedido.itens.length - 2} outro(s)</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredPedidos.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <ShoppingCartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum pedido encontrado</p>
          </div>
        )}
      </div>

      {/* Paginação - Desktop e Mobile */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg border transition ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex gap-1">
            {/* Páginas - Desktop */}
            <div className="hidden sm:flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-10 h-10 rounded-lg border transition ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            {/* Páginas - Mobile (simplificado) */}
            <div className="sm:hidden">
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
            </div>
          </div>
          
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg border transition ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Informação de paginação */}
      {filteredPedidos.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredPedidos.length)} de {filteredPedidos.length} pedidos
        </div>
      )}

      {/* Modal de Detalhes (mantido igual) */}
      {showDetalhesModal && selectedPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={() => setShowDetalhesModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-3 sm:p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Detalhes do Pedido</h2>
                <p className="text-xs sm:text-sm text-gray-500">#{selectedPedido.id}</p>
              </div>
              <button onClick={() => setShowDetalhesModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Informações do Pedido */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Solicitante</p>
                  <p className="text-xs sm:text-sm font-medium">{selectedPedido.dentistaNome}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Unidade</p>
                  <p className="text-xs sm:text-sm">{selectedPedido.unidade}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tipo</p>
                  <p className="text-xs sm:text-sm">{selectedPedido.tipo === 'mensal' ? 'Pedido Mensal' : 'Pedido Avulso'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPedido.status)}`}>
                    {selectedPedido.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Data do Pedido</p>
                  <p className="text-xs sm:text-sm">{formatDateTime(selectedPedido.dataPedido)}</p>
                </div>
                {selectedPedido.dataEntrega && (
                  <div>
                    <p className="text-xs text-gray-500">Data de Entrega</p>
                    <p className="text-xs sm:text-sm text-green-600">{formatDateTime(selectedPedido.dataEntrega)}</p>
                  </div>
                )}
              </div>

              {/* Itens do Pedido */}
              <div>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <h3 className="font-semibold text-gray-800">Itens do Pedido</h3>
                  {selectedPedido.status === 'aprovado' && !editandoItens && (
                    <button onClick={() => setEditandoItens(true)} className="text-xs sm:text-sm text-blue-600 hover:text-blue-800">
                      <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Editar quantidades
                    </button>
                  )}
                  {editandoItens && (
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setEditandoItens(false);
                        setQuantidadesEntregues(selectedPedido.itens?.reduce((acc, i, idx) => ({ ...acc, [idx]: i.quantidadeEntregue || 0 }), {}) || {});
                      }} className="text-xs sm:text-sm text-gray-600 hover:text-gray-800">
                        Cancelar
                      </button>
                      <button onClick={handleAtualizarMultiplasQuantidades} className="text-xs sm:text-sm text-green-600 hover:text-green-800">
                        <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Salvar
                      </button>
                    </div>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-xs sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-3 py-2 text-left">Produto</th>
                          <th className="px-2 sm:px-3 py-2 text-center">Marca</th>
                          <th className="px-2 sm:px-3 py-2 text-center">Solicitado</th>
                          <th className="px-2 sm:px-3 py-2 text-center">Entregue</th>
                          <th className="px-2 sm:px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPedido.itens.map((item, index) => {
                          const entregue = editandoItens ? (quantidadesEntregues[index] || 0) : (item.quantidadeEntregue || 0);
                          return (
                            <tr key={index} className="border-t">
                              <td className="px-2 sm:px-3 py-2 font-medium">{item.produtoNome}</td>
                              <td className="px-2 sm:px-3 py-2 text-center text-gray-500">{item.marca || '-'}</td>
                              <td className="px-2 sm:px-3 py-2 text-center">{item.quantidade}</td>
                              <td className="px-2 sm:px-3 py-2 text-center">
                                {editandoItens ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.quantidade}
                                    value={quantidadesEntregues[index] || 0}
                                    onChange={(e) => setQuantidadesEntregues({ ...quantidadesEntregues, [index]: Number(e.target.value) })}
                                    className="w-16 sm:w-20 px-1 sm:px-2 py-1 border rounded text-center text-xs sm:text-sm"
                                  />
                                ) : (
                                  <span className={entregue === item.quantidade ? 'text-green-600 font-medium' : entregue > 0 ? 'text-orange-600' : 'text-gray-600'}>
                                    {entregue}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-center">
                                {entregue === 0 && <span className="text-xs text-gray-500">⏳ Pendente</span>}
                                {entregue > 0 && entregue < item.quantidade && <span className="text-xs text-orange-600">⚠️ Parcial</span>}
                                {entregue === item.quantidade && <span className="text-xs text-green-600">✅ Completo</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Observações do Solicitante */}
              {selectedPedido.observacoes && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">📝 Observações do Solicitante</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">{selectedPedido.observacoes}</p>
                  </div>
                </div>
              )}

              {/* Adicionar Observação */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">➕ Adicionar Observação</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={novaObservacao}
                    onChange={(e) => setNovaObservacao(e.target.value)}
                    placeholder="Digite uma observação sobre este pedido..."
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleAdicionarObservacao(selectedPedido.id, novaObservacao)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Histórico Detalhado */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">📋 Histórico do Pedido</h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 max-h-80 overflow-y-auto">
                  {selectedPedido.historico && selectedPedido.historico.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {selectedPedido.historico.map((item, index) => (
                        <div key={index} className="bg-white p-2 sm:p-3 rounded-lg shadow-sm border-l-4 border-blue-500">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getHistoricoIcon(item.tipo)}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-800">{item.acao}</p>
                                <p className="text-xs text-gray-400">
                                  {formatDateTime(item.data?.toDate ? item.data.toDate() : item.data)}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-gray-500">por</span>
                                <span className="font-medium text-gray-700">{item.usuario || 'Sistema'}</span>
                                {item.tipo && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    item.tipo === 'status' ? 'bg-blue-100 text-blue-700' :
                                    item.tipo === 'quantidade' ? 'bg-green-100 text-green-700' :
                                    item.tipo === 'observacao' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {item.tipo === 'status' ? 'Status' :
                                     item.tipo === 'quantidade' ? 'Quantidade' :
                                     item.tipo === 'observacao' ? 'Observação' : 'Atualização'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ClockIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Nenhuma atualização no histórico</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap justify-end gap-2 sm:gap-3 pt-4 border-t">
                {selectedPedido.status === 'pendente' && (
                  <>
                    <button
                      onClick={() => {
                        handleAtualizarStatus(selectedPedido.id, 'aprovado');
                        setShowDetalhesModal(false);
                      }}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Aprovar Pedido
                    </button>
                    <button
                      onClick={() => {
                        handleAtualizarStatus(selectedPedido.id, 'cancelado');
                        setShowDetalhesModal(false);
                      }}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Cancelar Pedido
                    </button>
                  </>
                )}
                {selectedPedido.status === 'aprovado' && !editandoItens && (
                  <button
                    onClick={() => {
                      handleAtualizarStatus(selectedPedido.id, 'entregue');
                      setShowDetalhesModal(false);
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Marcar como Entregue
                  </button>
                )}
                <button onClick={() => setShowDetalhesModal(false)} className="px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg hover:bg-gray-50 text-sm">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}