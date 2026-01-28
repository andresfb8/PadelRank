import React, { useState } from 'react';
import {
    Trophy,
    Users,
    Settings,
    Activity,
    ChevronRight,
    Check,
    Smartphone,
    Layout,
    BarChart3,
    ShieldCheck,
    Zap,
    Star,
    LogIn,
    Menu,
    X,
    Calendar,
    Layers,
    TrendingUp,
    History,
    Award,
    ArrowUpRight,
    ArrowDownRight,
    MousePointer2,
    Clock,
    Search,
    Plus,
    Flame,
    Target,
    UserMinus,
    Cpu,
    UserCheck,
    Sparkles,
    Gift,
    Mail
} from 'lucide-react';

const App = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Configuración de WhatsApp
    const whatsappNumber = "34625277697";
    const whatsappMessage = encodeURIComponent("Hola! Vengo de la web y me gustaria probar RacketGrid");
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

    const subscriptionPlans = [
        {
            name: "Básico",
            price: "19",
            period: "/mes",
            description: "Ideal para pequeños grupos o clubes que inician.",
            features: [
                "Máximo 50 jugadores",
                "Hasta 3 torneos activos",
                "3 categorías por torneo",
                "Ligas, Americano y Mexicano",
                "Gestión administrativa",
            ],
            notIncluded: [
                "Portal del jugador",
                "Marca personalizada",
                "Playoffs Pro"
            ],
            color: "border-slate-200 bg-white text-slate-900"
        },
        {
            name: "Pro",
            price: "39",
            period: "/mes",
            description: "La solución completa para clubes en crecimiento.",
            features: [
                "Todo lo del plan básico y además:",
                "Hasta 150 jugadores",
                "Torneos ilimitados",
                "Categorías ilimitadas",
                "Liga + Playoff",
                "Portal auto-servicio",
                "Validación de resultados",
            ],
            notIncluded: [
                "Torneos de fin de Semana",
                "Multi-admin avanzado"
            ],
            featured: true,
            hasTrial: true,
            color: "border-green-500 bg-white text-slate-900 shadow-xl shadow-green-100"
        },
        {
            name: "Plan Star Point",
            price: "59",
            period: "/mes",
            description: "Potencia total e ilimitada para grandes centros.",
            features: [
                "Todo lo del plan básico y además:",
                "Usuarios ilimitados",
                "Todo ilimitado",
                "Playoffs (Main + Consolación)",
                "Multi-administrador",
                "Soporte prioritario",
            ],
            notIncluded: [],
            color: "border-slate-200 bg-white text-slate-900"
        }
    ];

    const eventPass = {
        name: "Weekend Warrior",
        price: "39",
        period: "/evento",
        badge: "Pase por Evento Único",
        description: "Desbloquea toda la potencia del Plan Star Point para un solo torneo de alto impacto.",
        features: [
            "Acceso total 14 días",
            "Cuadro Principal + Consolación",
            "Categorías ilimitadas",
            "Estadísticas Pro"
        ]
    };

    const tournamentFormats = [
        { title: "Ranking Individual", desc: "Liga con divisiones. Partidos con parejas rotatorias o aleatorias." },
        { title: "Ranking por Parejas", desc: "Liga de Parejas Fijas. 2 vs 2. Partidos Round Robin." },
        { title: "Americano / Mexicano", desc: "Todos juegan con todos. Puntuación por juegos ganados." },
        { title: "Eliminación Directa", desc: "Cuadro principal y de consolación. Cabezas de serie y avance por rondas." }
    ];

    const roadmap2026 = [
        {
            quarter: "Q1 2026",
            title: "Formatos de Nueva Generación",
            desc: "Expansión del ecosistema competitivo con la llegada de modalidades como 'Rey de la Pista', torneos por equipos con hándicap y ligas relámpago automatizadas.",
            icon: <Sparkles className="w-6 h-6 text-orange-500" />
        },
        {
            quarter: "Q2 2026",
            title: "Portal de Autogestión",
            desc: "Lanzamiento del Portal del Jugador con Login propio. Los usuarios podrán subir sus resultados directamente desde la pista para ahorrar tiempo al administrador.",
            icon: <UserCheck className="w-6 h-6 text-green-500" />
        },
        {
            quarter: "Q4 2026",
            title: "Smart Scheduler AI",
            desc: "Generación automática de horarios inteligentes para torneos de eliminación directa, optimizando la ocupación de pistas según las restricciones de los jugadores.",
            icon: <Cpu className="w-6 h-6 text-indigo-500" />
        },
        {
            quarter: "Q4 2026",
            title: "App iOS & Android",
            desc: "Tu club en el bolsillo. Lanzamiento de la App nativa para una experiencia 100% móvil con notificaciones push y resultados en vivo.",
            icon: <Smartphone className="w-6 h-6 text-blue-500" />
        }
    ];

    // --- MOCKUPS ---

    const RankingTableMockup = () => (
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-[10px] md:text-xs">
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-wrap gap-2">
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-md font-bold">Global</span>
                <span className="bg-white border px-3 py-1 rounded-md text-slate-600">División 1</span>
                <span className="bg-white border px-3 py-1 rounded-md text-slate-600">División 2</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                            <th className="p-3">#</th>
                            <th className="p-3">Jugador</th>
                            <th className="p-3">PTS</th>
                            <th className="p-3">PG</th>
                            <th className="p-3">Dif Sets</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {[
                            { id: 1, name: "Carlos Méndez", pts: 9, pg: 3, ds: "+6" },
                            { id: 2, name: "Roberto Sanz", pts: 7, pg: 2, ds: "+3" },
                            { id: 3, name: "Javier Ruiz", pts: 6, pg: 2, ds: "+2" },
                        ].map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                                <td className="p-3 font-bold text-slate-400">{row.id}</td>
                                <td className="p-3 font-semibold text-slate-900">{row.name}</td>
                                <td className="p-3 text-indigo-600 font-bold">{row.pts}</td>
                                <td className="p-3 text-green-600">{row.pg}</td>
                                <td className="p-3">{row.ds}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const ScheduleGridMockup = () => (
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-[9px] sm:text-[10px]">
            <div className="grid grid-cols-5 bg-slate-100 border-b border-slate-200 font-bold text-slate-500">
                <div className="p-2 border-r text-center">Hora</div>
                <div className="p-2 border-r text-center">Pista 1</div>
                <div className="p-2 border-r text-center">Pista 2</div>
                <div className="p-2 border-r text-center">Pista 3</div>
                <div className="p-2 text-center">Pista 4</div>
            </div>
            {["09:00", "10:00", "11:00"].map((time, idx) => (
                <div key={time} className="grid grid-cols-5 border-b border-slate-50 min-h-[85px]">
                    <div className="p-2 border-r bg-slate-50 font-bold text-slate-400 flex items-center justify-center">{time}</div>
                    <div className="p-1.5 border-r relative flex items-center justify-center">
                        {idx === 1 && (
                            <div className="w-full h-full bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-indigo-700 font-bold leading-tight flex flex-col justify-center text-center shadow-sm">
                                <span className="text-[7px] text-indigo-400 uppercase mb-1">OPEN</span>
                                <span>H. Martín / S. Ramos</span>
                                <span className="text-[7px] text-slate-300 my-0.5 uppercase">vs</span>
                                <span>A. Castro / E. Blanco</span>
                            </div>
                        )}
                    </div>
                    <div className="p-1.5 border-r"></div>
                    <div className="p-1.5 border-r relative flex items-center justify-center">
                        {idx === 0 && (
                            <div className="w-full h-full bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-indigo-700 font-bold leading-tight flex flex-col justify-center text-center shadow-sm">
                                <span className="text-[7px] text-indigo-400 uppercase mb-1">LIGA</span>
                                <span>M. Gil / D. Soler</span>
                                <span className="text-[7px] text-slate-300 my-0.5 uppercase">vs</span>
                                <span>L. Vega / P. Cano</span>
                            </div>
                        )}
                    </div>
                    <div className="p-1.5 border-r"></div>
                    <div className="p-1.5 flex items-center justify-center text-slate-200 uppercase font-bold text-[7px]">Libre</div>
                </div>
            ))}
        </div>
    );

    const PlayerDatabaseMockup = () => (
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-[10px] md:text-xs">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Buscando..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none" readOnly value="Sergio Domínguez" />
                </div>
                <button className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2">
                    <Plus className="w-3 h-3" /> Nuevo
                </button>
            </div>
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Nivel</th>
                        <th className="p-3">Estado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {[
                        { name: "Sergio Domínguez", level: "4.5", status: "Activo" },
                        { name: "Beatriz Ortiz", level: "3.0", status: "Activo" },
                        { name: "Hugo Martín", level: "5.2", status: "Baja" },
                    ].map((p, idx) => (
                        <tr key={idx}>
                            <td className="p-3 font-semibold">{p.name}</td>
                            <td className="p-3"><span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">{p.level}</span></td>
                            <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'Activo' ? 'bg-green-500' : 'bg-red-400'}`}></div>
                                    <span>{p.status}</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const PlayerStatsMockup = () => (
        <div className="bg-[#f8fafc] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 w-full">
            <div className="bg-[#0f172a] p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold border border-slate-500">RS</div>
                    <div>
                        <h3 className="text-xl font-bold">Roberto Sanz</h3>
                        <div className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5 bg-slate-800 px-2 py-0.5 rounded inline-block">Racha: WWLW</div>
                    </div>
                </div>
                <div className="flex gap-6 text-center">
                    <div><p className="text-green-400 text-2xl font-black">80%</p><p className="text-[8px] text-slate-400 uppercase font-bold">Win Rate</p></div>
                    <div><p className="text-white text-2xl font-black">15</p><p className="text-[8px] text-slate-400 uppercase font-bold">Partidos</p></div>
                </div>
            </div>
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm col-span-2 md:col-span-1">
                        <h4 className="text-[9px] font-bold text-green-600 uppercase mb-2">Resumen Total</h4>
                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between"><span>Victorias</span><span className="font-bold">12</span></div>
                            <div className="flex justify-between"><span>Derrotas</span><span className="font-bold">3</span></div>
                            <div className="flex justify-between border-t pt-1"><span>Dif. Sets</span><span className="font-bold text-indigo-600">+15</span></div>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                        <h4 className="text-[9px] font-bold text-yellow-600 uppercase mb-1">Mejor Aliado</h4>
                        <p className="text-xs font-bold">Carlos Méndez</p>
                        <p className="text-[9px] text-slate-400">100% efectividad</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                        <h4 className="text-[9px] font-bold text-red-600 uppercase mb-1">Némesis</h4>
                        <p className="text-xs font-bold">Elena Blanco</p>
                        <p className="text-[9px] text-slate-400">2 derrotas</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 scroll-smooth">
            {/* Navbar */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
                <div className="w-full px-6 md:px-12 lg:px-24 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-100">
                            <Trophy className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-black tracking-tight">Racket <span className="text-indigo-600">Grid</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-10">
                        <a href="#features" className="text-slate-600 hover:text-indigo-600 transition-colors font-bold text-sm">Funciones</a>
                        <a href="#pricing" className="text-slate-600 hover:text-indigo-600 transition-colors font-bold text-sm">Precios</a>
                        <a
                            href="https://app.racketgrid.com"
                            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full hover:bg-slate-800 transition-all font-bold text-sm shadow-lg shadow-slate-100"
                        >
                            <LogIn className="w-4 h-4" /> Admin Login
                        </a>
                    </div>
                    <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-slate-100 px-6 py-6 space-y-4">
                        <a href="#features" className="block py-2 text-slate-600 font-bold" onClick={() => setMobileMenuOpen(false)}>Funciones</a>
                        <a href="#pricing" className="block py-2 text-slate-600 font-bold" onClick={() => setMobileMenuOpen(false)}>Precios</a>
                        <a
                            href="https://app.racketgrid.com"
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-bold"
                        >
                            <LogIn className="w-4 h-4" /> Admin Login
                        </a>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section className="pt-40 pb-20 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-slate-50 to-white">
                <div className="w-full text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1]">
                        La plataforma definitiva para <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 font-black">Clubes de Padel</span>
                    </h1>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
                        Gestión inteligente de todo tipo de torneos. Controla el torneo de una forma sencilla y facilita el seguimiento del evento a todos los participantes.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                        >
                            Prueba Gratuita <ChevronRight className="w-5 h-5" />
                        </a>
                        <button
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            className="w-full sm:w-auto bg-white border border-slate-200 hover:border-indigo-600 text-slate-700 px-8 py-4 rounded-2xl text-lg font-bold transition-all"
                        >
                            Ver Funciones
                        </button>
                    </div>
                </div>
            </section>

            {/* Feature Sections with Improved Differentiation */}
            <section id="features" className="py-16 md:py-24 bg-white space-y-32">
                <div className="w-full px-6 md:px-12 lg:px-24">

                    {/* Card 01: Rankings */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center p-8 rounded-[3rem] bg-slate-50/50 border border-slate-100">
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-5xl font-black text-indigo-100">01</span>
                                <h2 className="text-4xl font-extrabold text-slate-900">Todos tus Formatos en una sola App</h2>
                            </div>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                Racket Grid automatiza el cálculo de puntos y ascensos al instante, desde ligas anuales hasta torneos rápidos.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {tournamentFormats.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <Check className="w-5 h-5 text-indigo-600 shrink-0" />
                                        <span className="font-bold text-slate-900 text-sm">{f.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-indigo-100/30 rounded-[2.5rem] blur-xl"></div>
                            <RankingTableMockup />
                        </div>
                    </div>

                    {/* Card 02: Schedule */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center p-8 rounded-[3rem] bg-white border border-slate-50 shadow-sm">
                        <div className="order-2 lg:order-1 relative group">
                            <div className="absolute -inset-4 bg-green-100/30 rounded-[2.5rem] blur-xl"></div>
                            <ScheduleGridMockup />
                        </div>
                        <div className="order-1 lg:order-2">
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-5xl font-black text-green-100">02</span>
                                <h2 className="text-4xl font-extrabold text-slate-900">Parrilla de Horarios Inteligente</h2>
                            </div>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                Visualiza la ocupación de tus pistas de un vistazo. Programa partidos directamente en la cuadrícula asegurando visibilidad total.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Gestión de múltiples pistas y franjas horarias",
                                    "Tarjetas de partido con legibilidad optimizada",
                                    "Sustitución rápida por bajas de última hora",
                                    "Sincronización total con las actas del torneo"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 font-medium text-slate-700">
                                        <div className="bg-green-100 text-green-600 p-1 rounded-full"><Check className="w-4 h-4" /></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Card 03: Player Database */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center p-8 rounded-[3rem] bg-slate-50/50 border border-slate-100">
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-5xl font-black text-indigo-100">03</span>
                                <h2 className="text-4xl font-extrabold text-slate-900">Gestión de Socios Centralizada</h2>
                            </div>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                Controla niveles, estados de socio y disponibilidad sin necesidad de hojas de cálculo externas.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Ficha de jugador con nivel técnico (1.0 - 7.0)",
                                    "Filtros avanzados por división y estado",
                                    "Historial de pagos y participaciones",
                                    "Gestión masiva de altas y bajas"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 font-medium text-slate-700">
                                        <div className="bg-indigo-100 text-indigo-600 p-1 rounded-full"><Check className="w-4 h-4" /></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-indigo-100/20 rounded-[2.5rem] blur-xl"></div>
                            <PlayerDatabaseMockup />
                        </div>
                    </div>

                    {/* Card 04: Player Experience */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center p-8 rounded-[3rem] bg-white border border-slate-50 shadow-sm">
                        <div className="order-2 lg:order-1 relative group">
                            <div className="absolute -inset-4 bg-orange-100/20 rounded-[2.5rem] blur-xl"></div>
                            <PlayerStatsMockup />
                        </div>
                        <div className="order-1 lg:order-2">
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-5xl font-black text-orange-100">04</span>
                                <h2 className="text-4xl font-extrabold text-slate-900">Experiencia Pro para el Jugador</h2>
                            </div>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                Visualiza winrate, rachas, némesis y un historial completo de partidos con eficiencia detallada.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { title: "Radar de Némesis", desc: "Identifica tus rivales directos." },
                                    { title: "Rachas de Forma", desc: "Mide tu consistencia." },
                                    { title: "Historial Visual", desc: "Resultados siempre a mano." },
                                    { title: "Mejores Aliados", desc: "Compañeros más efectivos." }
                                ].map((f, i) => (
                                    <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <Activity className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                        <div><h4 className="font-bold text-slate-900 text-sm">{f.title}</h4><p className="text-[10px] text-slate-500">{f.desc}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Admin Dashboard - Buttons visual only */}
            <section className="py-16 md:py-24 bg-slate-900 text-white overflow-hidden">
                <div className="w-full px-6 md:px-12 lg:px-24">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-extrabold mb-4">Control Administrativo Pro</h2>
                        <p className="text-slate-400">Herramientas diseñadas por y para organizadores.</p>
                    </div>
                    <div className="bg-slate-800 p-6 md:p-10 rounded-[3rem] border border-slate-700 shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-center">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700">
                                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Torneos Activos</p>
                                <div className="flex justify-center items-center gap-4"><span className="text-4xl font-black">1</span><Trophy className="text-indigo-500 w-8 h-8" /></div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700">
                                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Jugadores</p>
                                <div className="flex justify-center items-center gap-4"><span className="text-4xl font-black">40</span><Users className="text-green-500 w-8 h-8" /></div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700">
                                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Validaciones</p>
                                <div className="flex justify-center items-center gap-4"><span className="text-4xl font-black">20</span><ShieldCheck className="text-orange-500 w-8 h-8" /></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-indigo-600/50 p-8 rounded-3xl flex items-center justify-between cursor-default opacity-80 border border-indigo-400/30">
                                <div><h4 className="text-2xl font-bold mb-1">Nuevo Torneo</h4><p className="text-indigo-100 text-sm opacity-60">Configuración en segundos</p></div>
                                <Trophy className="w-12 h-12 opacity-20" />
                            </div>
                            <div className="bg-green-600/50 p-8 rounded-3xl flex items-center justify-between cursor-default opacity-80 border border-green-400/30">
                                <div><h4 className="text-2xl font-bold mb-1">Añadir Socio</h4><p className="text-green-100 text-sm opacity-60">Carga masiva</p></div>
                                <Users className="w-12 h-12 opacity-20" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roadmap */}
            <section className="py-16 md:py-24 bg-white relative">
                <div className="w-full px-6 md:px-12 lg:px-24">
                    <div className="mb-16">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                            <Plus className="w-3 h-3" /> Roadmap 2026
                        </div>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Construyendo el Futuro del Pádel</h2>
                        <p className="text-slate-600">Innovaciones que transformarán tu club este año.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {roadmap2026.map((item, i) => (
                            <div key={i} className="group bg-slate-50 hover:bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-indigo-100 hover:shadow-2xl transition-all duration-500">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 w-fit mb-6 group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </div>
                                <span className="text-[10px] font-black text-indigo-600 tracking-widest">{item.quarter}</span>
                                <h3 className="text-xl font-bold text-slate-900 mt-2 mb-4">{item.title}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-16 md:py-24 bg-slate-50">
                <div className="w-full px-6 md:px-12 lg:px-24">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Planes Adaptados a tu Club</h2>
                        <p className="text-slate-600">IVA Incluido en todos nuestros modelos.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        {subscriptionPlans.map((plan, i) => (
                            <div key={i} className={`relative p-8 rounded-3xl border-2 flex flex-col ${plan.color} transition-all hover:scale-[1.02] ${plan.featured ? 'scale-[1.05] shadow-2xl z-10 border-green-500' : 'hover:shadow-xl'}`}>
                                {plan.featured && (
                                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                                        Recomendado
                                    </span>
                                )}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                        {plan.hasTrial && (
                                            <div className="inline-flex items-center gap-1 text-green-600 font-black text-[10px] uppercase bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                <Gift className="w-2.5 h-2.5" /> Mes GRATIS
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-4xl font-extrabold text-slate-900">{plan.price}€</span>
                                        <span className="text-slate-500 font-medium text-sm">{plan.period}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-tighter">IVA Incluido</p>
                                    <p className="text-sm leading-snug text-slate-500">{plan.description}</p>
                                </div>
                                <div className="space-y-3 mb-8 flex-grow">
                                    {plan.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-sm">
                                            {feature.includes("Todo lo del plan") ? (
                                                <span className="font-bold text-indigo-600 leading-tight block mb-2">{feature}</span>
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                    <span className="leading-tight text-slate-700">{feature}</span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {plan.notIncluded && plan.notIncluded.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                                            <X className="w-5 h-5 shrink-0 mt-0.5" />
                                            <span className="line-through leading-tight">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`w-full py-4 rounded-xl font-bold text-center transition-all ${plan.featured ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-100' : 'bg-slate-900 hover:bg-slate-800 text-white'
                                        }`}
                                >
                                    {plan.hasTrial ? 'Empezar mes gratis' : `Elegir ${plan.name}`}
                                </a>
                            </div>
                        ))}
                    </div>

                    <div className="relative group max-w-5xl mx-auto">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative bg-white border border-indigo-100 p-8 md:p-10 rounded-[2.5rem] shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
                            <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left flex-1">
                                <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-100"><Clock className="w-10 h-10" /></div>
                                <div>
                                    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-3"><Star className="w-3 h-3 fill-indigo-700" /> {eventPass.badge}</div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-2">{eventPass.name}</h3>
                                    <p className="text-slate-500 max-w-md leading-relaxed">{eventPass.description}</p>
                                </div>
                            </div>
                            <div className="text-center lg:text-right min-w-[200px]">
                                <div className="mb-2"><span className="text-5xl font-black text-slate-900">{eventPass.price}€</span><span className="text-slate-500 font-bold ml-1">{eventPass.period}</span></div>
                                <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase tracking-tighter">IVA Incluido</p>
                                <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-100 inline-block"
                                >
                                    Comprar Pase Único
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-12 px-6 md:px-12 lg:px-24">
                <div className="w-full flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg"><Trophy className="text-white w-4 h-4" /></div>
                            <span className="text-lg font-black tracking-tight">Racket <span className="text-indigo-600">Grid</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium">
                            <Mail className="w-4 h-4" />
                            <a href="mailto:hola@racketgrid.com">hola@racketgrid.com</a>
                        </div>
                    </div>
                    <p className="text-sm text-slate-400">© 2026 Racket Grid. Gestión inteligente para clubes de pádel.</p>
                </div>
            </footer>
        </div>
    );
};

export default App;
