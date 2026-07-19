import Link from "next/link";
import { Monitor, Radio, Shield, Zap } from "lucide-react";

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
          <a href="#museos" className="hover:text-white transition-colors">
            Museos
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
          Monitorización AV multiprotocolo para museos
        </div>
        <h1 className="max-w-3xl text-4xl md:text-6xl font-bold leading-tight tracking-tight">
          Tu museo abierto al público.{" "}
          <span className="text-blue-400">Tu AV bajo control</span> en remoto.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted leading-relaxed">
          Observal monitoriza proyectores, pantallas LED, mesas de sonido,
          iluminación y procesadores de vídeo desde un único panel. Enchufa la
          Pi, activa con un código y olvídate de acceder al hardware.
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
    title: "Enchufa la Pi",
    desc: "Conecta el Observal Collector a la red AV del museo por Ethernet.",
  },
  {
    step: "2",
    title: "Activa con un código",
    desc: "Introduce el código de la etiqueta en observal.app. Sin SSH, sin terminal.",
  },
  {
    step: "3",
    title: "Monitoriza todo",
    desc: "Añade equipos AV desde la web. La Pi los vigila 24/7.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-card px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold">Cómo funciona</h2>
        <p className="mt-3 text-muted max-w-xl">
          Tres pasos. Cero configuración local. Diseñado para técnicos de museo
          e integradores AV.
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
];

export function Equipment() {
  return (
    <section id="equipos" className="border-t border-card px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold">Multiprotocolo, multimarca</h2>
        <p className="mt-3 text-muted max-w-xl">
          Sistema de adaptadores para leer el estado de cualquier fabricante:
          PJLink, SNMP, Extron, NovaStar y más.
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

export function MuseumCase() {
  return (
    <section id="museos" className="border-t border-card px-6 py-24">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold">Diseñado para museos</h2>
          <p className="mt-4 text-muted leading-relaxed">
            Organiza equipos por edificio, galería y sala. Alertas contextuales
            según horario de apertura. Sabrás si un proyector falla antes de que
            entre el primer visitante.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Vista por salas y exposiciones",
              "Alertas antes de la apertura",
              "Horas de lámpara y temperatura",
              "Histórico de disponibilidad AV",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-blue-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-card bg-card p-6 font-mono text-sm">
          <div className="text-muted mb-4">Command Center — Museo demo</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Galería Permanente</span>
              <span className="text-green-400">8/8 online</span>
            </div>
            <div className="flex justify-between">
              <span>Exposición &quot;Luz&quot;</span>
              <span className="text-yellow-400">11/12 online</span>
            </div>
            <div className="flex justify-between">
              <span>Auditorio</span>
              <span className="text-red-400">4/6 online</span>
            </div>
          </div>
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
          Monitorización AV remota para museos y venues culturales.
        </p>
      </div>
    </footer>
  );
}
