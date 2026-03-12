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
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  FunnelIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  TagIcon,
  IdentificationIcon,
  MapPinIcon,
  TruckIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function Patrimonio() {
  const [itens, setItens] = useState([]);
  const [filteredItens, setFilteredItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [exportando, setExportando] = useState(false);
  const [modoCompacto, setModoCompacto] = useState(false);
  const [unidades, setUnidades] = useState([]);

  const [formData, setFormData] = useState({
    // Campos principais (solicitados)
    numeroPatrimonio: '',
    material: '',
    unidadeOrigem: '',
    unidadeDestino: '',
    dataEntrega: '',
    
    // Campos adicionais (do modelo anterior)
    nome: '',
    categoria: 'equipamento',
    numeroSerie: '',
    marca: '',
    modelo: '',
    dataAquisicao: '',
    valorAquisicao: '',
    status: 'ativo',
    localizacao: '',
    fornecedor: '',
    garantia: '',
    observacoes: ''
  });

  // Carregar itens do Firebase
  useEffect(() => {
    const q = query(
      collection(db, 'patrimonio'),
      orderBy('dataEntrega', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itensData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItens(itensData);
      setFilteredItens(itensData);
      
      // Extrair unidades únicas para o filtro
      const unidadesSet = new Set();
      itensData.forEach(item => {
        if (item.unidadeOrigem) unidadesSet.add(item.unidadeOrigem);
        if (item.unidadeDestino) unidadesSet.add(item.unidadeDestino);
      });
      setUnidades(Array.from(unidadesSet));
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtrar itens
  useEffect(() => {
    let filtered = itens;
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.numeroPatrimonio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unidadeOrigem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unidadeDestino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.numeroSerie?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filtroStatus !== 'todos') {
      filtered = filtered.filter(item => item.status === filtroStatus);
    }
    
    if (filtroCategoria !== 'todos') {
      filtered = filtered.filter(item => item.categoria === filtroCategoria);
    }
    
    setFilteredItens(filtered);
  }, [searchTerm, filtroStatus, filtroCategoria, itens]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Garantir que o nome seja preenchido com o material se vazio
      const dadosParaSalvar = {
        ...formData,
        nome: formData.nome || formData.material,
        dataAtualizacao: new Date()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'patrimonio', editingItem.id), dadosParaSalvar);
        toast.success('Item atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'patrimonio'), {
          ...dadosParaSalvar,
          dataCriacao: new Date()
        });
        toast.success('Item adicionado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar item');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      try {
        await deleteDoc(doc(db, 'patrimonio', id));
        toast.success('Item excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir item');
      }
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      numeroPatrimonio: item.numeroPatrimonio || '',
      material: item.material || '',
      unidadeOrigem: item.unidadeOrigem || '',
      unidadeDestino: item.unidadeDestino || '',
      dataEntrega: item.dataEntrega || '',
      
      nome: item.nome || '',
      categoria: item.categoria || 'equipamento',
      numeroSerie: item.numeroSerie || '',
      marca: item.marca || '',
      modelo: item.modelo || '',
      dataAquisicao: item.dataAquisicao || '',
      valorAquisicao: item.valorAquisicao || '',
      status: item.status || 'ativo',
      localizacao: item.localizacao || '',
      fornecedor: item.fornecedor || '',
      garantia: item.garantia || '',
      observacoes: item.observacoes || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      numeroPatrimonio: '',
      material: '',
      unidadeOrigem: '',
      unidadeDestino: '',
      dataEntrega: '',
      
      nome: '',
      categoria: 'equipamento',
      numeroSerie: '',
      marca: '',
      modelo: '',
      dataAquisicao: '',
      valorAquisicao: '',
      status: 'ativo',
      localizacao: '',
      fornecedor: '',
      garantia: '',
      observacoes: ''
    });
    setEditingItem(null);
  };

  // Gerar PDF
  const gerarPDF = () => {
    setExportando(true);
    
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 102);
      doc.text('Relatório de Patrimônio', 14, 20);
      
      // Subtítulo
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);
      doc.text(`Total de itens: ${filteredItens.length}`, 14, 34);
      
      // Tabela resumida com os campos principais
      autoTable(doc, {
        startY: 40,
        head: [['Nº Patrimônio', 'Material', 'Unidade Origem', 'Unidade Destino', 'Data Entrega', 'Status']],
        body: filteredItens.map(item => [
          item.numeroPatrimonio || '-',
          item.material || item.nome || '-',
          item.unidadeOrigem || '-',
          item.unidadeDestino || '-',
          item.dataEntrega ? new Date(item.dataEntrega).toLocaleDateString('pt-BR') : '-',
          item.status === 'ativo' ? 'Ativo' : 
          item.status === 'manutencao' ? 'Em Manutenção' : 'Inativo'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102] },
        styles: { fontSize: 8 }
      });

      doc.save(`patrimonio-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF gerado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExportando(false);
    }
  };

  // Gerar relatório detalhado
  const gerarPDFDetalhado = () => {
    setExportando(true);
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(0, 51, 102);
      doc.text('Inventário Detalhado de Patrimônio', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
      doc.text(`Total de itens: ${filteredItens.length}`, 14, 36);
      
      // Estatísticas
      const ativos = filteredItens.filter(i => i.status === 'ativo').length;
      const manutencao = filteredItens.filter(i => i.status === 'manutencao').length;
      const inativos = filteredItens.filter(i => i.status === 'inativo').length;
      
      doc.text(`Itens ativos: ${ativos}`, 14, 44);
      doc.text(`Em manutenção: ${manutencao}`, 14, 50);
      doc.text(`Inativos: ${inativos}`, 14, 56);
      
      let yPos = 65;
      
      filteredItens.forEach((item, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`${index + 1}. ${item.material || item.nome}`, 14, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setTextColor(80);
        
        const detalhes = [
          `Nº Patrimônio: ${item.numeroPatrimonio || 'N/A'}`,
          `Material: ${item.material || item.nome || 'N/A'}`,
          `Unidade Origem: ${item.unidadeOrigem || 'N/A'}`,
          `Unidade Destino: ${item.unidadeDestino || 'N/A'}`,
          `Data Entrega: ${item.dataEntrega ? new Date(item.dataEntrega).toLocaleDateString('pt-BR') : 'N/A'}`,
          `Nº Série: ${item.numeroSerie || 'N/A'}`,
          `Marca/Modelo: ${item.marca || 'N/A'} ${item.modelo || ''}`,
          `Categoria: ${item.categoria}`,
          `Localização: ${item.localizacao || 'N/A'}`,
          `Status: ${item.status === 'ativo' ? 'Ativo' : item.status === 'manutencao' ? 'Em Manutenção' : 'Inativo'}`,
        ];
        
        if (item.dataAquisicao) {
          detalhes.push(`Data Aquisição: ${new Date(item.dataAquisicao).toLocaleDateString('pt-BR')}`);
        }
        
        if (item.valorAquisicao) {
          detalhes.push(`Valor: R$ ${parseFloat(item.valorAquisicao).toFixed(2)}`);
        }
        
        if (item.fornecedor) {
          detalhes.push(`Fornecedor: ${item.fornecedor}`);
        }
        
        if (item.garantia) {
          detalhes.push(`Garantia: ${item.garantia} meses`);
        }
        
        if (item.observacoes) {
          detalhes.push(`Obs: ${item.observacoes}`);
        }
        
        detalhes.forEach((detalhe) => {
          doc.text(detalhe, 20, yPos);
          yPos += 5;
        });
        
        yPos += 5;
      });

      doc.save(`inventario-detalhado-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Relatório detalhado gerado com sucesso!');
      
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportando(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Patrimônio</h1>
          <p className="text-sm sm:text-base text-gray-600">Gestão completa de equipamentos e materiais</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setModoCompacto(!modoCompacto)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm w-full sm:w-auto"
          >
            {modoCompacto ? 'Modo Detalhado' : 'Modo Compacto'}
          </button>
          <button
            onClick={gerarPDF}
            disabled={exportando}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm w-full sm:w-auto"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            PDF Resumido
          </button>
          <button
            onClick={gerarPDFDetalhado}
            disabled={exportando}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm w-full sm:w-auto"
          >
            <PrinterIcon className="w-4 h-4" />
            PDF Detalhado
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm w-full sm:w-auto"
          >
            <PlusIcon className="w-4 h-4" />
            Novo Item
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 sm:p-4 text-white">
          <p className="text-xs sm:text-sm opacity-90">Total</p>
          <p className="text-lg sm:text-2xl font-bold">{itens.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 sm:p-4 text-white">
          <p className="text-xs sm:text-sm opacity-90">Ativos</p>
          <p className="text-lg sm:text-2xl font-bold">{itens.filter(i => i.status === 'ativo').length}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 sm:p-4 text-white">
          <p className="text-xs sm:text-sm opacity-90">Manutenção</p>
          <p className="text-lg sm:text-2xl font-bold">{itens.filter(i => i.status === 'manutencao').length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 sm:p-4 text-white">
          <p className="text-xs sm:text-sm opacity-90">Unidades</p>
          <p className="text-lg sm:text-2xl font-bold">{unidades.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por patrimônio, material, unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="manutencao">Em Manutenção</option>
              <option value="inativo">Inativo</option>
            </select>
            
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todas categorias</option>
              <option value="equipamento">Equipamento</option>
              <option value="mobiliario">Mobiliário</option>
              <option value="instrumento">Instrumento</option>
              <option value="informatica">Informática</option>
              <option value="outro">Outro</option>
            </select>
            
            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroStatus('todos');
                setFiltroCategoria('todos');
              }}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Listagem - Modo Compacto (Mobile) */}
      {modoCompacto && (
        <div className="space-y-2 sm:hidden">
          {filteredItens.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs text-gray-500">Nº Patrimônio</span>
                  <p className="font-medium text-sm">{item.numeroPatrimonio || '-'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Material:</span>
                  <span className="font-medium">{item.material || item.nome || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Origem:</span>
                  <span>{item.unidadeOrigem || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Destino:</span>
                  <span>{item.unidadeDestino || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data Entrega:</span>
                  <span>{formatarData(item.dataEntrega)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${
                    item.status === 'ativo' ? 'bg-green-100 text-green-700' :
                    item.status === 'manutencao' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.status === 'ativo' ? 'Ativo' :
                     item.status === 'manutencao' ? 'Manutenção' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modo Tabela (Desktop e quando não está compacto) */}
      {(!modoCompacto || window.innerWidth >= 640) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Patrimônio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade Origem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade Destino</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Entrega</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItens.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {item.numeroPatrimonio || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {item.material || item.nome || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.unidadeOrigem || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.unidadeDestino || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatarData(item.dataEntrega)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                        item.status === 'ativo' ? 'bg-green-100 text-green-700' :
                        item.status === 'manutencao' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status === 'ativo' ? 'Ativo' :
                         item.status === 'manutencao' ? 'Em Manutenção' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mensagem quando não há itens */}
      {filteredItens.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum item encontrado</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + Adicionar primeiro item
          </button>
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* SEÇÃO 1: Campos principais (solicitados) - Destacados */}
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <TagIcon className="w-4 h-4" />
                  Informações Principais
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nº Patrimônio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.numeroPatrimonio}
                      onChange={(e) => setFormData({...formData, numeroPatrimonio: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: PAT-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.material}
                      onChange={(e) => setFormData({...formData, material: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Cadeira Odontológica"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade Origem
                    </label>
                    <input
                      type="text"
                      value={formData.unidadeOrigem}
                      onChange={(e) => setFormData({...formData, unidadeOrigem: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Consultório 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade Destino
                    </label>
                    <input
                      type="text"
                      value={formData.unidadeDestino}
                      onChange={(e) => setFormData({...formData, unidadeDestino: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Consultório 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Entrega
                    </label>
                    <input
                      type="date"
                      value={formData.dataEntrega}
                      onChange={(e) => setFormData({...formData, dataEntrega: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: Informações Complementares */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4" />
                  Informações Complementares
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Item
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome completo (opcional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nº de Série
                    </label>
                    <input
                      type="text"
                      value={formData.numeroSerie}
                      onChange={(e) => setFormData({...formData, numeroSerie: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Número de série do fabricante"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="equipamento">Equipamento</option>
                      <option value="mobiliario">Mobiliário</option>
                      <option value="instrumento">Instrumento</option>
                      <option value="informatica">Informática</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="manutencao">Em Manutenção</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={formData.marca}
                      onChange={(e) => setFormData({...formData, marca: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Marca do equipamento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={formData.modelo}
                      onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Modelo do equipamento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Aquisição
                    </label>
                    <input
                      type="date"
                      value={formData.dataAquisicao}
                      onChange={(e) => setFormData({...formData, dataAquisicao: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor de Aquisição (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorAquisicao}
                      onChange={(e) => setFormData({...formData, valorAquisicao: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Localização
                    </label>
                    <input
                      type="text"
                      value={formData.localizacao}
                      onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Localização atual"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fornecedor
                    </label>
                    <input
                      type="text"
                      value={formData.fornecedor}
                      onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome do fornecedor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Garantia (meses)
                    </label>
                    <input
                      type="number"
                      value={formData.garantia}
                      onChange={(e) => setFormData({...formData, garantia: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="12"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações
                    </label>
                    <textarea
                      rows="2"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Observações adicionais sobre o item..."
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm w-full sm:w-auto order-1 sm:order-2"
                >
                  {editingItem ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}