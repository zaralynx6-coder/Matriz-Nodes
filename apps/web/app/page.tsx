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
