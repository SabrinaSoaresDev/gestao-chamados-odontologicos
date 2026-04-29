import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  limit,
  where,
  getDocs
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
  BuildingOfficeIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  ComputerDesktopIcon,
  DocumentTextIcon
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
import { Link } from 'react-router-dom';

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

// ============================================
// COMPONENTE MODAL DE DETALHES DO CHAMADO
// ============================================
function DetalhesChamadoModal({ chamado, isOpen, onClose }) {
  if (!isOpen || !chamado) return null;

  const getStatusColor = (status) => {
    switch(status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concluido': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelado': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPrioridadeColor = (prioridade) => {
    switch(prioridade) {
      case 'emergencial': return 'bg-red-600 text-white';
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baixa': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPrioridadeTexto = (prioridade) => {
    switch(prioridade) {
      case 'emergencial': return '🚨 Emergencial';
      case 'alta': return '🔴 Alta';
      case 'media': return '🟡 Média';
      case 'baixa': return '🟢 Baixa';
      default: return '📌 Normal';
    }
  };

  const getStatusTexto = (status) => {
    switch(status) {
      case 'aberto': return '📋 Aberto';
      case 'em_andamento': return '⚙️ Em Andamento';
      case 'concluido': return '✅ Concluído';
      case 'cancelado': return '❌ Cancelado';
      default: return status;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Não definida';
    try {
      return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Para debug - veja no console o que está vindo
  console.log('Modal abriu com chamado:', chamado);

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Container do Modal */}
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Detalhes do Chamado
                    </h3>
                    <p className="text-sm text-blue-100">ID: {chamado.id?.slice(0, 8)}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-lg p-1 transition"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content - Scrollável */}
            <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {/* Título e Status */}
              <div className="mb-6">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <h2 className="text-2xl font-bold text-gray-800">{chamado.titulo || 'Sem título'}</h2>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(chamado.status)}`}>
                      {getStatusTexto(chamado.status)}
                    </span>
                    <span className={`px-3 py-1 text-sm rounded-full font-medium ${getPrioridadeColor(chamado.prioridade)}`}>
                      {getPrioridadeTexto(chamado.prioridade)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid de informações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Solicitante */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-700">Solicitante</h4>
                  </div>
                  <p className="text-gray-900 font-medium">{chamado.solicitanteNome || 'Não informado'}</p>
                  <p className="text-sm text-gray-500">{chamado.solicitanteEmail || 'Email não informado'}</p>
                </div>

                {/* Equipamento */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ComputerDesktopIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-700">Equipamento</h4>
                  </div>
                  <p className="text-gray-900 font-medium">{chamado.equipamento || 'Não informado'}</p>
                  <p className="text-sm text-gray-500">Tipo: {chamado.tipoEquipamento || 'Não especificado'}</p>
                </div>

                {/* Data de Criação */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-700">Datas</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Abertura:</span> {formatDate(chamado.dataCriacao)}
                  </p>
                  {chamado.dataConclusao && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Conclusão:</span> {formatDate(chamado.dataConclusao)}
                    </p>
                  )}
                </div>

                {/* Técnico Responsável */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UsersIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-700">Técnico</h4>
                  </div>
                  <p className="text-gray-900 font-medium">{chamado.tecnicoNome || 'Não atribuído'}</p>
                  {chamado.tecnicoEmail && (
                    <p className="text-sm text-gray-500">{chamado.tecnicoEmail}</p>
                  )}
                </div>
              </div>

              {/* Descrição */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-700">Descrição do Problema</h4>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {chamado.descricao || 'Nenhuma descrição fornecida'}
                  </p>
                </div>
              </div>

              {/* Solução (se concluído) */}
              {chamado.solucao && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-700">Solução Aplicada</h4>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{chamado.solucao}</p>
                  </div>
                </div>
              )}

              {/* Avaliação (se houver) */}
              {chamado.avaliacao && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <StarIcon className="w-5 h-5 text-yellow-500" />
                    <h4 className="font-semibold text-gray-700">Avaliação do Cliente</h4>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((nota) => (
                          <StarIcon 
                            key={nota} 
                            className={`w-5 h-5 ${nota <= chamado.avaliacao?.nota ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        ({chamado.avaliacao?.nota}/5)
                      </span>
                    </div>
                    {chamado.avaliacao?.comentario && (
                      <p className="text-gray-700 text-sm mt-2 italic">
                        "{chamado.avaliacao.comentario}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6  flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL DASHBOARD
// ============================================
export default function AdminDashboard() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
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
    taxaResolucao: 0,
    chamadosAvaliados: 0
  });
  
  const [chamadosRecentes, setChamadosRecentes] = useState([]);
  const [chamadosPorDia, setChamadosPorDia] = useState([]);
  const [tecnicosStatus, setTecnicosStatus] = useState([]);
  const [topTecnicos, setTopTecnicos] = useState([]);
  const [equipamentosProblema, setEquipamentosProblema] = useState([]);
  
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [showRelatoriosModal, setShowRelatoriosModal] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('7dias');

  // Função para abrir modal de detalhes - CORRIGIDA
  const handleViewChamado = (chamado) => {
    console.log('Abrindo modal do chamado:', chamado);
    setChamadoSelecionado(chamado);
    setShowDetalhesModal(true);
  };

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
            dataCriacao: doc.data().dataCriacao?.toDate(),
            dataConclusao: doc.data().dataConclusao?.toDate()
          }));

          console.log('Chamados carregados:', chamados.length);

          // Calcular estatísticas detalhadas
          const abertos = chamados.filter(c => c.status === 'aberto').length;
          const andamento = chamados.filter(c => c.status === 'em_andamento').length;
          const concluidos = chamados.filter(c => c.status === 'concluido').length;
          const cancelados = chamados.filter(c => c.status === 'cancelado').length;
          const urgentes = chamados.filter(c => c.prioridade === 'alta' || c.prioridade === 'emergencial').length;
          
          const totalResolvidos = concluidos;
          const taxaResolucao = chamados.length > 0 ? (totalResolvidos / chamados.length) * 100 : 0;

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
            taxaResolucao: taxaResolucao,
            chamadosAvaliados: chamadosAvaliados.length
          }));

          // Chamados recentes com filtro
          let filteredChamados = [...chamados];
          
          if (filtroStatus !== 'todos') {
            filteredChamados = filteredChamados.filter(c => c.status === filtroStatus);
          }
          
          if (searchTerm) {
            filteredChamados = filteredChamados.filter(c => 
              c.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.solicitanteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.equipamento?.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
          
          setChamadosRecentes(filteredChamados.slice(0, 10));

          // Agrupar chamados por dia
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
        const unsubscribeUsuarios = onSnapshot(usuariosQuery, async (snapshot) => {
          const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const tecnicos = usuarios.filter(u => u.role === 'tecnico');
          const dentistas = usuarios.filter(u => u.role === 'dentista');

          setStats(prev => ({
            ...prev,
            totalTecnicos: tecnicos.length,
            totalDentistas: dentistas.length
          }));

          const chamadosSnapshot = await getDocs(collection(db, 'chamados'));
          const todosChamados = chamadosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dataCriacao: doc.data().dataCriacao?.toDate(),
            dataConclusao: doc.data().dataConclusao?.toDate()
          }));

          // Status dos técnicos
          const tecnicosComMetricas = tecnicos
            .filter(t => t.ativo !== false)
            .map(tecnico => {
              const chamadosAtivos = todosChamados.filter(c => 
                c.tecnicoId === tecnico.id && 
                (c.status === 'aberto' || c.status === 'em_andamento')
              ).length;
              
              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);
              const concluidosHoje = todosChamados.filter(c => 
                c.tecnicoId === tecnico.id && 
                c.status === 'concluido' &&
                c.dataConclusao >= hoje
              ).length;

              return {
                id: tecnico.id,
                nome: tecnico.nome || 'Sem nome',
                chamadosAtivos: chamadosAtivos,
                concluidosHoje: concluidosHoje,
                status: chamadosAtivos > 0 ? 'ocupado' : 'disponivel'
              };
            })
            .sort((a, b) => b.concluidosHoje - a.concluidosHoje);

          setTecnicosStatus(tecnicosComMetricas);

          // Top técnicos
          const tecnicosComDesempenho = tecnicos.map(tecnico => {
            const chamadosDoTecnico = todosChamados.filter(c => c.tecnicoId === tecnico.id);
            const chamadosConcluidos = chamadosDoTecnico.filter(c => c.status === 'concluido').length;
            
            const avaliacoes = chamadosDoTecnico
              .filter(c => c.avaliacao?.nota)
              .map(c => c.avaliacao.nota);
            
            const mediaAvaliacao = avaliacoes.length > 0 
              ? avaliacoes.reduce((a, b) => a + b, 0) / avaliacoes.length 
              : 0;

            return {
              id: tecnico.id,
              nome: tecnico.nome || 'Sem nome',
              chamadosConcluidos: chamadosConcluidos,
              mediaAvaliacao: mediaAvaliacao
            };
          })
          .filter(t => t.chamadosConcluidos > 0)
          .sort((a, b) => b.mediaAvaliacao - a.mediaAvaliacao)
          .slice(0, 5);

          setTopTecnicos(tecnicosComDesempenho);
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
  }, [filtroStatus, searchTerm]);

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
    labels: equipamentosProblema.map(e => e.nome?.length > 20 ? e.nome.substring(0, 20) + '...' : e.nome),
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
            Bem-vindo ao painel administrativo do Ortodonsist
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
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Em Andamento</p>
          <p className="text-2xl font-bold text-blue-600">{stats.chamadosAndamento}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Urgentes</p>
          <p className="text-2xl font-bold text-red-600">{stats.chamadosUrgentes}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Técnicos</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalTecnicos}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Dentistas</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalDentistas}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Status</h3>
          <div className="h-64">
            <Pie data={dadosStatus} options={opcoesGrafico} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Evolução de Chamados</h3>
            <select 
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="7dias">Últimos 7 dias</option>
            </select>
          </div>
          <div className="h-64">
            <Line data={dadosEvolucao} options={opcoesGrafico} />
          </div>
        </div>
      </div>

      {/* Equipamentos e Top Técnicos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Equipamentos com mais Problemas</h3>
          <div className="h-64">
            {equipamentosProblema.length > 0 ? (
              <Bar data={dadosEquipamentos} options={{
                ...opcoesGrafico,
                indexAxis: 'y',
                plugins: { legend: { display: false } }
              }} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Top Técnicos</h3>
          <div className="space-y-4">
            {topTecnicos.length > 0 ? (
              topTecnicos.map((tecnico, index) => (
                <div key={tecnico.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{tecnico.nome}</p>
                      <p className="text-xs text-gray-500">✅ {tecnico.chamadosConcluidos} concluídos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarIcon className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{tecnico.mediaAvaliacao.toFixed(1)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum técnico com chamados</p>
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
              <h3 className="text-lg font-semibold text-gray-800">📋 Chamados Recentes</h3>
              <Link to="/admin/chamados" className="text-sm text-blue-600 hover:text-blue-800">
                Ver todos →
              </Link>
            </div>
            
            <div className="flex gap-3 mt-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar chamados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
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
                      <div className="text-sm font-medium text-gray-900">{chamado.titulo || 'Sem título'}</div>
                      <div className="text-xs text-gray-500">{chamado.equipamento || 'Sem equipamento'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{chamado.solicitanteNome || 'Desconhecido'}</div>
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
                        {chamado.prioridade || 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(chamado.dataCriacao)}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleViewChamado(chamado)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Visualizar chamado"
                      >
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
            <h3 className="text-lg font-semibold text-gray-800">👨‍🔧 Técnicos em Atividade</h3>
            <button
              onClick={() => setShowUsuariosModal(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              <UserPlusIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {tecnicosStatus.length > 0 ? (
              tecnicosStatus.map((tecnico, index) => (
                <div key={tecnico.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {tecnico.nome?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${tecnico.status === 'disponivel' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{tecnico.nome}</p>
                      <p className="text-xs text-gray-500">
                        {tecnico.status === 'disponivel' ? '🟢 Disponível' : '🟡 Ocupado'} • {tecnico.chamadosAtivos} ativos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Hoje</p>
                    <p className="font-medium text-green-600">{tecnico.concluidosHoje}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum técnico ativo</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Chamado */}
      <DetalhesChamadoModal 
        chamado={chamadoSelecionado}
        isOpen={showDetalhesModal}
        onClose={() => {
          setShowDetalhesModal(false);
          setChamadoSelecionado(null);
        }}
      />

      {/* Modais existentes */}
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