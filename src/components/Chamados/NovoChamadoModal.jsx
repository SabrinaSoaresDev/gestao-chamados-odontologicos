import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { XMarkIcon, PhotoIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function NovoChamadoModal({ isOpen, onClose, solicitanteId, solicitanteNome }) {
  const [formData, setFormData] = useState({
    titulo: '',
    equipamento: '',
    descricao: '',
    prioridade: 'media'
  });
  const [fotos, setFotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limitar a 3 fotos para não estourar o limite do Firestore (1MB por documento)
    if (files.length > 3) {
      toast.error('Máximo de 3 fotos por chamado');
      return;
    }

    // Validar tipos de arquivo
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      if (!isValid) {
        toast.error(`${file.name} não é uma imagem válida`);
      }
      return isValid;
    });

    // Validar tamanho (máx 500KB para não estourar o Firestore)
    const validSizeFiles = validFiles.filter(file => {
      const isValid = file.size <= 500 * 1024; // 500KB
      if (!isValid) {
        toast.error(`${file.name} é muito grande (máx 500KB)`);
      }
      return isValid;
    });

    setFotos(validSizeFiles);
  };

  const removeFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  // Função para converter imagem para Base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Função para redimensionar imagem (opcional - para reduzir ainda mais o tamanho)
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
        
        // Comprimir para JPEG com qualidade 0.7
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
      
      // Converter fotos para Base64 se houver
      if (fotos.length > 0) {
        toast.loading('Processando imagens...', { id: 'process' });
        
        for (let i = 0; i < fotos.length; i++) {
          const foto = fotos[i];
          
          // Converter para Base64
          let base64 = await convertToBase64(foto);
          
          // Redimensionar se for muito grande
          if (base64.length > 300 * 1024) { // Se maior que 300KB
            base64 = await resizeImage(base64, 600);
          }
          
          // Verificar tamanho final
          const sizeInMB = (base64.length * 0.75) / (1024 * 1024); // Aproximado
          if (sizeInMB > 0.8) {
            toast.warning(`Imagem ${i + 1} ficou grande (${sizeInMB.toFixed(2)}MB)`);
          }
          
          fotosBase64.push(base64);
        }
        
        toast.success(`${fotosBase64.length} imagem(ns) processada(s)!`, { id: 'process' });
      }

      // Calcular tamanho total aproximado
      const totalSize = fotosBase64.reduce((acc, base64) => acc + base64.length, 0);
      const totalSizeMB = (totalSize * 0.75) / (1024 * 1024);
      
      if (totalSizeMB > 0.9) {
        toast.warning('O total de imagens está próximo do limite do Firestore (1MB)');
      }

      // Salvar chamado no Firestore
      const chamadoData = {
        ...formData,
        solicitanteId,
        solicitanteNome,
        status: 'aberto',
        fotos: fotosBase64, // Agora salva as imagens em Base64
        dataCriacao: new Date(),
        historico: [{
          data: new Date(),
          acao: 'Chamado criado',
          usuario: solicitanteNome,
          tipo: 'criacao'
        }],
        metadata: {
          totalImagens: fotosBase64.length,
          tamanhoAproximadoKB: Math.round((totalSize * 0.75) / 1024)
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
      onClose();
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      
      if (error.code === 'permission-denied') {
        toast.error('Sem permissão para criar chamado');
      } else if (error.code === 'resource-exhausted') {
        toast.error('Limite de dados excedido. Tente com imagens menores.');
      } else {
        toast.error('Erro ao criar chamado. Tente novamente.');
      }
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos (opcional - máximo 3 fotos de até 500KB cada)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="fotos-upload"
                disabled={uploading}
              />
              <label
                htmlFor="fotos-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <PhotoIcon className="w-12 h-12 text-gray-400" />
                <span className="text-sm text-gray-500 mt-2">
                  Clique para adicionar fotos
                </span>
                <span className="text-xs text-gray-400">
                  PNG, JPG até 500KB (máx 3 fotos)
                </span>
              </label>
            </div>
            
            {fotos.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">
                    {fotos.length} foto(s) selecionada(s)
                  </p>
                  <p className="text-xs text-gray-500">
                    Tamanho total: {Array.from(fotos).reduce((acc, f) => acc + f.size, 0) / 1024}KB
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(fotos).map((foto, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(foto)}
                        alt={`Preview ${index}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFoto(index)}
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
          </div>

          {uploading && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Processando imagens...</span>
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