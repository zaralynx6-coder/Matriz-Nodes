'use client';

import cytoscape from 'cytoscape';
import { useEffect, useMemo, useRef, useState } from 'react';
import { expandEntityGraph, getMockGraph, getSeedGraph, MockEdge, MockNode } from '@/lib/mockGraph';

const colorByType: Record<string, string> = {
  Pessoa: '#60a5fa',
  Empresa: '#f59e0b',
  Conta: '#14b8a6',
  Transacao: '#ef4444',
  Produto: '#a78bfa',
  Fatura: '#22c55e',
  Projeto: '#f97316',
  Documento: '#eab308',
};

export default function GraphViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fullGraph = useMemo(() => getMockGraph(), []);
  const [entityId, setEntityId] = useState('pessoa_3381');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [status, setStatus] = useState('Gerando mock local...');
  const [graph, setGraph] = useState<{ nodes: MockNode[]; edges: MockEdge[] }>(() => getSeedGraph(320));

  const filteredNodes = useMemo(
    () =>
      graph.nodes.filter(
        (n) => (filterType === 'ALL' || n.type === filterType) && n.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [graph.nodes, filterType, search],
  );

  useEffect(() => {
    setStatus(
      `Mock local ativo (sem API): ${fullGraph.nodes.length.toLocaleString('pt-BR')} nós / ${fullGraph.edges.length.toLocaleString('pt-BR')} arestas`,
    );
  }, [fullGraph.edges.length, fullGraph.nodes.length]);

  useEffect(() => {
    if (!containerRef.current) return;

    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    const visibleEdges = graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...filteredNodes.map((n) => ({ data: { id: n.id, label: n.label, type: n.type, tooltip: JSON.stringify(n.properties) } })),
        ...visibleEdges.map((e) => ({ data: { id: e.id, source: e.source, target: e.target, label: e.type } })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': (el) => colorByType[el.data('type')] ?? '#64748b',
            color: '#fff',
            'font-size': 8,
            width: 10,
            height: 10,
          },
        },
        {
          selector: 'edge',
          style: { width: 1.1, label: 'data(label)', color: '#cbd5e1', 'font-size': 7, 'line-color': '#475569' },
        },
      ],
      layout: { name: 'cose', animate: false, fit: true, padding: 18 },
    });

    cy.on('tap', 'node', (evt) => {
      const id = evt.target.id();
      const payload = expandEntityGraph(id, 1, 550);
      if (!payload.nodes.length) return;

      setGraph((prev) => ({
        nodes: [...prev.nodes, ...payload.nodes.filter((n) => !prev.nodes.some((p) => p.id === n.id))],
        edges: [...prev.edges, ...payload.edges.filter((e) => !prev.edges.some((p) => p.id === e.id))],
      }));
      setStatus(`Expandido nó ${id} (+${payload.nodes.length} nós candidatos).`);
    });

    cy.on('mouseover', 'node', (evt) => {
      const target = evt.target;
      target.style('border-width', '3px');
      target.style('border-color', '#fff');
    });
    cy.on('mouseout', 'node', (evt) => evt.target.style('border-width', '0px'));

    return () => cy.destroy();
  }, [filteredNodes, graph.edges]);

  const loadEntity = () => {
    if (!entityId.trim()) {
      setStatus('Informe um ID (ex.: pessoa_3381) para expandir.');
      return;
    }

    const payload = expandEntityGraph(entityId.trim(), 2, 700);
    if (!payload.nodes.length) {
      setStatus(`ID ${entityId} não encontrado no mock local.`);
      return;
    }

    setGraph((prev) => ({
      nodes: [...prev.nodes, ...payload.nodes.filter((n) => !prev.nodes.some((p) => p.id === n.id))],
      edges: [...prev.edges, ...payload.edges.filter((e) => !prev.edges.some((p) => p.id === e.id))],
    }));
    setStatus(`Carregado/expandido ${entityId}: ${payload.nodes.length} nós e ${payload.edges.length} arestas no subgrafo.`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input className="rounded bg-slate-800 p-2" placeholder="ID da entidade" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        <input className="rounded bg-slate-800 p-2" placeholder="Buscar por label" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded bg-slate-800 p-2" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="ALL">Todas classes</option>
          {Object.keys(colorByType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button className="rounded bg-sky-600 p-2" onClick={loadEntity}>
          Carregar / expandir
        </button>
      </div>
      <div className="rounded border border-slate-700 p-3 text-xs">{status}</div>
      <div className="rounded border border-slate-700 p-3 text-xs">
        <strong>Legenda:</strong>{' '}
        {Object.entries(colorByType).map(([type, color]) => (
          <span key={type} className="mr-3 inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
      </div>
      <div ref={containerRef} className="h-[68vh] rounded border border-slate-700 bg-slate-900" />
    </div>
  );
}
