import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy 
} from 'firebase/firestore';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShoppingBagIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  BuildingOfficeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAlertaModal, setShowAlertaModal] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [produtosVencendo, setProdutosVencendo] = useState([]);
  const [ordenacao, setOrdenacao] = useState({ campo: 'nome', direcao: 'asc' });
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    quantidade: 0,
    unidade: 'unidade',
    vencimento: '',
    preco: '',
    fornecedor: '',
    observacoes: ''
  });

  // Buscar produtos
  useEffect(() => {
    const q = query(collection(db, 'produtos'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar produtos
      const ordenados = ordenarProdutos(produtosData, ordenacao.campo, ordenacao.direcao);
      setProdutos(ordenados);
      setFilteredProdutos(ordenados);
      
      // Calcular produtos próximos do vencimento
      const hoje = new Date();
      const noventaDias = new Date();
      noventaDias.setDate(hoje.getDate() + 90);
      
      const vencendo = produtosData.filter(produto => {
        if (!produto.vencimento) return false;
        const dataVencimento = new Date(produto.vencimento);
        return dataVencimento >= hoje && dataVencimento <= noventaDias;
      }).sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
      
      setProdutosVencendo(vencendo);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Função de ordenação
  const ordenarProdutos = (lista, campo, direcao) => {
    const sorted = [...lista];
    sorted.sort((a, b) => {
      let valorA = a[campo] || '';
      let valorB = b[campo] || '';
      
      if (campo === 'quantidade' || campo === 'preco') {
        valorA = Number(valorA) || 0;
        valorB = Number(valorB) || 0;
      } else if (campo === 'vencimento') {
        valorA = valorA ? new Date(valorA) : new Date(8640000000000000);
        valorB = valorB ? new Date(valorB) : new Date(8640000000000000);
      } else {
        valorA = String(valorA).toLowerCase();
        valorB = String(valorB).toLowerCase();
      }
      
      if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // Filtrar e ordenar produtos
  useEffect(() => {
    let filtered = [...produtos];
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const ordenados = ordenarProdutos(filtered, ordenacao.campo, ordenacao.direcao);
    setFilteredProdutos(ordenados);
    setCurrentPage(1);
  }, [searchTerm, produtos, ordenacao]);

  // Alternar ordenação
  const toggleOrdenacao = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProdutos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProdutos.length / itemsPerPage);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduto) {
        await updateDoc(doc(db, 'produtos', editingProduto.id), {
          ...formData,
          quantidade: Number(formData.quantidade),
          preco: Number(formData.preco) || 0,
          dataAtualizacao: new Date()
        });
        toast.success('Produto atualizado!');
      } else {
        await addDoc(collection(db, 'produtos'), {
          ...formData,
          quantidade: Number(formData.quantidade),
          preco: Number(formData.preco) || 0,
          ativo: true,
          dataCriacao: new Date()
        });
        toast.success('Produto cadastrado!');
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteDoc(doc(db, 'produtos', id));
      toast.success('Produto excluído');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      marca: '',
      quantidade: 0,
      unidade: 'unidade',
      vencimento: '',
      preco: '',
      fornecedor: '',
      observacoes: ''
    });
    setEditingProduto(null);
  };

  const handleEdit = (produto) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome || '',
      marca: produto.marca || '',
      quantidade: produto.quantidade || 0,
      unidade: produto.unidade || 'unidade',
      vencimento: produto.vencimento || '',
      preco: produto.preco || '',
      fornecedor: produto.fornecedor || '',
      observacoes: produto.observacoes || ''
    });
    setShowModal(true);
  };

  const isVencido = (vencimento) => {
    if (!vencimento) return false;
    return new Date(vencimento) < new Date();
  };

  const getDiasRestantes = (vencimento) => {
    if (!vencimento) return null;
    const hoje = new Date();
    const dataVenc = new Date(vencimento);
    const diffTime = dataVenc - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusVencimento = (vencimento) => {
    if (!vencimento) return null;
    const dias = getDiasRestantes(vencimento);
    if (dias < 0) return { text: 'Vencido', color: 'bg-red-100 text-red-800', icon: <XCircleIcon className="w-4 h-4" /> };
    if (dias <= 30) return { text: `Vence em ${dias} dias`, color: 'bg-red-100 text-red-800', icon: <ExclamationTriangleIcon className="w-4 h-4" /> };
    if (dias <= 60) return { text: `Vence em ${dias} dias`, color: 'bg-orange-100 text-orange-800', icon: <BellAlertIcon className="w-4 h-4" /> };
    if (dias <= 90) return { text: `Vence em ${dias} dias`, color: 'bg-yellow-100 text-yellow-800', icon: <CalendarIcon className="w-4 h-4" /> };
    return { text: `${dias} dias`, color: 'bg-green-100 text-green-800', icon: <CheckCircleIcon className="w-4 h-4" /> };
  };

  // Componente do cabeçalho da tabela com ordenação
  const TableHeader = ({ campo, label, className = "" }) => {
    const isActive = ordenacao.campo === campo;
    return (
      <th 
        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 transition-colors ${className}`}
        onClick={() => toggleOrdenacao(campo)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            ordenacao.direcao === 'asc' ? 
              <ArrowUpIcon className="w-3 h-3" /> : 
              <ArrowDownIcon className="w-3 h-3" />
          ) : (
            <div className="w-3 h-3" />
          )}
        </div>
      </th>
    );
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Produtos</h1>
          <p className="text-sm text-gray-600">Gerencie os produtos do estoque</p>
          <p className="text-xs text-blue-600 mt-1">
            💡 Clique nos cabeçalhos das colunas para ordenar
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {produtosVencendo.length > 0 && (
            <button
              onClick={() => setShowAlertaModal(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm transition"
            >
              <BellAlertIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{produtosVencendo.length} produtos vencem em até 90 dias</span>
              <span className="sm:hidden">{produtosVencendo.length}</span>
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
          <p className="text-xs sm:text-sm text-blue-600">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-700">{produtos.length}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 sm:p-4 border border-red-200">
          <p className="text-xs sm:text-sm text-red-600">Estoque Baixo</p>
          <p className="text-xl sm:text-2xl font-bold text-red-700">
            {produtos.filter(p => p.quantidade < 10).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 sm:p-4 border border-orange-200">
          <p className="text-xs sm:text-sm text-orange-600">Vencidos</p>
          <p className="text-xl sm:text-2xl font-bold text-orange-700">
            {produtos.filter(p => isVencido(p.vencimento)).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 sm:p-4 border border-red-200">
          <p className="text-xs sm:text-sm text-red-600">Vencem 30 dias</p>
          <p className="text-xl sm:text-2xl font-bold text-red-700">
            {produtos.filter(p => {
              if (!p.vencimento) return false;
              const dias = getDiasRestantes(p.vencimento);
              return dias > 0 && dias <= 30;
            }).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 sm:p-4 border border-yellow-200">
          <p className="text-xs sm:text-sm text-yellow-600">Vencem 30-90 dias</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-700">
            {produtos.filter(p => {
              if (!p.vencimento) return false;
              const dias = getDiasRestantes(p.vencimento);
              return dias > 30 && dias <= 90;
            }).length}
          </p>
        </div>
      </div>

      {/* Alerta de produtos próximos ao vencimento */}
      {produtosVencendo.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <BellAlertIcon className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800 text-sm sm:text-base">Atenção! Produtos próximos do vencimento</h3>
          </div>
          <p className="text-xs sm:text-sm text-yellow-700 mb-3">
            {produtosVencendo.length} produto(s) vence(m) nos próximos 90 dias:
          </p>
          <div className="flex flex-wrap gap-2">
            {produtosVencendo.slice(0, 5).map(produto => (
              <span key={produto.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs shadow-sm">
                {produto.nome}
                <span className="text-orange-600 font-medium">
                  ({getDiasRestantes(produto.vencimento)} dias)
                </span>
              </span>
            ))}
            {produtosVencendo.length > 5 && (
              <button
                onClick={() => setShowAlertaModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                +{produtosVencendo.length - 5} outros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar produtos por nome, marca ou fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-4 py-2 border rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* TABELA - Desktop com Ordenação */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <TableHeader campo="nome" label="Produto" className="w-1/4" />
                <TableHeader campo="marca" label="Marca" className="w-1/6" />
                <TableHeader campo="quantidade" label="Estoque" className="w-1/12" />
                <TableHeader campo="vencimento" label="Vencimento" className="w-1/6" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <TableHeader campo="preco" label="Preço" className="w-1/12" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((produto) => {
                const statusVenc = getStatusVencimento(produto.vencimento);
                const isEstoqueBaixo = produto.quantidade < 10;
                const isVencidoProd = isVencido(produto.vencimento);
                
                return (
                  <tr key={produto.id} className={`hover:bg-gray-50 transition ${isEstoqueBaixo ? 'bg-red-50/30' : ''} ${isVencidoProd ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isEstoqueBaixo ? 'bg-red-500' : 'bg-green-500'}`} />
                        <div>
                          <p className="font-medium text-sm">{produto.nome}</p>
                          <p className="text-xs text-gray-500">{produto.fornecedor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{produto.marca || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium text-sm ${isEstoqueBaixo ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                        {produto.quantidade} {produto.unidade}
                      </span>
                      {isEstoqueBaixo && (
                        <span className="ml-1 text-xs text-red-500">⚠️</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {produto.vencimento ? (
                        <span className={isVencidoProd ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {new Date(produto.vencimento).toLocaleDateString('pt-BR')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {statusVenc && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusVenc.color}`}>
                          {statusVenc.icon}
                          <span className="hidden sm:inline">{statusVenc.text}</span>
                          <span className="sm:hidden">{statusVenc.text.split(' ')[0]}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-green-600">
                        R$ {(produto.preco || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(produto)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(produto.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Excluir"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS - Mobile */}
      <div className="md:hidden space-y-4">
        {currentItems.map((produto) => {
          const statusVenc = getStatusVencimento(produto.vencimento);
          const isEstoqueBaixo = produto.quantidade < 10;
          const isVencidoProd = isVencido(produto.vencimento);
          
          return (
            <div key={produto.id} className={`bg-white rounded-lg shadow-sm border p-4 ${isEstoqueBaixo ? 'border-red-200' : isVencidoProd ? 'border-orange-200' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isEstoqueBaixo ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <h3 className="font-semibold text-gray-800 text-base">{produto.nome}</h3>
                  </div>
                  {produto.marca && (
                    <p className="text-sm text-gray-500 mt-1">{produto.marca}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(produto)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(produto.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Estoque:</span>
                  <span className={`font-medium ${isEstoqueBaixo ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                    {produto.quantidade} {produto.unidade}
                    {isEstoqueBaixo && <span className="ml-1">⚠️ Baixo</span>}
                  </span>
                </div>

                {produto.fornecedor && (
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Fornecedor:</span>
                    <span className="text-sm text-gray-700">{produto.fornecedor}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Preço:</span>
                  <span className="text-sm font-medium text-green-600">
                    R$ {(produto.preco || 0).toFixed(2)}
                  </span>
                </div>

                {produto.vencimento && (
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Vencimento:</span>
                    <span className={`text-sm ${isVencidoProd ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                      {new Date(produto.vencimento).toLocaleDateString('pt-BR')}
                      {isVencidoProd && <span className="ml-1">⚠️</span>}
                    </span>
                  </div>
                )}

                {statusVenc && (
                  <div className="mt-2 pt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusVenc.color} w-full justify-center`}>
                      {statusVenc.icon}
                      {statusVenc.text}
                    </span>
                  </div>
                )}

                {produto.observacoes && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-500">Observações:</p>
                    <p className="text-xs text-gray-600 mt-1">{produto.observacoes}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {filteredProdutos.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <ShoppingBagIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum produto encontrado</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              + Adicionar primeiro produto
            </button>
          </div>
        )}
      </div>

      {/* Paginação */}
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
                  className={`w-10 h-10 rounded-lg border transition font-medium ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <div className="sm:hidden">
            <span className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">
              Página {currentPage} de {totalPages}
            </span>
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
      {filteredProdutos.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredProdutos.length)} de {filteredProdutos.length} produtos
        </div>
      )}

      {/* Modal de Alerta de Produtos Vencendo */}
      {showAlertaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAlertaModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BellAlertIcon className="w-6 h-6 text-yellow-600" />
                Produtos que vencem em até 90 dias
              </h2>
              <button onClick={() => setShowAlertaModal(false)} className="text-gray-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Atenção! Os seguintes produtos estão com vencimento próximo. Recomenda-se priorizar o uso ou contatar o fornecedor.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Marca</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estoque</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data Vencimento</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Dias Restantes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {produtosVencendo.map((produto) => {
                      const dias = getDiasRestantes(produto.vencimento);
                      let rowClass = '';
                      if (dias <= 30) rowClass = 'bg-red-50';
                      else if (dias <= 60) rowClass = 'bg-orange-50';
                      else if (dias <= 90) rowClass = 'bg-yellow-50';
                      
                      return (
                        <tr key={produto.id} className={rowClass}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-sm">{produto.nome}</p>
                            <p className="text-xs text-gray-500">{produto.fornecedor}</p>
                          </td>
                          <td className="px-4 py-2 text-sm">{produto.marca || '-'}</td>
                          <td className="px-4 py-2 text-sm">
                            {produto.quantidade} {produto.unidade}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {new Date(produto.vencimento).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`font-bold text-sm ${
                              dias <= 30 ? 'text-red-600' : 
                              dias <= 60 ? 'text-orange-600' : 
                              'text-yellow-600'
                            }`}>
                              {dias} dias
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Dica: Considere fazer um pedido de reposição para produtos com estoque baixo ou planejar a utilização dos produtos próximos do vencimento.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Luva de Procedimento"
                  />
                  <p className="text-xs text-blue-500 mt-1">
                    💡 Os produtos são ordenados alfabeticamente por este campo
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => setFormData({...formData, marca: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 3M, Johnson..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fornecedor</label>
                  <input
                    type="text"
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do fornecedor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quantidade *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unidade">Unidade</option>
                    <option value="caixa">Caixa</option>
                    <option value="kit">Kit</option>
                    <option value="frasco">Frasco</option>
                    <option value="pacote">Pacote</option>
                    <option value="bobina">Bobina</option>
                    <option value="galão">Galão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Data Vencimento</label>
                  <input
                    type="date"
                    value={formData.vencimento}
                    onChange={(e) => setFormData({...formData, vencimento: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.vencimento && (
                    <p className={`text-xs mt-1 ${
                      getDiasRestantes(formData.vencimento) <= 90 ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {getDiasRestantes(formData.vencimento) > 0 
                        ? `📅 Vence em ${getDiasRestantes(formData.vencimento)} dias`
                        : getDiasRestantes(formData.vencimento) === 0
                        ? '⚠️ Vence hoje!'
                        : '❌ Produto vencido!'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Observações</label>
                  <textarea
                    rows="2"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Informações adicionais sobre o produto..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  {editingProduto ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
