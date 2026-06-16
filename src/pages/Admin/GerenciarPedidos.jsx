import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  addDoc,
  where
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
  ChevronRightIcon,
  PrinterIcon,
  PlusIcon
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
  
  // Estados para o modal de criar pedido
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [dentistas, setDentistas] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [novoPedido, setNovoPedido] = useState({
    dentistaId: '',
    dentistaNome: '',
    unidade: '',
    tipo: 'avulso',
    observacoes: '',
    itens: []
  });
  const [produtoSelecionado, setProdutoSelecionado] = useState({
    id: '',
    nome: '',
    marca: '',
    quantidade: 1
  });
  
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
  
  // Carregar dentistas da coleção de usuários (tipo = 'dentista' e ativo = true)
 // Carregar produtos disponíveis APENAS com estoque > 0
useEffect(() => {
  const usuariosRef = collection(db, 'usuarios');
  const q = query(
    usuariosRef, 
    where('role', '==', 'dentista'),
    where('ativo', '==', true)
  );
  
  const unsubscribeDentistas = onSnapshot(q, (snapshot) => {
    const dentistasData = snapshot.docs.map(doc => ({
      id: doc.id,
      uid: doc.id,
      nome: doc.data().nome || '',
      email: doc.data().email || '',
      unidade: doc.data().unidade || '',
      telefone: doc.data().telefone || '',
      especialidade: doc.data().especialidade || '',
      ativo: doc.data().ativo || false
    }));
    
    console.log('🦷 Dentistas carregados:', dentistasData);
    setDentistas(dentistasData);
  }, (error) => {
    console.error('Erro ao carregar dentistas:', error);
    toast.error('Erro ao carregar lista de dentistas');
  });

  // Carregar produtos disponíveis APENAS com estoque > 0 e ORDENADOS por nome (A-Z)
  const produtosRef = collection(db, 'produtos');
  const produtosQuery = query(
    produtosRef,
    orderBy('nome', 'asc') // <-- ADICIONE ESTA LINHA PARA ORDENAR A-Z
  );
  
  const unsubscribeProdutos = onSnapshot(produtosQuery, (snapshot) => {
    const produtosData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // FILTRAR apenas produtos com estoque > 0
    const produtosComEstoque = produtosData.filter(produto => {
      const estoque = produto.estoque !== undefined ? produto.estoque : produto.quantidade;
      return (estoque || 0) > 0;
    });
    
    console.log('📦 Produtos com estoque (ordenados):', produtosComEstoque.length);
    setProdutosDisponiveis(produtosComEstoque);
  }, (error) => {
    console.error('Erro ao carregar produtos:', error);
  });

  return () => {
    unsubscribeDentistas();
    unsubscribeProdutos();
  };
}, []);
  
  // Sincronizar selectedPedido quando a lista de pedidos mudar
  useEffect(() => {
    if (selectedPedido) {
      const pedidoAtualizado = pedidos.find(p => p.id === selectedPedido.id);
      if (pedidoAtualizado) {
        setSelectedPedido(pedidoAtualizado);
        setQuantidadesEntregues(
          pedidoAtualizado.itens?.reduce((acc, i, idx) => ({ 
            ...acc, 
            [idx]: i.quantidadeEntregue || 0 
          }), {}) || {}
        );
      }
    }
  }, [pedidos]);

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
    setCurrentPage(1);
  }, [searchTerm, filtroStatus, filtroUnidade, pedidos]);

  // Funções para o modal de criar pedido
  const handleAdicionarItem = () => {
    if (!produtoSelecionado.id || !produtoSelecionado.nome || produtoSelecionado.quantidade <= 0) {
      toast.error('Preencha todos os campos do produto');
      return;
    }

    // Verificar estoque disponível
    const produto = produtosDisponiveis.find(p => p.id === produtoSelecionado.id);
    if (produto) {
      const estoque = produto.estoque !== undefined ? produto.estoque : produto.quantidade;
      if (produtoSelecionado.quantidade > estoque) {
        toast.error(`Estoque insuficiente! Disponível: ${estoque} unidades`);
        return;
      }
    }

    const produtoExistente = novoPedido.itens.find(item => item.produtoId === produtoSelecionado.id);
    
    if (produtoExistente) {
      const novaQuantidade = produtoExistente.quantidade + produtoSelecionado.quantidade;
      const estoque = produto ? (produto.estoque !== undefined ? produto.estoque : produto.quantidade) : 0;
      if (novaQuantidade > estoque) {
        toast.error(`Quantidade total (${novaQuantidade}) excede o estoque disponível (${estoque})`);
        return;
      }
      const novosItens = novoPedido.itens.map(item =>
        item.produtoId === produtoSelecionado.id
          ? { ...item, quantidade: novaQuantidade }
          : item
      );
      setNovoPedido({ ...novoPedido, itens: novosItens });
      toast.success('Quantidade atualizada!');
    } else {
      setNovoPedido({
        ...novoPedido,
        itens: [
          ...novoPedido.itens,
          {
            produtoId: produtoSelecionado.id,
            produtoNome: produtoSelecionado.nome,
            marca: produtoSelecionado.marca,
            quantidade: produtoSelecionado.quantidade,
            quantidadeEntregue: 0
          }
        ]
      });
      toast.success('Produto adicionado!');
    }

    setProdutoSelecionado({
      id: '',
      nome: '',
      marca: '',
      quantidade: 1
    });
  };

  const handleRemoverItem = (index) => {
    const novosItens = novoPedido.itens.filter((_, i) => i !== index);
    setNovoPedido({ ...novoPedido, itens: novosItens });
    toast.success('Item removido');
  };

  const handleSalvarPedido = async () => {
    if (!novoPedido.dentistaId) {
      toast.error('Selecione um dentista');
      return;
    }
    if (!novoPedido.unidade) {
      toast.error('Unidade não informada');
      return;
    }
    if (novoPedido.itens.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    // Verificar estoque de todos os itens antes de enviar
    for (const item of novoPedido.itens) {
      const produto = produtosDisponiveis.find(p => p.id === item.produtoId);
      if (!produto) {
        toast.error(`Produto ${item.produtoNome} não encontrado no estoque`);
        return;
      }
      const estoque = produto.estoque !== undefined ? produto.estoque : produto.quantidade;
      if (item.quantidade > estoque) {
        toast.error(`Estoque insuficiente para ${item.produtoNome}. Disponível: ${estoque}`);
        return;
      }
    }

    try {
      const pedidoData = {
        dentistaId: novoPedido.dentistaId,
        dentistaNome: novoPedido.dentistaNome,
        unidade: novoPedido.unidade,
        tipo: novoPedido.tipo,
        status: 'pendente',
        dataPedido: new Date(),
        itens: novoPedido.itens,
        observacoes: novoPedido.observacoes || '',
        historico: [{
          data: new Date(),
          acao: 'Pedido criado pelo administrador',
          usuario: 'Admin',
          tipo: 'criacao'
        }]
      };

      await addDoc(collection(db, 'pedidos'), pedidoData);
      
      toast.success('Pedido criado com sucesso!');
      
      setNovoPedido({
        dentistaId: '',
        dentistaNome: '',
        unidade: '',
        tipo: 'avulso',
        observacoes: '',
        itens: []
      });
      setShowCriarModal(false);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao criar pedido');
    }
  };

  // Função para selecionar o dentista e preencher automaticamente os dados
  const handleSelecionarDentista = (dentistaId) => {
    const dentista = dentistas.find(d => d.id === dentistaId);
    if (dentista) {
      setNovoPedido({
        ...novoPedido,
        dentistaId: dentista.id,
        dentistaNome: dentista.nome,
        unidade: dentista.unidade || ''
      });
      
      toast.success(`Dentista selecionado: ${dentista.nome} - ${dentista.unidade || 'Unidade não cadastrada'}`);
    }
  };

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPedidos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);

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
        cancelado: 'Pedido cancelado!',
        separacao: 'Pedido em separação!'
      };
      
      toast.success(mensagens[novoStatus] || 'Status atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Reverter pedido entregue para aprovado
  const handleReverterEntrega = async (pedidoId) => {
    if (!window.confirm('⚠️ Deseja reverter o status do pedido de "Entregue" para "Aprovado"? Isso permitirá editar as quantidades novamente.')) return;
    
    try {
      const pedido = pedidos.find(p => p.id === pedidoId);
      await updateDoc(doc(db, 'pedidos', pedidoId), {
        status: 'aprovado',
        dataEntrega: null,
        historico: [
          ...(pedido?.historico || []),
          { 
            data: new Date(), 
            acao: 'Pedido revertido de Entregue para Aprovado',
            usuario: 'Admin',
            tipo: 'reversao'
          }
        ]
      });
      toast.success('Pedido revertido para aprovado!');
    } catch (error) {
      console.error('Erro ao reverter entrega:', error);
      toast.error('Erro ao reverter entrega');
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
    
    const deveMudarStatus = pedido.status === 'aprovado';
    const novoStatus = deveMudarStatus ? 'separacao' : pedido.status;
    
    try {
      await updateDoc(doc(db, 'pedidos', selectedPedido.id), {
        itens: novosItens,
        status: novoStatus,
        historico: [
          ...(pedido.historico || []),
          { 
            data: new Date(), 
            acao: `Quantidades atualizadas: ${alteracoes.join('; ')}${deveMudarStatus ? ' - Status alterado para EM SEPARAÇÃO' : ''}`,
            usuario: 'Admin',
            tipo: 'quantidade'
          }
        ]
      });
      
      setSelectedPedido({ 
        ...selectedPedido, 
        itens: novosItens, 
        status: novoStatus 
      });
      
      toast.success(deveMudarStatus ? 'Quantidades atualizadas! Status alterado para "Em Separação"' : 'Quantidades atualizadas!');
      setEditandoItens(false);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
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

  // Função de impressão
  const handleImprimir = () => {
    if (!selectedPedido) return;
    
    const dataRecebimentoFormatada = new Date().toLocaleDateString('pt-BR');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido ${selectedPedido.id?.slice(-6)}</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: white;
            color: #1a1a1a;
          }
          .print-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 8px;
          }
          .logo span {
            color: #2563eb;
          }
          .subtitle {
            color: #6b7280;
            font-size: 12px;
            margin-top: 5px;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin-top: 15px;
          }
          .info-section {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-pendente { background: #fef3c7; color: #92400e; }
          .status-aprovado { background: #dbeafe; color: #1e40af; }
          .status-separacao { background: #f3e8ff; color: #6b21a5; }
          .status-entregue { background: #dcfce7; color: #166534; }
          .status-cancelado { background: #fee2e2; color: #991b1b; }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
          }
          .items-table th {
            background: #f9fafb;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            border-bottom: 2px solid #e5e7eb;
          }
          .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          .items-table tr:last-child td {
            border-bottom: none;
          }
          .observacoes {
            background: #fffbeb;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            margin-bottom: 25px;
          }
          .observacoes-label {
            font-size: 12px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 6px;
          }
          .observacoes-admin {
            background: #f0fdf4;
            border-left-color: #22c55e;
          }
          .observacoes-admin .observacoes-label {
            color: #166534;
          }
          .assinatura-section {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px dashed #d1d5db;
          }
          .assinatura-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 20px;
          }
          .assinatura-box {
            text-align: center;
          }
          .assinatura-linha {
            margin-top: 40px;
            border-top: 1px solid #9ca3af;
            width: 80%;
            margin-left: auto;
            margin-right: auto;
          }
          .assinatura-texto {
            font-size: 11px;
            color: #6b7280;
            margin-top: 8px;
          }
          .data-recebimento {
            font-size: 12px;
            color: #4b5563;
            margin-top: 20px;
            text-align: right;
            font-style: italic;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <div class="logo">🦷 ORTO<span>DONSIST</span></div>
            <div class="subtitle">Materiais Odontológicos • Qualidade e Confiança</div>
            <div class="title">COMPROVANTE DE PEDIDO</div>
          </div>

          <div class="info-section">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Nº DO PEDIDO</span>
                <span class="info-value">#${selectedPedido.id?.slice(-8)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">DATA DO PEDIDO</span>
                <span class="info-value">${formatDateTime(selectedPedido.dataPedido)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">SOLICITANTE</span>
                <span class="info-value">${selectedPedido.dentistaNome || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">UNIDADE</span>
                <span class="info-value">${selectedPedido.unidade || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">TIPO DE PEDIDO</span>
                <span class="info-value">${selectedPedido.tipo === 'mensal' ? '📅 Pedido Mensal' : '📦 Pedido Avulso'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">STATUS</span>
                <span class="info-value">
                  <span class="status-badge status-${selectedPedido.status}">
                    ${getStatusText(selectedPedido.status)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr><th>Produto</th><th>Solicitado</th><th>Entregue</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${selectedPedido.itens.map(item => {
                const entregue = item.quantidadeEntregue || 0;
                const statusText = entregue === 0 ? 'Pendente' : (entregue === item.quantidade ? 'Completo' : 'Parcial');
                return `<tr>
                  <td><strong>${item.produtoNome}</strong>${item.marca ? `<br><small>${item.marca}</small>` : ''}</td>
                  <td>${item.quantidade} un.</td>
                  <td>${entregue} un.</td>
                  <td>${statusText}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>

          ${selectedPedido.observacoes ? `<div class="observacoes"><div class="observacoes-label">📝 OBSERVAÇÕES DO SOLICITANTE</div><div>${selectedPedido.observacoes}</div></div>` : ''}
          ${selectedPedido.observacoesAdmin ? `<div class="observacoes observacoes-admin"><div class="observacoes-label">📋 OBSERVAÇÕES DO ADMINISTRADOR</div><div>${selectedPedido.observacoesAdmin}</div></div>` : ''}

          <div class="assinatura-section">
            <div class="assinatura-grid">
              <div class="assinatura-box"><div class="assinatura-linha"></div><div class="assinatura-texto">Assinatura de quem recebeu</div></div>
              <div class="assinatura-box"><div class="assinatura-linha"></div><div class="assinatura-texto">Carimbo / Identificação</div></div>
            </div>
            <div class="data-recebimento">Data de recebimento: ${dataRecebimentoFormatada}</div>
          </div>

          <div class="footer">
            <div><strong>Ortodonsist</strong> - Materiais Odontológicos</div>
            <div style="font-size: 9px; margin-top: 8px;">Este documento é um comprovante válido do pedido realizado</div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 1000); };<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800',
      aprovado: 'bg-blue-100 text-blue-800',
      separacao: 'bg-purple-100 text-purple-800',
      entregue: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pendente': return <ClockIcon className="w-4 h-4" />;
      case 'aprovado': return <CheckCircleIcon className="w-4 h-4" />;
      case 'separacao': return <PencilIcon className="w-4 h-4" />;
      case 'entregue': return <TruckIcon className="w-4 h-4" />;
      case 'cancelado': return <XCircleIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    const texts = {
      pendente: 'Pendente',
      aprovado: 'Aprovado',
      separacao: 'Em Separação',
      entregue: 'Entregue',
      cancelado: 'Cancelado'
    };
    return texts[status] || status;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  const getHistoricoIcon = (tipo) => {
    const icons = {
      status: <ArrowPathIcon className="w-4 h-4 text-blue-500" />,
      quantidade: <PencilIcon className="w-4 h-4 text-green-500" />,
      observacao: <ChatBubbleLeftIcon className="w-4 h-4 text-purple-500" />,
      reabertura: <ArrowPathIcon className="w-4 h-4 text-orange-500" />,
      reversao: <ArrowPathIcon className="w-4 h-4 text-red-500" />
    };
    return icons[tipo] || <ClockIcon className="w-4 h-4 text-gray-500" />;
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Pedidos de Materiais</h1>
          <p className="text-sm text-gray-600">Gerencie os pedidos dos dentistas</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowCriarModal(true)} 
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Novo Pedido
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm sm:text-base w-full sm:w-auto justify-center">
            <DocumentArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-4">
        <div className="bg-white rounded-lg p-3 sm:p-4 border"><p className="text-xs sm:text-sm text-gray-500">Total</p><p className="text-xl sm:text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 border border-yellow-200"><p className="text-xs sm:text-sm text-yellow-600">Pendentes</p><p className="text-xl sm:text-2xl font-bold text-yellow-700">{stats.pendentes}</p></div>
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200"><p className="text-xs sm:text-sm text-blue-600">Aprovados</p><p className="text-xl sm:text-2xl font-bold text-blue-700">{stats.aprovados}</p></div>
        <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200"><p className="text-xs sm:text-sm text-purple-600">Em Separação</p><p className="text-xl sm:text-2xl font-bold text-purple-700">{stats.separacao}</p></div>
        <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200"><p className="text-xs sm:text-sm text-green-600">Entregues</p><p className="text-xl sm:text-2xl font-bold text-green-700">{stats.entregues}</p></div>
        <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200"><p className="text-xs sm:text-sm text-red-600">Cancelados</p><p className="text-xl sm:text-2xl font-bold text-red-700">{stats.cancelados}</p></div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input type="text" placeholder="Buscar por dentista, unidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 sm:pl-10 pr-3 py-2 border rounded-lg text-sm sm:text-base" />
        </div>
        <button onClick={() => setFiltrosAbertos(!filtrosAbertos)} className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg sm:hidden">
          <span className="text-sm font-medium text-gray-600">Filtros</span>
          <svg className={`w-5 h-5 transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div className={`${filtrosAbertos ? 'block' : 'hidden'} sm:flex sm:flex-row gap-3 mt-3 sm:mt-0`}>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm sm:text-base mb-2 sm:mb-0">
            <option value="todos">📋 Todos os status</option>
            <option value="pendente">🟡 Pendentes</option>
            <option value="aprovado">🔵 Aprovados</option>
            <option value="separacao">🟣 Em Separação</option>
            <option value="entregue">🟢 Entregues</option>
            <option value="cancelado">🔴 Cancelados</option>
          </select>
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm sm:text-base">
            <option value="todas">🏢 Todas unidades</option>
            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Tabela Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ID</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Solicitante</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Unidade</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tipo</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Itens</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Data Pedido</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Data Entrega</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ações</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">#{pedido.id?.slice(-6)}</td>
                  <td className="px-4 py-3 text-sm">{pedido.dentistaNome || '-'}</td>
                  <td className="px-4 py-3 text-sm">{pedido.unidade || '-'}</td>
                  <td className="px-4 py-3 text-sm">{pedido.tipo === 'mensal' ? '📅 Mensal' : '📦 Avulso'}</td>
                  <td className="px-4 py-3 text-sm">{pedido.itens?.length || 0} produtos</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(pedido.status)}`}>{getStatusIcon(pedido.status)}{getStatusText(pedido.status)}</span></td>
                  <td className="px-4 py-3 text-sm">{formatDate(pedido.dataPedido)}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(pedido.dataEntrega)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedPedido(pedido); setQuantidadesEntregues(pedido.itens?.reduce((acc, i, idx) => ({ ...acc, [idx]: i.quantidadeEntregue || 0 }), {}) || {}); setShowDetalhesModal(true); }} className="text-blue-600 hover:text-blue-800"><EyeIcon className="w-5 h-5" /></button>
                      {pedido.status === 'pendente' && (<><button onClick={() => handleAtualizarStatus(pedido.id, 'aprovado')} className="text-green-600 hover:text-green-800"><CheckCircleIcon className="w-5 h-5" /></button><button onClick={() => handleAtualizarStatus(pedido.id, 'cancelado')} className="text-red-600 hover:text-red-800"><XCircleIcon className="w-5 h-5" /></button></>)}
                      {pedido.status === 'aprovado' && (<button onClick={() => handleAtualizarStatus(pedido.id, 'entregue')} className="text-blue-600 hover:text-blue-800"><TruckIcon className="w-5 h-5" /></button>)}
                      {pedido.status === 'entregue' && (<button onClick={() => handleReverterEntrega(pedido.id)} className="text-orange-600 hover:text-orange-800"><ArrowPathIcon className="w-5 h-5" /></button>)}
                      {pedido.status === 'cancelado' && (<button onClick={() => handleReabrirPedido(pedido.id)} className="text-orange-600 hover:text-orange-800"><ArrowPathIcon className="w-5 h-5" /></button>)}
                      <button onClick={() => handleExcluirPedido(pedido.id)} className="text-red-600 hover:text-red-800"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPedidos.length === 0 && (<tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">Nenhum pedido encontrado</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards Mobile */}
      <div className="md:hidden space-y-4">
        {currentItems.map((pedido) => (
          <div key={pedido.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-start mb-3">
              <div><div className="flex items-center gap-2 flex-wrap mb-2"><span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#{pedido.id?.slice(-6)}</span><span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getStatusColor(pedido.status)}`}>{getStatusIcon(pedido.status)}{getStatusText(pedido.status)}</span><span className="text-xs text-gray-500">{pedido.tipo === 'mensal' ? '📅 Mensal' : '📦 Avulso'}</span></div><p className="font-medium text-gray-800">{pedido.dentistaNome}</p></div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedPedido(pedido); setQuantidadesEntregues(pedido.itens?.reduce((acc, i, idx) => ({ ...acc, [idx]: i.quantidadeEntregue || 0 }), {}) || {}); setShowDetalhesModal(true); }} className="text-blue-600"><EyeIcon className="w-5 h-5" /></button>
                {pedido.status === 'pendente' && (<><button onClick={() => handleAtualizarStatus(pedido.id, 'aprovado')} className="text-green-600"><CheckCircleIcon className="w-5 h-5" /></button><button onClick={() => handleAtualizarStatus(pedido.id, 'cancelado')} className="text-red-600"><XCircleIcon className="w-5 h-5" /></button></>)}
                {pedido.status === 'aprovado' && (<button onClick={() => handleAtualizarStatus(pedido.id, 'entregue')} className="text-blue-600"><TruckIcon className="w-5 h-5" /></button>)}
                {pedido.status === 'entregue' && (<button onClick={() => handleReverterEntrega(pedido.id)} className="text-orange-600"><ArrowPathIcon className="w-5 h-5" /></button>)}
                {pedido.status === 'cancelado' && (<button onClick={() => handleReabrirPedido(pedido.id)} className="text-orange-600"><ArrowPathIcon className="w-5 h-5" /></button>)}
                <button onClick={() => handleExcluirPedido(pedido.id)} className="text-red-600"><TrashIcon className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-gray-600"><BuildingOfficeIcon className="w-4 h-4" />{pedido.unidade}</div><div className="flex items-center gap-2 text-sm text-gray-600"><ShoppingCartIcon className="w-4 h-4" />{pedido.itens?.length || 0} produtos</div><div className="flex items-center gap-2 text-sm text-gray-600"><CalendarIcon className="w-4 h-4" />{formatDate(pedido.dataPedido)}</div></div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (<div className="flex justify-center items-center gap-2 mt-6"><button onClick={goToPreviousPage} disabled={currentPage === 1} className={`p-2 rounded-lg border ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}`}><ChevronLeftIcon className="w-5 h-5" /></button><span className="px-4 py-2 text-sm">Página {currentPage} de {totalPages}</span><button onClick={goToNextPage} disabled={currentPage === totalPages} className={`p-2 rounded-lg border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}`}><ChevronRightIcon className="w-5 h-5" /></button></div>)}

      {/* Modal de Detalhes */}
      {showDetalhesModal && selectedPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={() => setShowDetalhesModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-3 sm:p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Detalhes do Pedido</h2>
                <p className="text-xs sm:text-sm text-gray-500">#{selectedPedido.id}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleImprimir} className="text-gray-600 hover:text-gray-800" title="Imprimir">
                  <PrinterIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button onClick={() => setShowDetalhesModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
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
                    {getStatusText(selectedPedido.status)}
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
                  {(selectedPedido.status === 'aprovado' || selectedPedido.status === 'separacao') && !editandoItens && (
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
                                    item.tipo === 'reversao' ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {item.tipo === 'status' ? 'Status' :
                                     item.tipo === 'quantidade' ? 'Quantidade' :
                                     item.tipo === 'observacao' ? 'Observação' :
                                     item.tipo === 'reversao' ? 'Reversão' : 'Atualização'}
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
                {(selectedPedido.status === 'aprovado' || selectedPedido.status === 'separacao') && !editandoItens && (
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
                {selectedPedido.status === 'entregue' && (
                  <button
                    onClick={() => {
                      handleReverterEntrega(selectedPedido.id);
                      setShowDetalhesModal(false);
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                  >
                    Reverter Entrega
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

      {/* Modal de Criar Novo Pedido */}
      {showCriarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={() => setShowCriarModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-3 sm:p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Novo Pedido</h2>
                <p className="text-xs sm:text-sm text-gray-500">Preencha as informações do pedido</p>
              </div>
              <button onClick={() => setShowCriarModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Seção 1: Informações do Solicitante */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  Dados do Solicitante
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selecione o Dentista *
                    </label>
                    <select
                      value={novoPedido.dentistaId}
                      onChange={(e) => handleSelecionarDentista(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione um dentista</option>
                      {dentistas.map(dentista => (
                        <option key={dentista.id} value={dentista.id}>
                          👨‍⚕️ {dentista.nome} {dentista.unidade ? `- 🏢 ${dentista.unidade}` : ''}
                        </option>
                      ))}
                    </select>
                    {dentistas.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Nenhum dentista ativo encontrado. Cadastre dentistas em "Gerenciar Usuários"
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade *
                    </label>
                    <input
                      type="text"
                      value={novoPedido.unidade}
                      onChange={(e) => setNovoPedido({ ...novoPedido, unidade: e.target.value })}
                      placeholder="Unidade do dentista"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      A unidade é carregada automaticamente do cadastro do dentista
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Pedido *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="avulso"
                        checked={novoPedido.tipo === 'avulso'}
                        onChange={(e) => setNovoPedido({ ...novoPedido, tipo: e.target.value })}
                        className="text-blue-600"
                      />
                      <span>📦 Pedido Avulso</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="mensal"
                        checked={novoPedido.tipo === 'mensal'}
                        onChange={(e) => setNovoPedido({ ...novoPedido, tipo: e.target.value })}
                        className="text-blue-600"
                      />
                      <span>📅 Pedido Mensal</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Seção 2: Adicionar Produtos */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ShoppingCartIcon className="w-5 h-5 text-blue-600" />
                  Adicionar Produtos
                </h3>

                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Produto *
                      </label>
                      <select
                        value={produtoSelecionado.id}
                        onChange={(e) => {
                          const produto = produtosDisponiveis.find(p => p.id === e.target.value);
                          if (produto) {
                            setProdutoSelecionado({
                              id: produto.id,
                              nome: produto.nome,
                              marca: produto.marca || '',
                              quantidade: 1
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um produto</option>
                        {produtosDisponiveis.map(produto => {
                          const estoque = produto.estoque !== undefined ? produto.estoque : produto.quantidade;
                          return (
                            <option key={produto.id} value={produto.id}>
                              {produto.nome} {produto.marca ? `- ${produto.marca}` : ''} (Estoque: {estoque || 0})
                            </option>
                          );
                        })}
                      </select>
                      {produtosDisponiveis.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Nenhum produto disponível em estoque
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={produtoSelecionado.marca}
                        onChange={(e) => setProdutoSelecionado({ ...produtoSelecionado, marca: e.target.value })}
                        placeholder="Marca do produto"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantidade *
                      </label>
                      <input
                        type="number"
                        
                        value={produtoSelecionado.quantidade}
                        onChange={(e) => setProdutoSelecionado({ ...produtoSelecionado, quantidade: parseInt(e.target.value)  })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAdicionarItem}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + Adicionar Produto
                  </button>
                </div>

                {/* Lista de Produtos Adicionados */}
                {novoPedido.itens.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 font-medium text-sm">
                      Produtos Adicionados ({novoPedido.itens.length})
                    </div>
                    <div className="divide-y">
                      {novoPedido.itens.map((item, index) => (
                        <div key={index} className="px-4 py-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">{item.produtoNome}</p>
                            {item.marca && <p className="text-xs text-gray-500">Marca: {item.marca}</p>}
                            <p className="text-xs text-gray-600">Quantidade: {item.quantidade} un.</p>
                          </div>
                          <button
                            onClick={() => handleRemoverItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção 3: Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  value={novoPedido.observacoes}
                  onChange={(e) => setNovoPedido({ ...novoPedido, observacoes: e.target.value })}
                  rows="3"
                  placeholder="Informações adicionais sobre o pedido..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowCriarModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarPedido}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Criar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}