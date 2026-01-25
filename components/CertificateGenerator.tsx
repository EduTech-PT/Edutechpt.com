import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { Course, Profile } from '../types';
import { formatDate } from '../utils/formatters';
import { adminService } from '../services/admin';

interface Props {
    student: Profile;
    course: Course;
    onClose: () => void;
}

export const CertificateGenerator: React.FC<Props> = ({ student, course, onClose }) => {
    const [generating, setGenerating] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        // Carregar configuração para obter o logótipo
        adminService.getAppConfig().then(config => {
            if (config.logoUrl) setLogoUrl(config.logoUrl);
        }).catch(err => console.error("Erro ao carregar config para certificado", err));
    }, []);

    // Função auxiliar para converter imagem URL em Base64 (necessário para jsPDF)
    // Atualizado para retornar dimensões e evitar distorção
    const getBase64ImageFromURL = (url: string): Promise<{ data: string; width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                // Manter resolução original
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL("image/png");
                resolve({ data: dataURL, width: img.width, height: img.height });
            };
            img.onerror = () => {
                console.warn("Não foi possível carregar a imagem do logótipo para o PDF (CORS ou URL inválido).");
                resolve({ data: "", width: 0, height: 0 }); // Resolve vazio para não bloquear a geração
            };
        });
    };
    
    const generatePDF = async () => {
        setGenerating(true);
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Cores da Plataforma
        const colorPrimary = '#4f46e5'; // Indigo 600
        const colorSecondary = '#312e81'; // Indigo 900
        const colorText = '#1f2937'; // Gray 800
        const colorAccent = '#e0e7ff'; // Indigo 100 (Fundo suave)

        // 1. Fundo e Moldura
        doc.setFillColor(colorAccent);
        doc.rect(0, 0, 297, 210, 'F'); // Fundo colorido suave
        
        doc.setFillColor('#ffffff');
        doc.roundedRect(10, 10, 277, 190, 5, 5, 'F'); // Cartão branco central

        doc.setLineWidth(1);
        doc.setDrawColor(colorPrimary);
        doc.roundedRect(15, 15, 267, 180, 2, 2, 'S'); // Borda interna fina

        // 2. Logótipo (Topo) - Ajuste para não distorcer
        let yPos = 40;
        if (logoUrl) {
            try {
                const logoData = await getBase64ImageFromURL(logoUrl);
                if (logoData.data) {
                    // Definir caixa máxima para o logo
                    const maxW = 80; // Mais largo
                    const maxH = 30;
                    
                    // Calcular rácio para manter proporção
                    const ratio = Math.min(maxW / logoData.width, maxH / logoData.height);
                    const finalW = logoData.width * ratio;
                    const finalH = logoData.height * ratio;
                    
                    // Centrar
                    const finalX = 148.5 - (finalW / 2);

                    doc.addImage(logoData.data, 'PNG', finalX, 20, finalW, finalH, '', 'FAST'); 
                    yPos = 60;
                } else {
                    // Fallback texto se imagem falhar
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(24);
                    doc.setTextColor(colorSecondary);
                    doc.text("EduTech PT", 148.5, 35, { align: 'center' });
                }
            } catch (e) {
                yPos = 40;
            }
        } else {
            // Fallback texto se não houver URL
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(colorSecondary);
            doc.text("EduTech PT", 148.5, 35, { align: 'center' });
        }

        // 3. Título
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(40);
        doc.setTextColor(colorSecondary);
        doc.text("CERTIFICADO", 148.5, yPos + 10, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorPrimary);
        doc.text("DE CONCLUSÃO DE CURSO", 148.5, yPos + 20, { align: 'center' });

        // 4. Corpo do Texto
        doc.setFontSize(16);
        doc.setTextColor(colorText);
        doc.text("Certifica-se que", 148.5, yPos + 35, { align: 'center' });

        // Nome do Aluno (Destaque)
        doc.setFont('times', 'bolditalic');
        doc.setFontSize(32);
        doc.setTextColor(colorSecondary);
        const studentName = student.full_name || 'Aluno';
        doc.text(studentName, 148.5, yPos + 50, { align: 'center' });
        
        // Linha decorativa abaixo do nome
        doc.setLineWidth(0.5);
        doc.setDrawColor(colorPrimary);
        const textWidth = doc.getTextWidth(studentName);
        doc.line(148.5 - (textWidth / 2) - 10, yPos + 52, 148.5 + (textWidth / 2) + 10, yPos + 52);

        // Texto do Curso
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.setTextColor(colorText);
        doc.text("concluiu com êxito a ação de formação em", 148.5, yPos + 65, { align: 'center' });

        // Nome do Curso
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(colorPrimary);
        doc.text(course.title, 148.5, yPos + 78, { align: 'center' });

        // Detalhes (Nível e Data)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor('#6b7280'); // Gray 500
        const dateStr = formatDate(new Date());
        doc.text(`Nível: ${course.level.toUpperCase()}  |  Data de Emissão: ${dateStr}`, 148.5, yPos + 90, { align: 'center' });

        // 5. Assinatura Fictícia (Ajustada posição)
        const sigY = 160; 
        
        // Linha da assinatura
        doc.setDrawColor('#9ca3af'); // Gray 400
        doc.line(110, sigY, 190, sigY); // Centrada
        
        // "Assinatura" (Fonte Script simulada com Italic)
        doc.setFont('times', 'italic');
        doc.setFontSize(24);
        doc.setTextColor(colorSecondary);
        doc.text("EduTechPT", 150, sigY - 5, { align: 'center' }); // Assinatura "manual"

        // Cargo
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(colorText);
        doc.text("A Direção Pedagógica", 150, sigY + 6, { align: 'center' });
        
        // Removido o badge de "Certificado Verificado" conforme solicitado

        // Save
        doc.save(`certificado_${course.title.replace(/\s+/g, '_')}_${student.full_name?.split(' ')[0]}.pdf`);
        setGenerating(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in duration-300 relative border border-indigo-100">
                
                {/* Decorative blob */}
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <span className="text-3xl text-white">🎓</span>
                </div>

                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-indigo-900 mb-2">Certificado Disponível!</h2>
                    <p className="text-indigo-600 mb-6 text-sm">
                        Parabéns! Completaste todos os requisitos do curso <b>{course.title}</b>. O teu certificado oficial está pronto.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={generatePDF}
                            disabled={generating}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {generating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    A Gerar PDF...
                                </>
                            ) : (
                                <>
                                    <span>📥</span> Descarregar Certificado
                                </>
                            )}
                        </button>
                        
                        <button 
                            onClick={onClose}
                            disabled={generating}
                            className="w-full py-3 text-gray-500 hover:text-gray-800 font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};