
import { adminService } from './admin';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types';

// CONSTANTE DE VERSÃO DO SCRIPT
// Sempre que alterar o template abaixo, incremente esta versão.
export const GAS_VERSION = "v1.5.1";

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

          // Adicionado Timeout de 5s para evitar hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
              const response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain' },
                  body: JSON.stringify({ action: 'check_health' }),
                  signal: controller.signal
              });
              clearTimeout(timeoutId);

              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("text/html")) {
                  return 'error_html'; // Script não publicado como "Qualquer pessoa" ou erro do Google
              }

              const result = await response.json();
              
              if (result.status === 'success' && result.version) {
                  return result.version;
              }
              
              return 'outdated_unknown';
          } catch (e: any) {
              if (e.name === 'AbortError') return 'connection_error'; // Timeout
              throw e;
          }
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
          headers: { 'Content-Type': 'text/plain' },
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

  /**
   * Renomeia uma pasta no Google Drive
   */
  async renameFolder(folderId: string, newName: string): Promise<void> {
      const config = await this.getConfig();
      
      const response = await fetch(config.googleScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
              action: 'renameFolder',
              id: folderId,
              name: newName
          })
      });

      const result = await response.json();
      
      // Validação Extra para Scripts Antigos
      if (!result.status && !result.message) {
          throw new Error("Funcionalidade de renomear não disponível. O Script Google está desatualizado (v1.4.9+ necessária).");
      }

      if (result.status !== 'success') {
          throw new Error("Erro ao renomear pasta: " + result.message);
      }
  },

  async listFiles(currentFolderId?: string | null): Promise<{ files: DriveFile[], rootId: string }> {
    const config = await this.getConfig();
    const targetId = currentFolderId || config.driveFolderId;

    try {
        const response = await fetch(config.googleScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
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
            headers: { 'Content-Type': 'text/plain' },
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
        headers: { 'Content-Type': 'text/plain' },
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
      headers: { 'Content-Type': 'text/plain' },
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

function autorizarPermissoes() {
  const cals = CalendarApp.getAllCalendars();
  const drive = DriveApp.getRootFolder();
  console.log("SUCESSO! Acesso confirmado para " + cals.length + " calendários.");
  console.log("Drive Raiz: " + drive.getName());
}

// -----------------------------------------------------

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'EduTech PT API is running',
    version: '${GAS_VERSION}',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    if (!e || !e.postData) throw new Error("No POST data received");

    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    if (action === 'check_health') {
        result = { 
            status: 'success', 
            version: '${GAS_VERSION}',
            timestamp: new Date().toISOString()
        };
    }

    else if (action === 'getCalendarEvents') {
        const start = new Date(data.timeMin);
        const end = new Date(data.timeMax);
        const extraIds = data.extraCalendarIds || []; // IDs manuais
        
        let allEvents = [];
        let debugLog = [];
        let processedIds = {}; // Para evitar duplicados

        // Função auxiliar para processar calendário
        function processCalendar(cal, source) {
            if (!cal) return;
            const cid = cal.getId();
            if (processedIds[cid]) return; // Já processado
            
            try {
                // Tenta ler eventos
                const events = cal.getEvents(start, end);
                const prefix = source === 'default' ? '' : '[' + cal.getName() + '] ';
                
                const mapped = events.map(function(e) {
                    return {
                        id: e.getId(),
                        summary: prefix + e.getTitle(),
                        description: e.getDescription(),
                        location: e.getLocation(),
                        start: { dateTime: e.getStartTime().toISOString() },
                        end: { dateTime: e.getEndTime().toISOString() },
                        htmlLink: 'https://calendar.google.com'
                    };
                });
                
                allEvents = allEvents.concat(mapped);
                processedIds[cid] = true;
                debugLog.push("Lido (" + source + "): " + cal.getName() + " - " + events.length + " ev.");
            } catch (err) {
                debugLog.push("ERRO em " + cal.getName() + ": " + err.toString());
            }
        }

        // 1. Calendário Padrão
        try {
            const defCal = CalendarApp.getDefaultCalendar();
            processCalendar(defCal, 'default');
        } catch (e) { debugLog.push("Erro Default Cal: " + e.toString()); }

        // 2. Todos os Calendários Detetáveis (Auto-discovery)
        try {
            const allCals = CalendarApp.getAllCalendars();
            debugLog.push("Auto-detetados: " + allCals.length);
            for (var i = 0; i < allCals.length; i++) {
                processCalendar(allCals[i], 'auto');
            }
        } catch (e) { debugLog.push("Erro Auto-Discovery: " + e.toString()); }

        // 3. Calendários Manuais (IDs Específicos das Definições)
        if (extraIds.length > 0) {
            debugLog.push("IDs Manuais solicitados: " + extraIds.length);
            for (var j = 0; j < extraIds.length; j++) {
                try {
                    // Limpar espaços
                    const id = extraIds[j].trim();
                    if (!id) continue;
                    
                    const manCal = CalendarApp.getCalendarById(id);
                    if (manCal) {
                        processCalendar(manCal, 'manual');
                    } else {
                        debugLog.push("ID Manual não encontrado/acessível: " + id);
                    }
                } catch (e) {
                    debugLog.push("Erro ID Manual (" + extraIds[j] + "): " + e.toString());
                }
            }
        }
        
        result = { 
            status: 'success', 
            items: allEvents,
            debug: debugLog 
        };
    }

    // --- FILE OPERATIONS ---
    else if (action === 'list') {
      const folder = DriveApp.getFolderById(data.folderId);
      const list = [];
      const subfolders = folder.getFolders();
      while (subfolders.hasNext()) {
        const sub = subfolders.next();
        list.push({ id: sub.getId(), name: sub.getName(), mimeType: 'application/vnd.google-apps.folder', url: sub.getUrl(), size: 0 });
      }
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        list.push({ id: file.getId(), name: file.getName(), mimeType: file.getMimeType(), url: file.getUrl(), size: file.getSize() });
      }
      result = { status: 'success', files: list };
    }

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
      if (folders.hasNext()) targetFolder = folders.next();
      else {
        targetFolder = root.createFolder(data.name);
        targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
      result = { status: 'success', id: targetFolder.getId(), url: targetFolder.getUrl() };
    }

    else if (action === 'renameFolder') {
      try {
          const folder = DriveApp.getFolderById(data.id);
          folder.setName(data.name);
          result = { status: 'success' };
      } catch (e) {
          const file = DriveApp.getFileById(data.id);
          file.setName(data.name);
          result = { status: 'success' };
      }
    }

    else if (action === 'upload') {
      const folder = DriveApp.getFolderById(data.folderId);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.file), data.mimeType, data.filename);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', url: file.getUrl(), id: file.getId() };
    }

    else if (action === 'delete') {
      try {
        // Tenta apagar como ficheiro primeiro
        const file = DriveApp.getFileById(data.id);
        file.setTrashed(true);
      } catch (e) {
        try {
          // Se falhar, tenta como pasta
          const folder = DriveApp.getFolderById(data.id);
          folder.setTrashed(true);
        } catch (errFolder) {
           throw new Error("Item não encontrado ou sem permissão para eliminar. Apenas o proprietário pode apagar pastas.");
        }
      }
      result = { status: 'success' };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
