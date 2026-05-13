import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { 
  XMarkIcon, 
  PhotoIcon, 
  ArrowPathIcon,
  FilmIcon,
  PlayIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function NovoChamadoModal({ isOpen, onClose, solicitanteId, solicitanteNome }) {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    titulo: '',
    equipamento: '',
    descricao: '',
    prioridade: 'media',
    unidade: ''
  });
  const [fotos, setFotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [midiaType, setMidiaType] = useState('foto');

  // LIMITES AUMENTADOS PARA 10MB
  const MAX_FOTO_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FOTOS = 5;  // Máximo de 5 fotos
  const MAX_VIDEOS = 3; // Máximo de 3 vídeos

  // Buscar unidade do usuário ao abrir modal
  useEffect(() => {
    const buscarUnidade = async () => {
      if (isOpen && userData?.uid) {
        try {
          const userRef = doc(db, 'usuarios', userData.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const unidade = userDoc.data().unidade || '';
            setFormData(prev => ({ ...prev, unidade: unidade }));
          }
        } catch (error) {
          console.error('Erro ao buscar unidade:', error);
        }
      }
    };
    buscarUnidade();
  }, [isOpen, userData]);

  // Função para validar arquivos (AGORA COM 10MB)
  const validarArquivo = (file) => {
    const isFoto = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isFoto && !isVideo) {
      toast.error(`${file.name} não é uma imagem ou vídeo válido`);
      return false;
    }

    if (isFoto) {
      if (file.size > MAX_FOTO_SIZE) {
        const tamanhoMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`${file.name} excede 10MB. Tamanho: ${tamanhoMB}MB`);
        return false;
      }
    }
    
    if (isVideo) {
      if (file.size > MAX_VIDEO_SIZE) {
        const tamanhoMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`${file.name} excede 10MB. Tamanho: ${tamanhoMB}MB`);
        return false;
      }
    }

    // Validar formato
    const tiposFoto = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const tiposVideo = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
    
    if (isFoto && !tiposFoto.includes(file.type)) {
      toast.error(`Formato de foto não suportado: ${file.name}. Use JPG, PNG ou WEBP`);
      return false;
    }
    
    if (isVideo && !tiposVideo.includes(file.type)) {
      toast.error(`Formato de vídeo não suportado: ${file.name}. Use MP4, MOV ou WEBM`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    const totalArquivos = fotos.length + videos.length + files.length;
    if (totalArquivos > (MAX_FOTOS + MAX_VIDEOS)) {
      toast.error(`Máximo de ${MAX_FOTOS + MAX_VIDEOS} arquivos por chamado (${MAX_FOTOS} fotos + ${MAX_VIDEOS} vídeos)`);
      return;
    }

    const novasFotos = [];
    const novosVideos = [];

    for (const file of files) {
      if (!validarArquivo(file)) continue;

      if (file.type.startsWith('image/')) {
        if (fotos.length + novasFotos.length >= MAX_FOTOS) {
          toast.error(`Máximo de ${MAX_FOTOS} fotos por chamado`);
          continue;
        }
        novasFotos.push(file);
      } else if (file.type.startsWith('video/')) {
        if (videos.length + novosVideos.length >= MAX_VIDEOS) {
          toast.error(`Máximo de ${MAX_VIDEOS} vídeos por chamado`);
          continue;
        }
        novosVideos.push(file);
      }
    }

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

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const resizeImage = (base64Str, maxWidth = 1200) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        // Se a imagem já for pequena, não redimensiona
        if (img.width <= maxWidth && base64Str.length < 500 * 1024) {
          resolve(base64Str);
          return;
        }
        
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
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
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
    toast.loading('Processando arquivos...', { id: 'upload' });

    try {
      let fotosBase64 = [];
      let videosBase64 = [];
      
      // Processar fotos
      if (fotos.length > 0) {
        toast.loading(`Processando ${fotos.length} foto(s)...`, { id: 'upload' });
        
        for (let i = 0; i < fotos.length; i++) {
          const foto = fotos[i];
          let base64 = await convertToBase64(foto);
          
          // Redimensionar apenas se for maior que 1MB
          if (base64.length > 1024 * 1024) {
            base64 = await resizeImage(base64, 1200);
          }
          
          fotosBase64.push(base64);
        }
      }

      // Processar vídeos
      if (videos.length > 0) {
        toast.loading(`Processando ${videos.length} vídeo(s)...`, { id: 'upload' });
        
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          const base64 = await convertToBase64(video);
          videosBase64.push(base64);
        }
      }

      const totalSizeFotos = fotosBase64.reduce((acc, base64) => acc + base64.length, 0);
      const totalSizeVideos = videosBase64.reduce((acc, base64) => acc + base64.length, 0);
      const totalSizeMB = ((totalSizeFotos + totalSizeVideos) * 0.75) / (1024 * 1024);
      
      if (totalSizeMB > 9) {
        toast.warning(`Total de ${totalSizeMB.toFixed(1)}MB - Próximo do limite do Firestore (10MB)`);
      }

      // Salvar chamado no Firestore
      const chamadoData = {
        ...formData,
        solicitanteId: solicitanteId || userData?.uid,
        solicitanteNome: solicitanteNome || userData?.nome,
        status: 'aberto',
        fotos: fotosBase64,
        videos: videosBase64,
        dataCriacao: new Date(),
        historico: [{
          data: new Date(),
          acao: `Chamado criado ${formData.unidade ? `para ${formData.unidade}` : ''} com ${fotos.length} foto(s) e ${videos.length} vídeo(s)`,
          usuario: solicitanteNome || userData?.nome,
          tipo: 'criacao'
        }],
        metadata: {
          totalFotos: fotosBase64.length,
          totalVideos: videosBase64.length,
          tamanhoAproximadoKB: Math.round((totalSizeFotos + totalSizeVideos) * 0.75 / 1024)
        }
      };

      await addDoc(collection(db, 'chamados'), chamadoData);
      
      toast.success('Chamado criado com sucesso!', { id: 'upload' });
      
      // Resetar formulário
      setFormData({
        titulo: '',
        equipamento: '',
        descricao: '',
        prioridade: 'media',
        unidade: formData.unidade
      });
      setFotos([]);
      setVideos([]);
      onClose();
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      
      if (error.code === 'permission-denied') {
        toast.error('Sem permissão para criar chamado', { id: 'upload' });
      } else if (error.code === 'resource-exhausted') {
        toast.error('Limite de dados excedido. Tente com arquivos menores (máx 10MB total).', { id: 'upload' });
      } else {
        toast.error('Erro ao criar chamado. Tente novamente.', { id: 'upload' });
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

          {/* Unidade de Atendimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="w-4 h-4" />
                Unidade de Atendimento
              </div>
            </label>
            <input
              type="text"
              value={formData.unidade}
              onChange={(e) => setFormData({...formData, unidade: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o nome da unidade (ex: UBS Centro)"
              disabled={uploading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Unidade vinculada ao seu cadastro será preenchida automaticamente
            </p>
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
              <option value="baixa">Baixa - Pode aguardar</option>
              <option value="media">Média - Normal</option>
              <option value="alta">Alta - Afeta o atendimento</option>
              <option value="emergencial">Emergencial - Impossibilita atendimento</option>
            </select>
          </div>

          {/* SEÇÃO DE MÍDIA - ATUALIZADA COM 10MB */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos e Vídeos (opcional - até 10MB cada)
            </label>
            
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
                Fotos (máx {MAX_FOTOS} - 10MB cada)
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
                Vídeos (máx {MAX_VIDEOS} - 10MB cada)
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                accept={midiaType === 'foto' ? "image/jpeg,image/jpg,image/png,image/webp" : "video/mp4,video/mpeg,video/quicktime,video/webm"}
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
                      JPG, PNG, WEBP até 10MB (máx {MAX_FOTOS})
                    </span>
                  </>
                ) : (
                  <>
                    <FilmIcon className="w-12 h-12 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-2">
                      Clique para adicionar vídeos
                    </span>
                    <span className="text-xs text-gray-400">
                      MP4, MOV, WEBM até 10MB (máx {MAX_VIDEOS})
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Preview das Fotos */}
            {fotos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Fotos ({fotos.length}/{MAX_FOTOS}):
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
                  Vídeos ({videos.length}/{MAX_VIDEOS}):
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
                        {(video.size / (1024 * 1024)).toFixed(1)}MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(fotos.length > 0 || videos.length > 0) && (
              <div className="mt-2 text-xs text-gray-500">
                <strong>Resumo:</strong> {fotos.length} foto(s) + {videos.length} vídeo(s) | 
                Tamanho total: {((fotos.reduce((acc, f) => acc + f.size, 0) + 
                  videos.reduce((acc, v) => acc + v.size, 0)) / (1024 * 1024)).toFixed(2)}MB
                {((fotos.reduce((acc, f) => acc + f.size, 0) + 
                  videos.reduce((acc, v) => acc + v.size, 0)) / (1024 * 1024)) > 9 && (
                  <span className="text-orange-500 ml-1">⚠️ Próximo do limite</span>
                )}
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