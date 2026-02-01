
import { adminService } from './admin';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types';

// CONSTANTE DE VERSÃO DO SCRIPT
// Sempre que alterar o template abaixo, incremente esta versão.
export const GAS_VERSION = "v1.6.10";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  size: number;
}

export interface ScriptHealth {
    version: string;
    mailPermission: boolean;
    status: 'ok' | 'error' | 'not_configured';
    message?: string;
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

  async checkScriptVersion(urlOverride?: string): Promise<ScriptHealth> {
      try {
          const config = await adminService.getAppConfig();
          const url = urlOverride || config.googleScriptUrl;

          if (!url) return { version: '', mailPermission: false, status: 'not_configured' };

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
                  return { version: 'error_html', mailPermission: false, status: 'error', message: 'Script retornou HTML (Erro Permissão Publicação)' };
              }

              const result = await response.json();
              
              if (result.status === 'success' && result.version) {
                  return { 
                      version: result.version, 
                      mailPermission: result.mailPermission === true,
                      status: 'ok' 
                  };
              }
              
              return { version: 'outdated_unknown', mailPermission: false, status: 'error', message: 'Resposta inválida do script' };
          } catch (e: any) {
              if (e.name === 'AbortError') return { version: 'timeout', mailPermission: false, status: 'error', message: 'Tempo limite excedido' };
              throw e;
          }
      } catch (e: any) {
          console.error("Health Check Failed:", e);
          return { version: 'connection_error', mailPermission: false, status: 'error', message: e.message };
      }
  },

  // Novo método genérico para Garantir Pasta (Encontrar ou Criar)
  async ensureFolder(name: string, parentId: string): Promise<string> {
      const config = await this.getConfig();
      
      const response = await fetch(config.googleScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
              action: 'ensureFolder',
              rootId: parentId,
              name: name
          })
      });

      const result = await response.json();
      if (result.status !== 'success') {
          throw new Error("Falha ao criar/obter pasta: " + result.message);
      }
      return result.id;
  },

  async getPersonalFolder(profile: Profile): Promise<string> {
      if (profile.personal_folder_id) {
          return profile.personal_folder_id;
      }

      const config = await this.getConfig();
      const folderName = `[Formador] ${profile.full_name || profile.email}`;

      // Usa o método genérico para criar na raiz principal
      const newFolderId = await this.ensureFolder(folderName, config.driveFolderId);

      await supabase
          .from('profiles')
          .update({ personal_folder_id: newFolderId })
          .eq('id', profile.id);

      return newFolderId;
  },

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
      
      if (!result.status && !result.message) {
          throw new Error("Funcionalidade de renomear não disponível. O Script Google está desatualizado.");
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

  async uploadFile(file: File, parentFolderId?: string | null): Promise<{ url: string, id: string }> {
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
          if (result.status === 'success') {
              resolve({ url: result.url, id: result.id });
          } else {
              reject(new Error(result.message || 'Erro upload'));
          }
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
  },

  // NOVO: Forçar permissões públicas em ficheiros existentes
  async setFilesPublic(fileIds: string[]): Promise<void> {
      const config = await this.getConfig();
      const response = await fetch(config.googleScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
              action: 'setPublic',
              ids: fileIds
          })
      });
      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Erro ao definir permissões');
  }
};

export const GAS_MANIFEST_JSON = `{
  "timeZone": "Europe/Lisbon",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "ANYONE"
  }
}`;

export const GAS_TEMPLATE_CODE = `
// ==========================================
// EDUTECH PT - GOOGLE DRIVE & CALENDAR API
// VERSION: ${GAS_VERSION}
// ==========================================

/* 
INSTRUÇÕES:
1. No editor do Google Apps Script, vá a "Definições do Projeto" (ícone roda dentada à esquerda).
2. Marque a caixa "Mostrar ficheiro de manifesto 'appsscript.json' no editor".
3. Volte ao editor, abra 'appsscript.json' e substitua pelo JSON fornecido no site.
4. Guarde e execute 'autorizarPermissoes'.
*/

function autorizarPermissoes() {
  console.log("A iniciar verificação de permissões...");
  try { const drive = DriveApp.getRootFolder(); console.log("Drive: OK"); } catch(e) { console.error("Drive Error: " + e); }
  try { const cals = CalendarApp.getAllCalendars(); console.log("Calendar: OK"); } catch(e) { console.error("Calendar Error: " + e); }
  try { const aliases = GmailApp.getAliases(); console.log("Gmail: OK"); } catch(e) { console.error("Gmail Error: " + e); }
  return "Verificação Concluída.";
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'EduTech PT API is running',
    version: '${GAS_VERSION}',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' };

  try {
    if (!e || !e.postData) throw new Error("No POST data received");
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    if (action === 'check_health') {
        var mailStatus = false;
        try { GmailApp.getAliases(); mailStatus = true; } catch(e) {}
        result = { status: 'success', version: '${GAS_VERSION}', timestamp: new Date().toISOString(), mailPermission: mailStatus };
    }
    else if (action === 'sendEmail') {
        const recipient = data.to;
        if(recipient) {
            try {
                GmailApp.sendEmail(recipient, data.subject, '', { htmlBody: data.body, name: 'EduTech PT', from: 'edutechpt@hotmail.com' });
            } catch (e) {
                GmailApp.sendEmail(recipient, data.subject, '', { htmlBody: data.body, name: 'EduTech PT' });
            }
            result = { status: 'success', message: 'Email enviado.' };
        } else { throw new Error("Destinatário em falta."); }
    }
    else if (action === 'getCalendarEvents') {
        const start = new Date(data.timeMin);
        const end = new Date(data.timeMax);
        const extraIds = data.extraCalendarIds || [];
        let allEvents = [];
        
        function processCalendar(cal, source) {
            if (!cal) return;
            try {
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
            } catch (err) {}
        }

        try { processCalendar(CalendarApp.getDefaultCalendar(), 'default'); } catch (e) {}
        try { const allCals = CalendarApp.getAllCalendars(); for (var i = 0; i < allCals.length; i++) processCalendar(allCals[i], 'auto'); } catch (e) {}
        if (extraIds.length > 0) { for (var j = 0; j < extraIds.length; j++) { try { const manCal = CalendarApp.getCalendarById(extraIds[j].trim()); if (manCal) processCalendar(manCal, 'manual'); } catch (e) {} } }
        
        result = { status: 'success', items: allEvents };
    }
    else if (action === 'list') {
      const folder = DriveApp.getFolderById(data.folderId);
      const list = [];
      const subfolders = folder.getFolders();
      while (subfolders.hasNext()) { const sub = subfolders.next(); list.push({ id: sub.getId(), name: sub.getName(), mimeType: 'application/vnd.google-apps.folder', url: sub.getUrl(), size: 0 }); }
      const files = folder.getFiles();
      while (files.hasNext()) { const file = files.next(); list.push({ id: file.getId(), name: file.getName(), mimeType: file.getMimeType(), url: file.getUrl(), size: file.getSize() }); }
      result = { status: 'success', files: list };
    }
    else if (action === 'createFolder') {
      const newFolder = DriveApp.getFolderById(data.folderId).createFolder(data.name);
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', id: newFolder.getId(), url: newFolder.getUrl() };
    }
    else if (action === 'ensureFolder') {
      const root = DriveApp.getFolderById(data.rootId);
      const folders = root.getFoldersByName(data.name);
      let targetFolder = folders.hasNext() ? folders.next() : root.createFolder(data.name);
      targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', id: targetFolder.getId(), url: targetFolder.getUrl() };
    }
    else if (action === 'renameFolder') {
      try { DriveApp.getFolderById(data.id).setName(data.name); result = { status: 'success' }; }
      catch (e) { DriveApp.getFileById(data.id).setName(data.name); result = { status: 'success' }; }
    }
    else if (action === 'upload') {
      const blob = Utilities.newBlob(Utilities.base64Decode(data.file), data.mimeType, data.filename);
      const file = DriveApp.getFolderById(data.folderId).createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { status: 'success', url: file.getUrl(), id: file.getId() };
    }
    else if (action === 'delete') {
      try { DriveApp.getFileById(data.id).setTrashed(true); } 
      catch (e) { DriveApp.getFolderById(data.id).setTrashed(true); }
      result = { status: 'success' };
    }
    else if (action === 'setPublic') {
      const ids = data.ids || [data.id];
      ids.forEach(function(id) {
         try { DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
      });
      result = { status: 'success' };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
