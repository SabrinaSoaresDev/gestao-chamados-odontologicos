import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DocumentArrowDownIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon,
  StarIcon,
  PrinterIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function OrdemServico() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chamados, setChamados] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [exportando, setExportando] = useState(false);
  const [estatisticas, setEstatisticas] = useState({});

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const anos = [];
  const anoAtual = new Date().getFullYear();
  for (let i = anoAtual - 2; i <= anoAtual + 2; i++) {
    anos.push(i);
  }

  useEffect(() => {
    if (!userData) return;

    const dataInicio = new Date(anoSelecionado, mesSelecionado, 1);
    const dataFim = new Date(anoSelecionado, mesSelecionado + 1, 0, 23, 59, 59);

    const q = query(
      collection(db, 'chamados'),
      where('tecnicoId', '==', userData.uid),
      where('dataCriacao', '>=', dataInicio),
      where('dataCriacao', '<=', dataFim),
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
      calcularEstatisticas(chamadosData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar chamados:', error);
      toast.error('Erro ao carregar ordens de serviço');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData, mesSelecionado, anoSelecionado]);

  const calcularEstatisticas = (chamadosList) => {
    const total = chamadosList.length;
    const concluidos = chamadosList.filter(c => c.status === 'concluido').length;
    const andamento = chamadosList.filter(c => c.status === 'em_andamento').length;
    const abertos = chamadosList.filter(c => c.status === 'aberto').length;
    const cancelados = chamadosList.filter(c => c.status === 'cancelado').length;

    let tempoMedio = 0;
    const concluidosComData = chamadosList.filter(c => 
      c.status === 'concluido' && c.dataCriacao && c.dataConclusao
    );
    
    if (concluidosComData.length > 0) {
      const somaHoras = concluidosComData.reduce((acc, c) => {
        const diff = (c.dataConclusao - c.dataCriacao) / (1000 * 60 * 60);
        return acc + diff;
      }, 0);
      tempoMedio = (somaHoras / concluidosComData.length).toFixed(1);
    }

    let satisfacaoMedia = 0;
    const avaliados = chamadosList.filter(c => c.avaliacao);
    if (avaliados.length > 0) {
      const somaNotas = avaliados.reduce((acc, c) => acc + (c.avaliacao?.nota || 0), 0);
      satisfacaoMedia = (somaNotas / avaliados.length).toFixed(1);
    }

    const equipamentos = {};
    chamadosList.forEach(c => {
      if (c.equipamento) {
        equipamentos[c.equipamento] = (equipamentos[c.equipamento] || 0) + 1;
      }
    });

    const topEquipamentos = Object.entries(equipamentos)
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);

    setEstatisticas({
      total,
      concluidos,
      andamento,
      abertos,
      cancelados,
      tempoMedio,
      satisfacaoMedia,
      topEquipamentos,
      avaliacoes: avaliados.length
    });
  };

 // MODELO 1: PDF RESUMIDO PROFISSIONAL (VERSÃO PREMIUM)
const gerarPDFResumido = () => {
  setExportando(true);
  
  try {
    const doc = new jsPDF();
    const mesNome = meses[mesSelecionado];
    
    // ===== CABEÇALHO COM GRADIENTE =====
    // Faixa superior decorativa
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 210, 8, 'F');
    
    // Fundo do cabeçalho com gradiente simulado
    doc.setFillColor(240, 248, 255);
    doc.rect(0, 8, 210, 40, 'F');
    
    // Título principal
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE ORDENS DE SERVIÇO', 105, 32, { align: 'center' });
    
    // Subtítulo com período
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${mesNome} ${anoSelecionado}`, 105, 42, { align: 'center' });

    // ===== LINHA DECORATIVA =====
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(14, 52, 196, 52);
    
    // Pequenos detalhes nas pontas da linha
    doc.setFillColor(0, 51, 102);
    doc.circle(14, 52, 1, 'F');
    doc.circle(196, 52, 1, 'F');

    // ===== INFORMAÇÕES DO TÉCNICO EM BOX =====
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 58, 182, 25, 3, 3, 'F');
    
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.2);
    doc.roundedRect(14, 58, 182, 25, 3, 3, 'S');
    
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TÉCNICO:', 20, 68);
    doc.setFont('helvetica', 'normal');
    doc.text(userData?.nome || 'Não informado', 45, 68);
    
    doc.setFont('helvetica', 'bold');
    doc.text('PERÍODO:', 20, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`01/${mesSelecionado+1}/${anoSelecionado} a ${new Date(anoSelecionado, mesSelecionado + 1, 0).toLocaleDateString('pt-BR')}`, 45, 78);

    // ===== KPI CARDS MODERNOS =====
    const cards = [
      { 
        label: 'Total de OS', 
        value: estatisticas.total, 
        x: 20,
        icon: '📋',
        color: [0, 51, 102]
      },
      { 
        label: 'Concluídas', 
        value: estatisticas.concluidos, 
        x: 70,
        icon: '✅',
        color: [0, 150, 0]
      },
      { 
        label: 'Em Andamento', 
        value: estatisticas.andamento, 
        x: 120,
        icon: '⚙️',
        color: [0, 100, 200]
      },
      { 
        label: 'Canceladas', 
        value: estatisticas.cancelados, 
        x: 170,
        icon: '❌',
        color: [200, 0, 0]
      }
    ];

    let yCardStart = 92;
    
    cards.forEach(card => {
      // Sombra do card
      doc.setFillColor(220, 220, 220);
      doc.roundedRect(card.x - 3, yCardStart + 2, 45, 35, 3, 3, 'F');
      
      // Card principal
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(card.x - 5, yCardStart, 45, 35, 3, 3, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(card.x - 5, yCardStart, 45, 35, 3, 3, 'S');
      
      // Faixa colorida no topo do card
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(card.x - 5, yCardStart, 45, 5, 2, 2, 'F');
      
      // Valor
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value.toString(), card.x + 17, yCardStart + 20, { align: 'center' });
      
      // Label
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(card.label, card.x + 17, yCardStart + 30, { align: 'center' });
    });

    // ===== MÉTRICAS DE DESEMPENHO =====
    let yPos = 142;
    
    // Título da seção
    doc.setFillColor(0, 51, 102);
    doc.rect(14, yPos - 5, 5, 12, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MÉTRICAS DE DESEMPENHO', 24, yPos);
    yPos += 10;

    // Cards de métricas secundárias
    const metricas = [
      { label: 'Tempo Médio', value: `${estatisticas.tempoMedio}h`, icon: '⏱️', color: [255, 140, 0] },
      { label: 'Satisfação', value: `${estatisticas.satisfacaoMedia}/5`, icon: '⭐', color: [255, 215, 0] },
      { label: 'Avaliações', value: estatisticas.avaliacoes, icon: '📊', color: [147, 112, 219] }
    ];

    metricas.forEach((metrica, index) => {
      const xPos = 20 + (index * 60);
      
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(xPos, yPos, 50, 20, 3, 3, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(xPos, yPos, 50, 20, 3, 3, 'S');
      
      doc.setTextColor(metrica.color[0], metrica.color[1], metrica.color[2]);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(metrica.value.toString(), xPos + 25, yPos + 12, { align: 'center' });
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(metrica.label, xPos + 25, yPos + 18, { align: 'center' });
    });

    yPos += 35;

    // ===== TABELA DE RESUMO =====
    autoTable(doc, {
      startY: yPos,
      head: [['Métrica', 'Quantidade', '% do Total', 'Detalhes']],
      body: [
        [' Total de OS', estatisticas.total, '100%', '-'],
        [' Concluídas', estatisticas.concluidos, 
         estatisticas.total > 0 ? ((estatisticas.concluidos / estatisticas.total) * 100).toFixed(1) + '%' : '0%',
         estatisticas.concluidos > 0 ? `${estatisticas.tempoMedio}h (médio)` : '-'],
        [' Em Andamento', estatisticas.andamento,
         estatisticas.total > 0 ? ((estatisticas.andamento / estatisticas.total) * 100).toFixed(1) + '%' : '0%',
         '-'],
        [' Abertas', estatisticas.abertos,
         estatisticas.total > 0 ? ((estatisticas.abertos / estatisticas.total) * 100).toFixed(1) + '%' : '0%',
         '-'],
        [' Canceladas', estatisticas.cancelados,
         estatisticas.total > 0 ? ((estatisticas.cancelados / estatisticas.total) * 100).toFixed(1) + '%' : '0%',
         '-'],
        [' Satisfação', estatisticas.satisfacaoMedia > 0 ? `${estatisticas.satisfacaoMedia}/5` : '-',
         estatisticas.avaliacoes > 0 ? `${estatisticas.avaliacoes} avaliações` : 'sem avaliações',
         estatisticas.avaliacoes > 0 ? `${(estatisticas.satisfacaoMedia * 20).toFixed(0)}% positivo` : '-']
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [0, 51, 102], 
        textColor: [255, 255, 255], 
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 5,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 45, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    // ===== GRÁFICO DE PROGRESSO =====
    doc.addPage();
    
    // Cabeçalho da segunda página
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 210, 8, 'F');
    
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ANÁLISE DE DESEMPENHO', 105, 25, { align: 'center' });

    // Barras de progresso
    const barras = [
      { label: 'Concluídas', value: estatisticas.concluidos, total: estatisticas.total, color: [0, 150, 0] },
      { label: 'Em Andamento', value: estatisticas.andamento, total: estatisticas.total, color: [0, 100, 200] },
      { label: 'Abertas', value: estatisticas.abertos, total: estatisticas.total, color: [255, 140, 0] },
      { label: 'Canceladas', value: estatisticas.cancelados, total: estatisticas.total, color: [200, 0, 0] }
    ];

    let yBarra = 45;
    
    barras.forEach(barra => {
      const percentual = estatisticas.total > 0 ? (barra.value / estatisticas.total) * 100 : 0;
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(barra.label, 20, yBarra);
      
      doc.setTextColor(barra.color[0], barra.color[1], barra.color[2]);
      doc.text(`${percentual.toFixed(1)}%`, 160, yBarra);
      
      // Barra de fundo
      doc.setFillColor(230, 230, 230);
      doc.rect(20, yBarra + 2, 150, 8, 'F');
      
      // Barra de progresso
      doc.setFillColor(barra.color[0], barra.color[1], barra.color[2]);
      doc.rect(20, yBarra + 2, 150 * (percentual / 100), 8, 'F');
      
      // Valor numérico na barra
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(`${barra.value} OS`, 25, yBarra + 7);
      
      yBarra += 18;
    });

    // ===== TOP EQUIPAMENTOS =====
    yBarra += 10;
    
    doc.setFillColor(0, 51, 102);
    doc.rect(14, yBarra - 5, 5, 12, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EQUIPAMENTOS MAIS ATENDIDOS', 24, yBarra);
    yBarra += 10;

    if (estatisticas.topEquipamentos?.length > 0) {
      estatisticas.topEquipamentos.forEach((eq, index) => {
        const percentual = (eq.qtd / estatisticas.total) * 100;
        
        // Ranking
        doc.setFillColor(0, 51, 102);
        doc.circle(25, yBarra - 2, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}`, 25, yBarra, { align: 'center' });
        
        // Nome do equipamento
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(eq.nome, 35, yBarra - 2);
        
        // Quantidade
        doc.setTextColor(0, 51, 102);
        doc.setFont('helvetica', 'bold');
        doc.text(`${eq.qtd} OS`, 160, yBarra - 2);
        
        // Barra de percentual
        doc.setFillColor(220, 220, 220);
        doc.rect(35, yBarra + 2, 140, 3, 'F');
        doc.setFillColor(0, 51, 102);
        doc.rect(35, yBarra + 2, 140 * (percentual / 100), 3, 'F');
        
        yBarra += 12;
      });
    } else {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text('Nenhum equipamento registrado no período', 105, yBarra + 10, { align: 'center' });
    }

    // ===== LISTA DE ORDENS DE SERVIÇO =====
    doc.addPage();
    
    // Cabeçalho da terceira página
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 210, 8, 'F');
    
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELAÇÃO DE ORDENS DE SERVIÇO', 105, 25, { align: 'center' });

    autoTable(doc, {
      startY: 35,
      head: [['OS', 'Título', 'Equipamento', 'Status', 'Prioridade', 'Abertura', 'Conclusão']],
      body: chamados.map(c => [
        `#${c.id?.slice(-6)}`,
        c.titulo.length > 20 ? c.titulo.substring(0, 20) + '...' : c.titulo,
        c.equipamento,
        c.status === 'aberto' ? 'Aberta' :
        c.status === 'em andamento' ? 'Em Andamento' :
        c.status === 'concluido' ? 'Concluída' : 'Cancelada',
        c.prioridade,
        c.dataCriacao?.toLocaleDateString('pt-BR') || '-',
        c.dataConclusao?.toLocaleDateString('pt-BR') || '-'
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
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 18 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 }
      },
      didDrawCell: (data) => {
        // Colorir células de prioridade
        if (data.column.index === 4 && data.cell.raw) {
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
      }
    });

    // ===== RODAPÉ PROFISSIONAL =====
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Linha decorativa do rodapé
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.2);
      doc.line(14, 280, 196, 280);
      
      // Informações do rodapé
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Gestão de Ordens de Serviço', 14, 287);
      doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 292);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Página ${i} de ${pageCount}`, 180, 287, { align: 'right' });
      
      // Código do documento
      doc.setFont('helvetica', 'normal');
      doc.text(`OS-${mesNome}-${anoSelecionado}-${String(i).padStart(2, '0')}`, 180, 292, { align: 'right' });
    }

    doc.save(`OS_${mesNome}_${anoSelecionado}_Resumido.pdf`);
    toast.success('PDF resumido gerado com sucesso!');
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.error('Erro ao gerar PDF');
  } finally {
    setExportando(false);
  }
};

 // MODELO 2: PDF DETALHADO PREMIUM (FICHAS INDIVIDUAIS)
const gerarPDFDetalhado = () => {
  setExportando(true);
  
  try {
    const doc = new jsPDF();
    const mesNome = meses[mesSelecionado];
    
    // ===== CAPA DO RELATÓRIO =====
    // Fundo com gradiente
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Elementos decorativos
    doc.setFillColor(255, 255, 255, 0.1);
    for (let i = 0; i < 5; i++) {
      doc.circle(50 + i * 30, 250, 20, 'F');
    }
    
    // Logo da empresa (grande)
    doc.setFillColor(255, 215, 0);
    doc.circle(105, 80, 25, 'F');
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.text('OS', 105, 90, { align: 'center' });
    
    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDENS DE', 105, 140, { align: 'center' });
    doc.text('SERVIÇO', 105, 165, { align: 'center' });
    
    // Linha decorativa
    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(2);
    doc.line(60, 180, 150, 180);
    
    // Período
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text(`${mesNome} / ${anoSelecionado}`, 105, 205, { align: 'center' });
    
    // Informações do técnico
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Técnico: ${userData?.nome}`, 105, 230, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de OS: ${estatisticas.total}`, 105, 245, { align: 'center' });
    doc.text(`Período: 01/${mesSelecionado+1}/${anoSelecionado}`, 105, 255, { align: 'center' });
    doc.text(`a ${new Date(anoSelecionado, mesSelecionado + 1, 0).toLocaleDateString('pt-BR')}`, 105, 265, { align: 'center' });
    
    // Rodapé da capa
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text('Documento confidencial - Uso interno', 105, 285, { align: 'center' });

    // ===== FICHAS INDIVIDUAIS DAS OS =====
    chamados.forEach((chamado, index) => {
      doc.addPage();
      
      // ===== CABEÇALHO DA FICHA =====
      // Faixa superior colorida
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, 210, 45, 'F');
      
      // Título da OS
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(`ORDEM DE SERVIÇO #${chamado.id?.slice(-6)}`, 105, 25, { align: 'center' });
      
      // Data de emissão
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 180, 38, { align: 'right' });
      
      // ===== BADGE DE STATUS =====
      let statusColor;
      let statusText;
      let statusIcon;
      
      switch(chamado.status) {
        case 'concluido':
          statusColor = [39, 174, 96]; // Verde
          statusText = 'CONCLUÍDA';
          statusIcon = '✓';
          break;
        case 'em_andamento':
          statusColor = [41, 128, 185]; // Azul
          statusText = 'EM ANDAMENTO';
          statusIcon = '⚙';
          break;
        case 'aberto':
          statusColor = [241, 196, 15]; // Amarelo
          statusText = 'ABERTA';
          statusIcon = '⏳';
          break;
        default:
          statusColor = [149, 165, 166]; // Cinza
          statusText = 'CANCELADA';
          statusIcon = '✗';
      }

      // Badge de status
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.roundedRect(140, 50, 60, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${statusIcon} ${statusText}`, 170, 59, { align: 'center' });

      // ===== INFORMAÇÕES PRINCIPAIS EM CARDS =====
      let yPos = 70;
      
      // Card de identificação
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, yPos, 182, 35, 3, 3, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(14, yPos, 182, 35, 3, 3, 'S');
      
      doc.setTextColor(0, 51, 102);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('IDENTIFICAÇÃO', 20, yPos + 7);
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Título:', 20, yPos + 17);
      doc.setFont('helvetica', 'bold');
      doc.text(chamado.titulo, 45, yPos + 17);
      
      doc.setFont('helvetica', 'normal');
      doc.text('Equipamento:', 20, yPos + 27);
      doc.setFont('helvetica', 'bold');
      doc.text(chamado.equipamento || 'Não informado', 55, yPos + 27);
      
      yPos += 45;

      // Card de solicitante e prioridade
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, yPos, 182, 35, 3, 3, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(14, yPos, 182, 35, 3, 3, 'S');
      
      doc.setTextColor(0, 51, 102);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALHES', 20, yPos + 7);
      
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.text('Solicitante:', 20, yPos + 17);
      doc.setFont('helvetica', 'bold');
      doc.text(chamado.solicitanteNome || 'Não informado', 55, yPos + 17);
      
      doc.setFont('helvetica', 'normal');
      doc.text('Prioridade:', 20, yPos + 27);
      
      // Badge de prioridade colorido
      let prioridadeBg;
      switch(chamado.prioridade) {
        case 'alta':
        case 'emergencial':
          prioridadeBg = [255, 200, 200];
          break;
        case 'media':
          prioridadeBg = [255, 255, 200];
          break;
        default:
          prioridadeBg = [200, 255, 200];
      }
      
      doc.setFillColor(prioridadeBg[0], prioridadeBg[1], prioridadeBg[2]);
      doc.roundedRect(55, yPos + 22, 40, 6, 2, 2, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(chamado.prioridade, 75, yPos + 27, { align: 'center' });
      
      yPos += 45;

      // Card de datas
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, yPos, 182, 25, 3, 3, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(14, yPos, 182, 25, 3, 3, 'S');
      
      doc.setTextColor(0, 51, 102);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DATAS', 20, yPos + 7);
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Abertura:', 20, yPos + 17);
      doc.setFont('helvetica', 'bold');
      doc.text(chamado.dataCriacao?.toLocaleDateString('pt-BR') || '-', 50, yPos + 17);
      
      doc.setFont('helvetica', 'normal');
      doc.text('Conclusão:', 100, yPos + 17);
      doc.setFont('helvetica', 'bold');
      doc.text(chamado.dataConclusao?.toLocaleDateString('pt-BR') || '-', 130, yPos + 17);
      
      yPos += 35;

      // ===== DESCRIÇÃO DO PROBLEMA =====
      doc.setFillColor(0, 51, 102);
      doc.roundedRect(14, yPos - 5, 182, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIÇÃO DO PROBLEMA', 105, yPos, { align: 'center' });
      yPos += 8;
      
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, yPos, 182, 40, 3, 3, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(14, yPos, 182, 40, 3, 3, 'S');
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const descricaoLinhas = doc.splitTextToSize(chamado.descricao || 'Sem descrição', 170);
      doc.text(descricaoLinhas, 20, yPos + 7);
      yPos += 50;

      // ===== SERVIÇO REALIZADO =====
      if (chamado.servicoRealizado) {
        // Verificar se precisa de nova página
        if (yPos > 240) {
          doc.addPage();
          yPos = 30;
        }
        
        doc.setFillColor(39, 174, 96);
        doc.roundedRect(14, yPos - 5, 182, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('SERVIÇO REALIZADO', 105, yPos, { align: 'center' });
        yPos += 8;
        
        // Calcular altura necessária para o conteúdo
        let alturaServico = 0;
        alturaServico += 10; // Descrição
        
        if (chamado.servicoRealizado.pecasTrocadas) alturaServico += 7;
        if (chamado.servicoRealizado.tempoGasto) alturaServico += 7;
        if (chamado.servicoRealizado.observacoes) alturaServico += 15;
        
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14, yPos, 182, alturaServico + 10, 3, 3, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(14, yPos, 182, alturaServico + 10, 3, 3, 'S');
        
        let yServico = yPos + 7;
        
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Descrição:', 20, yServico);
        yServico += 5;
        
        doc.setFont('helvetica', 'normal');
        const servicoLinhas = doc.splitTextToSize(chamado.servicoRealizado.descricao || 'Sem descrição', 160);
        doc.text(servicoLinhas, 20, yServico);
        yServico += servicoLinhas.length * 4 + 5;
        
        if (chamado.servicoRealizado.pecasTrocadas) {
          doc.setFont('helvetica', 'bold');
          doc.text('Peças trocadas:', 20, yServico);
          doc.setFont('helvetica', 'normal');
          doc.text(chamado.servicoRealizado.pecasTrocadas, 60, yServico);
          yServico += 7;
        }
        
        if (chamado.servicoRealizado.tempoGasto) {
          doc.setFont('helvetica', 'bold');
          doc.text('Tempo gasto:', 20, yServico);
          doc.setFont('helvetica', 'normal');
          doc.text(chamado.servicoRealizado.tempoGasto, 60, yServico);
          yServico += 7;
        }
        
        if (chamado.servicoRealizado.observacoes) {
          doc.setFont('helvetica', 'bold');
          doc.text('Observações:', 20, yServico);
          yServico += 4;
          doc.setFont('helvetica', 'normal');
          const obsLinhas = doc.splitTextToSize(chamado.servicoRealizado.observacoes, 160);
          doc.text(obsLinhas, 20, yServico);
        }
        
        yPos += alturaServico + 20;
      }

      // ===== AVALIAÇÃO DO CLIENTE =====
      if (chamado.avaliacao) {
        // Verificar se precisa de nova página
        if (yPos > 240) {
          doc.addPage();
          yPos = 30;
        }
        
        doc.setFillColor(241, 196, 15);
        doc.roundedRect(14, yPos - 5, 182, 8, 2, 2, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('AVALIAÇÃO DO CLIENTE', 105, yPos, { align: 'center' });
        yPos += 8;
        
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14, yPos, 182, 35, 3, 3, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(14, yPos, 182, 35, 3, 3, 'S');
        
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        
        // Estrelas de avaliação
        const nota = chamado.avaliacao.nota || 0;
        doc.setFont('helvetica', 'bold');
        doc.text('Nota:', 20, yPos + 10);
        
        for (let i = 1; i <= 5; i++) {
          if (i <= nota) {
            doc.setFillColor(241, 196, 15);
            doc.circle(45 + (i * 6), yPos + 7, 2.5, 'F');
          } else {
            doc.setDrawColor(200, 200, 200);
            doc.circle(45 + (i * 6), yPos + 7, 2.5, 'S');
          }
        }
        doc.text(`${nota}/5`, 80, yPos + 10);
        
        if (chamado.avaliacao.comentario) {
          doc.setFont('helvetica', 'bold');
          doc.text('Comentário:', 20, yPos + 20);
          doc.setFont('helvetica', 'normal');
          const comentLinhas = doc.splitTextToSize(chamado.avaliacao.comentario, 150);
          doc.text(comentLinhas, 20, yPos + 27);
        }
        
        yPos += 45;
      }

      // ===== ASSINATURAS =====
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(20, yPos + 10, 90, yPos + 10);
      doc.line(120, yPos + 10, 190, yPos + 10);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Técnico Responsável', 55, yPos + 17, { align: 'center' });
      doc.text('Cliente / Solicitante', 155, yPos + 17, { align: 'center' });

      // ===== RODAPÉ DA FICHA =====
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.2);
      doc.line(14, 280, 196, 280);
      
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(`OS #${chamado.id?.slice(-6)} - Gerada em ${new Date().toLocaleString('pt-BR')}`, 14, 287);
      doc.text(`Código: OS-${mesNome}-${anoSelecionado}-${chamado.id?.slice(-6)}`, 180, 287, { align: 'right' });
    });

    // ===== SUMÁRIO EXECUTIVO (ÚLTIMA PÁGINA) =====
    doc.addPage();
    
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 210, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMÁRIO EXECUTIVO', 105, 13, { align: 'center' });
    
    // Resumo das OS
    let ySumario = 40;
    
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Período', 105, ySumario, { align: 'center' });
    ySumario += 10;
    
    const resumoData = [
      ['Total de OS', estatisticas.total],
      ['Concluídas', estatisticas.concluidos],
      ['Em Andamento', estatisticas.andamento],
      ['Abertas', estatisticas.abertos],
      ['Canceladas', estatisticas.cancelados],
      ['Média de Satisfação', `${estatisticas.satisfacaoMedia}/5`],
      ['Total de Avaliações', estatisticas.avaliacoes]
    ];
    
    resumoData.forEach((item, index) => {
      const xPos = index < 4 ? 40 : 120;
      const yPosItem = ySumario + (index % 4) * 10;
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(item[0] + ':', xPos, yPosItem);
      
      doc.setFont('helvetica', 'bold');
      doc.text(item[1].toString(), xPos + 50, yPosItem);
    });

    doc.save(`OS_${mesNome}_${anoSelecionado}_Detalhado.pdf`);
    toast.success('PDF detalhado gerado com sucesso!');
    
  } catch (error) {
    console.error('Erro ao gerar PDF detalhado:', error);
    toast.error('Erro ao gerar PDF detalhado');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ordens de Serviço</h1>
          <p className="text-gray-600">Gerencie e exporte suas OS com modelo profissional</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={gerarPDFResumido}
            disabled={exportando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            {exportando ? 'Gerando...' : 'PDF Resumido'}
          </button>
          <button
            onClick={gerarPDFDetalhado}
            disabled={exportando}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <PrinterIcon className="w-5 h-5" />
            PDF Detalhado
          </button>
        </div>
      </div>

      {/* Seletor de Mês/Ano (igual ao anterior) */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <CalendarIcon className="w-5 h-5 text-gray-400 hidden sm:block" />
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(parseInt(e.target.value))}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {meses.map((mes, index) => (
                <option key={index} value={index}>{mes}</option>
              ))}
            </select>
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {anos.map((ano) => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500 ml-auto">
            {chamados.length} {chamados.length === 1 ? 'OS encontrada' : 'OS encontradas'}
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas (igual ao anterior) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <DocumentTextIcon className="w-5 h-5 opacity-90" />
            <span className="text-xs opacity-75">Total</span>
          </div>
          <p className="text-2xl font-bold">{estatisticas.total}</p>
          <p className="text-xs opacity-90 mt-1">ordens no período</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <CheckCircleIcon className="w-5 h-5 opacity-90" />
            <span className="text-xs opacity-75">Concluídas</span>
          </div>
          <p className="text-2xl font-bold">{estatisticas.concluidos}</p>
          <p className="text-xs opacity-90 mt-1">
            {estatisticas.total > 0 ? ((estatisticas.concluidos / estatisticas.total) * 100).toFixed(0) : 0}% do total
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <ClockIcon className="w-5 h-5 opacity-90" />
            <span className="text-xs opacity-75">Tempo Médio</span>
          </div>
          <p className="text-2xl font-bold">{estatisticas.tempoMedio}h</p>
          <p className="text-xs opacity-90 mt-1">por OS</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <StarIconSolid className="w-5 h-5 opacity-90" />
            <span className="text-xs opacity-75">Satisfação</span>
          </div>
          <p className="text-2xl font-bold">{estatisticas.satisfacaoMedia}</p>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((nota) => (
              <StarIconSolid
                key={nota}
                className={`w-3 h-3 ${
                  nota <= Math.round(estatisticas.satisfacaoMedia) 
                    ? 'text-yellow-300' 
                    : 'text-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Estatísticas Detalhadas (igual ao anterior) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status das OS */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Distribuição por Status</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Concluídas</span>
                <span className="font-medium text-green-600">{estatisticas.concluidos}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(estatisticas.concluidos / (estatisticas.total || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Em Andamento</span>
                <span className="font-medium text-blue-600">{estatisticas.andamento}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(estatisticas.andamento / (estatisticas.total || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Abertas</span>
                <span className="font-medium text-yellow-600">{estatisticas.abertos}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: `${(estatisticas.abertos / (estatisticas.total || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Canceladas</span>
                <span className="font-medium text-red-600">{estatisticas.cancelados}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${(estatisticas.cancelados / (estatisticas.total || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Equipamentos */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Equipamentos Mais Atendidos</h3>
          {estatisticas.topEquipamentos?.length > 0 ? (
            <div className="space-y-3">
              {estatisticas.topEquipamentos.map((eq, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{eq.nome}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${(eq.qtd / (estatisticas.total || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{eq.qtd}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhum equipamento registrado</p>
          )}
        </div>

        {/* Resumo de Avaliações */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Avaliações</h3>
          {estatisticas.avaliacoes > 0 ? (
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-500 mb-2">{estatisticas.satisfacaoMedia}</div>
              <div className="flex justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((nota) => (
                  <StarIconSolid
                    key={nota}
                    className={`w-6 h-6 ${
                      nota <= Math.round(estatisticas.satisfacaoMedia) 
                        ? 'text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">
                Baseado em {estatisticas.avaliacoes} {estatisticas.avaliacoes === 1 ? 'avaliação' : 'avaliações'}
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <StarIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Nenhuma avaliação no período</p>
            </div>
          )}
        </div>
      </div>

      {/* Lista de OS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Ordens de Serviço do Mês</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avaliação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chamados.map((chamado) => (
                <tr key={chamado.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">#{chamado.id?.slice(-6)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{chamado.titulo}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{chamado.equipamento}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                      chamado.status === 'aberto' ? 'bg-yellow-100 text-yellow-700' :
                      chamado.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                      chamado.status === 'concluido' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {chamado.status === 'aberto' ? 'Aberta' :
                       chamado.status === 'em_andamento' ? 'Em Andamento' :
                       chamado.status === 'concluido' ? 'Concluída' : 'Cancelada'}
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
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatarData(chamado.dataCriacao)}
                  </td>
                  <td className="px-4 py-3">
                    {chamado.avaliacao ? (
                      <div className="flex items-center gap-1">
                        <StarIconSolid className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm">{chamado.avaliacao.nota}/5</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}