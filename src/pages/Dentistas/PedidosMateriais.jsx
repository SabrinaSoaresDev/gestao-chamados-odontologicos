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
      where('dentistaId', '==', userData.uid)
    );

    const unsubscribePedidos = onSnapshot(pedidosQuery, (snapshot) => {
      const pedidosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataPedido: doc.data().dataPedido?.toDate()
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
      toast.success(`${quantidadeProduto} unidade(s) adicionada(s)`);
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
      toast.error('Adicione pelo menos um item');
      return;
    }
    if (!formData.unidade) {
      toast.error('Informe a unidade');
      return;
    }
    if (!userData?.uid) {
      toast.error('Usuário não identificado');
      return;
    }

    try {
      const pedidoData = {
        dentistaId: userData.uid,
        dentistaNome: userData.nome || 'Dentista',
        unidade: formData.unidade,
        tipo: formData.tipo,
        status: 'pendente',
        itens: formData.itens,
        observacoes: formData.observacoes,
        dataPedido: new Date(),
        dataLimite: formData.tipo === 'mensal' ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) : null,
        historico: [{ data: new Date(), acao: 'Pedido criado', usuario: userData.nome || 'Dentista' }]
      };
      
      await addDoc(collection(db, 'pedidos'), pedidoData);
      toast.success('Pedido enviado!');
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast.error('Erro ao salvar pedido: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      await deleteDoc(doc(db, 'pedidos', id));
      toast.success('Pedido cancelado');
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
    setEditingPedido(pedido);
    setFormData({
      tipo: pedido.tipo,
      unidade: pedido.unidade,
      itens: pedido.itens,
      observacoes: pedido.observacoes || ''
    });
    setShowModal(true);
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
      case 'cancelado': return <XMarkIcon className="w-4 h-4" />;
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
    return new Date(date).toLocaleString('pt-BR');
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
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Pedidos de Materiais</h1>
          <p className="text-gray-600">Solicite materiais para sua unidade</p>
         
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Novo Pedido
        </button>
      </div>

      {/* Aviso de Pedido Mensal */}
      {podeFazerPedidoMensal && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-green-600" />
            <p className="text-green-800 text-sm">
              <strong>Período de pedido mensal!</strong> Você pode fazer seu pedido mensal entre os dias 20 e 30.
            </p>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
      <div className="md:hidden space-y-4">
        {pedidos.length > 0 ? (
          pedidos.map((pedido) => (
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

              {/* Informações */}
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

              {/* Lista de produtos */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-2">Produtos:</p>
                <div className="space-y-1">
                  {pedido.itens.map((item, idx) => (
                    <div key={idx} className="text-xs flex justify-between">
                      <span className="text-gray-600">{item.produtoNome}</span>
                      <span className="font-medium">{item.quantidade} unid.</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status de entrega dos itens */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-1">Entrega:</p>
                <div className="text-xs">
                  {pedido.itens.map((item, idx) => {
                    const entregue = item.quantidadeEntregue || 0;
                    const pendente = item.quantidade - entregue;
                    return (
                      <div key={idx} className="flex justify-between text-gray-600">
                        <span>{item.produtoNome}</span>
                        <span>{entregue}/{item.quantidade}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <ShoppingCartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Você ainda não fez nenhum pedido</p>
            <button onClick={() => setShowModal(true)} className="mt-4 text-blue-600 hover:text-blue-800">
              Fazer primeiro pedido
            </button>
          </div>
        )}
      </div>

      {/* Modal de Novo/Editar Pedido */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-bold">{editingPedido ? 'Editar Pedido' : 'Novo Pedido'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Tipo de Pedido */}
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Pedido</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" value="avulso" checked={formData.tipo === 'avulso'} onChange={(e) => setFormData({...formData, tipo: e.target.value})} />
                    Avulso
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" value="mensal" checked={formData.tipo === 'mensal'} onChange={(e) => setFormData({...formData, tipo: e.target.value})} disabled={!podeFazerPedidoMensal} />
                    Mensal {!podeFazerPedidoMensal && '(disponível dias 20-30)'}
                  </label>
                </div>
              </div>

              {/* Unidade */}
              <div>
                <label className="block text-sm font-medium mb-1">Unidade *</label>
                <div className="relative">
                  <input type="text" required value={formData.unidade} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
                  <BuildingOfficeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs text-green-600 mt-1">✓ Unidade vinculada ao seu cadastro</p>
              </div>

              {/* Produtos */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Adicionar Produtos</h3>
                
                <select
                  value={selectedProduto?.id || ''}
                  onChange={(e) => {
                    const produto = produtos.find(p => p.id === e.target.value);
                    setSelectedProduto(produto);
                    setQuantidadeProduto(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-white mb-3"
                >
                  <option value="">-- Selecione um produto --</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} {p.marca && `- ${p.marca}`}</option>
                  ))}
                </select>

                <div className="flex gap-2 mb-3">
                  <input type="number" min="1" value={quantidadeProduto} onChange={(e) => setQuantidadeProduto(Number(e.target.value))} className="flex-1 px-3 py-2 border rounded-lg" placeholder="Quantidade" />
                  <button type="button" onClick={adicionarItem} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Adicionar</button>
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
                                  <button type="button" onClick={() => removerItem(index)} className="text-red-500">
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
                  <div className="text-center py-4 text-gray-400 text-sm border rounded-lg bg-gray-50">
                    Nenhum produto adicionado ainda.
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <textarea rows="2" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Informações adicionais sobre o pedido..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{editingPedido ? 'Atualizar Pedido' : 'Enviar Pedido'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhesModal && selectedPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetalhesModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Detalhes do Pedido</h2>
              <button onClick={() => setShowDetalhesModal(false)} className="text-gray-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPedido.status)}`}>
                    {getStatusIcon(selectedPedido.status)}
                    {selectedPedido.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p>{selectedPedido.tipo === 'mensal' ? 'Pedido Mensal' : 'Pedido Avulso'}</p>
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
                            <td className="px-3 py-2">{item.produtoNome} {item.marca && `(${item.marca})`}</td>
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
                    <div key={index} className="text-sm text-gray-600">
                      <span className="text-gray-400">{formatDateTime(item.data?.toDate?.() || item.data)}</span> - {item.acao} - <strong>{item.usuario}</strong>
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
