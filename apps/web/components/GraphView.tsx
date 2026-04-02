'use client';

import { GraphData, NodeType } from '@matriz/shared';
import cytoscape from 'cytoscape';
import { useEffect, useMemo, useRef, useState } from 'react';

const COLORS: Record<NodeType, string> = {
  Pessoa: '#52b4ff',
  Empresa: '#ffa657',
  Conta: '#a371f7',
  Transacao: '#3fb950',
  Produto: '#f778ba',
  Fatura: '#ffd33d',
  Projeto: '#58a6ff',
  Documento: '#8b949e',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function GraphView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [query, setQuery] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState('Carregando...');

  const availableTypes = useMemo(() => Object.keys(COLORS), []);

  const fetchGraph = async (): Promise<GraphData> => {
    const params = new URLSearchParams();
    if (minValue) params.set('minValue', minValue);
    if (maxValue) params.set('maxValue', maxValue);
    params.set('limit', '350');
    const res = await fetch(`${API_URL}/transactions?${params.toString()}`);
    return res.json() as Promise<GraphData>;
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const graph = await fetchGraph();
      if (cancelled || !containerRef.current) return;

      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const elements = [
        ...graph.nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            ...node.properties,
          },
        })),
        ...graph.edges.map((edge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
          },
        })),
      ];

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'font-size': 10,
              width: 14,
              height: 14,
              'background-color': (ele) => COLORS[ele.data('type') as NodeType] ?? '#999',
              color: '#ffffff',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1,
              opacity: 0.5,
              'line-color': '#6e7681',
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: false,
        },
      });

      cy.on('tap', 'node', async (event) => {
        const id = event.target.id();
        const resp = await fetch(`${API_URL}/entity/${id}?depth=1&limit=200`);
        const subgraph = (await resp.json()) as GraphData;
        cy.add([
          ...subgraph.nodes
            .filter((n) => cy.$id(n.id).empty())
            .map((n) => ({ data: { id: n.id, label: n.label, type: n.type, ...n.properties } })),
          ...subgraph.edges
            .filter((e) => cy.$id(e.id).empty())
            .map((e) => ({ data: { id: e.id, source: e.source, target: e.target, type: e.type } })),
        ]);
        cy.layout({ name: 'cose', animate: false }).run();
      });

      cyRef.current = cy;
      setStatus(`Nós: ${graph.nodes.length} | Arestas: ${graph.edges.length}`);
    };

    init().catch((error) => {
      setStatus(`Erro ao carregar grafo: ${String(error)}`);
    });

    return () => {
      cancelled = true;
    };
  }, [minValue, maxValue]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node) => {
      const type = node.data('type') as string;
      const label = String(node.data('label') ?? '').toLowerCase();
      const byQuery = !query || label.includes(query.toLowerCase()) || node.id().toLowerCase().includes(query.toLowerCase());
      const byType = selectedTypes.size === 0 || selectedTypes.has(type);
      node.style('display', byQuery && byType ? 'element' : 'none');
    });
  }, [query, selectedTypes]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12, height: '95vh' }}>
      <aside style={{ background: '#0f1726', padding: 12, borderRadius: 10 }}>
        <h3>Filtros</h3>
        <p>{status}</p>

        <label>Buscar por nome/id</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ex: pessoa_10" />

        <label>Valor mínimo transação</label>
        <input value={minValue} onChange={(e) => setMinValue(e.target.value)} type="number" />

        <label>Valor máximo transação</label>
        <input value={maxValue} onChange={(e) => setMaxValue(e.target.value)} type="number" />

        <h4>Tipos</h4>
        {availableTypes.map((type) => (
          <label key={type} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={selectedTypes.has(type)}
              onChange={(e) => {
                const copy = new Set(selectedTypes);
                if (e.target.checked) copy.add(type);
                else copy.delete(type);
                setSelectedTypes(copy);
              }}
            />{' '}
            {type}
          </label>
        ))}
      </aside>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#081020', borderRadius: 10 }} />
    </div>
  );
}
