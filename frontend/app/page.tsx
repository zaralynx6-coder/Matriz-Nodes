import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Matriz Nodes</h1>
      <p className="mt-3 text-slate-300">Visualização de grafo e análise de transações.</p>
      <Link href="/graph" className="mt-4 inline-block rounded bg-sky-600 px-4 py-2">
        Ir para /graph
      </Link>
    </main>
  );
}
