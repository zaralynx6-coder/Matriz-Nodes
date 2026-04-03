'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { expandEntityGraph, getMockGraph, getSeedGraph, MockEdge, MockNode } from '@/lib/mockGraph';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

type GraphState = { nodes: MockNode[]; edges: MockEdge[] };
type RenderNode = MockNode & { color: string; degree: number; val: number; x?: number; y?: number; z?: number };
type RenderLink = MockEdge;

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
  const fgRef = useRef<any>(null);
  const fullGraph = useMemo(() => getMockGraph(), []);
  const [entityId, setEntityId] = useState('pessoa_3381');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [status, setStatus] = useState('Gerando mock local...');
  const [graph, setGraph] = useState<GraphState>(() => getSeedGraph(420));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const resolveEntityId = (raw: string): string | null => {
    const value = raw.trim().toLowerCase();
    if (!value) return null;

    if (fullGraph.nodes.some((node) => node.id === value)) return value;

    if (/^\d+$/.test(value)) {
      const numeric = Number(value);
      const byIndex = fullGraph.nodes[numeric - 1];
      if (byIndex) return byIndex.id;

      const bySuffix = fullGraph.nodes.find((node) => node.id.endsWith(`_${numeric}`));
      if (bySuffix) return bySuffix.id;
    }

    return null;
  };

  const renderGraph = useMemo(() => {
    const visibleNodes = graph.nodes.filter(
      (n) => (filterType === 'ALL' || n.type === filterType) && n.label.toLowerCase().includes(search.toLowerCase()),
    );
    const visibleIds = new Set(visibleNodes.map((node) => node.id));
    const visibleEdges = graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));

    const degreeMap = new Map<string, number>();
    for (const edge of visibleEdges) {
      degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
      degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
    }

    const nodes: RenderNode[] = visibleNodes.map((node) => {
      const degree = degreeMap.get(node.id) ?? 0;
      return {
        ...node,
        degree,
        color: colorByType[node.type] ?? '#64748b',
        val: Math.max(1.8, Math.min(10, 2 + degree * 0.5)),
      };
    });

    return { nodes, links: visibleEdges };
  }, [filterType, graph.edges, graph.nodes, search]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const node of renderGraph.nodes) map.set(node.id, new Set());
    for (const edge of renderGraph.links) {
      map.get(edge.source)?.add(edge.target);
      map.get(edge.target)?.add(edge.source);
    }
    return map;
  }, [renderGraph.links, renderGraph.nodes]);

  const selectedNode = useMemo(
    () => renderGraph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [renderGraph.nodes, selectedNodeId],
  );

  const activeNodeId = hoveredNodeId ?? selectedNodeId;
  const activeNeighbors = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    return new Set(adjacency.get(activeNodeId) ?? []);
  }, [activeNodeId, adjacency]);

  const related = useMemo(() => {
    if (!selectedNode) return [];
    return renderGraph.links
      .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .map((edge) => {
        const relatedId = edge.source === selectedNode.id ? edge.target : edge.source;
        const relatedNode = renderGraph.nodes.find((node) => node.id === relatedId);
        return { edge, relatedNode };
      })
      .filter((item): item is { edge: RenderLink; relatedNode: RenderNode } => Boolean(item.relatedNode))
      .slice(0, 30);
  }, [renderGraph.links, renderGraph.nodes, selectedNode]);

  useEffect(() => {
    setStatus(
      `Mock local 3D ativo (sem API): ${fullGraph.nodes.length.toLocaleString('pt-BR')} nós / ${fullGraph.edges.length.toLocaleString('pt-BR')} arestas`,
    );
  }, [fullGraph.edges.length, fullGraph.nodes.length]);

  const mergePayload = (payload: GraphState, actionLabel: string) => {
    if (!payload.nodes.length) {
      setStatus(`${actionLabel}: sem conexões encontradas para este nó.`);
      return;
    }

    setGraph((prev) => ({
      nodes: [...prev.nodes, ...payload.nodes.filter((n) => !prev.nodes.some((p) => p.id === n.id))],
      edges: [...prev.edges, ...payload.edges.filter((e) => !prev.edges.some((p) => p.id === e.id))],
    }));

    setStatus(`${actionLabel}: +${payload.nodes.length} nós e +${payload.edges.length} arestas.`);
  };

  const focusNode = (nodeId: string) => {
    const node = renderGraph.nodes.find((item) => item.id === nodeId);
    if (!node || !fgRef.current) return;

    const distance = 180;
    const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    fgRef.current.cameraPosition(
      { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
      node,
      900,
    );
  };

  const loadEntity = () => {
    if (!entityId.trim()) {
      setStatus('Informe um ID (ex.: pessoa_3381) para expandir.');
      return;
    }

    const resolvedId = resolveEntityId(entityId);
    if (!resolvedId) {
      setStatus(`ID ${entityId} não encontrado. Exemplos válidos: pessoa_3381, empresa_1, 3381.`);
      return;
    }

    const payload = expandEntityGraph(resolvedId, 2, 1100);
    mergePayload(payload, `Expansão ${resolvedId}`);
    setSelectedNodeId(resolvedId);
    requestAnimationFrame(() => focusNode(resolvedId));
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="h-[70vh] overflow-hidden rounded border border-slate-700 bg-slate-950">
          <ForceGraph3D
            ref={fgRef}
            graphData={renderGraph}
            nodeLabel={(node: object) => {
              const typed = node as RenderNode;
              return `${typed.label} (${typed.type})\nID: ${typed.id}\nGrau: ${typed.degree}`;
            }}
            linkLabel={(link: object) => (link as RenderLink).type}
            nodeColor={(node: object) => {
              const typed = node as RenderNode;
              if (!activeNodeId) return typed.color;
              if (typed.id === activeNodeId) return '#f8fafc';
              if (activeNeighbors.has(typed.id)) return typed.color;
              return '#334155';
            }}
            nodeVal={(node: object) => {
              const typed = node as RenderNode;
              if (typed.id === selectedNodeId) return typed.val + 2;
              return typed.val;
            }}
            linkColor={(link: object) => {
              const typed = link as RenderLink;
              if (!activeNodeId) return '#475569';
              if (typed.source === activeNodeId || typed.target === activeNodeId) return '#38bdf8';
              return '#1e293b';
            }}
            linkWidth={(link: object) => ((link as RenderLink).source === selectedNodeId || (link as RenderLink).target === selectedNodeId ? 2.4 : 0.35)}
            linkDirectionalParticles={(link: object) => {
              const typed = link as RenderLink;
              return typed.source === selectedNodeId || typed.target === selectedNodeId ? 2 : 0;
            }}
            linkDirectionalParticleSpeed={() => 0.004}
            onNodeClick={(node: object) => {
              const typed = node as RenderNode;
              setSelectedNodeId(typed.id);
              setEntityId(typed.id);
              mergePayload(expandEntityGraph(typed.id, 1, 760), `Expandido ${typed.id}`);
              focusNode(typed.id);
            }}
            onNodeHover={(node?: object) => setHoveredNodeId((node as RenderNode | undefined)?.id ?? null)}
            backgroundColor="#020617"
            enableNodeDrag
            cooldownTicks={120}
            d3VelocityDecay={0.4}
          />
        </div>

        <aside className="h-[70vh] overflow-y-auto rounded border border-slate-700 bg-slate-900 p-3 text-xs">
          <h2 className="mb-2 text-sm font-semibold">Inspeção do nó</h2>
          {!selectedNode ? (
            <p className="text-slate-300">Clique em um nó no grafo 3D para ver propriedades, relações e link de redirecionamento.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-base font-semibold text-white">{selectedNode.label}</p>
                <p className="text-slate-300">{selectedNode.id}</p>
                <p className="text-slate-300">Classe: {selectedNode.type}</p>
                <p className="text-slate-300">Conexões visíveis: {selectedNode.degree}</p>
                {typeof selectedNode.properties.redirectUrl === 'string' ? (
                  <a className="text-sky-400 underline" href={selectedNode.properties.redirectUrl} target="_blank" rel="noreferrer">
                    Abrir redirecionamento
                  </a>
                ) : null}
              </div>

              <div>
                <h3 className="mb-1 font-medium">Dados</h3>
                <pre className="overflow-x-auto rounded bg-slate-950 p-2 text-[11px]">{JSON.stringify(selectedNode.properties, null, 2)}</pre>
              </div>

              <div>
                <h3 className="mb-1 font-medium">Relacionamentos ({related.length})</h3>
                <ul className="space-y-1">
                  {related.map(({ edge, relatedNode }) => (
                    <li key={edge.id} className="rounded bg-slate-800 p-2">
                      <button
                        className="text-left text-sky-300 hover:underline"
                        onClick={() => {
                          setSelectedNodeId(relatedNode.id);
                          setEntityId(relatedNode.id);
                          focusNode(relatedNode.id);
                        }}
                      >
                        [{edge.type}] {relatedNode.label} ({relatedNode.type})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <button className="rounded bg-sky-700 px-2 py-1 text-[11px] hover:bg-sky-600" onClick={() => focusNode(selectedNode.id)}>
                  Focar câmera
                </button>
                <button
                  className="rounded bg-slate-700 px-2 py-1 text-[11px] hover:bg-slate-600"
                  onClick={() => {
                    setGraph(getSeedGraph(420));
                    setSelectedNodeId(null);
                    setHoveredNodeId(null);
                    setStatus('Visualização reiniciada com seed local.');
                  }}
                >
                  Resetar visão
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
