import fs from 'node:fs';
import path from 'node:path';
import { GraphData, GraphEdge, GraphNode, NodeType } from '@matriz/shared';

const counts = {
  Pessoa: 1000,
  Empresa: 500,
  Conta: 500,
  Transacao: 2000,
  Produto: 500,
  Fatura: 300,
  Projeto: 150,
  Documento: 50,
} as const satisfies Record<NodeType, number>;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function picks<T>(arr: T[], count: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) out.push(pick(arr));
  return out;
}

const departments = ['Financeiro', 'Operações', 'TI', 'RH', 'Comercial'];
const segments = ['Varejo', 'Indústria', 'Tecnologia', 'Serviços', 'Saúde'];
const names = ['Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Hugo', 'Iara', 'João'];
const surnames = ['Silva', 'Souza', 'Oliveira', 'Costa', 'Lima', 'Pereira', 'Rocha'];

const nodes: GraphNode[] = [];
const edges: GraphEdge[] = [];

const byType: Record<NodeType, GraphNode[]> = {
  Pessoa: [], Empresa: [], Conta: [], Transacao: [], Produto: [], Fatura: [], Projeto: [], Documento: [],
};

function addNode(type: NodeType, index: number, label: string, properties: GraphNode['properties']) {
  const node: GraphNode = { id: `${type.toLowerCase()}_${index}`, type, label, properties };
  nodes.push(node);
  byType[type].push(node);
}

for (let i = 0; i < counts.Pessoa; i++) {
  const fullName = `${pick(names)} ${pick(surnames)}`;
  addNode('Pessoa', i, fullName, {
    documentoAnon: `***${String(randInt(100, 999))}`,
    papel: pick(['cliente', 'colaborador']),
    email: `${fullName.toLowerCase().replace(' ', '.')}@empresa.com`,
  });
}
for (let i = 0; i < counts.Empresa; i++) addNode('Empresa', i, `Empresa ${i}`, { segmento: pick(segments), pais: 'BR' });
for (let i = 0; i < counts.Conta; i++) addNode('Conta', i, `Conta ${i}`, { instituicao: `Banco ${randInt(1, 25)}`, tipo: pick(['corrente', 'digital']), moeda: 'BRL' });
for (let i = 0; i < counts.Transacao; i++) addNode('Transacao', i, `TX-${randInt(100000, 999999)}`, { valor: randInt(100, 250000), data: `2025-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`, moeda: 'BRL' });
for (let i = 0; i < counts.Produto; i++) addNode('Produto', i, `Produto ${i}`, { categoria: pick(departments), preco: randInt(20, 5000) });
for (let i = 0; i < counts.Fatura; i++) addNode('Fatura', i, `FAT-${i}`, { valor: randInt(1000, 150000), dataEmissao: `2025-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`, dataVencimento: `2026-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`, status: pick(['aberta', 'paga', 'atrasada']) });
for (let i = 0; i < counts.Projeto; i++) addNode('Projeto', i, `Projeto ${i}`, { departamento: pick(departments) });
for (let i = 0; i < counts.Documento; i++) addNode('Documento', i, `DOC-${i}.pdf`, { tipo: pick(['contrato', 'nota_fiscal', 'relatorio']) });

let edgeCount = 0;
const addEdge = (type: GraphEdge['type'], source: GraphNode, target: GraphNode, properties: GraphEdge['properties'] = {}) => {
  edges.push({ id: `edge_${edgeCount++}`, type, source: source.id, target: target.id, properties });
};

byType.Pessoa.forEach((pessoa) => {
  const empresa = pick(byType.Empresa);
  addEdge('EMPLOYED_IN', pessoa, empresa, { papel: String(pessoa.properties.papel) });

  const conta = pick(byType.Conta);
  addEdge('OWNS_ACCOUNT', pessoa, conta);

  picks(byType.Transacao, randInt(2, 5)).forEach((tx) => {
    addEdge('PAYS', pessoa, tx);
    addEdge('RECEIVES', empresa, tx);

    const produto = pick(byType.Produto);
    addEdge('CONTAINS_ITEM', tx, produto, { qtd: randInt(1, 10) });
  });

  addEdge('WORKS_ON', pessoa, pick(byType.Projeto));
});

byType.Empresa.forEach((empresa) => {
  picks(byType.Produto, randInt(1, 8)).forEach((produto) => {
    addEdge('SUPPLIES', empresa, produto);
  });

  picks(byType.Fatura, randInt(1, 4)).forEach((fatura) => {
    addEdge('ISSUED_FOR', fatura, empresa);
  });

  if (Math.random() > 0.5) addEdge('HAS_DOCUMENT', empresa, pick(byType.Documento));
});

byType.Projeto.forEach((projeto) => {
  if (Math.random() > 0.5) addEdge('HAS_DOCUMENT', projeto, pick(byType.Documento));
});

const graph: GraphData = { nodes, edges };
const outDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(graph, null, 2));

console.log(`Graph generated with ${nodes.length} nodes and ${edges.length} edges`);
