import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  doc,
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  UserCircleIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  StarIcon,
  XMarkIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import NovoChamadoModal from '../../components/Chamados/NovoChamadoModal';

// Componente de Gráfico de Barras Simplificado
const BarChart = ({ data, title, color = 'blue' }) => {
  // Verificar se há dados
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8">
          <ShoppingCartIcon className="w-16 h-16 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  const getColorClass = (colorName) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    };
    return colors[colorName] || 'bg-blue-500';
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-semibold text-gray-800">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-700 ${getColorClass(color)}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t text-center text-sm text-gray-500">
        Total: {data.reduce((sum, item) => sum + item.value, 0)}
      </div>
    </div>
  );
};

// Componente de Gráfico de Pizza Simplificado
const PieChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Se não há dados, mostrar mensagem
  if (total === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  let currentAngle = 0;
  
  const colors = [
    { bg: '#3B82F6', hover: '#2563EB' }, // blue
    { bg: '#10B981', hover: '#059669' }, // green
    { bg: '#F59E0B', hover: '#D97706' }, // yellow
    { bg: '#EF4444', hover: '#DC2626' }, // red
    { bg: '#8B5CF6', hover: '#7C3AED' }, // purple
    { bg: '#F97316', hover: '#EA580C' }  // orange
  ];
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="flex flex-col items-center">
        {/* Gráfico de Pizza Simples usando SVG */}
        <svg width="150" height="150" viewBox="0 0 150 150" className="mb-4">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = startAngle + angle;
            currentAngle = endAngle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = 75 + 60 * Math.cos(startRad);
            const y1 = 75 + 60 * Math.sin(startRad);
            const x2 = 75 + 60 * Math.cos(endRad);
            const y2 = 75 + 60 * Math.sin(endRad);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            const pathData = `M 75 75 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={colors[index % colors.length].bg}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                stroke="white"
                strokeWidth="2"
              >
                <title>{item.label}: {item.value} ({percentage.toFixed(1)}%)</title>
              </path>
            );
          })}
        </svg>
        
        {/* Legenda */}
        <div className="grid grid-cols-2 gap-2 w-full mt-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[index % colors.length].bg }}
              />
              <span className="text-gray-600">{item.label}</span>
              <span className="font-semibold ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
        
        {/* Total */}
        <div className="mt-3 pt-2 border-t text-center text-sm text-gray-500">
          Total: {total}
        </div>
      </div>
    </div>
  );
};

export default function DentistaDashboard() {
  const { userData } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [filteredChamados, setFilteredChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAvaliarModal, setShowAvaliarModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [avaliacao, setAvaliacao] = useState({
    nota: 5,
    comentario: ''
  });
  const [viewMode, setViewMode] = useState('grid');

  // Buscar chamados do dentista
  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'chamados'),
      where('solicitanteId', '==', userData.uid),
      orderBy('dataCriacao', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chamadosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate(),
        dataConclusao: doc.data().dataConclusao?.toDate()
      }));
      setChamados(chamadosData);
      setFilteredChamados(chamadosData);
    }, (error) => {
      console.error('Erro ao carregar chamados:', error);
      toast.error('Erro ao carregar seus chamados');
    });

    return () => unsubscribe();
  }, [userData]);

  // Buscar pedidos do dentista
  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'pedidos'),
      where('dentistaId', '==', userData.uid),
      orderBy('dataPedido', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pedidosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataPedido: doc.data().dataPedido?.toDate()
      }));
      setPedidos(pedidosData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar pedidos:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  useEffect(() => {
    let filtered = chamados;
    
    if (searchTerm) {
      filtered = filtered.filter(chamado =>
        chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'todos') {
      filtered = filtered.filter(chamado => chamado.status === filterStatus);
    }

    if (filterPrioridade !== 'todos') {
      filtered = filtered.filter(chamado => chamado.prioridade === filterPrioridade);
    }
    
    setFilteredChamados(filtered);
  }, [searchTerm, filterStatus, filterPrioridade, chamados]);

  const handleAvaliarChamado = async () => {
    if (!selectedChamado) return;

    if (!avaliacao.comentario.trim()) {
      toast.error('Por favor, deixe um comentário sobre o atendimento');
      return;
    }

    try {
      const chamadoRef = doc(db, 'chamados', selectedChamado.id);
      await updateDoc(chamadoRef, {
        avaliacao: {
          nota: avaliacao.nota,
          comentario: avaliacao.comentario,
          data: new Date(),
          avaliador: userData.nome
        },
        status: 'avaliado',
        historico: [
          ...(selectedChamado.historico || []),
          {
            data: new Date(),
            acao: `Chamado avaliado com nota ${avaliacao.nota}/5`,
            usuario: userData.nome,
            tipo: 'avaliacao',
            detalhes: avaliacao.comentario
          }
        ]
      });

      toast.success(`Avaliação enviada! Nota: ${avaliacao.nota}/5`);
      setShowAvaliarModal(false);
      setAvaliacao({ nota: 5, comentario: '' });
    } catch (error) {
      console.error('Erro ao avaliar chamado:', error);
      toast.error('Erro ao enviar avaliação');
    }
  };

  // Estatísticas para os gráficos
  const chamadosPorStatus = [
    { label: 'Abertos', value: chamados.filter(c => c.status === 'aberto').length },
    { label: 'Em Andamento', value: chamados.filter(c => c.status === 'em_andamento').length },
    { label: 'Concluídos', value: chamados.filter(c => c.status === 'concluido').length },
    { label: 'Avaliados', value: chamados.filter(c => c.status === 'avaliado').length },
    { label: 'Cancelados', value: chamados.filter(c => c.status === 'cancelado').length }
  ];

  const chamadosPorPrioridade = [
    { label: 'Emergencial', value: chamados.filter(c => c.prioridade === 'emergencial').length },
    { label: 'Alta', value: chamados.filter(c => c.prioridade === 'alta').length },
    { label: 'Média', value: chamados.filter(c => c.prioridade === 'media').length },
    { label: 'Baixa', value: chamados.filter(c => c.prioridade === 'baixa').length }
  ];

  const pedidosPorStatus = [
    { label: 'Pendentes', value: pedidos.filter(p => p.status === 'pendente').length },
    { label: 'Aprovados', value: pedidos.filter(p => p.status === 'aprovado').length },
    { label: 'Entregues', value: pedidos.filter(p => p.status === 'entregue').length },
    { label: 'Cancelados', value: pedidos.filter(p => p.status === 'cancelado').length }
  ];

  const avaliacoes = chamados.filter(c => c.avaliacao);
  const mediaAvaliacoes = avaliacoes.length > 0 
    ? (avaliacoes.reduce((acc, c) => acc + c.avaliacao.nota, 0) / avaliacoes.length).toFixed(1)
    : 0;

  const distribuicaoNotas = [
    { nota: 5, quantidade: avaliacoes.filter(a => a.avaliacao.nota === 5).length },
    { nota: 4, quantidade: avaliacoes.filter(a => a.avaliacao.nota === 4).length },
    { nota: 3, quantidade: avaliacoes.filter(a => a.avaliacao.nota === 3).length },
    { nota: 2, quantidade: avaliacoes.filter(a => a.avaliacao.nota === 2).length },
    { nota: 1, quantidade: avaliacoes.filter(a => a.avaliacao.nota === 1).length }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'aberto': return 'bg-yellow-500';
      case 'em_andamento': return 'bg-blue-500';
      case 'concluido': return 'bg-green-500';
      case 'avaliado': return 'bg-purple-500';
      case 'cancelado': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'aberto': return <ClockIcon className="w-4 h-4" />;
      case 'em_andamento': return <ArrowPathIcon className="w-4 h-4" />;
      case 'concluido': return <CheckCircleIcon className="w-4 h-4" />;
      case 'avaliado': return <StarIcon className="w-4 h-4" />;
      case 'cancelado': return <XMarkIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      case 'avaliado': return 'Avaliado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getPrioridadeColor = (prioridade) => {
    switch(prioridade) {
      case 'emergencial': return 'bg-red-600 text-white';
      case 'alta': return 'bg-red-500 text-white';
      case 'media': return 'bg-yellow-500 text-white';
      case 'baixa': return 'bg-green-500 text-white';
      default: return 'bg-gray-300';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Olá, Dr(a). {userData?.nome?.split(' ')[0]}!
            </h1>
            <p className="text-blue-100">Acompanhe seus chamados e pedidos</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition shadow-lg font-semibold"
          >
            <PlusIcon className="w-5 h-5" />
            Novo Chamado
          </button>
        </div>
      </div>

      {/* Cards Resumo Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <DocumentTextIcon className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-800">{chamados.length}</span>
          </div>
          <p className="text-sm text-gray-600">Total Chamados</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCartIcon className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold text-gray-800">{pedidos.length}</span>
          </div>
          <p className="text-sm text-gray-600">Total Pedidos</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-green-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <StarIcon className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold text-gray-800">{mediaAvaliacoes}</span>
          </div>
          <p className="text-sm text-gray-600">Média Avaliações</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-yellow-500 rounded-full" style={{ width: `${(mediaAvaliacoes / 5) * 100}%` }}></div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <ClockIcon className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-gray-800">
              {chamados.filter(c => c.status === 'aberto' || c.status === 'em_andamento').length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Em Andamento</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-orange-500 rounded-full" style={{ width: `${(chamados.filter(c => c.status === 'aberto' || c.status === 'em_andamento').length / chamados.length) * 100 || 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Gráficos - Primeira Linha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChart data={chamadosPorStatus.filter(s => s.value > 0)} title="📊 Chamados por Status" />
        <PieChart data={chamadosPorPrioridade.filter(p => p.value > 0)} title="⚠️ Chamados por Prioridade" />
      </div>

      {/* Gráficos - Segunda Linha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart data={pedidosPorStatus.filter(p => p.value > 0)} title="📦 Pedidos por Status" color="green" />
        
        {/* Distribuição de Notas */}
        {avaliacoes.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">⭐ Distribuição das Avaliações</h3>
            <div className="space-y-3">
              {distribuicaoNotas.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-yellow-500">{item.nota} ★</span>
                      <span className="text-gray-600">{item.quantidade} avaliações</span>
                    </div>
                    <span className="font-semibold text-gray-800">
                      {avaliacoes.length > 0 ? ((item.quantidade / avaliacoes.length) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-2 rounded-full transition-all duration-700 bg-yellow-500"
                      style={{ width: `${avaliacoes.length > 0 ? (item.quantidade / avaliacoes.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t text-center">
              <p className="text-sm text-gray-600">
                Média geral: <span className="font-bold text-yellow-600 text-lg">{mediaAvaliacoes}</span> / 5
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">⭐ Distribuição das Avaliações</h3>
            <div className="flex flex-col items-center justify-center py-8">
              <StarIcon className="w-16 h-16 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Nenhuma avaliação ainda</p>
              <p className="text-xs text-gray-400 mt-1">Quando seus chamados forem concluídos, você poderá avaliá-los</p>
            </div>
          </div>
        )}
      </div>

      {/* Últimos Chamados e Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos Chamados */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">📋 Últimos Chamados</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {chamados.slice(0, 5).map((chamado) => (
              <div key={chamado.id} className="p-4 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => {
                  setSelectedChamado(chamado);
                  setShowDetailsModal(true);
                }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{chamado.titulo}</p>
                    <p className="text-xs text-gray-500">{chamado.equipamento}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getPrioridadeColor(chamado.prioridade)}`}>
                        {chamado.prioridade}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${getStatusColor(chamado.status)}`}>
                        {getStatusIcon(chamado.status)}
                        {getStatusText(chamado.status)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatDate(chamado.dataCriacao)}</p>
                    {chamado.avaliacao && (
                      <div className="flex items-center gap-1 text-xs mt-1">
                        <StarIconSolid className="w-3 h-3 text-yellow-500" />
                        <span>{chamado.avaliacao.nota}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {chamados.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nenhum chamado encontrado
              </div>
            )}
          </div>
        </div>

        {/* Últimos Pedidos */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">📦 Últimos Pedidos</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {pedidos.slice(0, 5).map((pedido) => (
              <div key={pedido.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">
                      {pedido.tipo === 'mensal' ? '📅 Pedido Mensal' : '📦 Pedido Avulso'}
                    </p>
                    <p className="text-xs text-gray-500">Unidade: {pedido.unidade}</p>
                    <p className="text-xs text-gray-500">{pedido.itens?.length || 0} itens</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      pedido.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                      pedido.status === 'aprovado' ? 'bg-blue-100 text-blue-800' :
                      pedido.status === 'entregue' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pedido.status === 'pendente' && <ClockIcon className="w-3 h-3" />}
                      {pedido.status === 'aprovado' && <CheckCircleIcon className="w-3 h-3" />}
                      {pedido.status === 'entregue' && <TruckIcon className="w-3 h-3" />}
                      {pedido.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(pedido.dataPedido)}</p>
                  </div>
                </div>
              </div>
            ))}
            {pedidos.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nenhum pedido encontrado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtros e Lista de Chamados */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar chamados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="todos">Todos Status</option>
            <option value="aberto">Abertos</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluídos</option>
            <option value="avaliado">Avaliados</option>
            <option value="cancelado">Cancelados</option>
          </select>

          <select
            value={filterPrioridade}
            onChange={(e) => setFilterPrioridade(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="todos">Todas Prioridades</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="emergencial">Emergencial</option>
          </select>
        </div>
      </div>

      {/* Lista de Chamados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChamados.map((chamado) => (
          <div
            key={chamado.id}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition cursor-pointer"
            onClick={() => {
              setSelectedChamado(chamado);
              setShowDetailsModal(true);
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPrioridadeColor(chamado.prioridade)}`}>
                {chamado.prioridade}
              </span>
              <span className="text-xs text-gray-400">#{chamado.id?.slice(-6)}</span>
            </div>
            
            <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">{chamado.titulo}</h3>
            <p className="text-sm text-gray-500 mb-3">{chamado.equipamento}</p>
            
            <div className="flex justify-between items-center">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${getStatusColor(chamado.status)}`}>
                {getStatusIcon(chamado.status)}
                {getStatusText(chamado.status)}
              </span>
              
              {chamado.status === 'concluido' && !chamado.avaliacao && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChamado(chamado);
                    setShowAvaliarModal(true);
                  }}
                  className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg hover:bg-yellow-200"
                >
                  Avaliar
                </button>
              )}
              
              {chamado.avaliacao && (
                <div className="flex items-center gap-1 text-xs">
                  <StarIconSolid className="w-3 h-3 text-yellow-500" />
                  <span>{chamado.avaliacao.nota}/5</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredChamados.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <WrenchScrewdriverIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum chamado encontrado</p>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{selectedChamado.titulo}</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Equipamento</label>
                  <p className="font-medium">{selectedChamado.equipamento}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Prioridade</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getPrioridadeColor(selectedChamado.prioridade)}`}>
                      {selectedChamado.prioridade}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${getStatusColor(selectedChamado.status)}`}>
                      {getStatusIcon(selectedChamado.status)}
                      {getStatusText(selectedChamado.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Data</label>
                  <p>{selectedChamado.dataCriacao?.toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Descrição</label>
                <p className="mt-1 text-gray-700">{selectedChamado.descricao}</p>
              </div>

              {selectedChamado.tecnicoNome && (
                <div>
                  <label className="text-xs text-gray-500">Técnico</label>
                  <div className="flex items-center gap-2 mt-1">
                    <UserCircleIcon className="w-5 h-5 text-gray-400" />
                    <p className="font-medium">{selectedChamado.tecnicoNome}</p>
                  </div>
                </div>
              )}

              {selectedChamado.solucao && (
                <div>
                  <label className="text-xs text-gray-500">Solução</label>
                  <p className="mt-1 text-gray-700 bg-green-50 p-3 rounded-lg">{selectedChamado.solucao}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                {selectedChamado.status === 'concluido' && !selectedChamado.avaliacao && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowAvaliarModal(true);
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Avaliar Atendimento
                  </button>
                )}
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avaliação */}
      {showAvaliarModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAvaliarModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Avaliar Atendimento</h2>
              <p className="text-sm text-gray-500">{selectedChamado.titulo}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nota</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((nota) => (
                    <button
                      key={nota}
                      onClick={() => setAvaliacao({ ...avaliacao, nota })}
                      className={`p-2 rounded-lg transition ${avaliacao.nota >= nota ? 'text-yellow-500' : 'text-gray-300'}`}
                    >
                      <StarIconSolid className="w-8 h-8" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Comentário *</label>
                <textarea
                  rows={4}
                  value={avaliacao.comentario}
                  onChange={(e) => setAvaliacao({ ...avaliacao, comentario: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Como foi o atendimento? O problema foi resolvido?"
                />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowAvaliarModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleAvaliarChamado} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Enviar Avaliação
              </button>
            </div>
          </div>
        </div>
      )}

      <NovoChamadoModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        solicitanteId={userData?.uid}
        solicitanteNome={userData?.nome}
      />
    </div>
  );
}