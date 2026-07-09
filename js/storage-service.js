/**
 * STORAGE SERVICE - NEP Delivery Control
 * Service unificado para operações de storage com Supabase
 * 
 * Uso:
 *   await StorageService.uploadAvatar(file);
 *   await StorageService.uploadAttachment('reports', reportId, file);
 *   StorageService.getAvatarUrl(userId);
 */

const StorageService = {

    // ============================================
    // MÉTODOS GENÉRICOS
    // ============================================

    /**
     * Upload genérico de arquivo
     * @param {string} bucket - Nome do bucket
     * @param {string} path - Caminho dentro do bucket
     * @param {File} file - Arquivo a ser enviado
     * @param {Object} options - Opções adicionais
     * @returns {Promise<{url: string, path: string}>}
     */
    async upload(bucket, path, file, options = {}) {
        const storage = SupabaseClient.storage;
        if (!storage) {
            throw new Error('Supabase Storage não está configurado');
        }

        const {
            upsert = false,
            cacheControl = '3600',
            onProgress = null
        } = options;

        try {
            const { data, error } = await storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl,
                    upsert,
                    ...(onProgress && { onUploadProgress: onProgress })
                });

            if (error) throw error;

            // Retorna URL pública ou assinada dependendo do bucket
            const url = this.getPublicUrl(bucket, path);

            console.log(`[Storage] ✅ Upload concluído: ${bucket}/${path}`);
            return { url, path: data.path };

        } catch (error) {
            console.error(`[Storage] ❌ Erro no upload:`, error);
            throw error;
        }
    },

    /**
     * Obtém URL pública de um arquivo
     * @param {string} bucket - Nome do bucket
     * @param {string} path - Caminho do arquivo
     * @param {Object} transform - Transformações de imagem (opcional)
     * @returns {string} URL pública
     */
    getPublicUrl(bucket, path, transform = null) {
        const storage = SupabaseClient.storage;
        if (!storage) return '';

        const options = transform ? { transform } : {};
        const { data } = storage.from(bucket).getPublicUrl(path, options);
        return data.publicUrl;
    },

    /**
     * Obtém URL assinada (para buckets privados)
     * @param {string} bucket - Nome do bucket
     * @param {string} path - Caminho do arquivo
     * @param {number} expiresIn - Tempo de expiração em segundos (default: 1 hora)
     * @returns {Promise<string>} URL assinada
     */
    async getSignedUrl(bucket, path, expiresIn = 3600) {
        const storage = SupabaseClient.storage;
        if (!storage) throw new Error('Storage não configurado');

        const { data, error } = await storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);

        if (error) throw error;
        return data.signedUrl;
    },

    /**
     * Deleta um ou mais arquivos
     * @param {string} bucket - Nome do bucket
     * @param {string|string[]} paths - Caminho(s) dos arquivos
     * @returns {Promise<void>}
     */
    async delete(bucket, paths) {
        const storage = SupabaseClient.storage;
        if (!storage) throw new Error('Storage não configurado');

        const pathArray = Array.isArray(paths) ? paths : [paths];

        const { error } = await storage
            .from(bucket)
            .remove(pathArray);

        if (error) throw error;
        console.log(`[Storage] 🗑️ Deletado: ${pathArray.join(', ')}`);
    },

    /**
     * Lista arquivos em uma pasta
     * @param {string} bucket - Nome do bucket
     * @param {string} folder - Pasta a listar
     * @param {Object} options - Opções de listagem
     * @returns {Promise<Array>} Lista de arquivos
     */
    async list(bucket, folder = '', options = {}) {
        const storage = SupabaseClient.storage;
        if (!storage) throw new Error('Storage não configurado');

        const { data, error } = await storage
            .from(bucket)
            .list(folder, {
                limit: options.limit || 100,
                offset: options.offset || 0,
                sortBy: options.sortBy || { column: 'name', order: 'asc' }
            });

        if (error) throw error;
        return data;
    },

    // ============================================
    // MÉTODOS ESPECÍFICOS - AVATARS
    // ============================================

    /**
     * Faz upload da foto de perfil do usuário
     * @param {File} file - Arquivo de imagem
     * @param {string} userId - UID do usuário (opcional, usa o logado)
     * @returns {Promise<string>} URL da foto
     */
    async uploadAvatar(file, userId = null) {
        const uid = userId || localStorage.getItem('nep_user_uid');
        if (!uid) throw new Error('Usuário não identificado');

        // Gera nome único para evitar cache
        const ext = file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const path = `${uid}/avatar_${timestamp}.${ext}`;

        // Remove avatar antigo se existir
        try {
            const oldFiles = await this.list(SupabaseClient.buckets.avatars, uid);
            if (oldFiles.length > 0) {
                const oldPaths = oldFiles.map(f => `${uid}/${f.name}`);
                await this.delete(SupabaseClient.buckets.avatars, oldPaths);
            }
        } catch (e) {
            // Ignora erro se não houver avatar antigo
        }

        // Upload do novo avatar
        const result = await this.upload(
            SupabaseClient.buckets.avatars,
            path,
            file,
            { upsert: true }
        );

        // Atualiza no Firestore se disponível
        if (window.db && uid) {
            try {
                await window.db.collection('users').doc(uid).update({
                    photoURL: result.url,
                    photoUpdatedAt: new Date()
                });
                console.log('[Storage] 📝 URL do avatar atualizada no Firestore');
            } catch (e) {
                console.warn('[Storage] ⚠️ Não foi possível atualizar Firestore:', e);
            }
        }

        return result.url;
    },

    /**
     * Obtém URL do avatar do usuário
     * @param {string} userId - UID do usuário
     * @param {Object} options - Opções de transformação
     * @returns {string} URL do avatar ou placeholder
     */
    getAvatarUrl(userId, options = {}) {
        const { width = 200, height = 200 } = options;

        // Se não tem Supabase configurado, retorna placeholder
        if (!SupabaseClient.isReady) {
            return this.getAvatarPlaceholder(userId);
        }

        // Tenta pegar do cache local primeiro (Firestore user doc)
        // A URL real será carregada do Firestore pelo módulo de perfil
        return this.getAvatarPlaceholder(userId);
    },

    /**
     * Gera um avatar placeholder baseado no nome/ID
     * @param {string} nameOrId - Nome ou ID do usuário
     * @returns {string} URL do placeholder ou gradiente CSS
     */
    getAvatarPlaceholder(nameOrId) {
        // Usa o gradiente existente do NepApp se disponível
        if (window.NepApp?.getAvatarGradient) {
            return window.NepApp.getAvatarGradient(nameOrId);
        }

        // Fallback para UI Avatars
        const name = encodeURIComponent(nameOrId || 'User');
        return `https://ui-avatars.com/api/?name=${name}&background=random&size=200`;
    },

    // ============================================
    // MÉTODOS ESPECÍFICOS - ATTACHMENTS
    // ============================================

    /**
     * Faz upload de anexo para um módulo específico
     * @param {string} module - Módulo (reports, okr, tasks)
     * @param {string} parentId - ID do documento pai
     * @param {File} file - Arquivo a enviar
     * @param {Object} options - Opções adicionais
     * @returns {Promise<Object>} Metadados do anexo
     */
    async uploadAttachment(module, parentId, file, options = {}) {
        const bucket = SupabaseClient.buckets.attachments;
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${module}/${parentId}/${timestamp}_${safeName}`;

        const result = await this.upload(bucket, path, file, options);

        return {
            id: `${timestamp}_${safeName}`,
            name: file.name,
            path: result.path,
            url: result.url,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: localStorage.getItem('nep_user_uid')
        };
    },

    /**
     * Lista anexos de um documento
     * @param {string} module - Módulo (reports, okr, tasks)
     * @param {string} parentId - ID do documento pai
     * @returns {Promise<Array>} Lista de anexos
     */
    async listAttachments(module, parentId) {
        const folder = `${module}/${parentId}`;
        const bucket = SupabaseClient.buckets.attachments;
        const files = await this.list(bucket, folder);

        // Usar signed URLs porque o bucket 'attachments' é privado
        const results = [];
        for (const f of files) {
            const filePath = `${folder}/${f.name}`;
            let url = '';
            try {
                url = await this.getSignedUrl(bucket, filePath, 7200); // 2 horas
            } catch (e) {
                console.warn(`[Storage] Erro ao gerar signed URL para ${f.name}:`, e);
                url = this.getPublicUrl(bucket, filePath); // fallback
            }
            results.push({
                name: f.name,
                path: filePath,
                url,
                size: f.metadata?.size || 0,
                createdAt: f.created_at
            });
        }
        return results;
    },

    /**
     * Deleta todos os anexos de um documento
     * @param {string} module - Módulo (reports, okr, tasks)
     * @param {string} parentId - ID do documento pai
     */
    async deleteAllAttachments(module, parentId) {
        const folder = `${module}/${parentId}`;
        const files = await this.list(SupabaseClient.buckets.attachments, folder);

        if (files.length > 0) {
            const paths = files.map(f => `${folder}/${f.name}`);
            await this.delete(SupabaseClient.buckets.attachments, paths);
        }
    },

    // ============================================
    // UTILITÁRIOS
    // ============================================

    /**
     * Formata tamanho de arquivo para exibição
     * @param {number} bytes - Tamanho em bytes
     * @returns {string} Tamanho formatado
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Valida tipo de arquivo
     * @param {File} file - Arquivo
     * @param {string[]} allowedTypes - Tipos MIME permitidos
     * @returns {boolean}
     */
    validateFileType(file, allowedTypes) {
        return allowedTypes.some(type => {
            if (type.endsWith('/*')) {
                return file.type.startsWith(type.replace('/*', ''));
            }
            return file.type === type;
        });
    },

    /**
     * Valida tamanho de arquivo
     * @param {File} file - Arquivo
     * @param {number} maxSizeMB - Tamanho máximo em MB
     * @returns {boolean}
     */
    validateFileSize(file, maxSizeMB) {
        return file.size <= maxSizeMB * 1024 * 1024;
    },

    /**
     * Comprime imagem antes do upload (se necessário)
     * @param {File} file - Arquivo de imagem
     * @param {Object} options - Opções de compressão
     * @returns {Promise<Blob>} Imagem comprimida
     */
    async compressImage(file, options = {}) {
        const {
            maxWidth = 1920,
            maxHeight = 1080,
            quality = 0.8
        } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                // Calcula novas dimensões mantendo proporção
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                // Cria canvas e desenha imagem redimensionada
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Converte para blob
                canvas.toBlob(
                    blob => resolve(blob),
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
};

// Expor globalmente
window.StorageService = StorageService;

console.log('[StorageService] 📦 Módulo carregado');
