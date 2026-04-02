export type MockNodeType =
  | 'Pessoa'
  | 'Empresa'
  | 'Conta'
  | 'Transacao'
  | 'Produto'
  | 'Fatura'
  | 'Projeto'
  | 'Documento';

export type MockNode = {
  id: string;
  type: MockNodeType;
  label: string;
  properties: Record<string, unknown>;
};

export type MockEdge = {
  id: string;
  type: string;
  source: string;
  target: string;
};

export type MockGraph = {
  nodes: MockNode[];
  edges: MockEdge[];
};

const COUNTS: Record<MockNodeType, number> = {
  Pessoa: 1800,
  Empresa: 500,
  Conta: 900,
  Transacao: 1300,
  Produto: 450,
  Fatura: 250,
  Projeto: 180,
  Documento: 120,
};

const rng = (() => {
  let seed = 42;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
})();

const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

const buildGraph = (): MockGraph => {
  const nodes: MockNode[] = [];
  const edges: MockEdge[] = [];
  const byType: Record<MockNodeType, MockNode[]> = {
    Pessoa: [],
    Empresa: [],
    Conta: [],
    Transacao: [],
    Produto: [],
    Fatura: [],
    Projeto: [],
    Documento: [],
  };

  let nodeId = 1;
  let edgeId = 1;

  const addNode = (type: MockNodeType, label: string, properties: Record<string, unknown>) => {
    const node: MockNode = { id: `${type.toLowerCase()}_${nodeId++}`, type, label, properties };
    nodes.push(node);
    byType[type].push(node);
  };

  const addEdge = (type: string, source: MockNode, target: MockNode) => {
    edges.push({ id: `e_${edgeId++}`, type, source: source.id, target: target.id });
  };

  for (let i = 0; i < COUNTS.Empresa; i += 1) addNode('Empresa', `Empresa ${i + 1}`, { setor: `Setor ${(i % 12) + 1}` });
  for (let i = 0; i < COUNTS.Produto; i += 1) addNode('Produto', `Produto ${i + 1}`, { categoria: `Categoria ${(i % 16) + 1}` });
  for (let i = 0; i < COUNTS.Projeto; i += 1) addNode('Projeto', `Projeto ${i + 1}`, { status: i % 3 === 0 ? 'ativo' : 'planejado' });
  for (let i = 0; i < COUNTS.Documento; i += 1) addNode('Documento', `DOC-${1000 + i}`, { tipo: i % 2 === 0 ? 'contrato' : 'relatorio' });
  for (let i = 0; i < COUNTS.Conta; i += 1) addNode('Conta', `Conta ${i + 1}`, { banco: `Banco ${(i % 30) + 1}` });
  for (let i = 0; i < COUNTS.Fatura; i += 1) addNode('Fatura', `Fatura ${i + 1}`, { status: i % 4 === 0 ? 'paga' : 'aberta' });

  for (let i = 0; i < COUNTS.Pessoa; i += 1) {
    addNode('Pessoa', `Pessoa ${i + 1}`, { cidade: `Cidade ${(i % 50) + 1}`, score: Math.round(rng() * 100) });
  }

  for (let i = 0; i < COUNTS.Transacao; i += 1) {
    addNode('Transacao', `TX-${100000 + i}`, { valor: Math.floor(rng() * 250000) + 100, moeda: 'BRL' });
  }

  for (const p of byType.Pessoa) {
    addEdge('EMPLOYED_IN', p, pick(byType.Empresa));
    const account = pick(byType.Conta);
    addEdge('OWNS_ACCOUNT', p, account);
    addEdge('WORKS_ON', p, pick(byType.Projeto));
    if (rng() > 0.55) addEdge('HAS_DOCUMENT', p, pick(byType.Documento));

    const txCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < txCount; i += 1) {
      const tx = pick(byType.Transacao);
      addEdge('PAYS', account, tx);
      addEdge('CONTAINS_ITEM', tx, pick(byType.Produto));
    }
  }

  for (const e of byType.Empresa) {
    addEdge('SUPPLIES', e, pick(byType.Produto));
    addEdge('SUPPLIES', e, pick(byType.Produto));
    addEdge('ISSUED_FOR', pick(byType.Fatura), e);
    if (rng() > 0.5) addEdge('HAS_DOCUMENT', e, pick(byType.Documento));
  }

  return { nodes, edges };
};

let cached: MockGraph | null = null;

export const getMockGraph = (): MockGraph => {
  if (!cached) cached = buildGraph();
  return cached;
};

export const getSeedGraph = (limit = 350): MockGraph => {
  const graph = getMockGraph();
  const nodes = graph.nodes.slice(0, Math.max(1, limit));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  return { nodes, edges };
};

export const expandEntityGraph = (rootId: string, depth = 1, limit = 500): MockGraph => {
  const graph = getMockGraph();
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  if (!nodeMap.has(rootId)) return { nodes: [], edges: [] };

  const selected = new Set<string>([rootId]);
  const selectedEdges = new Set<string>();
  let frontier = new Set<string>([rootId]);

  for (let d = 0; d < depth; d += 1) {
    const next = new Set<string>();
    for (const edge of graph.edges) {
      if (frontier.has(edge.source) || frontier.has(edge.target)) {
        selectedEdges.add(edge.id);
        selected.add(edge.source);
        selected.add(edge.target);
        next.add(edge.source);
        next.add(edge.target);
      }
      if (selected.size >= limit) break;
    }
    frontier = next;
    if (selected.size >= limit) break;
  }

  return {
    nodes: [...selected].map((id) => nodeMap.get(id)).filter((node): node is MockNode => Boolean(node)),
    edges: graph.edges.filter((edge) => selectedEdges.has(edge.id)),
  };
};
