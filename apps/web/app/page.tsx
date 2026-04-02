import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold">Codex Data Nexus</h1>
      <p className="text-slate-300">
        Prova de conceito para exploração visual de grafo empresarial com +5.000 nós.
      </p>
      <Link href="/graph" className="rounded bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400">
        Abrir visualização
      </Link>
import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Codex Data Nexus</h1>
      <p>PoC de Grafo Visual para Big Data empresarial.</p>
      <Link href="/graph">Abrir visualização</Link>
    </main>
  );
}
