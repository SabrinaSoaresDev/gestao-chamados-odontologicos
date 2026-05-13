import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DocumentArrowDownIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon,
  StarIcon,
  PrinterIcon,
  DocumentTextIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  PauseIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  XCircleIcon,
  CameraIcon,
  ClipboardDocumentCheckIcon
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
  const [selectedChamado, setSelectedChamado] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
        dataConclusao: doc.data().dataConclusao?.toDate(),
        dataPausa: doc.data().dataPausa?.toDate(),
        dataOficina: doc.data().dataOficina?.toDate(),
        dataCancelamento: doc.data().dataCancelamento?.toDate(),
        dataInicio: doc.data().dataInicio?.toDate()
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
    const emPausa = chamadosList.filter(c => c.status === 'em_pausa').length;
    const emOficina = chamadosList.filter(c => c.status === 'em_oficina').length;
    const aguardandoPecas = chamadosList.filter(c => c.status === 'aguardando_pecas').length;

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
      emPausa,
      emOficina,
      aguardandoPecas,
      satisfacaoMedia,
      topEquipamentos,
      avaliacoes: avaliados.length
    });
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'aberto': return 'Aberta';
      case 'em_andamento': return 'Em Andamento';
      case 'em_pausa': return 'Em Pausa';
      case 'em_oficina': return 'Em Oficina';
      case 'aguardando_pecas': return 'Aguardando Peças';
      case 'concluido': return 'Concluída';
      case 'cancelado': return 'Cancelada';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'em_pausa': return 'bg-orange-100 text-orange-800';
      case 'em_oficina': return 'bg-purple-100 text-purple-800';
      case 'aguardando_pecas': return 'bg-red-100 text-red-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatarDataHora = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularDuracao = (inicio, fim) => {
    if (!inicio || !fim) return '-';
    const diff = (fim - inicio) / (1000 * 60 * 60);
    const horas = Math.floor(diff);
    const minutos = Math.floor((diff % 1) * 60);
    return `${horas}h ${minutos}min`;
  };

  // GERAR PDF NO ESTILO DO DOCUMENTO
  const gerarPDFCompleto = () => {
    setExportando(true);
    
    try {
      const doc = new jsPDF();
      const mesNome = meses[mesSelecionado];
      
      // CAPA
      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setFillColor(255, 215, 0);
      doc.circle(105, 80, 25, 'F');
      doc.setTextColor(0, 51, 102);
      doc.setFontSize(40);
      doc.setFont('helvetica', 'bold');
      doc.text('OS', 105, 90, { align: 'center' });
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDENS DE', 105, 140, { align: 'center' });
      doc.text('SERVIÇO', 105, 165, { align: 'center' });
      
      doc.setDrawColor(255, 215, 0);
      doc.setLineWidth(2);
      doc.line(60, 180, 150, 180);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(`${mesNome} / ${anoSelecionado}`, 105, 205, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Técnico: ${userData?.nome || 'Não informado'}`, 105, 230, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de OS: ${estatisticas.total}`, 105, 245, { align: 'center' });
      doc.text(`Concluídas: ${estatisticas.concluidos}`, 105, 255, { align: 'center' });
      doc.text(`Em Andamento: ${estatisticas.andamento}`, 105, 265, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text('Documento gerado pelo sistema', 105, 285, { align: 'center' });

      // FICHAS INDIVIDUAIS DAS OS
      chamados.forEach((chamado, idx) => {
        doc.addPage();
        
        // Cabeçalho
        doc.setFillColor(0, 51, 102);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`ORDEM DE SERVIÇO #${chamado.id?.slice(-6) || 'XXXXXX'}`, 105, 22, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 180, 35, { align: 'right' });
        
        // Badge de status
        let statusColor;
        switch(chamado.status) {
          case 'concluido': statusColor = [39, 174, 96]; break;
          case 'em_andamento': statusColor = [41, 128, 185]; break;
          case 'em_pausa': statusColor = [230, 126, 34]; break;
          case 'em_oficina': statusColor = [155, 89, 182]; break;
          case 'aguardando_pecas': statusColor = [192, 57, 43]; break;
          case 'aberto': statusColor = [241, 196, 15]; break;
          default: statusColor = [149, 165, 166];
        }
        
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.roundedRect(140, 45, 60, 10, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(getStatusText(chamado.status), 170, 53, { align: 'center' });
        
        let yPos = 65;
        
        // INFORMAÇÕES DO CLIENTE
        doc.setFillColor(0, 51, 102);
        doc.rect(14, yPos - 5, 5, 10, 'F');
        doc.setTextColor(0, 51, 102);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES DO CLIENTE', 24, yPos);
        yPos += 10;
        
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(14, yPos, 182, 50, 3, 3, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(14, yPos, 182, 50, 3, 3, 'S');
        
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        doc.text('Nome do cliente:', 20, yPos + 10);
        doc.setFont('helvetica', 'bold');
        doc.text(chamado.solicitanteNome || '-', 55, yPos + 10);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Unidade:', 20, yPos + 20);
        doc.setFont('helvetica', 'bold');
        doc.text(chamado.unidade || '-', 55, yPos + 20);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Telefone:', 20, yPos + 30);
        doc.setFont('helvetica', 'bold');
        doc.text(chamado.telefone || '-', 55, yPos + 30);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Endereço:', 20, yPos + 40);
        doc.setFont('helvetica', 'bold');
        doc.text(chamado.endereco || '-', 55, yPos + 40);
        
        yPos += 60;
        
        // INFORMAÇÕES DA TAREFA
        doc.setFillColor(0, 51, 102);
        doc.rect(14, yPos - 5, 5, 10, 'F');
        doc.setTextColor(0, 51, 102);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES DA TAREFA', 24, yPos);
        yPos += 10;
        
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(14, yPos, 182, 55, 3, 3, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(14, yPos, 182, 55, 3, 3, 'S');
        
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        doc.text('Equipamento:', 20, yPos + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(chamado.equipamento || '-', 55, yPos + 10);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Data/Hora abertura:', 20, yPos + 20);
        doc.setFont('helvetica', 'normal');
        doc.text(formatarDataHora(chamado.dataCriacao), 65, yPos + 20);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Tipo de tarefa:', 20, yPos + 30);
        doc.setFont('helvetica', 'normal');
        doc.text(chamado.servicoRealizado?.tipo || 'Corretiva', 55, yPos + 30);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Orientação:', 20, yPos + 40);
        doc.setFont('helvetica', 'normal');
        const orientacao = doc.splitTextToSize(chamado.descricao || '-', 150);
        doc.text(orientacao, 45, yPos + 40);
        
        yPos += 65;
        
        // DEFEITO E SOLUÇÃO
        doc.setFillColor(0, 51, 102);
        doc.rect(14, yPos - 5, 5, 10, 'F');
        doc.setTextColor(0, 51, 102);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DEFEITO E SOLUÇÃO', 24, yPos);
        yPos += 10;
        
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14, yPos, 182, 50, 3, 3, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(14, yPos, 182, 50, 3, 3, 'S');
        
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Defeito relatado:', 20, yPos + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(chamado.descricao || '-', 55, yPos + 10);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Defeito identificado:', 20, yPos + 20);
        doc.setFont('helvetica', 'normal');
        doc.text(chamado.servicoRealizado?.defeitoIdentificado || '-', 60, yPos + 20);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Solução aplicada:', 20, yPos + 30);
        doc.setFont('helvetica', 'normal');
        const solucao = doc.splitTextToSize(chamado.servicoRealizado?.descricao || chamado.servicoRealizado?.solucao || '-', 150);
        doc.text(solucao, 55, yPos + 30);
        
        yPos += 60;
        
        // PAUSAS NA TAREFA (se houver)
        if (chamado.historico?.filter(h => h.tipo === 'status' && h.acao.includes('PAUSA')).length > 0) {
          const pausas = chamado.historico.filter(h => h.tipo === 'status' && h.acao.includes('PAUSA'));
          
          if (yPos > 200) {
            doc.addPage();
            yPos = 30;
          }
          
          doc.setFillColor(230, 126, 34);
          doc.rect(14, yPos - 5, 5, 10, 'F');
          doc.setTextColor(230, 126, 34);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('PAUSAS NA TAREFA', 24, yPos);
          yPos += 10;
          
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(14, yPos, 182, 15 + (pausas.length * 12), 3, 3, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(14, yPos, 182, 15 + (pausas.length * 12), 3, 3, 'S');
          
          let yPausa = yPos + 7;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Início', 20, yPausa);
          doc.text('Fim', 65, yPausa);
          doc.text('Motivo', 110, yPausa);
          yPausa += 5;
          
          doc.setFont('helvetica', 'normal');
          pausas.forEach((pausa, i) => {
            doc.text(formatarDataHora(pausa.data), 20, yPausa + (i * 8));
            doc.text('-', 65, yPausa + (i * 8));
            doc.text(pausa.motivo || '-', 110, yPausa + (i * 8));
          });
          
          yPos += 20 + (pausas.length * 12);
        }
        
        // ASSINATURAS
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
        
        // Rodapé
        doc.setDrawColor(0, 51, 102);
        doc.setLineWidth(0.2);
        doc.line(14, 280, 196, 280);
        
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text(`OS #${chamado.id?.slice(-6)} - Gerada em ${new Date().toLocaleString('pt-BR')}`, 14, 287);
        doc.text(`Código: OS-${mesNome}-${anoSelecionado}-${String(idx + 1).padStart(2, '0')}`, 180, 287, { align: 'right' });
      });
      
      doc.save(`OS_${mesNome}_${anoSelecionado}_Completo.pdf`);
      toast.success('PDF gerado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
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
          <h1 className="text-2xl font-bold text-gray-800">Ordens de Serviço</h1>
          <p className="text-gray-600">Visualize e exporte suas OS com modelo profissional</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={gerarPDFCompleto}
            disabled={exportando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md"
          >
            <PrinterIcon className="w-5 h-5" />
            {exportando ? 'Gerando...' : 'Exportar PDF Completo'}
          </button>
        </div>
      </div>

      {/* Seletor de Mês/Ano */}
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

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
          <DocumentTextIcon className="w-8 h-8 opacity-90 mb-2" />
          <p className="text-2xl font-bold">{estatisticas.total}</p>
          <p className="text-xs opacity-90">Total de OS no período</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
          <CheckCircleIcon className="w-8 h-8 opacity-90 mb-2" />
          <p className="text-2xl font-bold">{estatisticas.concluidos}</p>
          <p className="text-xs opacity-90">Concluídas</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-md">
          <ClockIcon className="w-8 h-8 opacity-90 mb-2" />
          <p className="text-2xl font-bold">{estatisticas.andamento}</p>
          <p className="text-xs opacity-90">Em Andamento</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
          <StarIconSolid className="w-8 h-8 opacity-90 mb-2" />
          <p className="text-2xl font-bold">{estatisticas.satisfacaoMedia}</p>
          <p className="text-xs opacity-90">Satisfação média</p>
        </div>
      </div>

      {/* Lista de OS - Cards estilo OS */}
      <div className="grid grid-cols-1 gap-4">
        {chamados.map((chamado) => (
          <div
            key={chamado.id}
            className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition cursor-pointer overflow-hidden"
            onClick={() => {
              setSelectedChamado(chamado);
              setShowDetailsModal(true);
            }}
          >
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  #{chamado.id?.slice(-6)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(chamado.status)}`}>
                  {getStatusText(chamado.status)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  chamado.prioridade === 'alta' || chamado.prioridade === 'emergencial' ? 'bg-red-100 text-red-700' :
                  chamado.prioridade === 'media' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}>
                  {chamado.prioridade}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {formatarData(chamado.dataCriacao)}
              </div>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircleIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Cliente:</span>
                    <span className="text-sm text-gray-600">{chamado.solicitanteNome || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Unidade:</span>
                    <span className="text-sm text-gray-600">{chamado.unidade || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <WrenchScrewdriverIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Equipamento:</span>
                    <span className="text-sm text-gray-600">{chamado.equipamento || '-'}</span>
                  </div>
                </div>
                <div>
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Defeito:</span>
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{chamado.descricao || '-'}</p>
                  </div>
                  {chamado.servicoRealizado && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Solução:</span>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{chamado.servicoRealizado.descricao || '-'}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <button className="text-blue-600 text-sm hover:text-blue-800 font-medium flex items-center gap-1">
                  Ver detalhes completos
                  <ArrowPathIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {chamados.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma OS encontrada</h3>
            <p className="text-gray-500">Não há ordens de serviço no período selecionado.</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da OS */}
      {showDetailsModal && selectedChamado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Ordem de Serviço</h2>
                <p className="text-sm text-gray-500">#{selectedChamado.id?.slice(-6)}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* INFORMAÇÕES DO CLIENTE */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <UserCircleIcon className="w-5 h-5 text-blue-600" />
                  Informações do Cliente
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{selectedChamado.solicitanteNome || '-'}</span></div>
                  <div><span className="text-gray-500">Unidade:</span> <span className="font-medium">{selectedChamado.unidade || '-'}</span></div>
                  <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{selectedChamado.telefone || '-'}</span></div>
                  <div><span className="text-gray-500">Endereço:</span> <span className="font-medium">{selectedChamado.endereco || '-'}</span></div>
                </div>
              </div>
              
              {/* INFORMAÇÕES DO EQUIPAMENTO */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <WrenchScrewdriverIcon className="w-5 h-5 text-blue-600" />
                  Equipamento
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><span className="text-gray-500">Equipamento:</span> <span className="font-medium">{selectedChamado.equipamento || '-'}</span></div>
                  <div><span className="text-gray-500">Prioridade:</span> <span className="font-medium">{selectedChamado.prioridade || '-'}</span></div>
                  <div><span className="text-gray-500">Data de abertura:</span> <span className="font-medium">{formatarDataHora(selectedChamado.dataCriacao)}</span></div>
                  <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedChamado.status)}`}>{getStatusText(selectedChamado.status)}</span></div>
                </div>
              </div>
              
              {/* DEFEITO E SOLUÇÃO */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-blue-600" />
                  Defeito e Solução
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div><span className="text-gray-500">Defeito relatado:</span> <p className="mt-1">{selectedChamado.descricao || '-'}</p></div>
                  <div><span className="text-gray-500">Solução aplicada:</span> <p className="mt-1">{selectedChamado.servicoRealizado?.descricao || '-'}</p></div>
                  {selectedChamado.servicoRealizado?.pecasTrocadas && (
                    <div><span className="text-gray-500">Peças trocadas:</span> <p className="mt-1">{selectedChamado.servicoRealizado.pecasTrocadas}</p></div>
                  )}
                </div>
              </div>
              
              {/* TIMELINE/HISTÓRICO */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Linha do Tempo
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  {selectedChamado.historico && selectedChamado.historico.length > 0 ? (
                    <div className="space-y-3">
                      {selectedChamado.historico.map((item, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg border-l-4 border-blue-500">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{item.usuario}</span>
                            <span className="text-xs text-gray-500">{formatarDataHora(item.data?.toDate?.() || item.data)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{item.acao}</p>
                          {item.motivo && <p className="text-xs text-orange-600 mt-1">Motivo: {item.motivo}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nenhuma atualização registrada</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}