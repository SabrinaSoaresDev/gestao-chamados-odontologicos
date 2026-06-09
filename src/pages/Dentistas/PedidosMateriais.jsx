import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  ShoppingCartIcon,
  CalendarIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function PedidosMateriais() {
  const { userData } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [unidadeDentista, setUnidadeDentista] = useState('');
  const [formData, setFormData] = useState({
    tipo: 'avulso',
    unidade: '',
    itens: [],
    observacoes: ''
  });
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [quantidadeProduto, setQuantidadeProduto] = useState(1);

  // Data limite para pedidos mensais
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const podeFazerPedidoMensal = diaAtual >= 20 && diaAtual <= 30;

  // Buscar a unidade do dentista
  useEffect(() => {
    const fetchUnidadeDentista = async () => {
      if (!userData?.uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', userData.uid));
        if (userDoc.exists()) {
          const unidade = userDoc.data().unidade || '';
          setUnidadeDentista(unidade);
          setFormData(prev => ({ ...prev, unidade: unidade }));
        }
      } catch (error) {
        console.error('Erro ao buscar unidade:', error);
      }
    };
    fetchUnidadeDentista();
  }, [userData]);

  // Buscar pedidos
  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    const pedidosQuery = query(
      collection(db, 'pedidos'),
      where('dentistaId', '==', userData.uid),
      orderBy('dataPedido', 'desc')
    );

    const unsubscribePedidos = onSnapshot(pedidosQuery, (snapshot) => {
      const pedidosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataPedido: doc.data().dataPedido?.toDate(),
        dataEntrega: doc.data().dataEntrega?.toDate()
      }));
      setPedidos(pedidosData);
      setLoading(false);
    }, (error) => {
      console.error('Erro na query:', error);
      setLoading(false);
    });

    const produtosQuery = query(collection(db, 'produtos'), orderBy('nome', 'asc'));
    const unsubscribeProdutos = onSnapshot(produtosQuery, (snapshot) => {
      const produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProdutos(produtosData);
    });

    return () => {
      unsubscribePedidos();
      unsubscribeProdutos();
    };
  }, [userData]);

  const adicionarItem = () => {
    if (!selectedProduto) {
      toast.error('Selecione um produto');
      return;
    }
    if (quantidadeProduto < 1) {
      toast.error('Quantidade inválida');
      return;
    }

    const itemExistente = formData.itens.find(i => i.produtoId === selectedProduto.id);
    
    if (itemExistente) {
      setFormData({
        ...formData,
        itens: formData.itens.map(i =>
          i.produtoId === selectedProduto.id
            ? { ...i, quantidade: i.quantidade + quantidadeProduto }
            : i
        )
      });
      toast.success(`${quantidadeProduto} unidade(s) adicionada(s) a ${selectedProduto.nome}`);
    } else {
      const novoItem = {
        produtoId: selectedProduto.id,
        produtoNome: selectedProduto.nome,
        marca: selectedProduto.marca || '',
        quantidade: quantidadeProduto,
        quantidadeEntregue: 0
      };
      setFormData({
        ...formData,
        itens: [...formData.itens, novoItem]
      });
      toast.success(`${selectedProduto.nome} adicionado!`);
    }
    setQuantidadeProduto(1);
    setSelectedProduto(null);
    // Resetar o select
    const selectElement = document.getElementById('produto-select');
    if (selectElement) selectElement.value = '';
  };

  const removerItem = (index) => {
    setFormData({
      ...formData,
      itens: formData.itens.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }
    
    if (!formData.unidade) {
      toast.error('Unidade não encontrada. Contate o administrador.');
      return;
    }
    
    if (!userData?.uid) {
      toast.error('Usuário não identificado');
      return;
    }

    // Validar pedido mensal
    if (formData.tipo === 'mensal' && !podeFazerPedidoMensal && !editingPedido) {
      toast.error('Pedidos mensais só podem ser feitos entre os dias 20 e 30 de cada mês');
      return;
    }

    // Verificar se já existe pedido mensal no mês
    if (formData.tipo === 'mensal' && !editingPedido) {
      const pedidoMensalExistente = pedidos.find(p => {
        if (p.tipo !== 'mensal') return false;
        const dataPedido = p.dataPedido?.toDate ? p.dataPedido.toDate() : new Date(p.dataPedido);
        return dataPedido.getMonth() === hoje.getMonth() && 
               dataPedido.getFullYear() === hoje.getFullYear() &&
               p.status !== 'cancelado';
      });
      
      if (pedidoMensalExistente) {
        toast.error('Você já possui um pedido mensal neste mês. Aguarde a aprovação ou faça um pedido avulso.');
        return;
      }
    }

    try {
      const pedidoData = {
        dentistaId: userData.uid,
        dentistaNome: userData.nome || userData.displayName || 'Dentista',
        unidade: formData.unidade,
        tipo: formData.tipo,
        status: 'pendente',
        itens: formData.itens.map(item => ({
          ...item,
          quantidadeEntregue: 0
        })),
        observacoes: formData.observacoes || '',
        dataPedido: new Date(),
        dataLimite: formData.tipo === 'mensal' ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0) : null,
        historico: [{ 
          data: new Date(), 
          acao: 'Pedido criado', 
          usuario: userData.nome || userData.displayName || 'Dentista',
          tipo: 'criacao'
        }]
      };
      
      if (editingPedido) {
        await updateDoc(doc(db, 'pedidos', editingPedido.id), {
          ...pedidoData,
          historico: [
            ...pedidoData.historico,
            { 
              data: new Date(), 
              acao: 'Pedido editado', 
              usuario: userData.nome || userData.displayName || 'Dentista',
              tipo: 'edicao'
            }
          ]
        });
        toast.success('Pedido atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'pedidos'), pedidoData);
        toast.success('Pedido enviado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast.error('Erro ao salvar pedido: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      try {
        await deleteDoc(doc(db, 'pedidos', id));
        toast.success('Pedido cancelado com sucesso');
      } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        toast.error('Erro ao cancelar pedido');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'avulso',
      unidade: unidadeDentista,
      itens: [],
      observacoes: ''
    });
    setEditingPedido(null);
    setSelectedProduto(null);
    setQuantidadeProduto(1);
  };

  const handleEdit = (pedido) => {
    if (pedido.status !== 'pendente') {
      toast.error('Apenas pedidos pendentes podem ser editados');
      return;
    }
    setEditingPedido(pedido);
    setFormData({
      tipo: pedido.tipo,
      unidade: pedido.unidade,
      itens: pedido.itens.map(item => ({
        ...item,
        quantidadeEntregue: item.quantidadeEntregue || 0
      })),
      observacoes: pedido.observacoes || ''
    });
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'aprovado': return 'bg-blue-100 text-blue-800';
      case 'separacao': return 'bg-purple-100 text-purple-800';
      case 'entregue': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pendente': return <ClockIcon className="w-4 h-4" />;
      case 'aprovado': return <CheckCircleIcon className="w-4 h-4" />;
      case 'separacao': return <PencilIcon className="w-4 h-4" />;
      case 'entregue': return <TruckIcon className="w-4 h-4" />;
      case 'cancelado': return <XMarkIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pendente': return 'Pendente';
      case 'aprovado': return 'Aprovado';
      case 'separacao': return 'Em Separação';
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
    return new Date(date).toLocaleString('pt-BR');
  };

  const stats = {
    total: pedidos.length,
    pendentes: pedidos.filter(p => p.status === 'pendente').length,
    aprovados: pedidos.filter(p => p.status === 'aprovado').length,
    separacao: pedidos.filter(p => p.status === 'separacao').length,
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Meus Pedidos de Materiais</h1>
          <p className="text-sm text-gray-600">Solicite materiais para sua unidade</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          Novo Pedido
        </button>
      </div>

      {/* Aviso de Pedido Mensal */}
      {!podeFazerPedidoMensal && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CalendarIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-800 text-sm">
              <strong>📅 Hoje é dia {diaAtual}.</strong> O período para pedidos mensais é entre os dias <strong>20 e 30</strong>.
              Enquanto isso, você pode fazer pedidos avulsos normalmente.
            </p>
          </div>
        </div>
      )}

      {podeFazerPedidoMensal && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-green-600" />
            <p className="text-green-800 text-sm">
              <strong>Período de pedido mensal!</strong> Você pode fazer seu pedido mensal entre os dias 20 e 30 de cada mês.
            </p>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="bg-white rounded-lg p-3 shadow-sm border">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 shadow-sm border border-yellow-200">
          <p className="text-xs text-yellow-600">Pendentes</p>
          <p className="text-xl font-bold text-yellow-700">{stats.pendentes}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 shadow-sm border border-blue-200">
          <p className="text-xs text-blue-600">Aprovados</p>
          <p className="text-xl font-bold text-blue-700">{stats.aprovados}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 shadow-sm border border-purple-200">
          <p className="text-xs text-purple-600">Em Separação</p>
          <p className="text-xl font-bold text-purple-700">{stats.separacao}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 shadow-sm border border-green-200">
          <p className="text-xs text-green-600">Entregues</p>
          <p className="text-xl font-bold text-green-700">{stats.entregues}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 shadow-sm border border-red-200">
          <p className="text-xs text-red-600">Cancelados</p>
          <p className="text-xl font-bold text-red-700">{stats.cancelados}</p>
        </div>
      </div>

      {/* TABELA - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Unidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Itens</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Total Unid.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">#{pedido.id?.slice(-6)}</td>
                  <td className="px-4 py-3 text-sm">{pedido.unidade}</td>
                  <td className="px-4 py-3 text-sm">
                    {pedido.tipo === 'mensal' ? '📅 Mensal' : '📦 Avulso'}
                  </td>
                  <td className="px-4 py-3 text-sm">{pedido.itens.length}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {pedido.itens.reduce((acc, i) => acc + i.quantidade, 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(pedido.status)}`}>
                      {getStatusIcon(pedido.status)}
                      {getStatusText(pedido.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(pedido.dataPedido)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPedido(pedido);
                          setShowDetalhesModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Visualizar detalhes"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      {pedido.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => handleEdit(pedido)}
                            className="text-green-600 hover:text-green-800"
                            title="Editar pedido"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(pedido.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Cancelar pedido"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS - Mobile */}
      <div className="md:hidden space-y-3">
        {pedidos.length > 0 ? (
          pedidos.map((pedido) => (
            <div key={pedido.id} className="bg-white rounded-lg shadow-sm border p-4">
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
                  <h3 className="font-medium text-gray-800">Unidade: {pedido.unidade}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedPedido(pedido);
                      setShowDetalhesModal(true);
                    }}
                    className="text-blue-600"
                    title="Detalhes"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  {pedido.status === 'pendente' && (
                    <>
                      <button onClick={() => handleEdit(pedido)} className="text-green-600" title="Editar">
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(pedido.id)} className="text-red-600" title="Cancelar">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Itens:</span>
                  <span className="font-medium">{pedido.itens.length} produtos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total unidades:</span>
                  <span className="font-medium">{pedido.itens.reduce((acc, i) => acc + i.quantidade, 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Data:</span>
                  <span>{formatDate(pedido.dataPedido)}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-2">Produtos:</p>
                <div className="space-y-1">
                  {pedido.itens.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="text-xs flex justify-between">
                      <span className="text-gray-600">{item.produtoNome}</span>
                      <span className="font-medium">{item.quantidade} unid.</span>
                    </div>
                  ))}
                  {pedido.itens.length > 3 && (
                    <p className="text-xs text-gray-400">+ {pedido.itens.length - 3} outro(s)</p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-1">Entrega:</p>
                <div className="text-xs">
                  {pedido.itens.slice(0, 3).map((item, idx) => {
                    const entregue = item.quantidadeEntregue || 0;
                    return (
                      <div key={idx} className="flex justify-between text-gray-600">
                        <span>{item.produtoNome}</span>
                        <span>{entregue}/{item.quantidade}</span>
                      </div>
                    );
                  })}
                  {pedido.itens.length > 3 && (
                    <p className="text-xs text-gray-400">+ {pedido.itens.length - 3} outro(s)</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <ShoppingCartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Você ainda não fez nenhum pedido</p>
            <button onClick={() => {
              resetForm();
              setShowModal(true);
            }} className="mt-4 text-blue-600 hover:text-blue-800">
              Fazer primeiro pedido
            </button>
          </div>
        )}
      </div>

      {/* Modal de Novo/Editar Pedido - CORRIGIDO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold">{editingPedido ? 'Editar Pedido' : 'Novo Pedido'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Tipo de Pedido */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Pedido *</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="radio" 
                      value="avulso" 
                      checked={formData.tipo === 'avulso'} 
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})} 
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="font-medium">📦 Avulso</span>
                      <p className="text-xs text-gray-500">Permitido qualquer dia do mês</p>
                    </div>
                  </label>
                  
                  <label className={`flex items-center gap-3 p-2 rounded-lg border ${!podeFazerPedidoMensal && !editingPedido ? 'bg-gray-50 border-gray-200 opacity-60' : 'hover:bg-gray-50 cursor-pointer border-gray-200'}`}>
                    <input 
                      type="radio" 
                      value="mensal" 
                      checked={formData.tipo === 'mensal'} 
                      onChange={(e) => {
                        if (!podeFazerPedidoMensal && !editingPedido) {
                          toast.error('Pedidos mensais só podem ser feitos entre os dias 20 e 30');
                          return;
                        }
                        setFormData({...formData, tipo: e.target.value});
                      }} 
                      className="w-4 h-4"
                      disabled={!podeFazerPedidoMensal && !editingPedido}
                    />
                    <div>
                      <span className="font-medium">📅 Mensal</span>
                      <p className="text-xs text-gray-500">Disponível apenas entre os dias 20 e 30 de cada mês</p>
                    </div>
                  </label>
                </div>
                
                {!podeFazerPedidoMensal && !editingPedido && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-700">
                      📅 Hoje é dia {diaAtual}. O período para pedidos mensais é entre os dias <strong>20 e 30</strong>.
                      Enquanto isso, você pode fazer pedidos avulsos normalmente.
                    </p>
                  </div>
                )}
              </div>

              {/* Unidade */}
              <div>
                <label className="block text-sm font-medium mb-2">Unidade *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required 
                    value={formData.unidade} 
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700" 
                  />
                  <BuildingOfficeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs text-green-600 mt-1">✓ Unidade vinculada ao seu cadastro</p>
              </div>

              {/* Produtos */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Adicionar Produtos</h3>
                
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <select
                    id="produto-select"
                    value={selectedProduto?.id || ''}
                    onChange={(e) => {
                      const produto = produtos.find(p => p.id === e.target.value);
                      setSelectedProduto(produto);
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg bg-white text-sm"
                  >
                    <option value="">-- Selecione um produto --</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} {p.marca && `- ${p.marca}`}</option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="1" 
                      value={quantidadeProduto} 
                      onChange={(e) => setQuantidadeProduto(Number(e.target.value))} 
                      className="w-24 px-3 py-2 border rounded-lg text-center" 
                      placeholder="Qtd" 
                    />
                    
                    <button 
                      type="button" 
                      onClick={adicionarItem} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                {formData.itens.length > 0 && (
                  <div className="mt-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">Produto</th>
                              <th className="px-3 py-2 text-center w-20">Qtd</th>
                              <th className="px-3 py-2 text-center w-12">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.itens.map((item, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-3 py-2">
                                  <p className="font-medium text-sm">{item.produtoNome}</p>
                                  <p className="text-xs text-gray-500">{item.marca}</p>
                                </td>
                                <td className="px-3 py-2 text-center font-medium">{item.quantidade}</td>
                                <td className="px-3 py-2 text-center">
                                  <button type="button" onClick={() => removerItem(index)} className="text-red-500 hover:text-red-700">
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {formData.itens.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm border rounded-lg bg-gray-50">
                    <ShoppingCartIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Nenhum produto adicionado ainda.
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium mb-2">Observações (opcional)</label>
                <textarea 
                  rows="3" 
                  value={formData.observacoes} 
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg resize-none" 
                  placeholder="Informações adicionais sobre o pedido..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white py-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  {editingPedido ? 'Atualizar Pedido' : 'Enviar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhesModal && selectedPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetalhesModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Detalhes do Pedido</h2>
              <button onClick={() => setShowDetalhesModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPedido.status)}`}>
                    {getStatusIcon(selectedPedido.status)}
                    {getStatusText(selectedPedido.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p>{selectedPedido.tipo === 'mensal' ? '📅 Pedido Mensal' : '📦 Pedido Avulso'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unidade</p>
                  <p>{selectedPedido.unidade}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data do Pedido</p>
                  <p>{formatDateTime(selectedPedido.dataPedido)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Itens do Pedido</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-center">Pedido</th>
                          <th className="px-3 py-2 text-center">Entregue</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPedido.itens.map((item, index) => {
                          const entregue = item.quantidadeEntregue || 0;
                          const status = entregue === 0 ? '⏳ Pendente' : entregue === item.quantidade ? '✅ Completo' : '⚠️ Parcial';
                          return (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2">
                                {item.produtoNome} {item.marca && `(${item.marca})`}
                              </td>
                              <td className="px-3 py-2 text-center">{item.quantidade}</td>
                              <td className="px-3 py-2 text-center">{entregue}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`text-xs ${
                                  entregue === 0 ? 'text-gray-500' : 
                                  entregue === item.quantidade ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {selectedPedido.observacoes && (
                <div>
                  <h3 className="font-medium mb-2">Observações</h3>
                  <p className="text-gray-600">{selectedPedido.observacoes}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-2">Histórico</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedPedido.historico?.map((item, index) => (
                    <div key={index} className="text-sm text-gray-600 border-l-2 border-blue-300 pl-3 py-1">
                      <span className="text-gray-400 text-xs">{formatDateTime(item.data?.toDate?.() || item.data)}</span>
                      <p>{item.acao} - <strong>{item.usuario}</strong></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
