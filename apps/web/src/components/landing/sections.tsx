import Link from "next/link";
import { Building2, Monitor, Radio, Shield, Zap } from "lucide-react";

export function LandingNav() {
  return (
    <header className="border-b border-card bg-[#06080f]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Monitor className="h-4 w-4 text-white" />
          </div>
          Observal
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <a href="#como-funciona" className="hover:text-white transition-colors">
            Cómo funciona
          </a>
          <a href="#equipos" className="hover:text-white transition-colors">
            Equipos
          </a>
          <a href="#sectores" className="hover:text-white transition-colors">
            Sectores
          </a>
          <a href="#precios" className="hover:text-white transition-colors">
            Precios
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Acceder
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Empezar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.15),_transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-card bg-card px-4 py-1.5 text-xs text-muted mb-8">
          <Radio className="h-3 w-3 text-blue-400" />
          Monitorización AV multiprotocolo en remoto
        </div>
        <h1 className="max-w-3xl text-4xl md:text-6xl font-bold leading-tight tracking-tight">
          Todo tu sistema AV,{" "}
          <span className="text-blue-400">visible y bajo control</span> desde
          cualquier lugar.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted leading-relaxed">
          Observal monitoriza proyectores, pantallas LED, audio, iluminación,
          matrices y procesadores de vídeo en instalaciones fijas. Enchufa el
          collector, activa con un código y gestiona todo desde la nube — sin
          acceder al hardware.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500 transition-colors"
          >
            Crear cuenta gratis
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex items-center justify-center rounded-lg border border-card px-6 py-3 font-medium hover:bg-card transition-colors"
          >
            Ver cómo funciona
          </a>
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    step: "1",
    title: "Enchufa el collector",
    desc: "Conecta el Observal Collector a la red AV de la instalación por Ethernet.",
  },
  {
    step: "2",
    title: "Activa con un código",
    desc: "Introduce el código de la etiqueta en observal.app. Sin SSH, sin terminal.",
  },
  {
    step: "3",
    title: "Monitoriza todo",
    desc: "Añade equipos desde la web. El collector los vigila 24/7 con multimarca.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-card px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold">Cómo funciona</h2>
        <p className="mt-3 text-muted max-w-xl">
          Tres pasos. Cero configuración local. Pensado para integradores AV,
          técnicos de sala y equipos de operaciones.
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="rounded-xl border border-card bg-card p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 font-bold">
                {s.step}
              </div>
              <h3 className="mt-4 font-semibold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const equipment = [
  "Proyectores",
  "Pantallas LED",
  "Procesadores de vídeo",
  "Matrices AV",
  "Mesas de sonido",
  "Mesas de luces",
  "Amplificadores",
  "Media players",
  "Switches AV",
  "Controladores",
];

export function Equipment() {
  return (
    <section id="equipos" className="border-t border-card px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold">Multiprotocolo, multimarca</h2>
        <p className="mt-3 text-muted max-w-xl">
          Adaptadores para leer el estado real de cualquier fabricante: PJLink,
          SNMP, Extron, NovaStar, TCP y más — en una sola plataforma.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {equipment.map((e) => (
            <span
              key={e}
              className="rounded-full border border-card bg-card px-4 py-2 text-sm"
            >
              {e}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const sectors = [
  {
    title: "Integradores AV",
    desc: "Monitoriza todas tus instalaciones desde un panel. Menos desplazamientos, más SLA cumplido.",
  },
  {
    title: "Venues y auditorios",
    desc: "Proyectores, PA y iluminación bajo control antes de cada evento.",
  },
  {
    title: "Corporativo y retail",
    desc: "Videowalls, señalización digital y salas de reunión siempre operativas.",
  },
  {
    title: "Cultura y exposiciones",
    desc: "Museos, galerías y espacio expositivo con alertas según horario de apertura.",
  },
];

export function UseCases() {
  return (
    <section id="sectores" className="border-t border-card px-6 py-24">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="text-3xl font-bold">Para cualquier instalación AV</h2>
          <p className="mt-4 text-muted leading-relaxed">
            Desde un rack en un hotel hasta una red completa en un recinto
            ferial. Organiza equipos por sede, zona y sala. Alertas
            inteligentes, histórico de métricas y disponibilidad en tiempo real.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Command Center con estado global",
              "Alertas por umbral y equipos críticos",
              "Horas de lámpara, temperatura, uptime",
              "Histórico y dashboards profesionales",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-blue-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {sectors.map((s) => (
              <div
                key={s.title}
                className="rounded-lg border border-card bg-card/50 p-4"
              >
                <Building2 className="h-4 w-4 text-blue-400 mb-2" />
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-card bg-card p-6 font-mono text-sm sticky top-24">
          <div className="text-muted mb-4">Command Center — Instalación demo</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Sala principal</span>
              <span className="text-green-400">12/12 online</span>
            </div>
            <div className="flex justify-between">
              <span>Rack AV planta 1</span>
              <span className="text-green-400">8/8 online</span>
            </div>
            <div className="flex justify-between">
              <span>Videowall recepción</span>
              <span className="text-yellow-400">3/4 online</span>
            </div>
            <div className="flex justify-between">
              <span>Auditorio</span>
              <span className="text-red-400">5/7 online</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--card-border)] text-xs text-muted">
            2 alertas abiertas · 1 collector activo
          </div>
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "Gratis",
      period: "beta",
      desc: "Ideal para probar Observal en una instalación piloto.",
      features: [
        "1 collector incluido",
        "Hasta 25 equipos AV",
        "Alertas por email",
        "7 días de histórico",
      ],
      cta: "Empezar gratis",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "99 €",
      period: "/mes por sede",
      desc: "Para integradores y venues con monitorización continua.",
      features: [
        "Collectors ilimitados",
        "Equipos ilimitados",
        "Informe SLA mensual",
        "Roles de equipo",
        "90 días de histórico",
      ],
      cta: "Contactar ventas",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "A medida",
      period: "",
      desc: "Multi-sede, SLA garantizado y soporte prioritario.",
      features: [
        "Multi-organización",
        "Retención extendida",
        "Onboarding dedicado",
        "SLA contractual",
      ],
      cta: "Hablar con nosotros",
      highlighted: false,
    },
  ];

  return (
    <section id="precios" className="border-t border-card px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold">Precios simples, sin sorpresas</h2>
          <p className="mt-4 text-muted">
            Empieza gratis en beta. Escala cuando despliegues Observal en
            producción para tus clientes AV.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-blue-600 bg-blue-600/10"
                  : "border-card bg-card"
              }`}
            >
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <p className="mt-3">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted ml-1">{plan.period}</span>
                )}
              </p>
              <p className="text-sm text-muted mt-3 leading-relaxed">{plan.desc}</p>
              <ul className="mt-6 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`mt-6 block text-center rounded-lg py-2.5 text-sm font-medium ${
                  plan.highlighted
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "border border-card hover:bg-[#0a0f1a]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-card px-6 py-12">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <span className="font-semibold">Observal</span>
          <span className="text-muted text-sm">· observal.app</span>
        </div>
        <p className="text-sm text-muted">
          Monitorización remota de sistemas AV para integradores e instalaciones
          fijas.
        </p>
      </div>
    </footer>
  );
}
