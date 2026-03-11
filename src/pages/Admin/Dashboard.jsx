import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  limit,
  where 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  UsersIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  EyeIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import GerenciarUsuariosModal from '../../pages/Admin/GerenciarUsuariosModal';
import RelatoriosModal from '../../pages/Admin/RelatoriosModal';
import {Link} from 'react-router-dom';

// Registrar componentes do Chart.js
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
);

export default function AdminDashboard() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalChamados: 0,
    chamadosAbertos: 0,
    chamadosAndamento: 0,
    chamadosConcluidos: 0,
    chamadosCancelados: 0,
    totalTecnicos: 0,
    totalDentistas: 0,
    tempoMedioAtendimento: 0,
    satisfacaoMedia: 0,
    chamadosUrgentes: 0,
    taxaResolucao: 0
  });
  
  const [chamadosRecentes, setChamadosRecentes] = useState([]);
  const [chamadosPorDia, setChamadosPorDia] = useState([]);
  const [tecnicosStatus, setTecnicosStatus] = useState([]);
  const [topTecnicos, setTopTecnicos] = useState([]);
  const [equipamentosProblema, setEquipamentosProblema] = useState([]);
  
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [showRelatoriosModal, setShowRelatoriosModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [periodo, setPeriodo] = useState('semana');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('7dias');

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Escutar mudanças nos chamados
        const chamadosQuery = query(
          collection(db, 'chamados'),
          orderBy('dataCriacao', 'desc')
        );
        
        const unsubscribeChamados = onSnapshot(chamadosQuery, (snapshot) => {
          const chamados = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dataCriacao: doc.data().dataCriacao?.toDate()
          }));

          // Calcular estatísticas detalhadas
          const abertos = chamados.filter(c => c.status === 'aberto').length;
          const andamento = chamados.filter(c => c.status === 'em_andamento').length;
          const concluidos = chamados.filter(c => c.status === 'concluido').length;
          const cancelados = chamados.filter(c => c.status === 'cancelado').length;
          const urgentes = chamados.filter(c => c.prioridade === 'alta' || c.prioridade === 'emergencial').length;
          
          // Calcular taxa de resolução
          const totalResolvidos = concluidos;
          const taxaResolucao = chamados.length > 0 ? (totalResolvidos / chamados.length) * 100 : 0;

          // Calcular média de satisfação
          const chamadosAvaliados = chamados.filter(c => c.avaliacao);
          const somaNotas = chamadosAvaliados.reduce((acc, c) => acc + (c.avaliacao?.nota || 0), 0);
          const satisfacaoMedia = chamadosAvaliados.length > 0 ? somaNotas / chamadosAvaliados.length : 0;

          setStats(prev => ({
            ...prev,
            totalChamados: chamados.length,
            chamadosAbertos: abertos,
            chamadosAndamento: andamento,
            chamadosConcluidos: concluidos,
            chamadosCancelados: cancelados,
            chamadosUrgentes: urgentes,
            satisfacaoMedia: satisfacaoMedia,
            taxaResolucao: taxaResolucao
          }));

          // Chamados recentes
          const recentes = chamados.slice(0, 5);
          setChamadosRecentes(recentes);

          // Agrupar chamados por dia (últimos 7 dias)
          const ultimos7Dias = [];
          for (let i = 6; i >= 0; i--) {
            const data = new Date();
            data.setDate(data.getDate() - i);
            data.setHours(0, 0, 0, 0);
            
            const dataFim = new Date(data);
            dataFim.setHours(23, 59, 59, 999);
            
            const chamadosDia = chamados.filter(c => {
              const dataChamado = new Date(c.dataCriacao);
              return dataChamado >= data && dataChamado <= dataFim;
            });
            
            ultimos7Dias.push({
              data: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
              abertos: chamadosDia.filter(c => c.status === 'aberto').length,
              andamento: chamadosDia.filter(c => c.status === 'em_andamento').length,
              concluidos: chamadosDia.filter(c => c.status === 'concluido').length,
              total: chamadosDia.length
            });
          }
          setChamadosPorDia(ultimos7Dias);

          // Equipamentos com mais problemas
          const equipamentosMap = new Map();
          chamados.forEach(c => {
            if (c.equipamento) {
              const count = equipamentosMap.get(c.equipamento) || 0;
              equipamentosMap.set(c.equipamento, count + 1);
            }
          });
          
          const topEquipamentos = Array.from(equipamentosMap.entries())
            .map(([nome, count]) => ({ nome, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          setEquipamentosProblema(topEquipamentos);
        });

        // Carregar usuários
        const usuariosQuery = query(collection(db, 'usuarios'));
        const unsubscribeUsuarios = onSnapshot(usuariosQuery, (snapshot) => {
          const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const tecnicos = usuarios.filter(u => u.role === 'tecnico').length;
          const dentistas = usuarios.filter(u => u.role === 'dentista').length;

          setStats(prev => ({
            ...prev,
            totalTecnicos: tecnicos,
            totalDentistas: dentistas
          }));

          // Status dos técnicos em tempo real
          const tecnicosAtivos = usuarios
            .filter(u => u.role === 'tecnico' && u.ativo)
            .map(t => ({
              id: t.id,
              nome: t.nome,
              chamadosAtivos: 0,
              concluidosHoje: 0,
              status: 'disponivel',
              foto: t.foto
            }));
          setTecnicosStatus(tecnicosAtivos);

          // Top técnicos por desempenho
          const tecnicosComChamados = usuarios
            .filter(u => u.role === 'tecnico')
            .map(t => ({
              nome: t.nome,
              chamadosConcluidos: 0,
              mediaAvaliacao: 0
            }))
            .sort((a, b) => b.chamadosConcluidos - a.chamadosConcluidos)
            .slice(0, 3);
          setTopTecnicos(tecnicosComChamados);
        });

        setLoading(false);

        return () => {
          unsubscribeChamados();
          unsubscribeUsuarios();
        };
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados do dashboard');
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  // Dados para os gráficos
  const dadosStatus = {
    labels: ['Abertos', 'Em Andamento', 'Concluídos', 'Cancelados'],
    datasets: [
      {
        data: [
          stats.chamadosAbertos, 
          stats.chamadosAndamento, 
          stats.chamadosConcluidos,
          stats.chamadosCancelados
        ],
        backgroundColor: ['#FCD34D', '#60A5FA', '#34D399', '#9CA3AF'],
        borderColor: ['#F59E0B', '#3B82F6', '#10B981', '#6B7280'],
        borderWidth: 1,
      },
    ],
  };

  const dadosEvolucao = {
    labels: chamadosPorDia.map(d => d.data),
    datasets: [
      {
        label: 'Chamados Abertos',
        data: chamadosPorDia.map(d => d.abertos),
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Em Andamento',
        data: chamadosPorDia.map(d => d.andamento),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Concluídos',
        data: chamadosPorDia.map(d => d.concluidos),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      },
    ],
  };

  const dadosEquipamentos = {
    labels: equipamentosProblema.map(e => e.nome),
    datasets: [
      {
        label: 'Número de Chamados',
        data: equipamentosProblema.map(e => e.count),
        backgroundColor: '#3B82F6',
        borderRadius: 6,
      },
    ],
  };

  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      }
    },
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
      case 'cancelado': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPrioridadeBadge = (prioridade) => {
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
          <p className="text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com boas-vindas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Olá, {userData?.nome}! 
          </h1>
          <p className="text-gray-600">
            Bem-vindo ao painel administrativo do DentalCare
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRelatoriosModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <DocumentArrowDownIcon className="w-5 h-5 text-gray-600" />
            <span className="hidden sm:inline">Relatórios</span>
          </button>
          
          <button
            onClick={() => setShowUsuariosModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <UserPlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas Principal */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Total de Chamados */}
  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
        <WrenchScrewdriverIcon className="w-7 h-7" />
      </div>
      <span className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm font-medium">
        Total
      </span>
    </div>
    <p className="text-4xl font-bold mb-1">{stats.totalChamados}</p>
    <p className="text-sm text-blue-100 font-medium">Chamados Totais</p>
    <div className="mt-4 flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full" style={{ width: '100%' }}></div>
      </div>
      <span className="text-xs text-white/80">100%</span>
    </div>
  </div>

  {/* Abertos */}
  <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
        <ClockIcon className="w-7 h-7" />
      </div>
      <span className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm font-medium">
        Abertos
      </span>
    </div>
    <p className="text-4xl font-bold mb-1">{stats.chamadosAbertos}</p>
    <p className="text-sm text-yellow-100 font-medium">Aguardando Atendimento</p>
    <div className="mt-4 flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
        <div 
          className="h-full bg-white rounded-full" 
          style={{ width: `${stats.totalChamados > 0 ? (stats.chamadosAbertos / stats.totalChamados) * 100 : 0}%` }}
        ></div>
      </div>
      <span className="text-xs text-white/80">
        {stats.totalChamados > 0 ? ((stats.chamadosAbertos / stats.totalChamados) * 100).toFixed(1) : 0}%
      </span>
    </div>
  </div>

  {/* Concluídos */}
  <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
        <CheckCircleIcon className="w-7 h-7" />
      </div>
      <span className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm font-medium">
        Concluídos
      </span>
    </div>
    <p className="text-4xl font-bold mb-1">{stats.chamadosConcluidos}</p>
    <p className="text-sm text-green-100 font-medium">Chamados Concluídos</p>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="bg-white/20 rounded-lg p-2 text-center">
        <p className="text-xs text-green-100">Taxa</p>
        <p className="text-lg font-bold">{stats.taxaResolucao.toFixed(1)}%</p>
      </div>
      <div className="bg-white/20 rounded-lg p-2 text-center">
        <p className="text-xs text-green-100">Este mês</p>
        <p className="text-lg font-bold">{stats.chamadosConcluidos}</p>
      </div>
    </div>
  </div>

  {/* Satisfação */}
  <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
        <StarIcon className="w-7 h-7" />
      </div>
      <span className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm font-medium">
        Satisfação
      </span>
    </div>
    <p className="text-4xl font-bold mb-1">{stats.satisfacaoMedia > 0 ? stats.satisfacaoMedia.toFixed(1) : '0.0'}</p>
    <p className="text-sm text-purple-100 font-medium">
      {stats.satisfacaoMedia > 0 ? `Média de ${stats.satisfacaoMedia.toFixed(1)}/5` : 'Aguardando avaliações'}
    </p>
    <div className="mt-4 flex items-center justify-between">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((nota) => (
          <StarIcon 
            key={nota} 
            className={`w-5 h-5 ${nota <= Math.round(stats.satisfacaoMedia) ? 'text-yellow-300' : 'text-white/30'}`}
            fill={nota <= Math.round(stats.satisfacaoMedia) ? 'currentColor' : 'none'}
          />
        ))}
      </div>
      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
        {stats.chamadosAvaliados || 0} avaliações
      </span>
    </div>
  </div>
</div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Em Andamento</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-blue-600">{stats.chamadosAndamento}</p>
            <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin-slow" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Urgentes</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-red-600">{stats.chamadosUrgentes}</p>
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Técnicos</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-purple-600">{stats.totalTecnicos}</p>
            <UsersIcon className="w-5 h-5 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Dentistas</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-green-600">{stats.totalDentistas}</p>
            <BuildingOfficeIcon className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Pizza - Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Status</h3>
          <div className="h-64">
            <Pie data={dadosStatus} options={opcoesGrafico} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span>Abertos: {stats.chamadosAbertos}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span>Andamento: {stats.chamadosAndamento}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span>Concluídos: {stats.chamadosConcluidos}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span>Cancelados: {stats.chamadosCancelados}</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Linha - Evolução */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Evolução de Chamados</h3>
            <select 
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="7dias">Últimos 7 dias</option>
              <option value="15dias">Últimos 15 dias</option>
              <option value="30dias">Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-64">
            <Line data={dadosEvolucao} options={opcoesGrafico} />
          </div>
        </div>
      </div>

      {/* Equipamentos com mais problemas e Top Técnicos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Equipamentos */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Equipamentos com mais Problemas</h3>
          <div className="h-64">
            <Bar data={dadosEquipamentos} options={{
              ...opcoesGrafico,
              indexAxis: 'y',
              plugins: {
                ...opcoesGrafico.plugins,
                legend: { display: false }
              }
            }} />
          </div>
        </div>

        {/* Top Técnicos */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Técnicos</h3>
          <div className="space-y-4">
            {topTecnicos.map((tecnico, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-yellow-100' :
                    index === 1 ? 'bg-gray-100' :
                    'bg-orange-100'
                  }`}>
                    <span className={`font-bold ${
                      index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-gray-600' :
                      'text-orange-600'
                    }`}>#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{tecnico.nome}</p>
                    <p className="text-xs text-gray-500">
                      {tecnico.chamadosConcluidos} chamados concluídos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    {tecnico.mediaAvaliacao > 0 ? `${tecnico.mediaAvaliacao} ★` : 'Sem avaliação'}
                  </p>
                </div>
              </div>
            ))}
            {topTecnicos.length === 0 && (
              <p className="text-center text-gray-500 py-4">Nenhum técnico encontrado</p>
            )}
          </div>
        </div>
      </div>

      {/* Chamados Recentes e Status dos Técnicos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Chamados Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Chamados Recentes</h3>
              <Link to="/admin/chamados" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Ver todos
              </Link>
            </div>
            
            {/* Filtros */}
            <div className="flex gap-3 mt-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar chamados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos status</option>
                <option value="aberto">Abertos</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluídos</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chamado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chamadosRecentes.map((chamado) => (
                  <tr key={chamado.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{chamado.titulo}</div>
                      <div className="text-xs text-gray-500">{chamado.equipamento}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{chamado.solicitanteNome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getStatusColor(chamado.status)}`}>
                        {getStatusIcon(chamado.status)}
                        {chamado.status === 'aberto' && 'Aberto'}
                        {chamado.status === 'em_andamento' && 'Em Andamento'}
                        {chamado.status === 'concluido' && 'Concluído'}
                        {chamado.status === 'cancelado' && 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPrioridadeBadge(chamado.prioridade)}`}>
                        {chamado.prioridade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(chamado.dataCriacao)}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800">
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {chamadosRecentes.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      Nenhum chamado encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status dos Técnicos */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Técnicos em Atividade</h3>
            <button
              onClick={() => setShowUsuariosModal(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Gerenciar usuários"
            >
              <UserPlusIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {tecnicosStatus.map((tecnico, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {tecnico.nome?.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{tecnico.nome}</p>
                    <p className="text-xs text-gray-500">
                      <span className="text-green-600 font-medium">Online</span> • {tecnico.chamadosAtivos} chamados
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Hoje</span>
                  <p className="font-medium text-green-600">{tecnico.concluidosHoje}</p>
                </div>
              </div>
            ))}

            {tecnicosStatus.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                Nenhum técnico ativo no momento
              </p>
            )}
          </div>

        
        </div>
      </div>

      {/* Modais */}
      <GerenciarUsuariosModal 
        isOpen={showUsuariosModal}
        onClose={() => setShowUsuariosModal(false)}
      />
      
      <RelatoriosModal
        isOpen={showRelatoriosModal}
        onClose={() => setShowRelatoriosModal(false)}
      />
      
      
    </div>
  );
}