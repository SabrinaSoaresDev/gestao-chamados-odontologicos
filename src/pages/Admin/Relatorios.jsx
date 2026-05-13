import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot,
  orderBy,
  where,
  getDocs
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
  PrinterIcon,
  UserCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PauseIcon,
  BuildingStorefrontIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [chamados, setChamados] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [showFiltros, setShowFiltros] = useState(true);
  const [exportando, setExportando] = useState(false);

  // Estados dos filtros
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Carregar chamados
  useEffect(() => {
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

    // Carregar técnicos
    const tecnicosQuery = query(
      collection(db, 'usuarios'),
      where('role', '==', 'tecnico'),
      where('ativo', '==', true)
    );
    
    const unsubscribeTecnicos = onSnapshot(tecnicosQuery, (snapshot) => {
      const tecnicosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTecnicos(tecnicosData);
      setLoading(false);
    });

    return () => {
      unsubscribeChamados();
      unsubscribeTecnicos();
    };
  }, []);

  // Função para aplicar todos os filtros
  const getChamadosFiltrados = () => {
    let filtrados = [...chamados];

    // Filtro por técnico
    if (filtroTecnico !== 'todos') {
      filtrados = filtrados.filter(c => c.tecnicoId === filtroTecnico);
    }

    // Filtro por prioridade
    if (filtroPrioridade !== 'todos') {
      filtrados = filtrados.filter(c => c.prioridade === filtroPrioridade);
    }

    // Filtro por status
    if (filtroStatus !== 'todos') {
      filtrados = filtrados.filter(c => c.status === filtroStatus);
    }

    // Filtro por período (data inicial e fim)
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59);
      
      filtrados = filtrados.filter(c => {
        const data = new Date(c.dataCriacao);
        return data >= inicio && data <= fim;
      });
    } else if (dataInicio) {
      const inicio = new Date(dataInicio);
      filtrados = filtrados.filter(c => new Date(c.dataCriacao) >= inicio);
    } else if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59);
      filtrados = filtrados.filter(c => new Date(c.dataCriacao) <= fim);
    }

    return filtrados;
  };

  const chamadosFiltrados = getChamadosFiltrados();

  // Verificar se há filtros ativos
  const temFiltrosAtivos = () => {
    return filtroTecnico !== 'todos' || 
           filtroPrioridade !== 'todos' || 
           filtroStatus !== 'todos' || 
           dataInicio !== '' || 
           dataFim !== '';
  };

  // Estatísticas
  const stats = {
    total: chamadosFiltrados.length,
    abertos: chamadosFiltrados.filter(c => c.status === 'aberto').length,
    andamento: chamadosFiltrados.filter(c => c.status === 'em_andamento').length,
    concluidos: chamadosFiltrados.filter(c => c.status === 'concluido').length,
    cancelados: chamadosFiltrados.filter(c => c.status === 'cancelado').length,
    emPausa: chamadosFiltrados.filter(c => c.status === 'em_pausa').length,
    emOficina: chamadosFiltrados.filter(c => c.status === 'em_oficina').length,
    aguardandoPecas: chamadosFiltrados.filter(c => c.status === 'aguardando_pecas').length,
    
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
    const tecnicosMap = {};
    chamadosFiltrados.forEach(c => {
      if (c.tecnicoNome) {
        tecnicosMap[c.tecnicoNome] = (tecnicosMap[c.tecnicoNome] || 0) + 1;
      }
    });
    
    return Object.entries(tecnicosMap)
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

  // Formatar data para exibição
  const formatarData = (data) => {
    if (!data) return '-';
    try {
      const date = data instanceof Date ? data : data.toDate?.() || new Date(data);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const formatarDataHora = (data) => {
    if (!data) return '-';
    try {
      const date = data instanceof Date ? data : data.toDate?.() || new Date(data);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('pt-BR');
    } catch {
      return '-';
    }
  };

  // Obter nome do técnico selecionado
  const getTecnicoNome = () => {
    if (filtroTecnico === 'todos') return 'Todos os técnicos';
    const tecnico = tecnicos.find(t => t.id === filtroTecnico);
    return tecnico?.nome || 'Técnico selecionado';
  };

  // Obter texto da prioridade
  const getPrioridadeTexto = () => {
    switch(filtroPrioridade) {
      case 'baixa': return 'Baixa';
      case 'media': return 'Média';
      case 'alta': return 'Alta';
      case 'emergencial': return 'Emergencial';
      default: return 'Todas prioridades';
    }
  };

  // Obter texto do status
  const getStatusTexto = (status) => {
    switch(status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'em_pausa': return 'Em Pausa';
      case 'em_oficina': return 'Em Oficina';
      case 'aguardando_pecas': return 'Aguardando Peças';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusFilterTexto = () => {
    return getStatusTexto(filtroStatus);
  };

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroTecnico('todos');
    setFiltroPrioridade('todos');
    setFiltroStatus('todos');
    setDataInicio('');
    setDataFim('');
    toast.success('Filtros limpos');
  };

  // Gerar PDF com todos os filtros aplicados
  // Gerar PDF com todos os filtros aplicados (incluindo UNIDADE)
const gerarPDF = () => {
  if (chamadosFiltrados.length === 0) {
    toast.error('Não há dados para gerar o PDF com os filtros selecionados');
    return;
  }

  setExportando(true);
  
  try {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 210, 8, 'F');
    
    doc.setFillColor(240, 248, 255);
    doc.rect(0, 8, 210, 45, 'F');
    
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE CHAMADOS', 105, 28, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    let yInfo = 40;
    doc.text(`Técnico: ${getTecnicoNome()}`, 105, yInfo, { align: 'center' });
    yInfo += 5;
    doc.text(`Prioridade: ${getPrioridadeTexto()}`, 105, yInfo, { align: 'center' });
    yInfo += 5;
    doc.text(`Status: ${getStatusFilterTexto()}`, 105, yInfo, { align: 'center' });
    yInfo += 5;
    
    let periodoTexto = 'Período: ';
    if (dataInicio && dataFim) {
      periodoTexto += `${formatarData(dataInicio)} a ${formatarData(dataFim)}`;
    } else if (dataInicio) {
      periodoTexto += `a partir de ${formatarData(dataInicio)}`;
    } else if (dataFim) {
      periodoTexto += `até ${formatarData(dataFim)}`;
    } else {
      periodoTexto += 'Todos os períodos';
    }
    doc.text(periodoTexto, 105, yInfo, { align: 'center' });
    
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(14, 62, 196, 62);
    
    // Informações da empresa
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Ortodonsist - Sistema de Gestão de Chamados Odontológicos', 105, 72, { align: 'center' });
    
    // Resumo dos filtros
    let yPos = 85;
    
    doc.setFillColor(0, 51, 102);
    doc.rect(14, yPos - 5, 5, 10, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DOS FILTROS APLICADOS', 24, yPos);
    yPos += 8;
    
    const filtrosData = [
      ['Técnico:', getTecnicoNome()],
      ['Prioridade:', getPrioridadeTexto()],
      ['Status:', getStatusFilterTexto()],
      ['Período:', periodoTexto.replace('Período: ', '')],
      ['Total de registros:', chamadosFiltrados.length.toString()]
    ];
    
    autoTable(doc, {
      startY: yPos,
      body: filtrosData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 35 },
        1: { cellWidth: 120 }
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // Estatísticas Gerais
    doc.setFillColor(0, 51, 102);
    doc.rect(14, yPos - 5, 5, 10, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTATÍSTICAS GERAIS', 24, yPos);
    yPos += 8;
    
    const statsData = [
      ['Total de Chamados', stats.total.toString()],
      ['Chamados Abertos', stats.abertos.toString()],
      ['Em Andamento', stats.andamento.toString()],
      ['Em Pausa', stats.emPausa.toString()],
      ['Em Oficina', stats.emOficina.toString()],
      ['Aguardando Peças', stats.aguardandoPecas.toString()],
      ['Concluídos', stats.concluidos.toString()],
      ['Cancelados', stats.cancelados.toString()],
      ['Tempo Médio de Atendimento', `${stats.tempoMedio} horas`],
      ['Satisfação Média', `${stats.satisfacaoMedia}/5`]
    ];
    
    autoTable(doc, {
      startY: yPos,
      body: statsData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 60 },
        1: { halign: 'right', cellWidth: 30 }
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // Gráfico de barras de status
    if (yPos > 180) {
      doc.addPage();
      yPos = 30;
    }
    
    doc.setFillColor(0, 51, 102);
    doc.rect(14, yPos - 5, 5, 10, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUIÇÃO POR STATUS', 24, yPos);
    yPos += 10;
    
    const statusBarras = [
      { label: 'Abertos', value: stats.abertos, color: [241, 196, 15] },
      { label: 'Em Andamento', value: stats.andamento, color: [41, 128, 185] },
      { label: 'Em Pausa', value: stats.emPausa, color: [230, 126, 34] },
      { label: 'Em Oficina', value: stats.emOficina, color: [155, 89, 182] },
      { label: 'Aguard. Peças', value: stats.aguardandoPecas, color: [192, 57, 43] },
      { label: 'Concluídos', value: stats.concluidos, color: [39, 174, 96] },
      { label: 'Cancelados', value: stats.cancelados, color: [149, 165, 166] }
    ];
    
    statusBarras.forEach(barra => {
      const percentual = stats.total > 0 ? (barra.value / stats.total) * 100 : 0;
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(barra.label, 20, yPos);
      
      doc.setTextColor(barra.color[0], barra.color[1], barra.color[2]);
      doc.text(`${percentual.toFixed(1)}%`, 160, yPos);
      
      doc.setFillColor(230, 230, 230);
      doc.rect(20, yPos + 2, 140, 5, 'F');
      
      doc.setFillColor(barra.color[0], barra.color[1], barra.color[2]);
      doc.rect(20, yPos + 2, 140 * (percentual / 100), 5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${barra.value}`, 23, yPos + 5);
      
      yPos += 12;
    });
    
    yPos += 5;
    
    // Prioridades
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
    }
    
    doc.setFillColor(0, 51, 102);
    doc.rect(14, yPos - 5, 5, 10, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUIÇÃO POR PRIORIDADE', 24, yPos);
    yPos += 10;
    
    const prioridadesBarras = [
      { label: 'Alta/Emergencial', value: stats.urgentes, color: [231, 76, 60] },
      { label: 'Média', value: stats.media, color: [241, 196, 15] },
      { label: 'Baixa', value: stats.baixa, color: [46, 204, 113] }
    ];
    
    prioridadesBarras.forEach(barra => {
      const percentual = stats.total > 0 ? (barra.value / stats.total) * 100 : 0;
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(barra.label, 20, yPos);
      
      doc.setTextColor(barra.color[0], barra.color[1], barra.color[2]);
      doc.text(`${percentual.toFixed(1)}%`, 160, yPos);
      
      doc.setFillColor(230, 230, 230);
      doc.rect(20, yPos + 2, 140, 5, 'F');
      
      doc.setFillColor(barra.color[0], barra.color[1], barra.color[2]);
      doc.rect(20, yPos + 2, 140 * (percentual / 100), 5, 'F');
      
      yPos += 10;
    });
    
    yPos += 5;
    
    // Top Equipamentos
    if (stats.chamadosPorEquipamento.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.setFillColor(0, 51, 102);
      doc.rect(14, yPos - 5, 5, 10, 'F');
      doc.setTextColor(0, 51, 102);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('EQUIPAMENTOS MAIS ATENDIDOS', 24, yPos);
      yPos += 10;
      
      stats.chamadosPorEquipamento.forEach((eq, index) => {
        const percentual = (eq.quantidade / stats.total) * 100;
        
        doc.setFillColor(0, 51, 102);
        doc.circle(25, yPos - 2, 3.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}`, 25, yPos, { align: 'center' });
        
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(eq.nome, 35, yPos - 2);
        
        doc.setTextColor(0, 51, 102);
        doc.setFont('helvetica', 'bold');
        doc.text(`${eq.quantidade} chamados`, 160, yPos - 2);
        
        doc.setFillColor(220, 220, 220);
        doc.rect(35, yPos + 3, 140, 3, 'F');
        doc.setFillColor(0, 51, 102);
        doc.rect(35, yPos + 3, 140 * (percentual / 100), 3, 'F');
        
        yPos += 11;
      });
      
      yPos += 5;
    }
    
    // LISTA DE CHAMADOS COM UNIDADE
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
    }
    
    doc.setFillColor(0, 51, 102);
    doc.rect(14, yPos - 5, 5, 10, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE CHAMADOS', 24, yPos);
    yPos += 5;
    
    // TABELA COM A COLUNA UNIDADE ADICIONADA
    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Título', 'Equipamento', 'Unidade', 'Status', 'Prioridade', 'Técnico', 'Data']],
      body: chamadosFiltrados.slice(0, 20).map(c => [
        `#${c.id?.slice(-6)}`,
        c.titulo?.length > 18 ? c.titulo.substring(0, 18) + '...' : c.titulo,
        c.equipamento?.length > 12 ? c.equipamento.substring(0, 12) + '...' : c.equipamento || '-',
        c.unidade?.length > 12 ? c.unidade.substring(0, 12) + '...' : c.unidade || '-',
        getStatusTexto(c.status),
        c.prioridade,
        c.tecnicoNome?.length > 12 ? c.tecnicoNome.substring(0, 12) + '...' : c.tecnicoNome || '-',
        formatarData(c.dataCriacao)
      ]),
      theme: 'striped',
      headStyles: { 
        fillColor: [0, 51, 102], 
        textColor: [255, 255, 255], 
        fontSize: 8,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 7, 
        cellPadding: 3,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 15 },  // ID
        1: { cellWidth: 35 },  // Título
        2: { cellWidth: 22 },  // Equipamento
        3: { cellWidth: 22 },  // UNIDADE (nova coluna)
        4: { cellWidth: 20 },  // Status
        5: { cellWidth: 15 },  // Prioridade
        6: { cellWidth: 25 },  // Técnico
        7: { cellWidth: 20 }   // Data
      },
      didDrawCell: (data) => {
        // Colorir células de prioridade
        if (data.column.index === 5 && data.cell.raw) {
          const prioridade = data.cell.raw;
          let textColor = [0, 0, 0];
          
          if (prioridade === 'alta' || prioridade === 'emergencial') {
            textColor = [200, 0, 0];
          } else if (prioridade === 'media') {
            textColor = [200, 100, 0];
          } else {
            textColor = [0, 150, 0];
          }
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        }
        // Colorir células de status
        if (data.column.index === 4 && data.cell.raw) {
          const status = data.cell.raw;
          let textColor = [0, 0, 0];
          
          if (status === 'Concluído') textColor = [0, 150, 0];
          else if (status === 'Em Andamento') textColor = [0, 100, 200];
          else if (status === 'Em Pausa') textColor = [230, 126, 34];
          else if (status === 'Em Oficina') textColor = [155, 89, 182];
          else if (status === 'Aguardando Peças') textColor = [192, 57, 43];
          else if (status === 'Aberto') textColor = [200, 100, 0];
          else textColor = [100, 100, 100];
          
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        }
      }
    });
    
    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.2);
      doc.line(14, 280, 196, 280);
      
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório gerado pelo sistema Ortodonsist', 14, 287);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 292);
      doc.text(`Página ${i} de ${pageCount}`, 180, 287, { align: 'right' });
    }
    
    const nomeArquivo = `relatorio_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nomeArquivo);
    toast.success('PDF gerado com sucesso!');
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error('Erro ao gerar PDF');
  } finally {
    setExportando(false);
  }
};

  // Gerar Excel
  const gerarExcel = () => {
    if (chamadosFiltrados.length === 0) {
      toast.error('Não há dados para exportar com os filtros selecionados');
      return;
    }

    const dados = chamadosFiltrados.map(c => ({
      ID: c.id?.slice(-6),
      Título: c.titulo,
      Equipamento: c.equipamento,
      Unidade: c.unidade || '-',
      Status: getStatusTexto(c.status),
      Prioridade: c.prioridade,
      Técnico: c.tecnicoNome || 'Não atribuído',
      'Data Abertura': formatarData(c.dataCriacao),
      'Data Conclusão': formatarData(c.dataConclusao),
      Avaliação: c.avaliacao?.nota || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
    
    const nomeArquivo = `relatorio_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
    toast.success('Excel gerado com sucesso!');
  };

  // Gerar CSV
  const gerarCSV = () => {
    if (chamadosFiltrados.length === 0) {
      toast.error('Não há dados para exportar com os filtros selecionados');
      return;
    }

    const headers = ['ID', 'Título', 'Equipamento', 'Unidade', 'Status', 'Prioridade', 'Técnico', 'Data Abertura', 'Data Conclusão'];
    const linhas = chamadosFiltrados.map(c => [
      c.id?.slice(-6),
      c.titulo,
      c.equipamento,
      c.unidade || '-',
      getStatusTexto(c.status),
      c.prioridade,
      c.tecnicoNome || 'Não atribuído',
      formatarData(c.dataCriacao),
      formatarData(c.dataConclusao)
    ]);
    
    const csv = [headers, ...linhas].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('CSV gerado com sucesso!');
  };

  const handleExportar = (formato) => {
    if (chamadosFiltrados.length === 0) {
      toast.error('Não há dados para exportar com os filtros selecionados');
      return;
    }
    
    setExportando(true);
    try {
      if (formato === 'pdf') gerarPDF();
      if (formato === 'excel') gerarExcel();
      if (formato === 'csv') gerarCSV();
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
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
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-600">Análise completa com filtros avançados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExportar('pdf')}
            disabled={exportando || chamadosFiltrados.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 shadow-sm"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            PDF
          </button>
          <button
            onClick={() => handleExportar('excel')}
            disabled={exportando || chamadosFiltrados.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Excel
          </button>
          <button
            onClick={() => handleExportar('csv')}
            disabled={exportando || chamadosFiltrados.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-700">Filtros Avançados</h3>
            {temFiltrosAtivos() && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Filtros ativos</span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por Técnico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserCircleIcon className="w-4 h-4 inline mr-1" />
                Técnico
              </label>
              <select
                value={filtroTecnico}
                onChange={(e) => setFiltroTecnico(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os técnicos</option>
                {tecnicos.map(tecnico => (
                  <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                Prioridade
              </label>
              <select
                value={filtroPrioridade}
                onChange={(e) => setFiltroPrioridade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todas prioridades</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="emergencial">Emergencial</option>
              </select>
            </div>

            {/* Filtro por Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os status</option>
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="em_pausa">Em Pausa</option>
                <option value="em_oficina">Em Oficina</option>
                <option value="aguardando_pecas">Aguardando Peças</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Placeholder para alinhamento */}
            <div className="hidden lg:block"></div>
          </div>

          {/* Filtro por Período */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Data Final
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Botões de ação dos filtros */}
          <div className="flex justify-end gap-2 pt-2">
            {temFiltrosAtivos() && (
              <button
                onClick={limparFiltros}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resumo dos Filtros Aplicados */}
      {temFiltrosAtivos() && (
        <div className="bg-blue-50 rounded-lg p-3 flex flex-wrap items-center gap-2 text-sm border border-blue-200">
          <span className="text-blue-700 font-medium">Filtros aplicados:</span>
          {filtroTecnico !== 'todos' && (
            <span className="px-2 py-1 bg-white text-blue-700 rounded-full text-xs border border-blue-200">
              Técnico: {getTecnicoNome()}
            </span>
          )}
          {filtroPrioridade !== 'todos' && (
            <span className="px-2 py-1 bg-white text-blue-700 rounded-full text-xs border border-blue-200">
              Prioridade: {getPrioridadeTexto()}
            </span>
          )}
          {filtroStatus !== 'todos' && (
            <span className="px-2 py-1 bg-white text-blue-700 rounded-full text-xs border border-blue-200">
              Status: {getStatusFilterTexto()}
            </span>
          )}
          {(dataInicio || dataFim) && (
            <span className="px-2 py-1 bg-white text-blue-700 rounded-full text-xs border border-blue-200">
              Período: {dataInicio ? formatarData(dataInicio) : 'início'} {dataInicio && dataFim && 'a'} {dataFim ? formatarData(dataFim) : dataInicio && 'até hoje'}
            </span>
          )}
          <span className="ml-auto text-blue-600 font-medium">
            {chamadosFiltrados.length} chamados encontrados
          </span>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
          <p className="text-sm opacity-90">Total de Chamados</p>
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-xs mt-2">Com os filtros aplicados</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
          <p className="text-sm opacity-90">Concluídos</p>
          <p className="text-3xl font-bold">{stats.concluidos}</p>
          <p className="text-xs mt-2">{((stats.concluidos / stats.total) * 100 || 0).toFixed(1)}% do total</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-md">
          <p className="text-sm opacity-90">Tempo Médio</p>
          <p className="text-3xl font-bold">{stats.tempoMedio}h</p>
          <p className="text-xs mt-2">Para conclusão</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
          <p className="text-sm opacity-90">Satisfação</p>
          <p className="text-3xl font-bold">{stats.satisfacaoMedia}</p>
          <p className="text-xs mt-2">Média de {stats.satisfacaoMedia}/5</p>
        </div>
      </div>

      {/* Cards de Status Detalhados */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
          <p className="text-xs text-yellow-600">Abertos</p>
          <p className="text-xl font-bold text-yellow-700">{stats.abertos}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
          <p className="text-xs text-blue-600">Em Andamento</p>
          <p className="text-xl font-bold text-blue-700">{stats.andamento}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
          <p className="text-xs text-orange-600">Em Pausa</p>
          <p className="text-xl font-bold text-orange-700">{stats.emPausa}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
          <p className="text-xs text-purple-600">Em Oficina</p>
          <p className="text-xl font-bold text-purple-700">{stats.emOficina}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
          <p className="text-xs text-red-600">Aguard. Peças</p>
          <p className="text-xl font-bold text-red-700">{stats.aguardandoPecas}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
          <p className="text-xs text-green-600">Concluídos</p>
          <p className="text-xl font-bold text-green-700">{stats.concluidos}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
          <p className="text-xs text-gray-600">Cancelados</p>
          <p className="text-xl font-bold text-gray-700">{stats.cancelados}</p>
        </div>
      </div>

      {/* Cards de Prioridades */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border-l-4 border-red-500 shadow-sm">
          <p className="text-sm text-gray-500">Prioridade Alta/Emergencial</p>
          <p className="text-2xl font-bold text-red-600">{stats.urgentes}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-yellow-500 shadow-sm">
          <p className="text-sm text-gray-500">Prioridade Média</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.media}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-green-500 shadow-sm">
          <p className="text-sm text-gray-500">Prioridade Baixa</p>
          <p className="text-2xl font-bold text-green-600">{stats.baixa}</p>
        </div>
      </div>

      {/* Equipamentos mais problemáticos e Top Técnicos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <WrenchIcon className="w-5 h-5 text-blue-500" />
            Equipamentos com Mais Problemas
          </h3>
          <div className="space-y-3">
            {stats.chamadosPorEquipamento.length > 0 ? (
              stats.chamadosPorEquipamento.map((eq, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate max-w-[150px]">{eq.nome}</span>
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
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">Nenhum equipamento registrado</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-green-500" />
            Técnicos com Mais Atendimentos
          </h3>
          <div className="space-y-3">
            {stats.chamadosPorTecnico.length > 0 ? (
              stats.chamadosPorTecnico.map((tec, idx) => (
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
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">Nenhum técnico registrado</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Chamados Filtrados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-gray-800">Detalhamento dos Chamados</h3>
            <p className="text-sm text-gray-500 mt-1">Mostrando {chamadosFiltrados.length} chamados</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chamadosFiltrados.slice(0, 15).map((chamado) => (
                <tr key={chamado.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">#{chamado.id?.slice(-6)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{chamado.titulo}</p>
                    <p className="text-xs text-gray-500">{chamado.equipamento}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{chamado.equipamento || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                      chamado.status === 'aberto' ? 'bg-yellow-100 text-yellow-700' :
                      chamado.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                      chamado.status === 'em_pausa' ? 'bg-orange-100 text-orange-700' :
                      chamado.status === 'em_oficina' ? 'bg-purple-100 text-purple-700' :
                      chamado.status === 'aguardando_pecas' ? 'bg-red-100 text-red-700' :
                      chamado.status === 'concluido' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getStatusTexto(chamado.status)}
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
                  <td className="px-4 py-3 text-sm text-gray-500">{formatarData(chamado.dataCriacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {chamadosFiltrados.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum chamado encontrado com os filtros selecionados.</p>
            <button onClick={limparFiltros} className="mt-3 text-blue-600 hover:text-blue-700 text-sm">
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}