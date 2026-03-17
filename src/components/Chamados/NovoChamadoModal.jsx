import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { 
  XMarkIcon, 
  PhotoIcon, 
  ArrowPathIcon,
  FilmIcon,
  PlayIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function NovoChamadoModal({ isOpen, onClose, solicitanteId, solicitanteNome }) {
  const [formData, setFormData] = useState({
    titulo: '',
    equipamento: '',
    descricao: '',
    prioridade: 'media'
  });
  const [fotos, setFotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [midiaType, setMidiaType] = useState('foto'); // 'foto' ou 'video'

  // Função para validar arquivos
  const validarArquivo = (file) => {
    const isFoto = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isFoto && !isVideo) {
      toast.error(`${file.name} não é uma imagem ou vídeo válido`);
      return false;
    }

    // Limites diferentes para fotos e vídeos
    if (isFoto && file.size > 500 * 1024) { // 500KB para fotos
      toast.error(`${file.name} é muito grande (máx 500KB)`);
      return false;
    }
    
    if (isVideo && file.size > 5 * 1024 * 1024) { // 5MB para vídeos
      toast.error(`${file.name} é muito grande (máx 5MB)`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limitar número total de arquivos
    const totalArquivos = fotos.length + videos.length + files.length;
    if (totalArquivos > 5) {
      toast.error('Máximo de 5 arquivos por chamado');
      return;
    }

    const novasFotos = [];
    const novosVideos = [];

    files.forEach(file => {
      if (!validarArquivo(file)) return;

      if (file.type.startsWith('image/')) {
        // Verificar limite de fotos (máx 3)
        if (fotos.length + novasFotos.length >= 3) {
          toast.error('Máximo de 3 fotos por chamado');
          return;
        }
        novasFotos.push(file);
      } else if (file.type.startsWith('video/')) {
        // Verificar limite de vídeos (máx 2)
        if (videos.length + novosVideos.length >= 2) {
          toast.error('Máximo de 2 vídeos por chamado');
          return;
        }
        novosVideos.push(file);
      }
    });

    setFotos(prev => [...prev, ...novasFotos]);
    setVideos(prev => [...prev, ...novosVideos]);
  };

  const removerArquivo = (index, tipo) => {
    if (tipo === 'foto') {
      setFotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setVideos(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Função para converter arquivo para Base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Função para redimensionar imagem
  const resizeImage = (base64Str, maxWidth = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth * height) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    
    if (!formData.equipamento.trim()) {
      toast.error('Equipamento é obrigatório');
      return;
    }
    
    if (!formData.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    setUploading(true);

    try {
      let fotosBase64 = [];
      let videosBase64 = [];
      
      // Processar fotos
      if (fotos.length > 0) {
        toast.loading('Processando imagens...', { id: 'process' });
        
        for (let i = 0; i < fotos.length; i++) {
          const foto = fotos[i];
          let base64 = await convertToBase64(foto);
          
          if (base64.length > 300 * 1024) {
            base64 = await resizeImage(base64, 600);
          }
          
          fotosBase64.push(base64);
        }
      }

      // Processar vídeos
      if (videos.length > 0) {
        toast.loading('Processando vídeos...', { id: 'process-videos' });
        
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          const base64 = await convertToBase64(video);
          
          // Vídeos não são redimensionados, apenas convertidos
          videosBase64.push({
            data: base64,
            nome: video.name,
            tipo: video.type,
            tamanho: video.size
          });
        }
      }

      // Calcular tamanho total
      const totalSizeFotos = fotosBase64.reduce((acc, base64) => acc + base64.length, 0);
      const totalSizeVideos = videosBase64.reduce((acc, v) => acc + v.data.length, 0);
      const totalSizeMB = ((totalSizeFotos + totalSizeVideos) * 0.75) / (1024 * 1024);
      
      if (totalSizeMB > 0.9) {
        toast.warning('O total de arquivos está próximo do limite do Firestore (1MB)');
      }

      // Salvar chamado no Firestore
      const chamadoData = {
        ...formData,
        solicitanteId,
        solicitanteNome,
        status: 'aberto',
        fotos: fotosBase64,
        videos: videosBase64,
        dataCriacao: new Date(),
        historico: [{
          data: new Date(),
          acao: `Chamado criado com ${fotos.length} foto(s) e ${videos.length} vídeo(s)`,
          usuario: solicitanteNome,
          tipo: 'criacao'
        }],
        metadata: {
          totalFotos: fotosBase64.length,
          totalVideos: videosBase64.length,
          tamanhoAproximadoKB: Math.round((totalSizeFotos + totalSizeVideos) * 0.75 / 1024)
        }
      };

      await addDoc(collection(db, 'chamados'), chamadoData);
      
      toast.success('Chamado criado com sucesso!');
      
      // Reset form
      setFormData({
        titulo: '',
        equipamento: '',
        descricao: '',
        prioridade: 'media'
      });
      setFotos([]);
      setVideos([]);
      onClose();
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      
      if (error.code === 'permission-denied') {
        toast.error('Sem permissão para criar chamado');
      } else if (error.code === 'resource-exhausted') {
        toast.error('Limite de dados excedido. Tente com arquivos menores.');
      } else {
        toast.error('Erro ao criar chamado. Tente novamente.');
      }
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Novo Chamado</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            disabled={uploading}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título do Chamado *
            </label>
            <input
              type="text"
              required
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Cadeira odontológica com problema"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipamento *
            </label>
            <input
              type="text"
              required
              value={formData.equipamento}
              onChange={(e) => setFormData({...formData, equipamento: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Cadeira OD-3000"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição do Problema *
            </label>
            <textarea
              required
              rows="4"
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva detalhadamente o problema..."
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridade
            </label>
            <select
              value={formData.prioridade}
              onChange={(e) => setFormData({...formData, prioridade: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={uploading}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="emergencial">Emergencial</option>
            </select>
          </div>

          {/* SEÇÃO DE MÍDIA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos e Vídeos (opcional)
            </label>
            
            {/* Tabs para selecionar tipo */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setMidiaType('foto')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                  midiaType === 'foto' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <PhotoIcon className="w-4 h-4" />
                Fotos (máx 3 - 500KB cada)
              </button>
              <button
                type="button"
                onClick={() => setMidiaType('video')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                  midiaType === 'video' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FilmIcon className="w-4 h-4" />
                Vídeos (máx 2 - 5MB cada)
              </button>
            </div>

            {/* Área de upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                accept={midiaType === 'foto' ? "image/*" : "video/*"}
                onChange={handleFileChange}
                className="hidden"
                id="midia-upload"
                disabled={uploading}
              />
              <label
                htmlFor="midia-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                {midiaType === 'foto' ? (
                  <>
                    <PhotoIcon className="w-12 h-12 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-2">
                      Clique para adicionar fotos
                    </span>
                    <span className="text-xs text-gray-400">
                      PNG, JPG até 500KB (máx 3)
                    </span>
                  </>
                ) : (
                  <>
                    <FilmIcon className="w-12 h-12 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-2">
                      Clique para adicionar vídeos
                    </span>
                    <span className="text-xs text-gray-400">
                      MP4, MOV até 5MB (máx 2)
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Preview das Fotos */}
            {fotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Fotos ({fotos.length}/3):
                </p>
                <div className="flex flex-wrap gap-2">
                  {fotos.map((foto, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(foto)}
                        alt={`Preview ${index}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removerArquivo(index, 'foto')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={uploading}
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1 rounded-b-lg">
                        {(foto.size / 1024).toFixed(0)}KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview dos Vídeos */}
            {videos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Vídeos ({videos.length}/2):
                </p>
                <div className="flex flex-wrap gap-2">
                  {videos.map((video, index) => (
                    <div key={index} className="relative">
                      <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center">
                        <FilmIcon className="w-8 h-8 text-white" />
                        <PlayIcon className="w-4 h-4 text-white absolute bottom-1 right-1" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removerArquivo(index, 'video')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={uploading}
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1 rounded-b-lg">
                        {(video.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informações de tamanho total */}
            {(fotos.length > 0 || videos.length > 0) && (
              <div className="mt-2 text-xs text-gray-500">
                Tamanho total aproximado: {
                  ((fotos.reduce((acc, f) => acc + f.size, 0) + 
                    videos.reduce((acc, v) => acc + v.size, 0)) / 1024 / 1024).toFixed(2)
                }MB
              </div>
            )}
          </div>

          {uploading && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Processando arquivos...</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={uploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                'Criar Chamado'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}