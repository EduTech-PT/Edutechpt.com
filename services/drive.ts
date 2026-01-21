
import { adminService } from './admin';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types';

// CONSTANTE DE VERSÃO DO SCRIPT
// Sempre que alterar o template abaixo, incremente esta versão.
export const GAS_VERSION = "v1.4.1";

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
    
    if (!config.driveFolderId || config.driveFolderId.trim() === '') {
      throw new Error('ID da Pasta Raiz não configurado. Vá a Definições > Integração Drive e cole o ID ou Link da pasta.');
    }
    
    return config;
  },

  /**
   * Verifica a versão real instalada no Google Apps Script
   */
  async checkScriptVersion(urlOverride?: string): Promise<string> {
      try {
          const config = await adminService.getAppConfig();
          const url = urlOverride || config.googleScriptUrl;

          if (!url) return 'not_configured';

          const response = await fetch(url, {
              method: 'POST',
              body: JSON.stringify({ action: 'check_health' })
          });

          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
              return 'error_html'; // Script não publicado como "Qualquer pessoa" ou erro do Google
          }

          const result = await response.json();
          
          // Se o script for antigo, ele devolve {} (sem version) ou erro
          if (result.status === 'success' && result.version) {
              return result.version;
          }
          
          return 'outdated_unknown';
      } catch (e) {
          console.error("Health Check Failed:", e);
          return 'connection_error';
      }
  },

  /**
   * Obtém a pasta pessoal do utilizador.
   */
  async getPersonalFolder(profile: Profile): Promise<string> {
      if (profile.personal_folder_id) {
          return profile.personal_folder_id;
      }

      const config = await this.getConfig();
      const folderName = `[Formador] ${profile.full_name || profile.email}`;

      const response = await fetch(config.googleScriptUrl, {
          method: 'POST',
          body: JSON.stringify({
              action: 'ensureFolder',
              rootId: config.driveFolderId,
              name: folderName
          })
      });

      const result = await response.json();
      if (result.status !== 'success') {
          throw new Error("Falha ao criar pasta pessoal: " + result.message);
      }

      const newFolderId = result.id;

      await supabase
          .from('profiles')
          .update({ personal_folder_id: newFolderId })
          .eq('id', profile.id);

      return newFolderId;
  },

  async listFiles(currentFolderId?: string | null): Promise<{ files: DriveFile[], rootId: string }> {
    const config = await this.getConfig();
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
            rootId: config.driveFolderId 
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
// EDUTECH PT - GOOGLE DRIVE & CALENDAR API
// VERSION: ${GAS_VERSION}
// ==========================================

// -----------------------------------------------------
// 1. EXECUTE ESTA FUNÇÃO UMA VEZ PARA AUTORIZAR
// Selecione "autorizarPermissoes" na barra acima e clique em "Executar"
// Isto forçará o Google a pedir as permissões de Calendário em falta.
// -----------------------------------------------------
function autorizarPermissoes() {
  const cal = CalendarApp.getDefaultCalendar();
  const drive = DriveApp.getRootFolder();
  console.log("Permissões de Calendário (" + cal.getName() + ") e Drive (" + drive.getName() + ") ativas.");
}
// -----------------------------------------------------

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

    // --- HEALTH CHECK ---
    if (action === 'check_health') {
        result = { 
            status: 'success', 
            version: '${GAS_VERSION}',
            timestamp: new Date().toISOString()
        };
    }

    // --- CALENDAR PROXY ---
    else if (action === 'getCalendarEvents') {
        // Usa o calendário padrão da conta que implementou o script (Admin)
        const cal = CalendarApp.getDefaultCalendar();
        const start = new Date(data.timeMin);
        const end = new Date(data.timeMax);
        
        const events = cal.getEvents(start, end);
        
        const list = events.map(function(e) {
            return {
                id: e.getId(),
                summary: e.getTitle(),
                description: e.getDescription(),
                location: e.getLocation(),
                // Simplificação de datas para JSON
                start: { dateTime: e.getStartTime().toISOString() },
                end: { dateTime: e.getEndTime().toISOString() },
                htmlLink: 'https://calendar.google.com'
            };
        });
        
        result = { status: 'success', items: list };
    }

    // --- LIST FILES ---
    else if (action === 'list') {
      const folder = DriveApp.getFolderById(data.folderId);
      const list = [];
      
      const subfolders = folder.getFolders();
      while (subfolders.hasNext()) {
        const sub = subfolders.next();
        list.push({
          id: sub.getId(),
          name: sub.getName(),
          mimeType: 'application/vnd.google-apps.folder',
          url: sub.getUrl(),
          size: 0
        });
      }

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

    // --- FOLDER OPERATIONS ---
    else if (action === 'createFolder') {
      const parent = DriveApp.getFolderById(data.folderId);
      const newFolder = parent.createFolder(data.name);
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', id: newFolder.getId(), url: newFolder.getUrl() };
    }

    else if (action === 'ensureFolder') {
      const root = DriveApp.getFolderById(data.rootId);
      const folders = root.getFoldersByName(data.name);
      let targetFolder;
      
      if (folders.hasNext()) {
        targetFolder = folders.next();
      } else {
        targetFolder = root.createFolder(data.name);
        targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
      result = { status: 'success', id: targetFolder.getId(), url: targetFolder.getUrl() };
    }

    // --- UPLOAD & DELETE ---
    else if (action === 'upload') {
      const folder = DriveApp.getFolderById(data.folderId);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.file), data.mimeType, data.filename);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', url: file.getUrl(), id: file.getId() };
    }

    else if (action === 'delete') {
      try {
        const file = DriveApp.getFileById(data.id);
        file.setTrashed(true);
      } catch (e) {
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
