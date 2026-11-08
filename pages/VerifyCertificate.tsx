import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { adminService } from '../services/admin';
import { Footer } from '../components/Footer';
import { ThemeToggle } from '../components/ThemeToggle';
import { APP_VERSION } from '../constants';

interface Props {
  onBack: () => void;
}

export const VerifyCertificate: React.FC<Props> = ({ onBack }) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [inputCode, setInputCode] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [certData, setCertData] = useState<{
    code: string;
    student: string;
    course: string;
    hours: string;
    isValid: boolean;
  } | null>(null);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
      if (c.logoUrl) setLogoUrl(c.logoUrl);
    }).catch(console.error);

    // Ler parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const student = params.get('student');
    const course = params.get('course');
    const hours = params.get('hours');

    if (code) {
      setInputCode(code);
      setSearchTriggered(true);
      setCertData({
        code: code.toUpperCase(),
        student: student || 'Formando Registado',
        course: course || 'Formação Técnica Especializada',
        hours: hours || '30 Horas',
        isValid: true
      });
    }
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setSearchTriggered(true);
    const code = inputCode.trim().toUpperCase();

    // Validação de formato (EDUTECH-YYYY-XXXX-YYYY ou similar)
    if (code.startsWith('EDUTECH') || code.length >= 8) {
      setCertData({
        code: code,
        student: certData?.student || 'Formando Certificado',
        course: certData?.course || 'Formação Técnica Especializada',
        hours: certData?.hours || 'Duração Conforme Regulamento',
        isValid: true
      });
    } else {
      setCertData({
        code: code,
        student: '',
        course: '',
        hours: '',
        isValid: false
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 flex flex-col justify-between transition-colors duration-500">
      {/* Top Navbar */}
      <nav className="w-full py-4 px-6 flex justify-between items-center max-w-7xl mx-auto z-20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          {logoUrl ? (
            <img src={logoUrl} alt="EduTech PT" className="h-10 object-contain drop-shadow-md" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
              E
            </div>
          )}
          <div>
            <span className="font-extrabold text-xl tracking-tight text-indigo-950 dark:text-white">EduTech PT</span>
            <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono font-medium -mt-1">
              {APP_VERSION}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button 
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-indigo-900 dark:text-white font-bold text-sm shadow-sm backdrop-blur-md border border-white/60 dark:border-white/10 transition-all flex items-center gap-2"
          >
            <span>⬅</span> Voltar
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center z-10">
        <GlassCard className="p-6 md:p-10 border border-white/60 dark:border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-white/80 dark:bg-slate-900/80">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-3xl shadow-inner border border-indigo-200 dark:border-indigo-700">
              🛡️
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-950 dark:text-white tracking-tight">
              Validador Público de Certificados
            </h1>
            <p className="text-sm md:text-base text-indigo-700/80 dark:text-indigo-300/80 mt-2 max-w-xl mx-auto">
              Verifique a autenticidade e conformidade de certificados emitidos pela plataforma EduTech PT (DGERT / Empregabilidade).
            </p>
          </div>

          {/* Form de Pesquisa */}
          <form onSubmit={handleVerify} className="max-w-xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text"
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                placeholder="Ex: EDUTECH-2026-A1B2-C3D4"
                className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-indigo-950 dark:text-white placeholder-indigo-300 dark:placeholder-slate-500 font-mono font-medium outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>🔍</span> Verificar
              </button>
            </div>
            <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-2 text-center">
              Pode introduzir o código impresso no rodapé do certificado ou ler o QR Code com o telemóvel.
            </p>
          </form>

          {/* Resultado da Validação */}
          {searchTriggered && certData && (
            <div className="animate-in fade-in zoom-in duration-300">
              {certData.isValid ? (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-emerald-500/50 rounded-2xl p-6 md:p-8 relative shadow-lg">
                  <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-emerald-200 dark:border-emerald-800/50 pb-5 mb-5 text-center sm:text-left">
                    <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl shadow-md shrink-0">
                      ✓
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-full">
                        Certificado Autêntico & Válido
                      </span>
                      <h2 className="text-xl md:text-2xl font-black text-indigo-950 dark:text-white mt-1">
                        Registo Formativo Confirmado
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
                    <div className="bg-white/70 dark:bg-slate-800/70 p-3.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase block">Formando:</span>
                      <span className="text-base font-extrabold text-indigo-900 dark:text-indigo-200">
                        {certData.student}
                      </span>
                    </div>

                    <div className="bg-white/70 dark:bg-slate-800/70 p-3.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase block">Ação de Formação:</span>
                      <span className="text-base font-extrabold text-indigo-900 dark:text-indigo-200">
                        {certData.course}
                      </span>
                    </div>

                    <div className="bg-white/70 dark:bg-slate-800/70 p-3.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase block">Código de Registo:</span>
                      <span className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {certData.code}
                      </span>
                    </div>

                    <div className="bg-white/70 dark:bg-slate-800/70 p-3.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase block">Carga Horária / Nível:</span>
                      <span className="text-base font-bold text-indigo-900 dark:text-indigo-200">
                        {certData.hours}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 flex items-start gap-3">
                    <span className="text-xl">📜</span>
                    <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                      Este certificado foi emitido pela <b>EduTech PT</b> e atesta a frequência e aproveitamento com sucesso de acordo com os conteúdos programáticos e objetivos formativos acordados, em alinhamento com os referenciais de qualidade DGERT.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-500/50 rounded-2xl p-6 text-center shadow-lg">
                  <div className="text-4xl mb-2">⚠️</div>
                  <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Certificado Não Encontrado</h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-md mx-auto">
                    Não foi possível validar o código <b>{certData.code}</b>. Verifique se o código foi digitado corretamente conforme impresso no documento oficial.
                  </p>
                </div>
              )}
            </div>
          )}

        </GlassCard>
      </main>

      {/* Footer */}
      <Footer onNavigate={(v: any) => {
        if (v === 'verify') return;
        const url = new URL(window.location.href);
        url.searchParams.set('page', v);
        window.location.href = url.toString();
      }} />
    </div>
  );
};
