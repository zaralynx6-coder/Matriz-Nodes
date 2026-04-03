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
const pickMany = <T,>(arr: T[], count: number): T[] => {
  const pool = [...arr];
  const selected: T[] = [];
  const safeCount = Math.max(0, Math.min(count, arr.length));

  for (let i = 0; i < safeCount; i += 1) {
    const idx = Math.floor(rng() * pool.length);
    selected.push(pool[idx]!);
    pool.splice(idx, 1);
  }

  return selected;
};

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

  for (let i = 0; i < COUNTS.Empresa; i += 1) {
    addNode('Empresa', `Empresa ${i + 1}`, {
      setor: `Setor ${(i % 12) + 1}`,
      resumo: `Empresa de demonstração ${i + 1}`,
      redirectUrl: `/entidade/empresa/${i + 1}`,
    });
  }

  for (let i = 0; i < COUNTS.Produto; i += 1) {
    addNode('Produto', `Produto ${i + 1}`, {
      categoria: `Categoria ${(i % 16) + 1}`,
      risco: i % 10 === 0 ? 'alto' : 'normal',
      redirectUrl: `/entidade/produto/${i + 1}`,
    });
  }

  for (let i = 0; i < COUNTS.Projeto; i += 1) {
    addNode('Projeto', `Projeto ${i + 1}`, {
      status: i % 3 === 0 ? 'ativo' : 'planejado',
      redirectUrl: `/entidade/projeto/${i + 1}`,
    });
  }

  for (let i = 0; i < COUNTS.Documento; i += 1) {
    addNode('Documento', `DOC-${1000 + i}`, {
      tipo: i % 2 === 0 ? 'contrato' : 'relatorio',
      redirectUrl: `/documentos/${1000 + i}`,
    });
  }

  for (let i = 0; i < COUNTS.Conta; i += 1) {
    addNode('Conta', `Conta ${i + 1}`, {
      banco: `Banco ${(i % 30) + 1}`,
      redirectUrl: `/entidade/conta/${i + 1}`,
    });
  }

  for (let i = 0; i < COUNTS.Fatura; i += 1) {
    addNode('Fatura', `Fatura ${i + 1}`, {
      status: i % 4 === 0 ? 'paga' : 'aberta',
      redirectUrl: `/entidade/fatura/${i + 1}`,
    });
  }

  for (let i = 0; i < COUNTS.Pessoa; i += 1) {
    addNode('Pessoa', `Pessoa ${i + 1}`, {
      cidade: `Cidade ${(i % 50) + 1}`,
      score: Math.round(rng() * 100),
      redirectUrl: `/entidade/pessoa/${i + 1}`,
    });
  }

  for (let i = 0; i < COUNTS.Transacao; i += 1) {
    addNode('Transacao', `TX-${100000 + i}`, {
      valor: Math.floor(rng() * 250000) + 100,
      moeda: 'BRL',
      redirectUrl: `/entidade/transacao/${100000 + i}`,
    });
  }

  const isolatedNodes = new Set(
    pickMany(byType.Documento, 25)
      .concat(pickMany(byType.Projeto, 25))
      .concat(pickMany(byType.Produto, 20))
      .map((node) => node.id),
  );

  for (const p of byType.Pessoa) {
    addEdge('EMPLOYED_IN', p, pick(byType.Empresa));

    const account = pick(byType.Conta);
    addEdge('OWNS_ACCOUNT', p, account);

    const project = pick(byType.Projeto);
    if (!isolatedNodes.has(project.id)) addEdge('WORKS_ON', p, project);

    const doc = pick(byType.Documento);
    if (rng() > 0.55 && !isolatedNodes.has(doc.id)) addEdge('HAS_DOCUMENT', p, doc);

    const txCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < txCount; i += 1) {
      const tx = pick(byType.Transacao);
      addEdge('PAYS', account, tx);

      const product = pick(byType.Produto);
      if (!isolatedNodes.has(product.id)) addEdge('CONTAINS_ITEM', tx, product);
    }
  }

  for (const e of byType.Empresa) {
    const p1 = pick(byType.Produto);
    const p2 = pick(byType.Produto);

    if (!isolatedNodes.has(p1.id)) addEdge('SUPPLIES', e, p1);
    if (!isolatedNodes.has(p2.id)) addEdge('SUPPLIES', e, p2);

    addEdge('ISSUED_FOR', pick(byType.Fatura), e);

    const doc = pick(byType.Documento);
    if (rng() > 0.5 && !isolatedNodes.has(doc.id)) addEdge('HAS_DOCUMENT', e, doc);
  }

  const filteredEdges = edges.filter((edge) => !isolatedNodes.has(edge.source) && !isolatedNodes.has(edge.target));

  return { nodes, edges: filteredEdges };
};

let cached: MockGraph | null = null;

export const getMockGraph = (): MockGraph => {
  if (!cached) cached = buildGraph();
  return cached;
};

export const getSeedGraph = (limit = 350): MockGraph => {
  const graph = getMockGraph();
  const root = graph.nodes.find((node) => node.type === 'Pessoa')?.id ?? graph.nodes[0]?.id;
  if (!root) return { nodes: [], edges: [] };
  return expandEntityGraph(root, 2, Math.max(80, limit));
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
