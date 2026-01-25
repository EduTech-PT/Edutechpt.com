
import React from 'react';
import jsPDF from 'jspdf';
import { Course, Profile } from '../types';
import { formatDate } from '../utils/formatters';

interface Props {
    student: Profile;
    course: Course;
    onClose: () => void;
}

export const CertificateGenerator: React.FC<Props> = ({ student, course, onClose }) => {
    
    const generatePDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Cores
        const primaryColor = '#4f46e5'; // Indigo 600
        const secondaryColor = '#312e81'; // Indigo 900

        // Borda
        doc.setLineWidth(2);
        doc.setDrawColor(primaryColor);
        doc.rect(10, 10, 277, 190);
        
        doc.setLineWidth(0.5);
        doc.rect(15, 15, 267, 180);

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(36);
        doc.setTextColor(secondaryColor);
        doc.text("CERTIFICADO DE CONCLUSÃO", 148.5, 50, { align: 'center' });

        // Corpo
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.setTextColor('#000000');
        doc.text("Certifica-se que", 148.5, 80, { align: 'center' });

        // Nome do Aluno
        doc.setFont('times', 'bolditalic');
        doc.setFontSize(30);
        doc.setTextColor(primaryColor);
        doc.text(student.full_name || 'Aluno', 148.5, 95, { align: 'center' });

        // Curso
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.setTextColor('#000000');
        doc.text("concluiu com êxito o curso de formação profissional de", 148.5, 115, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(course.title, 148.5, 130, { align: 'center' });

        // Detalhes
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor('#555555');
        const dateStr = formatDate(new Date());
        doc.text(`Data de Emissão: ${dateStr}`, 148.5, 150, { align: 'center' });
        doc.text(`Nível: ${course.level.toUpperCase()}`, 148.5, 156, { align: 'center' });

        // Assinatura Digital (Simulada)
        doc.setLineWidth(0.5);
        doc.line(200, 175, 260, 175);
        doc.setFontSize(10);
        doc.text("A Direção Pedagógica", 230, 182, { align: 'center' });
        doc.text("EduTech PT", 230, 187, { align: 'center' });

        // Save
        doc.save(`certificado_${course.title.replace(/\s+/g, '_')}.pdf`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in duration-300">
                <div className="text-6xl mb-4">🎓</div>
                <h2 className="text-2xl font-bold text-indigo-900 mb-2">Parabéns!</h2>
                <p className="text-indigo-600 mb-6">
                    Completaste 100% dos materiais deste curso. O teu certificado está pronto a ser emitido.
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={generatePDF}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transform hover:-translate-y-1 transition-all"
                    >
                        Descarregar PDF
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-3 text-gray-500 hover:text-gray-800 font-bold"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
