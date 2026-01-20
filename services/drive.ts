
import { adminService } from './admin';

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
    
    // Verificações robustas para evitar erros genéricos
    if (!config.googleScriptUrl) {
      throw new Error('CONFIGURAÇÃO EM FALTA: O URL do Google Script não está definido. Vá a Definições > Integração Drive.');
    }
    if (!config.driveFolderId) {
      throw new Error('CONFIGURAÇÃO EM FALTA: O ID da Pasta Google Drive não está definido. Vá a Definições > Integração Drive.');
    }
    
    return config;
  },

  async listFiles(): Promise<DriveFile[]> {
    const config = await this.getConfig();
    
    try {
        const response = await fetch(config.googleScriptUrl, {
          method: 'POST', 
          body: JSON.stringify({ action: 'list', folderId: config.driveFolderId })
        });

        // Verifica se a resposta é HTML (erro comum do Google quando não está publicado corretamente)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("O Script retornou HTML em vez de JSON. Verifique se a implementação está definida como 'Qualquer pessoa'.");
        }

        const result = await response.json();
        
        if (result.status === 'error') {
             throw new Error('Google Script Erro: ' + result.message);
        }
        
        return result.files;
    } catch (e: any) {
        // Se falhar o fetch (ex: CORS ou rede)
        if (e.message === 'Failed to fetch') {
            throw new Error('Falha na conexão. Verifique se o URL do Script está correto e a implementação permite "Qualquer pessoa".');
        }
        throw e;
    }
  },

  async uploadFile(file: File): Promise<void> {
    const config = await this.getConfig();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          
          const response = await fetch(config.googleScriptUrl, {
            method: 'POST',
            body: JSON.stringify({
              action: 'upload',
              folderId: config.driveFolderId,
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
// ==========================================

function doPost(e) {
  // Configuração CORS
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
      const files = folder.getFiles();
      const list = [];
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

    else if (action === 'upload') {
      const folder = DriveApp.getFolderById(data.folderId);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.file), data.mimeType, data.filename);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', url: file.getUrl(), id: file.getId() };
    }

    else if (action === 'delete') {
      const file = DriveApp.getFileById(data.id);
      file.setTrashed(true);
      result = { status: 'success' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      // Nota: GAS não suporta custom headers em respostas normais de WebApp facilmente,
      // O cliente deve estar preparado para seguir o redirect 302 que o Google faz.
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
