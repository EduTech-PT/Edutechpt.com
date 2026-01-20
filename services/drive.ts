
import { adminService } from './admin';

// CONSTANTE DE VERSÃO DO SCRIPT
// Sempre que alterar o template abaixo, incremente esta versão.
export const GAS_VERSION = "v1.1.0";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  size: number;
}

export const driveService = {
  async getConfig() {
    const config = await adminService.getAppConfig();
    
    if (!config.googleScriptUrl) {
      throw new Error('URL do Script não definido. Vá a Definições > Integração Drive e cole o URL do Web App.');
    }
    
    // Check explícito para valor vazio ou undefined
    if (!config.driveFolderId || config.driveFolderId.trim() === '') {
      throw new Error('ID da Pasta Raiz não configurado. Vá a Definições > Integração Drive e cole o ID ou Link da pasta.');
    }
    
    return config;
  },

  // Agora aceita um folderId opcional para navegação
  async listFiles(currentFolderId?: string | null): Promise<{ files: DriveFile[], rootId: string }> {
    const config = await this.getConfig();
    
    // Se não for passado ID, usa o da config (Raiz)
    const targetId = currentFolderId || config.driveFolderId;

    try {
        const response = await fetch(config.googleScriptUrl, {
          method: 'POST', 
          body: JSON.stringify({ action: 'list', folderId: targetId })
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("Erro de permissão no Script (HTML retornado). Verifique se a implementação é 'Qualquer pessoa'.");
        }

        const result = await response.json();
        
        if (result.status === 'error') {
             throw new Error('Google Script: ' + result.message);
        }
        
        return { 
            files: result.files, 
            rootId: config.driveFolderId // Retorna sempre o root para sabermos onde é o "Início"
        };
    } catch (e: any) {
        if (e.message === 'Failed to fetch') {
            throw new Error('Falha de Rede. Verifique o URL do Script nas Definições.');
        }
        throw e;
    }
  },

  async uploadFile(file: File, parentFolderId?: string | null): Promise<void> {
    const config = await this.getConfig();
    const targetId = parentFolderId || config.driveFolderId;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          
          const response = await fetch(config.googleScriptUrl, {
            method: 'POST',
            body: JSON.stringify({
              action: 'upload',
              folderId: targetId,
              filename: file.name,
              mimeType: file.type,
              file: base64Data
            })
          });
          
          const result = await response.json();
          if (result.status === 'success') resolve();
          else reject(new Error(result.message || 'Erro upload'));
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsDataURL(file);
    });
  },

  async createFolder(name: string, parentFolderId?: string | null): Promise<void> {
    const config = await this.getConfig();
    const targetId = parentFolderId || config.driveFolderId;

    const response = await fetch(config.googleScriptUrl, {
        method: 'POST',
        body: JSON.stringify({
            action: 'createFolder',
            folderId: targetId,
            name: name
        })
    });
    
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message);
  },

  async deleteFile(fileId: string): Promise<void> {
    const config = await this.getConfig();
    const response = await fetch(config.googleScriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        id: fileId
      })
    });
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message);
  }
};

export const GAS_TEMPLATE_CODE = `
// ==========================================
// EDUTECH PT - GOOGLE DRIVE API GATEWAY
// VERSION: ${GAS_VERSION}
// ==========================================

function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    if (action === 'list') {
      const folder = DriveApp.getFolderById(data.folderId);
      const list = [];
      
      // 1. Get Subfolders
      const subfolders = folder.getFolders();
      while (subfolders.hasNext()) {
        const sub = subfolders.next();
        list.push({
          id: sub.getId(),
          name: sub.getName(),
          mimeType: 'application/vnd.google-apps.folder', // Marcador especial
          url: sub.getUrl(),
          size: 0
        });
      }

      // 2. Get Files
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        list.push({
          id: file.getId(),
          name: file.getName(),
          mimeType: file.getMimeType(),
          url: file.getUrl(),
          size: file.getSize()
        });
      }
      
      result = { status: 'success', files: list };
    }

    else if (action === 'createFolder') {
      const parent = DriveApp.getFolderById(data.folderId);
      const newFolder = parent.createFolder(data.name);
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', id: newFolder.getId(), url: newFolder.getUrl() };
    }

    else if (action === 'upload') {
      const folder = DriveApp.getFolderById(data.folderId);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.file), data.mimeType, data.filename);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', url: file.getUrl(), id: file.getId() };
    }

    else if (action === 'delete') {
      // Tenta remover como ficheiro primeiro
      try {
        const file = DriveApp.getFileById(data.id);
        file.setTrashed(true);
      } catch (e) {
        // Se falhar, tenta como pasta
        const folder = DriveApp.getFolderById(data.id);
        folder.setTrashed(true);
      }
      result = { status: 'success' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
