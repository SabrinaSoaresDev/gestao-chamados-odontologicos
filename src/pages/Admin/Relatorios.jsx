import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  orderBy,
  where 
} from 'firebase/firestore';
import { 
  DocumentArrowDownIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  WrenchIcon,
  ArrowPathIcon,
  FunnelIcon,
  CalendarIcon,
  ChevronDownIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [chamados, setChamados] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [periodo, setPeriodo] = useState('mes');
  const [tipoRelatorio, setTipoRelatorio] = useState('geral');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Carregar dados
  useEffect(() => {
    // Carregar chamados
    const chamadosQuery = query(
      collection(db, 'chamados'),
      orderBy('dataCriacao', 'desc')
    );

    const unsubscribeChamados = onSnapshot(chamadosQuery, (snapshot) => {
      const chamadosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate(),
        dataConclusao: doc.data().dataConclusao?.toDate()
      }));
      setChamados(chamadosData);
    });

    // Carregar usuários
    const usuariosQuery = query(collection(db, 'usuarios'));
    const unsubscribeUsuarios = onSnapshot(usuariosQuery, (snapshot) => {
      const usuariosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(usuariosData);
      setLoading(false);
    });

    return () => {
      unsubscribeChamados();
      unsubscribeUsuarios();
    };
  }, []);

  // Filtrar chamados por período
  const getChamadosFiltrados = () => {
    let filtrados = [...chamados];

    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59);
      
      filtrados = filtrados.filter(c => {
        const data = new Date(c.dataCriacao);
        return data >= inicio && data <= fim;
      });
    } else {
      const hoje = new Date();
      let dias = 30;
      
      if (periodo === 'semana') dias = 7;
      if (periodo === 'mes') dias = 30;
      if (periodo === 'trimestre') dias = 90;
      if (periodo === 'ano') dias = 365;
      
      const dataLimite = new Date(hoje.setDate(hoje.getDate() - dias));
      
      filtrados = filtrados.filter(c => new Date(c.dataCriacao) >= dataLimite);
    }

    return filtrados;
  };

  const chamadosFiltrados = getChamadosFiltrados();

  // Estatísticas
  const stats = {
    total: chamadosFiltrados.length,
    abertos: chamadosFiltrados.filter(c => c.status === 'aberto').length,
    andamento: chamadosFiltrados.filter(c => c.status === 'em_andamento').length,
    concluidos: chamadosFiltrados.filter(c => c.status === 'concluido').length,
    cancelados: chamadosFiltrados.filter(c => c.status === 'cancelado').length,
    
    urgentes: chamadosFiltrados.filter(c => c.prioridade === 'alta' || c.prioridade === 'emergencial').length,
    media: chamadosFiltrados.filter(c => c.prioridade === 'media').length,
    baixa: chamadosFiltrados.filter(c => c.prioridade === 'baixa').length,

    tempoMedio: calcularTempoMedio(),
    satisfacaoMedia: calcularSatisfacaoMedia(),
    
    chamadosPorTecnico: agruparPorTecnico(),
    chamadosPorEquipamento: agruparPorEquipamento()
  };

  function calcularTempoMedio() {
    const concluidos = chamadosFiltrados.filter(c => c.status === 'concluido' && c.dataCriacao && c.dataConclusao);
    if (concluidos.length === 0) return 0;
    
    const totalHoras = concluidos.reduce((acc, c) => {
      const diff = (c.dataConclusao - c.dataCriacao) / (1000 * 60 * 60);
      return acc + diff;
    }, 0);
    
    return (totalHoras / concluidos.length).toFixed(1);
  }

  function calcularSatisfacaoMedia() {
    const avaliados = chamadosFiltrados.filter(c => c.avaliacao);
    if (avaliados.length === 0) return 0;
    
    const soma = avaliados.reduce((acc, c) => acc + (c.avaliacao?.nota || 0), 0);
    return (soma / avaliados.length).toFixed(1);
  }

  function agruparPorTecnico() {
    const tecnicos = {};
    chamadosFiltrados.forEach(c => {
      if (c.tecnicoNome) {
        tecnicos[c.tecnicoNome] = (tecnicos[c.tecnicoNome] || 0) + 1;
      }
    });
    
    return Object.entries(tecnicos)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }

  function agruparPorEquipamento() {
    const equipamentos = {};
    chamadosFiltrados.forEach(c => {
      if (c.equipamento) {
        equipamentos[c.equipamento] = (equipamentos[c.equipamento] || 0) + 1;
      }
    });
    
    return Object.entries(equipamentos)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }

  // Gerar PDF
  const gerarPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text('Ortodonsist - Relatório', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Período: ${periodo}`, 14, 30);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 38);
    
    // Estatísticas
    autoTable(doc, {
      startY: 45,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Chamados', stats.total],
        ['Abertos', stats.abertos],
        ['Em Andamento', stats.andamento],
        ['Concluídos', stats.concluidos],
        ['Cancelados', stats.cancelados],
        ['Tempo Médio', stats.tempoMedio + 'h'],
        ['Satisfação', stats.satisfacaoMedia + '/5']
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 51, 102] }
    });

    doc.save(`relatorio-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  // Gerar Excel
  const gerarExcel = () => {
    const dados = chamadosFiltrados.map(c => ({
      ID: c.id?.slice(-6),
      Título: c.titulo,
      Equipamento: c.equipamento,
      Status: c.status,
      Prioridade: c.prioridade,
      Técnico: c.tecnicoNome || 'Não atribuído',
      'Data Abertura': c.dataCriacao?.toLocaleDateString('pt-BR'),
      'Data Conclusão': c.dataConclusao?.toLocaleDateString('pt-BR') || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
    XLSX.writeFile(wb, `relatorio-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Excel gerado com sucesso!');
  };

  // Gerar CSV
  const gerarCSV = () => {
    const headers = ['ID', 'Título', 'Status', 'Prioridade', 'Técnico', 'Data'];
    const linhas = chamadosFiltrados.map(c => [
      c.id?.slice(-6),
      c.titulo,
      c.status,
      c.prioridade,
      c.tecnicoNome || 'Não atribuído',
      c.dataCriacao?.toLocaleDateString('pt-BR')
    ]);
    
    const csv = [headers, ...linhas].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('CSV gerado com sucesso!');
  };

  const handleExportar = (formato) => {
    setExportando(true);
    try {
      if (formato === 'pdf') gerarPDF();
      if (formato === 'excel') gerarExcel();
      if (formato === 'csv') gerarCSV();
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-600">Análise completa do sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExportar('pdf')}
            disabled={exportando}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            PDF
          </button>
          <button
            onClick={() => handleExportar('excel')}
            disabled={exportando}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Excel
          </button>
          <button
            onClick={() => handleExportar('csv')}
            disabled={exportando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setShowFiltros(!showFiltros)}
          className="w-full px-4 py-3 flex items-center justify-between text-gray-700 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5" />
            <span className="font-medium">Filtros</span>
          </div>
          <ChevronDownIcon className={`w-5 h-5 transition-transform ${showFiltros ? 'rotate-180' : ''}`} />
        </button>

        {showFiltros && (
          <div className="p-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="semana">Última semana</option>
                  <option value="mes">Último mês</option>
                  <option value="trimestre">Último trimestre</option>
                  <option value="ano">Último ano</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              {periodo === 'personalizado' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Total de Chamados</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs mt-2">No período selecionado</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Concluídos</p>
          <p className="text-2xl font-bold">{stats.concluidos}</p>
          <p className="text-xs mt-2">{((stats.concluidos / stats.total) * 100 || 0).toFixed(1)}% do total</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Tempo Médio</p>
          <p className="text-2xl font-bold">{stats.tempoMedio}h</p>
          <p className="text-xs mt-2">Para conclusão</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Satisfação</p>
          <p className="text-2xl font-bold">{stats.satisfacaoMedia}</p>
          <p className="text-xs mt-2">Média de {stats.satisfacaoMedia}/5</p>
        </div>
      </div>

      {/* Tabela de Chamados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Detalhamento dos Chamados</h3>
          <p className="text-sm text-gray-500 mt-1">Mostrando {chamadosFiltrados.length} chamados</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chamadosFiltrados.slice(0, 10).map((chamado) => (
                <tr key={chamado.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">#{chamado.id?.slice(-6)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{chamado.titulo}</p>
                    <p className="text-xs text-gray-500">{chamado.equipamento}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                      chamado.status === 'aberto' ? 'bg-yellow-100 text-yellow-700' :
                      chamado.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                      chamado.status === 'concluido' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {chamado.status === 'aberto' && 'Aberto'}
                      {chamado.status === 'em_andamento' && 'Em Andamento'}
                      {chamado.status === 'concluido' && 'Concluído'}
                      {chamado.status === 'cancelado' && 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                      chamado.prioridade === 'alta' || chamado.prioridade === 'emergencial' ? 'bg-red-100 text-red-700' :
                      chamado.prioridade === 'media' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {chamado.prioridade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{chamado.tecnicoNome || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {chamado.dataCriacao?.toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipamentos mais problemáticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">Top Equipamentos com Problemas</h3>
          <div className="space-y-3">
            {stats.chamadosPorEquipamento.map((eq, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{eq.nome}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(eq.quantidade / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{eq.quantidade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">Top Técnicos</h3>
          <div className="space-y-3">
            {stats.chamadosPorTecnico.map((tec, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{tec.nome}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full"
                      style={{ width: `${(tec.quantidade / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{tec.quantidade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}