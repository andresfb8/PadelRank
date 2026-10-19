import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConsentManager } from './components/ConsentManager';
import { LegalModal } from './components/LegalModal';
import {
    BrandFragment, ConflictFragment, FollowFragment, FormatsFragment, InscriptionsFragment, ParrillaLive,
    RegistrationFragment, ResultFragment, ScheduleListFragment, StandingsFragment, TVFragment,
} from './fragments';

const APP_URL = 'https://app.racketgrid.com';
const WHATSAPP_URL = 'https://wa.me/34625277697';
const EMAIL = 'hola@racketgrid.com';
const checkoutUrl = (priceId: string, plan: string) =>
    `https://us-central1-padelrank-pro-app-2025.cloudfunctions.net/checkoutRedirect?priceId=${priceId}&plan=${plan}`;
const TRIAL_URL = checkoutUrl('price_1SyENLH0qNNQGErtnn8H2yK7', 'pro');
const KIT_MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent('Quiero el kit de gestión para mi club')}&body=${encodeURIComponent('Hola, soy … del club … y me gustaría recibir la plantilla de ranking y el checklist de torneos.')}`;

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const FEATURES = [
    {
        title: 'Siete formatos en una sola app',
        text: 'Liga individual o por parejas, americano, mexicano, eliminatoria con consolación, liga con playoff y pozo. Ascensos, descensos y desempates se calculan solos al apuntar cada resultado.',
        Proof: FormatsFragment,
    },
    {
        title: 'La parrilla se hace sola',
        text: 'Cada pareja marca al inscribirse cuándo no puede jugar. Racket Grid reparte los partidos por pistas y horas respetándolo, deja descansar entre partidos y te avisa de lo que no encaja.',
        Proof: ConflictFragment,
        live: true,
    },
    {
        title: 'Inscripción con un enlace',
        text: 'Compartes un enlace por WhatsApp; las parejas eligen categoría, dejan sus datos y marcan su horario desde el móvil. Tú solo revisas y apruebas.',
        Proof: RegistrationFragment,
    },
    {
        title: 'Cada jugador lo sigue en su móvil',
        text: 'Elige su pareja una vez y ve su próximo partido, la pista y su posición. Clasificaciones, partidos y cuadros pensados para el pulgar, sin tablas que se salgan de la pantalla.',
        Proof: FollowFragment,
    },
    {
        title: 'La pantalla del club, en directo',
        text: 'El modo TV rota resultados, cuadros, horarios y clasificaciones en cualquier Smart TV o proyector, con los patrocinadores del torneo.',
        Proof: TVFragment,
    },
    {
        title: 'Con el logo de tu club',
        text: 'La vista pública lleva tu logo y una dirección propia para compartir, así que jugadores y patrocinadores ven tu club, no el nuestro.',
        Proof: BrandFragment,
    },
];

const STAGES = [
    { name: 'Inscripciones', clause: 'Primero, abres las inscripciones', Fragment: InscriptionsFragment },
    { name: 'Parrilla', clause: 'Después, se reparte la parrilla', Fragment: ScheduleListFragment },
    { name: 'Resultados', clause: 'Mientras se juega, apuntas resultados', Fragment: ResultFragment },
    { name: 'Clasificación', clause: 'Y todos lo ven al momento', Fragment: StandingsFragment },
];

const PLANS = [
    {
        name: 'Básico', price: '19', period: '€ al mes', cta: 'Elegir Básico',
        href: checkoutUrl('price_1SyENKH0qNNQGErtnwAw3w9R', 'basic'),
        text: 'Para clubes que empiezan: hasta 50 jugadores, 3 torneos activos y 3 categorías por torneo. Ligas, americano y mexicano con la gestión administrativa. Sin portal del jugador, marca propia ni playoffs.',
    },
    {
        name: 'Pro', price: '39', period: '€ al mes', cta: 'Empezar el mes gratis', trial: true,
        href: TRIAL_URL,
        text: 'El primer mes es gratis. Hasta 150 jugadores, torneos y categorías sin límite, liga con playoff, modo TV, portal de autoservicio y validación de resultados. No incluye torneos de fin de semana ni varios administradores.',
    },
    {
        name: 'Star Point', price: '59', period: '€ al mes', cta: 'Elegir Star Point',
        href: checkoutUrl('price_1SyENLH0qNNQGErtanrpSTkh', 'star'),
        text: 'Para grandes centros: jugadores y torneos sin límite, playoffs con cuadro principal y de consolación, varios administradores y soporte prioritario.',
    },
    {
        name: 'Weekend Warrior', price: '39', period: '€ por torneo', cta: 'Comprar el pase',
        href: checkoutUrl('price_1QuU3dG36W3wUv2p3m7XFvU4', 'weekend'),
        text: 'Un solo torneo con todo lo de Star Point durante 14 días: cuadro principal y de consolación, categorías sin límite y estadísticas completas.',
    },
];

const PROOF = [
    { kind: 'Clubes', names: ['Roda Padel Reserve', 'Padel Indoor Aragón', 'Club de Pádel San Javier'] },
    { kind: 'Formatos', names: ['Liga individual', 'Liga por parejas', 'Americano', 'Mexicano', 'Eliminatoria', 'Liga + playoff', 'Pozo'] },
    { kind: 'Se ve en', names: ['El móvil del jugador', 'La tablet del club', 'El ordenador del organizador', 'La Smart TV del bar'] },
];

const NAV = [
    { label: 'Funciones', href: '#funciones' },
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Precios', href: '#precios' },
    { label: 'Entrar', href: APP_URL },
];

// ---------------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------------

/** Adds .in to every [data-reveal] block the first time it enters the screen. */
const useReveal = () => {
    useEffect(() => {
        const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
        if (!('IntersectionObserver' in window)) { blocks.forEach(b => b.classList.add('in')); return; }
        const io = new IntersectionObserver(entries => entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        }), { rootMargin: '0px 0px -12% 0px' });
        blocks.forEach(b => io.observe(b));
        // Never leave content hidden if the observer is slow to fire
        const safety = window.setTimeout(() => blocks.forEach(b => b.classList.add('in')), 4000);
        return () => { io.disconnect(); window.clearTimeout(safety); };
    }, []);
};

const Button = ({ href, children, tone = 'accent', className = '' }: { href: string; children: React.ReactNode; tone?: 'accent' | 'light' | 'ink'; className?: string }) => {
    const tones = {
        accent: 'bg-court text-white hover:bg-court-deep',
        light: 'bg-white text-rg-ink hover:bg-rg-raised',
        ink: 'bg-rg-ink text-white hover:bg-rg-night-2',
    };
    return (
        <a href={href} className={`inline-flex items-center justify-center h-12 px-6 rounded-full text-[16px] font-semibold transition-[background-color,transform] duration-150 active:scale-[0.97] ${tones[tone]} ${className}`}>
            {children}
        </a>
    );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const App = () => {
    const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: 'aviso' | 'privacidad' | 'cookies' }>({ isOpen: false, type: 'aviso' });
    const openLegal = (type: 'aviso' | 'privacidad' | 'cookies') => setLegalModal({ isOpen: true, type });
    const [menuOpen, setMenuOpen] = useState(false);

    // The live parrilla: the slots in which Laura and Marta cannot play
    const [blocked, setBlocked] = useState<Set<number>>(() => new Set([0]));
    const toggleSlot = useCallback((slot: number) => setBlocked(prev => {
        const next = new Set(prev);
        if (next.has(slot)) next.delete(slot); else next.add(slot);
        return next;
    }), []);

    // The fixed half shows the courts until the features arrive, then the live parrilla
    const featuresRef = useRef<HTMLElement>(null);
    const [stage, setStage] = useState<'photo' | 'parrilla'>('photo');
    useEffect(() => {
        const el = featuresRef.current;
        if (!el || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(([e]) => setStage(e.isIntersecting ? 'parrilla' : 'photo'), { rootMargin: '-45% 0px -45% 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const [stageIndex, setStageIndex] = useState(0);
    const [planIndex, setPlanIndex] = useState(1);
    useReveal();

    const [pastHero, setPastHero] = useState(false);
    useEffect(() => {
        const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const plan = PLANS[planIndex];
    const Current = STAGES[stageIndex].Fragment;

    return (
        <div className="min-h-svh bg-rg-paper text-rg-ink font-sans">
            <div className="hidden lg:block"><ConsentManager /></div>
            <a href="#funciones" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[120] bg-white px-4 py-2 rounded-full">Saltar al contenido</a>

            {/* ============ The split stage: courts and parrilla on the left, reading on the right ============ */}
            <div className="relative bg-rg-night lg:grid lg:grid-cols-[47%_53%]">

                {/* Fixed half */}
                <div className="relative">
                    <div className="h-[58svh] p-3 lg:sticky lg:top-0 lg:h-svh lg:p-5">
                        <div className="relative h-full rounded-xl overflow-hidden bg-rg-night-2">
                            <div className={`stage-layer absolute inset-0 ${stage === 'photo' ? 'opacity-100' : 'opacity-0 lg:scale-[1.02]'}`} aria-hidden={stage !== 'photo'}>
                                <img
                                    src="/photos/pistas-desde-arriba.jpg"
                                    alt="Pistas de pádel azules vistas desde arriba, junto a una antigua capilla de piedra"
                                    width={1920} height={1440}
                                    className="drift w-full h-full object-cover object-[60%_70%] brightness-[0.82]"
                                />
                            </div>
                            <div className={`stage-layer hidden lg:flex absolute inset-0 items-center justify-center p-6 xl:p-10 bg-rg-night-2 ${stage === 'parrilla' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden={stage !== 'parrilla'}>
                                <div className="w-full max-w-[620px]">
                                    <ParrillaLive blocked={blocked} onToggle={toggleSlot} />
                                    <p className="text-[14px] text-rg-on-night-muted mt-3">Toca las horas: el partido de Laura y Marta busca el siguiente hueco libre.</p>
                                </div>
                            </div>

                            {/* Phone: menu and action over the photograph */}
                            <div className="lg:hidden absolute top-0 inset-x-0 flex items-center justify-between p-3">
                                <button type="button" onClick={() => setMenuOpen(true)} className="h-11 px-4 rounded-full bg-white/90 text-rg-ink text-[15px] font-medium">Menú</button>
                                <Button href={TRIAL_URL} className="h-11 text-[15px] px-5">Probar gratis</Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reading half */}
                <div className="relative">
                    {/* First screen */}
                    <section className="relative px-5 pb-12 lg:px-14 lg:pb-0 lg:h-svh text-rg-on-night" aria-labelledby="titulo">
                        <nav className="hidden lg:flex absolute top-8 right-8 items-center gap-7 text-[15px]" aria-label="Principal">
                            {NAV.map(l => <a key={l.label} href={l.href} className="text-rg-on-night hover:text-white transition-colors">{l.label}</a>)}
                            <Button href={TRIAL_URL} className="h-10 px-5 text-[15px]">Probar gratis</Button>
                        </nav>

                        <h1 id="titulo" className="wordmark text-display font-medium lowercase text-white -mt-[9vw] sm:-mt-[6vw] sm:whitespace-nowrap lg:mt-0 lg:absolute lg:right-8 lg:bottom-10 lg:z-20 lg:whitespace-nowrap lg:text-[clamp(84px,11vw,190px)]">
                            <span className="block sm:inline">racket</span> grid
                        </h1>

                        <div className="mt-6 max-w-[30ch] sm:max-w-none sm:grid sm:grid-cols-2 sm:gap-8 sm:items-end lg:block lg:mt-0 lg:pt-[36svh] lg:max-w-[30ch]">
                            <p className="text-[20px] lg:text-[24px] leading-[1.35] text-white">
                                Las ligas y torneos de pádel de tu club, con la parrilla hecha y los resultados en el móvil de cada jugador.
                            </p>
                            <div className="mt-7 sm:mt-0 lg:mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                                <Button href={TRIAL_URL}>Probar un mes gratis</Button>
                                <a href="#como-funciona" className="text-[16px] text-rg-on-night underline-offset-4 hover:underline">Ver cómo funciona</a>
                            </div>
                        </div>
                    </section>

                    <div className="lg:hidden"><ConsentManager /></div>

                    {/* Features, on paper */}
                    <section id="funciones" ref={featuresRef} className="bg-rg-paper px-5 py-20 lg:px-14 lg:py-32" aria-labelledby="funciones-titulo">
                        <div data-reveal>
                            <h2 id="funciones-titulo" className="rise text-l font-semibold max-w-[20ch]">Lo que Racket Grid hace por tu club</h2>
                            <p className="rise text-m mt-3 max-w-[46ch]" style={{ '--i': 1 } as React.CSSProperties}>
                                Todo lo que hoy vive en un Excel, un grupo de WhatsApp y un corcho en recepción, en un solo sitio.
                            </p>
                        </div>
                        <div className="mt-14 lg:mt-16 space-y-16 lg:space-y-24">
                            {FEATURES.map(({ title, text, Proof, live }) => (
                                <article key={title} data-reveal className="grid gap-5 xl:grid-cols-[340px_minmax(0,300px)] xl:gap-7 items-start">
                                    <div className="rise bg-rg-raised rounded-xl p-3 overflow-hidden">
                                        {live ? (
                                            <>
                                                <div className="hidden lg:block"><Proof /></div>
                                                <div className="lg:hidden"><ParrillaLive blocked={blocked} onToggle={toggleSlot} compact /></div>
                                            </>
                                        ) : <Proof />}
                                    </div>
                                    <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
                                        <h3 className="text-[18px] font-semibold leading-snug">{title}</h3>
                                        <p className="text-[16px] leading-[1.55] mt-2">{text}</p>
                                        {live && <p className="hidden lg:block text-[15px] text-court-ink mt-3">Pruébalo en la parrilla de la izquierda.</p>}
                                        {live && <p className="lg:hidden text-[15px] text-court-ink mt-3">Pruébalo arriba: toca las horas.</p>}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* ============ How it works: one slider drives both fields ============ */}
            <section id="como-funciona" className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 lg:min-h-[88svh]" aria-labelledby="como-titulo">
                <div className="order-1 bg-court text-white px-5 py-10 lg:px-14 lg:py-16 flex flex-col">
                    <h2 id="como-titulo" key={stageIndex} className="swap text-xl font-semibold max-w-[13ch]">{STAGES[stageIndex].clause}</h2>
                    <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 text-[16px] lg:hidden">
                        {STAGES.map((s, i) => <li key={s.name} className={i === stageIndex ? 'text-white font-semibold' : 'text-white/70'}>{s.name}</li>)}
                    </ul>
                </div>
                <div className="order-2 bg-rg-raised px-4 py-8 lg:p-14 flex items-center justify-center min-h-[46svh]">
                    <div key={stageIndex} className="swap w-full flex justify-center"><Current /></div>
                </div>
                <div className="order-3 lg:col-span-2 bg-rg-ink px-5 lg:px-14 py-6">
                    <label htmlFor="etapa" className="sr-only">Etapa del torneo</label>
                    <input
                        id="etapa"
                        type="range" min={0} max={STAGES.length - 1} step={1}
                        value={stageIndex}
                        onChange={e => setStageIndex(Number(e.target.value))}
                        className="stage-range w-full"
                        style={{ '--fill': `${(stageIndex / (STAGES.length - 1)) * 100}%` } as React.CSSProperties}
                        aria-valuetext={STAGES[stageIndex].name}
                    />
                    <ol className="hidden lg:grid grid-cols-4 mt-3 text-[16px]">
                        {STAGES.map((s, i) => (
                            <li key={s.name} className={`${i === 0 ? '' : i === STAGES.length - 1 ? 'text-right' : 'text-center'}`}>
                                <button type="button" onClick={() => setStageIndex(i)} className={`transition-colors ${i === stageIndex ? 'text-white font-semibold' : 'text-rg-on-night-muted hover:text-white'}`}>{s.name}</button>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ============ Where it is played ============ */}
            <section className="px-5 py-24 lg:px-14 lg:py-32 grid lg:grid-cols-12 gap-10 lg:gap-8" aria-labelledby="clubes-titulo" data-reveal>
                <div className="lg:col-span-3">
                    <h2 id="clubes-titulo" className="rise text-l font-semibold">Dónde ya se juega</h2>
                    <img
                        src="/photos/pista-cristal.jpg"
                        alt="Pista de pádel de cristal y césped azul bajo un cielo nublado"
                        width={1920} height={1280} loading="lazy"
                        className="rise mt-8 w-full aspect-[4/5] object-cover object-[45%_50%] rounded-xl"
                        style={{ '--i': 1 } as React.CSSProperties}
                    />
                </div>
                <div className="rise lg:col-span-8 lg:col-start-5 columns-2 md:columns-3 gap-8 text-[18px] lg:text-[20px] leading-[1.5]" style={{ '--i': 1 } as React.CSSProperties}>
                    {PROOF.map(group => (
                        <ul key={group.kind} className="break-inside-avoid mb-8">
                            <li className="text-rg-muted">{group.kind}</li>
                            {group.names.map(n => <li key={n}>{n}</li>)}
                        </ul>
                    ))}
                </div>
            </section>

            {/* ============ Prices: plan names, one live figure ============ */}
            <section id="precios" className="bg-white px-5 py-24 lg:px-14 lg:py-32" aria-labelledby="precios-titulo">
                <h2 id="precios-titulo" className="text-l font-semibold">Precios, con el IVA incluido</h2>
                <p className="text-[16px] text-rg-muted mt-2 max-w-[52ch]">Son precios de lanzamiento y pueden cambiar. Puedes cancelar cuando quieras.</p>

                <div className="mt-12 lg:grid lg:grid-cols-12 lg:gap-8">
                    <ul className="lg:col-span-6" role="tablist" aria-label="Planes">
                        {PLANS.map((p, i) => (
                            <li key={p.name}>
                                <button
                                    type="button"
                                    role="tab"
                                    id={`plan-${i}`}
                                    aria-selected={i === planIndex}
                                    aria-controls="plan-panel"
                                    onClick={() => setPlanIndex(i)}
                                    onFocus={() => setPlanIndex(i)}
                                    className={`group flex items-center gap-[0.35em] text-left text-[clamp(40px,5vw,76px)] font-semibold leading-[1.12] tracking-[-0.03em] transition-colors ${i === planIndex ? 'text-rg-ink' : 'text-[#76808F] hover:text-rg-muted'}`}
                                >
                                    <span className={`w-[0.3em] h-[0.3em] rounded-full flex-none transition-colors ${i === planIndex ? 'bg-court' : 'bg-transparent'}`} />
                                    {p.name}
                                </button>
                                {/* Phone: the plan opens beneath its name */}
                                {i === planIndex && (
                                    <div className="lg:hidden swap mt-3 mb-14 bg-rg-paper rounded-xl p-5">
                                        <PlanDetail plan={p} />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div id="plan-panel" role="tabpanel" aria-labelledby={`plan-${planIndex}`} className="hidden lg:block lg:col-span-5 lg:col-start-8">
                        <div key={planIndex} className="swap"><PlanDetail plan={plan} large /></div>
                    </div>
                </div>
            </section>

            {/* ============ The close ============ */}
            <section className="px-5 lg:px-14 pt-[20svh] pb-[16svh] grid lg:grid-cols-12 gap-12 lg:gap-8 items-end" aria-labelledby="hablamos" data-reveal>
                <div className="lg:col-span-6">
                    <h2 id="hablamos" className="rise text-[20px] font-medium leading-[1.45] max-w-[34ch]">
                        Cuéntanos cómo es tu club y te enseñamos Racket Grid con uno de tus torneos.
                    </h2>
                    <div className="rise mt-6 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ '--i': 1 } as React.CSSProperties}>
                        <Button href={WHATSAPP_URL} tone="ink">Escribir por WhatsApp</Button>
                        <a href={`mailto:${EMAIL}`} className="text-[16px] text-court underline-offset-4 hover:underline">o a {EMAIL}</a>
                    </div>
                </div>
                <div className="rise lg:col-span-5 lg:col-start-8 bg-white rounded-xl p-6" style={{ '--i': 2 } as React.CSSProperties}>
                    <h3 className="text-[18px] font-semibold">El kit de gestión, gratis</h3>
                    <p className="text-[16px] leading-[1.55] mt-2">
                        La plantilla de ranking con sus fórmulas de puntos, el checklist de 20 pasos para organizar un torneo,
                        la guía de niveles y categorías y el manual de bienvenida para socios nuevos.
                    </p>
                    <a href={KIT_MAILTO} className="inline-block mt-4 text-[16px] font-semibold text-court underline-offset-4 hover:underline">Pedirlo por email</a>
                </div>
            </section>

            {/* ============ Footer: the court close up, the menu large ============ */}
            <footer className="grid lg:grid-cols-2 lg:min-h-svh bg-rg-night text-rg-on-night">
                <div className="relative h-[50svh] lg:h-auto overflow-hidden">
                    <img src="/photos/jugadores-pista-azul.jpg" alt="Dos jugadores en una pista de pádel azul durante una exhibición" width={1920} height={1357} loading="lazy" className="absolute inset-0 w-full h-full object-cover object-[22%_40%] scale-[1.35] origin-[22%_40%]" />
                </div>
                <div className="px-5 py-12 lg:px-14 lg:py-20 flex flex-col">
                    <p className="text-[16px] font-semibold text-white">Racket Grid</p>
                    <nav className="mt-8" aria-label="Pie">
                        <ul className="space-y-3 lg:space-y-5">
                            {[...NAV, { label: 'Probar un mes gratis', href: TRIAL_URL }].map(l => (
                                <li key={l.label}>
                                    <a href={l.href} className="inline-block text-[8vw] lg:text-[2.6vw] font-semibold leading-tight text-white transition-transform duration-200 hover:translate-x-3">{l.label}</a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="mt-14 grid sm:grid-cols-2 gap-6 text-[15px] leading-relaxed">
                        <div>
                            <p className="text-rg-on-night-muted">Contacto</p>
                            <a href={`mailto:${EMAIL}`} className="block hover:text-white">{EMAIL}</a>
                            <a href={WHATSAPP_URL} className="block hover:text-white num">WhatsApp +34 625 277 697</a>
                        </div>
                        <div>
                            <p className="text-rg-on-night-muted">Redes</p>
                            <a href="https://instagram.com/racketgridapp" target="_blank" rel="noopener noreferrer" className="block hover:text-white">Instagram @racketgridapp</a>
                        </div>
                    </div>
                    <div className="mt-auto pt-14 space-y-3 text-[13px] text-rg-on-night-muted">
                        <div className="flex flex-wrap gap-x-5 gap-y-1">
                            <span className="num">© 2026 Racket Grid</span>
                            <button type="button" onClick={() => openLegal('aviso')} className="hover:text-white">Aviso legal</button>
                            <button type="button" onClick={() => openLegal('privacidad')} className="hover:text-white">Privacidad</button>
                            <button type="button" onClick={() => openLegal('cookies')} className="hover:text-white">Cookies</button>
                        </div>
                        <p className="leading-relaxed max-w-[60ch]">
                            Fotos: «Platform 26 padel tennis courts behind Railway Street, Chatham», de OathOn, CC0;
                            «Padel Tennis Arena ISPO 2014», de Ordercrazy, CC0; «Pista de padel, Muñomer del Peco», de Malopez 21,
                            CC BY-SA 4.0. Todas vía Wikimedia Commons.
                        </p>
                    </div>
                </div>
            </footer>

            {/* Phone menu */}
            {menuOpen && (
                <div className="lg:hidden fixed inset-0 z-[95] bg-rg-night text-white px-5 py-4 flex flex-col swap" role="dialog" aria-modal="true" aria-label="Menú">
                    <div className="flex justify-between items-center">
                        <span className="text-[16px] font-semibold">Racket Grid</span>
                        <button type="button" onClick={() => setMenuOpen(false)} className="h-11 px-4 rounded-full bg-white/10 text-[15px]">Cerrar</button>
                    </div>
                    <ul className="mt-10 space-y-4">
                        {NAV.map(l => (
                            <li key={l.label}><a href={l.href} onClick={() => setMenuOpen(false)} className="text-[9vw] font-semibold leading-tight">{l.label}</a></li>
                        ))}
                    </ul>
                    <Button href={TRIAL_URL} className="mt-auto w-full">Probar un mes gratis</Button>
                </div>
            )}

            <LegalModal isOpen={legalModal.isOpen} onClose={() => setLegalModal({ ...legalModal, isOpen: false })} type={legalModal.type} />

            {/* WhatsApp, always at hand. taste-skill-ignore: it floats over the page, so it may cast a shadow */}
            <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escribir por WhatsApp"
                className={`fixed bottom-5 right-5 z-[90] w-14 h-14 rounded-full bg-[#1FA855] hover:bg-[#178a45] text-white grid place-items-center float-fab transition-[opacity,transform] duration-300 active:scale-95 ${pastHero ? 'opacity-100' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" /></svg>
            </a>
        </div>
    );
};

const PlanDetail = ({ plan, large = false }: { plan: typeof PLANS[number]; large?: boolean }) => (
    <div>
        <p className="flex items-baseline gap-3">
            <span className={`${large ? 'text-[clamp(72px,9vw,150px)]' : 'text-[20vw]'} font-semibold leading-[0.9] tracking-[-0.04em] num`}>{plan.price}</span>
            <span className="text-[18px] text-rg-muted">{plan.period}</span>
        </p>
        <p className={`${large ? 'text-[18px]' : 'text-[17px]'} leading-[1.55] mt-5 max-w-[40ch]`}>{plan.text}</p>
        <Button href={plan.href} className={`mt-7 ${large ? '' : 'w-full'}`}>{plan.cta}</Button>
    </div>
);

export default App;
