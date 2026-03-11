import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { 
  XMarkIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  WrenchIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function RelatoriosModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [chamados, setChamados] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [periodo, setPeriodo] = useState('mes');
  const [tipoRelatorio, setTipoRelatorio] = useState('geral');
  const [formato, setFormato] = useState('pdf');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

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
  }, [isOpen]);

  // Filtrar chamados por período
  const getChamadosFiltrados = () => {
    let filtrados = [...chamados];

    if (periodo === 'personalizado' && dataInicio && dataFim) {
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

  // Gerar PDF
  const gerarPDF = (dados, tipo) => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text('DentalCare - Relatório', 14, 20);
    
    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(dados.tipo, 14, 30);
    
    // Período
    doc.setFontSize(10);
    doc.text(`Período: ${dados.periodo}`, 14, 38);
    doc.text(`Data de geração: ${dados.dataGeracao}`, 14, 44);
    
    let yPos = 50;

    if (tipo === 'equipamentos') {
      // Tabela de equipamentos
      autoTable(doc, {
        startY: yPos,
        head: [['Equipamento', 'Quantidade de Chamados']],
        body: dados.equipamentos.map(e => [e.nome, e.quantidade]),
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102] }
      });
    } 
    else if (tipo === 'tecnicos') {
      // Tabela de técnicos
      autoTable(doc, {
        startY: yPos,
        head: [['Técnico', 'Chamados', 'Concluídos', 'Média']],
        body: dados.tecnicos.map(t => [t.nome, t.chamadosAtendidos, t.concluidos, t.mediaAvaliacao]),
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102] }
      });
    }
    else if (tipo === 'tempo') {
      doc.text(`Tempo Médio Geral: ${dados.tempoMedioGeral} horas`, 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 10,
        head: [['Técnico', 'Tempo Médio (horas)']],
        body: dados.porTecnico.map(t => [t.nome, t.tempoMedio]),
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102] }
      });
    }
    else {
      // Relatório Geral
      // Estatísticas
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Resumo Estatístico', 14, yPos);
      
      const stats = [
        ['Total de Chamados', dados.estatisticas.total],
        ['Abertos', dados.estatisticas.abertos],
        ['Em Andamento', dados.estatisticas.andamento],
        ['Concluídos', dados.estatisticas.concluidos],
        ['Cancelados', dados.estatisticas.cancelados],
        ['Tempo Médio', dados.estatisticas.tempoMedio + ' horas'],
        ['Satisfação Média', dados.estatisticas.satisfacaoMedia + '/5']
      ];
      
      autoTable(doc, {
        startY: yPos + 10,
        head: [['Métrica', 'Valor']],
        body: stats,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102] }
      });
      
      // Tabela de chamados
      yPos = doc.lastAutoTable.finalY + 10;
      
      doc.text('Detalhamento dos Chamados', 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['ID', 'Título', 'Status', 'Prioridade', 'Técnico', 'Data']],
        body: dados.chamados.slice(0, 20).map(c => [
          c.id?.slice(-6),
          c.titulo,
          c.status,
          c.prioridade,
          c.tecnico,
          c.dataAbertura
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102] }
      });
    }

    // Salvar PDF
    doc.save(`relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Gerar dados do relatório baseado no tipo
  const gerarDadosRelatorio = () => {
    const chamadosFiltrados = getChamadosFiltrados();
    
    const tecnicos = usuarios.filter(u => u.role === 'tecnico');

    // Estatísticas gerais
    const stats = {
      total: chamadosFiltrados.length,
      abertos: chamadosFiltrados.filter(c => c.status === 'aberto').length,
      andamento: chamadosFiltrados.filter(c => c.status === 'em_andamento').length,
      concluidos: chamadosFiltrados.filter(c => c.status === 'concluido').length,
      cancelados: chamadosFiltrados.filter(c => c.status === 'cancelado').length,
      
      tempoMedio: calcularTempoMedio(chamadosFiltrados),
      satisfacaoMedia: calcularSatisfacaoMedia(chamadosFiltrados),
      
      chamadosPorEquipamento: agruparPorEquipamento(chamadosFiltrados)
    };

    switch(tipoRelatorio) {
      case 'geral':
        return {
          tipo: 'Relatório Geral',
          periodo: periodo,
          dataGeracao: new Date().toLocaleString('pt-BR'),
          estatisticas: stats,
          chamados: chamadosFiltrados.map(c => ({
            id: c.id,
            titulo: c.titulo,
            status: c.status,
            prioridade: c.prioridade,
            tecnico: c.tecnicoNome || 'Não atribuído',
            solicitante: c.solicitanteNome,
            dataAbertura: c.dataCriacao?.toLocaleDateString('pt-BR')
          }))
        };
        
      case 'tecnicos':
        return {
          tipo: 'Desempenho dos Técnicos',
          periodo: periodo,
          dataGeracao: new Date().toLocaleString('pt-BR'),
          tecnicos: usuarios.filter(u => u.role === 'tecnico').map(t => ({
            nome: t.nome,
            email: t.email,
            chamadosAtendidos: chamadosFiltrados.filter(c => c.tecnicoId === t.id).length,
            concluidos: chamadosFiltrados.filter(c => c.tecnicoId === t.id && c.status === 'concluido').length,
            mediaAvaliacao: calcularMediaAvaliacaoTecnico(t.id, chamadosFiltrados)
          }))
        };
        
      case 'equipamentos':
        return {
          tipo: 'Manutenção por Equipamento',
          periodo: periodo,
          dataGeracao: new Date().toLocaleString('pt-BR'),
          equipamentos: stats.chamadosPorEquipamento
        };
        
      case 'tempo':
        return {
          tipo: 'Tempo de Atendimento',
          periodo: periodo,
          dataGeracao: new Date().toLocaleString('pt-BR'),
          tempoMedioGeral: stats.tempoMedio,
          porTecnico: usuarios.filter(u => u.role === 'tecnico').map(t => ({
            nome: t.nome,
            tempoMedio: calcularTempoMedioTecnico(t.id, chamadosFiltrados)
          }))
        };
        
      default:
        return {};
    }
  };

  function calcularTempoMedio(chamados) {
    const concluidos = chamados.filter(c => c.status === 'concluido' && c.dataCriacao && c.dataConclusao);
    if (concluidos.length === 0) return 0;
    
    const totalHoras = concluidos.reduce((acc, c) => {
      const diff = (c.dataConclusao - c.dataCriacao) / (1000 * 60 * 60);
      return acc + diff;
    }, 0);
    
    return (totalHoras / concluidos.length).toFixed(1);
  }

  function calcularSatisfacaoMedia(chamados) {
    const avaliados = chamados.filter(c => c.avaliacao);
    if (avaliados.length === 0) return 0;
    
    const soma = avaliados.reduce((acc, c) => acc + (c.avaliacao?.nota || 0), 0);
    return (soma / avaliados.length).toFixed(1);
  }

  function agruparPorEquipamento(chamados) {
    const equipamentos = {};
    chamados.forEach(c => {
      if (c.equipamento) {
        equipamentos[c.equipamento] = (equipamentos[c.equipamento] || 0) + 1;
      }
    });
    
    return Object.entries(equipamentos)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }

  function calcularMediaAvaliacaoTecnico(tecnicoId, chamados) {
    const chamadosTecnico = chamados.filter(c => c.tecnicoId === tecnicoId && c.avaliacao);
    if (chamadosTecnico.length === 0) return 0;
    
    const soma = chamadosTecnico.reduce((acc, c) => acc + (c.avaliacao?.nota || 0), 0);
    return (soma / chamadosTecnico.length).toFixed(1);
  }

  function calcularTempoMedioTecnico(tecnicoId, chamados) {
    const chamadosTecnico = chamados.filter(c => 
      c.tecnicoId === tecnicoId && 
      c.status === 'concluido' && 
      c.dataCriacao && 
      c.dataConclusao
    );
    
    if (chamadosTecnico.length === 0) return 0;
    
    const totalHoras = chamadosTecnico.reduce((acc, c) => {
      const diff = (c.dataConclusao - c.dataCriacao) / (1000 * 60 * 60);
      return acc + diff;
    }, 0);
    
    return (totalHoras / chamadosTecnico.length).toFixed(1);
  }

  const handleGerarRelatorio = async () => {
    setLoading(true);
    
    try {
      const dados = gerarDadosRelatorio();
      
      if (formato === 'pdf') {
        gerarPDF(dados, tipoRelatorio);
        toast.success('PDF gerado com sucesso!');
      } 
      else if (formato === 'json') {
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-${tipoRelatorio}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        toast.success('JSON gerado com sucesso!');
      } 
      else if (formato === 'csv') {
        let csv = '';
        
        if (tipoRelatorio === 'equipamentos') {
          const headers = ['Equipamento', 'Quantidade de Chamados'];
          const linhas = dados.equipamentos.map(e => [e.nome, e.quantidade]);
          csv = [headers, ...linhas].map(row => row.join(',')).join('\n');
        } else {
          const headers = ['ID', 'Título', 'Status', 'Prioridade', 'Técnico', 'Data'];
          const linhas = dados.chamados?.map(c => [
            c.id?.slice(-6),
            c.titulo,
            c.status,
            c.prioridade,
            c.tecnico,
            c.dataAbertura
          ]) || [];
          csv = [headers, ...linhas].map(row => row.join(',')).join('\n');
        }
        
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-${tipoRelatorio}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('CSV gerado com sucesso!');
      }

      onClose();
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const relatorios = [
    {
      id: 'geral',
      nome: 'Relatório Geral',
      descricao: 'Visão completa de todos os chamados',
      icon: ChartBarIcon,
      cor: 'blue'
    },
    {
      id: 'tecnicos',
      nome: 'Desempenho dos Técnicos',
      descricao: 'Análise de produtividade da equipe',
      icon: UserGroupIcon,
      cor: 'green'
    },
    {
      id: 'equipamentos',
      nome: 'Manutenção por Equipamento',
      descricao: 'Histórico de problemas por equipamento',
      icon: WrenchIcon,
      cor: 'purple'
    },
    {
      id: 'tempo',
      nome: 'Tempo de Atendimento',
      descricao: 'Métricas de tempo médio de resolução',
      icon: ClockIcon,
      cor: 'orange'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Relatórios</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Seleção de tipo de relatório */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Tipo de Relatório</h3>
            <div className="grid grid-cols-2 gap-3">
              {relatorios.map((rel) => {
                const Icon = rel.icon;
                return (
                  <button
                    key={rel.id}
                    onClick={() => setTipoRelatorio(rel.id)}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      tipoRelatorio === rel.id
                        ? `border-${rel.cor}-500 bg-${rel.cor}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 text-${rel.cor}-600 mb-2`} />
                    <h4 className="font-medium text-gray-800">{rel.nome}</h4>
                    <p className="text-xs text-gray-500 mt-1">{rel.descricao}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção de período */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Período</h3>
            <div className="space-y-3">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="semana">Última semana</option>
                <option value="mes">Último mês</option>
                <option value="trimestre">Último trimestre</option>
                <option value="ano">Último ano</option>
                <option value="personalizado">Personalizado</option>
              </select>
              
              {periodo === 'personalizado' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Opções de formato */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Formato de Exportação</h3>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="formato" 
                  value="pdf" 
                  checked={formato === 'pdf'}
                  onChange={(e) => setFormato(e.target.value)}
                  className="mr-2" 
                />
                PDF
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="formato" 
                  value="csv" 
                  checked={formato === 'csv'}
                  onChange={(e) => setFormato(e.target.value)}
                  className="mr-2" 
                />
                CSV
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="formato" 
                  value="json" 
                  checked={formato === 'json'}
                  onChange={(e) => setFormato(e.target.value)}
                  className="mr-2" 
                />
                JSON
              </label>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleGerarRelatorio}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  Gerar Relatório
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}