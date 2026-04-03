import { fakerPT_BR as faker } from '@faker-js/faker';
import fs from 'node:fs/promises';
import path from 'node:path';
import neo4j from 'neo4j-driver';
import { GraphData, GraphEdge, GraphNode } from '@matriz/shared';

const COUNTS = {
  Pessoa: 1000,
  Empresa: 500,
  Conta: 500,
  Transacao: 2000,
  Produto: 500,
  Fatura: 300,
  Projeto: 150,
  Documento: 50,
} as const;

const byType = new Map<string, GraphNode[]>();
const nodes: GraphNode[] = [];
const edges: GraphEdge[] = [];

const pushNode = (node: GraphNode) => {
  nodes.push(node);
  const bucket = byType.get(node.type) ?? [];
  bucket.push(node);
  byType.set(node.type, bucket);
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

const addEdge = (source: string, target: string, type: GraphEdge['type'], properties: GraphEdge['properties'] = {}) => {
  edges.push({
    id: `${type}-${edges.length + 1}`,
    source,
    target,
    type,
    properties,
  });
};

for (let i = 0; i < COUNTS.Pessoa; i += 1) {
  pushNode({
    id: `P-${i + 1}`,
    type: 'Pessoa',
    label: faker.person.fullName(),
    properties: {
      papel: faker.helpers.arrayElement(['cliente', 'colaborador', 'fornecedor']),
      documento: `***${faker.string.numeric(3)}`,
      email: faker.internet.email().toLowerCase(),
    },
  });
}

for (let i = 0; i < COUNTS.Empresa; i += 1) {
  pushNode({
    id: `E-${i + 1}`,
    type: 'Empresa',
    label: faker.company.name(),
    properties: {
      segmento: faker.company.buzzPhrase(),
      pais: faker.location.countryCode('alpha-2'),
    },
  });
}

for (let i = 0; i < COUNTS.Conta; i += 1) {
  pushNode({
    id: `C-${i + 1}`,
    type: 'Conta',
    label: `Conta ${i + 1}`,
    properties: {
      instituicao: faker.company.name(),
      tipo: faker.helpers.arrayElement(['corrente', 'poupança', 'digital']),
      moeda: faker.helpers.arrayElement(['BRL', 'USD', 'EUR']),
    },
  });
}

for (let i = 0; i < COUNTS.Transacao; i += 1) {
  pushNode({
    id: `T-${i + 1}`,
    type: 'Transacao',
    label: `Transação ${i + 1}`,
    properties: {
      valor: Number(faker.finance.amount({ min: 100, max: 200000, dec: 2 })),
      data: faker.date.recent({ days: 300 }).toISOString(),
      moeda: faker.helpers.arrayElement(['BRL', 'USD', 'EUR']),
    },
  });
}

for (let i = 0; i < COUNTS.Produto; i += 1) {
  pushNode({
    id: `PR-${i + 1}`,
    type: 'Produto',
    label: faker.commerce.productName(),
    properties: {
      categoria: faker.commerce.department(),
      preco: Number(faker.commerce.price({ min: 10, max: 10000, dec: 2 })),
    },
  });
}

for (let i = 0; i < COUNTS.Fatura; i += 1) {
  const emissao = faker.date.recent({ days: 360 });
  const venc = faker.date.soon({ days: 90, refDate: emissao });
  pushNode({
    id: `F-${i + 1}`,
    type: 'Fatura',
    label: `Fatura ${i + 1}`,
    properties: {
      valor: Number(faker.finance.amount({ min: 500, max: 300000, dec: 2 })),
      dataEmissao: emissao.toISOString(),
      dataVencimento: venc.toISOString(),
      status: faker.helpers.arrayElement(['aberta', 'paga', 'atrasada']),
    },
  });
}

for (let i = 0; i < COUNTS.Projeto; i += 1) {
  pushNode({
    id: `PJ-${i + 1}`,
    type: 'Projeto',
    label: `${faker.commerce.productAdjective()} ${faker.company.buzzNoun()}`,
    properties: {
      departamento: faker.commerce.department(),
      responsavel: faker.person.fullName(),
    },
  });
}

for (let i = 0; i < COUNTS.Documento; i += 1) {
  pushNode({
    id: `D-${i + 1}`,
    type: 'Documento',
    label: faker.system.commonFileName('pdf'),
    properties: {
      tipo: faker.helpers.arrayElement(['contrato', 'relatório', 'nota_fiscal']),
      versao: faker.system.semver(),
    },
  });
}

const pessoas = byType.get('Pessoa') ?? [];
const empresas = byType.get('Empresa') ?? [];
const contas = byType.get('Conta') ?? [];
const transacoes = byType.get('Transacao') ?? [];
const produtos = byType.get('Produto') ?? [];
const faturas = byType.get('Fatura') ?? [];
const projetos = byType.get('Projeto') ?? [];
const documentos = byType.get('Documento') ?? [];

for (const pessoa of pessoas) {
  addEdge(pessoa.id, pick(empresas).id, 'EMPLOYED_IN', { papel: pessoa.properties.papel ?? 'colaborador' });
  addEdge(pessoa.id, pick(contas).id, 'OWNS_ACCOUNT');

  const txCount = faker.number.int({ min: 2, max: 5 });
  for (let i = 0; i < txCount; i += 1) {
    const tx = pick(transacoes);
    addEdge(pessoa.id, tx.id, 'PAYS', { valor: tx.properties.valor ?? 0, data: tx.properties.data ?? null });
    addEdge(pick(empresas).id, tx.id, 'RECEIVES', { canal: faker.helpers.arrayElement(['pix', 'boleto', 'cartao']) });
    addEdge(tx.id, pick(produtos).id, 'CONTAINS_ITEM', { quantidade: faker.number.int({ min: 1, max: 8 }) });
  }

  if (Math.random() > 0.6) {
    addEdge(pessoa.id, pick(projetos).id, 'WORKS_ON', { alocacao: faker.number.int({ min: 10, max: 100 }) });
  }
}

for (const empresa of empresas) {
  const productsCount = faker.number.int({ min: 1, max: 5 });
  for (let i = 0; i < productsCount; i += 1) {
    addEdge(empresa.id, pick(produtos).id, 'SUPPLIES');
  }

  const invoiceCount = faker.number.int({ min: 10, max: 20 });
  for (let i = 0; i < invoiceCount; i += 1) {
    addEdge(pick(faturas).id, empresa.id, 'ISSUED_FOR');
  }

  if (Math.random() > 0.5) {
    addEdge(empresa.id, pick(documentos).id, 'HAS_DOCUMENT');
  }
}

for (const projeto of projetos) {
  if (Math.random() > 0.3) {
    addEdge(projeto.id, pick(documentos).id, 'HAS_DOCUMENT');
  }
}

const graph: GraphData = { nodes, edges };

const outputPath = path.resolve(process.cwd(), 'data/graph.json');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(graph, null, 2), 'utf-8');

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (uri && username && password) {
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();

  try {
    await session.run('MATCH (n) DETACH DELETE n');
    for (const node of nodes) {
      await session.run(`CREATE (n:${node.type} {id: $id, label: $label, properties: $properties})`, {
        id: node.id,
        label: node.label,
        properties: node.properties,
      });
    }

    for (const edge of edges) {
      await session.run(
        `MATCH (a {id: $source}), (b {id: $target}) CREATE (a)-[r:${edge.type} $properties]->(b)`,
        {
          source: edge.source,
          target: edge.target,
          properties: edge.properties,
        },
      );
    }

    console.log(`✅ Graph salvo em Neo4j e JSON com ${nodes.length} nós.`);
  } catch (error) {
    console.error('⚠️ Falha ao persistir no Neo4j. JSON local foi salvo.', error);
  } finally {
    await session.close();
    await driver.close();
  }
} else {
  console.log(`✅ Graph JSON gerado com ${nodes.length} nós e ${edges.length} arestas em ${outputPath}`);
}
