import React from 'react';
import { X, Shield, FileText, Gavel } from 'lucide-react';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'aviso' | 'privacidad' | 'cookies';
}

export const LegalModal = ({ isOpen, onClose, type }: LegalModalProps) => {
    if (!isOpen) return null;

    const content = {
        aviso: {
            title: 'Aviso Legal',
            icon: <Gavel className="text-indigo-600" />,
            text: (
                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                    <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSICE), se exponen a continuación los datos identificativos de la empresa:</p>
                    <p><strong>Titular:</strong> Racket Grid (Proyecto en fase de desarrollo)</p>
                    <p><strong>Email:</strong> hola@racketgrid.com</p>
                    <p><strong>Propiedad Intelectual:</strong> El código fuente, los diseños gráficos, las imágenes, las fotografías, los sonidos, las animaciones, el software, los textos, así como la información y los contenidos que se recogen en este sitio web están protegidos por la legislación española sobre los derechos de propiedad intelectual e industrial a favor de Racket Grid.</p>
                    <p>No se permite la reproducción y/o publicación, total o parcial, del sitio web, ni su tratamiento informático, su distribución, su difusión, ni su modificación o transformación, ni demás derechos reconocidos legalmente a su titular, sin el permiso previo y por escrito del mismo.</p>
                </div>
            )
        },
        privacidad: {
            title: 'Política de Privacidad',
            icon: <Shield className="text-indigo-600" />,
            text: (
                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                    <p>Racket Grid informa a los usuarios del sitio web sobre su política respecto del tratamiento y protección de los datos de carácter personal de los usuarios y clientes que puedan ser recabados por la navegación o contratación de servicios a través de su sitio web.</p>
                    <p><strong>Finalidad del tratamiento:</strong> Los datos personales recogidos serán utilizados para la gestión de usuarios, administración de torneos y comunicación directa con los clientes interesados en nuestros servicios.</p>
                    <p><strong>Legitimación:</strong> El tratamiento de sus datos se realiza con base en el consentimiento del interesado al registrarse o contactar a través de la web.</p>
                    <p><strong>Derechos:</strong> Podrá ejercer sus derechos de acceso, rectificación, cancelación y oposición enviando un email a hola@racketgrid.com.</p>
                </div>
            )
        },
        cookies: {
            title: 'Política de Cookies',
            icon: <FileText className="text-indigo-600" />,
            text: (
                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                    <p>Este sitio web utiliza cookies propias y de terceros para recopilar información con la finalidad de mejorar nuestros servicios, así como el análisis de sus hábitos de navegación.</p>
                    <p><strong>¿Qué son las cookies?</strong> Una cookie es un fichero que se descarga en su ordenador al acceder a determinadas páginas web. Las cookies permiten a una página web, entre otras cosas, almacenar y recuperar información sobre los hábitos de navegación de un usuario o de su equipo.</p>
                    <p><strong>Cookies utilizadas:</strong></p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Cookies técnicas:</strong> Necesarias para el funcionamiento de la plataforma y el inicio de sesión.</li>
                        <li><strong>Cookies de análisis:</strong> Permiten cuantificar el número de usuarios y realizar la medición y análisis estadístico de la utilización que hacen los usuarios del servicio ofertado.</li>
                    </ul>
                </div>
            )
        }
    };

    const activeContent = content[type];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2 rounded-xl">
                            {activeContent.icon}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{activeContent.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar">
                    {activeContent.text}
                </div>

                <div className="p-8 border-t border-slate-100 bg-slate-50 text-center">
                    <button
                        onClick={onClose}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-all"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
