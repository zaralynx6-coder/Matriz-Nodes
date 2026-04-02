import { fakerPT_BR as faker } from "@faker-js/faker";
import fs from "node:fs/promises";
import path from "node:path";
import neo4j from "neo4j-driver";
import { GraphData, GraphEdge, GraphNode } from "../shared/types";

const COUNTS = {
  Pessoa: 1000,
  Empresa: 500,
  Conta: 500,
  Transacao: 2000,
  Produto: 500,
  Fatura: 300,
  Projeto: 150,
  Documento: 50
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

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

const addEdge = (source: string, target: string, type: GraphEdge["type"], properties: GraphEdge["properties"] = {}) => {
  edges.push({
    id: `${type}-${edges.length + 1}`,
    source,
    target,
    type,
    properties
  });
};

for (let i = 0; i < COUNTS.Pessoa; i++) {
  pushNode({
    id: `P-${i + 1}`,
    type: "Pessoa",
    name: faker.person.fullName(),
    properties: {
      papel: faker.helpers.arrayElement(["cliente", "colaborador", "fornecedor"]),
      documento: `***${faker.string.numeric(3)}`,
      email: faker.internet.email().toLowerCase()
    }
  });
}

for (let i = 0; i < COUNTS.Empresa; i++) {
  pushNode({
    id: `E-${i + 1}`,
    type: "Empresa",
    name: faker.company.name(),
    properties: {
      segmento: faker.company.buzzPhrase(),
      pais: faker.location.countryCode("alpha-2")
    }
  });
}

for (let i = 0; i < COUNTS.Conta; i++) {
  pushNode({
    id: `C-${i + 1}`,
    type: "Conta",
    name: `Conta ${i + 1}`,
    properties: {
      instituicao: faker.company.name(),
      tipo: faker.helpers.arrayElement(["corrente", "poupança", "digital"]),
      moeda: faker.helpers.arrayElement(["BRL", "USD", "EUR"])
    }
  });
}

for (let i = 0; i < COUNTS.Transacao; i++) {
  pushNode({
    id: `T-${i + 1}`,
    type: "Transacao",
    name: `Transação ${i + 1}`,
    properties: {
      valor: Number(faker.finance.amount({ min: 100, max: 200000, dec: 2 })),
      data: faker.date.recent({ days: 300 }).toISOString(),
      moeda: faker.helpers.arrayElement(["BRL", "USD", "EUR"])
    }
  });
}

for (let i = 0; i < COUNTS.Produto; i++) {
  pushNode({
    id: `PR-${i + 1}`,
    type: "Produto",
    name: faker.commerce.productName(),
    properties: {
      categoria: faker.commerce.department(),
      preco: Number(faker.commerce.price({ min: 10, max: 10000, dec: 2 }))
    }
  });
}

for (let i = 0; i < COUNTS.Fatura; i++) {
  const emissao = faker.date.recent({ days: 360 });
  const venc = faker.date.soon({ days: 90, refDate: emissao });
  pushNode({
    id: `F-${i + 1}`,
    type: "Fatura",
    name: `Fatura ${i + 1}`,
    properties: {
      valor: Number(faker.finance.amount({ min: 500, max: 300000, dec: 2 })),
      dataEmissao: emissao.toISOString(),
      dataVencimento: venc.toISOString(),
      status: faker.helpers.arrayElement(["aberta", "paga", "atrasada"])
    }
  });
}

for (let i = 0; i < COUNTS.Projeto; i++) {
  pushNode({
    id: `PJ-${i + 1}`,
    type: "Projeto",
    name: faker.commerce.productAdjective() + " " + faker.company.buzzNoun(),
    properties: {
      departamento: faker.commerce.department(),
      responsavel: faker.person.fullName()
    }
  });
}

for (let i = 0; i < COUNTS.Documento; i++) {
  pushNode({
    id: `D-${i + 1}`,
    type: "Documento",
    name: faker.system.commonFileName("pdf"),
    properties: {
      tipo: faker.helpers.arrayElement(["contrato", "relatório", "nota_fiscal"]),
      versao: faker.system.semver()
    }
  });
}

const pessoas = byType.get("Pessoa")!;
const empresas = byType.get("Empresa")!;
const contas = byType.get("Conta")!;
const transacoes = byType.get("Transacao")!;
const produtos = byType.get("Produto")!;
const faturas = byType.get("Fatura")!;
const projetos = byType.get("Projeto")!;
const documentos = byType.get("Documento")!;

for (const p of pessoas) {
  addEdge(p.id, pick(empresas).id, "EMPLOYED_IN", { papel: p.properties.papel ?? "colaborador" });
  addEdge(p.id, pick(contas).id, "OWNS_ACCOUNT");

  const txCount = faker.number.int({ min: 2, max: 5 });
  for (let i = 0; i < txCount; i++) {
    const tx = pick(transacoes);
    addEdge(p.id, tx.id, "PAYS", { valor: tx.properties.valor ?? 0, data: tx.properties.data ?? null });
    addEdge(pick(empresas).id, tx.id, "RECEIVES", { canal: faker.helpers.arrayElement(["pix", "boleto", "cartao"]) });
    addEdge(tx.id, pick(produtos).id, "CONTAINS_ITEM", { quantidade: faker.number.int({ min: 1, max: 8 }) });
  }

  if (Math.random() > 0.6) {
    addEdge(p.id, pick(projetos).id, "WORKS_ON", { alocacao: faker.number.int({ min: 10, max: 100 }) });
  }
}

for (const e of empresas) {
  const productsCount = faker.number.int({ min: 1, max: 5 });
  for (let i = 0; i < productsCount; i++) {
    addEdge(e.id, pick(produtos).id, "SUPPLIES");
  }

  const invoiceCount = faker.number.int({ min: 10, max: 20 });
  for (let i = 0; i < invoiceCount; i++) {
    addEdge(pick(faturas).id, e.id, "ISSUED_FOR");
  }

  if (Math.random() > 0.5) {
    addEdge(e.id, pick(documentos).id, "HAS_DOCUMENT");
  }
}

for (const pj of projetos) {
  if (Math.random() > 0.3) {
    addEdge(pj.id, pick(documentos).id, "HAS_DOCUMENT");
  }
}

const graph: GraphData = {
  nodes,
  edges,
  meta: {
    generatedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length
  }
};

const outputPath = path.resolve(process.cwd(), "data/graph.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(graph, null, 2), "utf-8");

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (uri && username && password) {
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();

  try {
    await session.run("MATCH (n) DETACH DELETE n");
    for (const node of nodes) {
      await session.run(
        `CREATE (n:${node.type} {id: $id, name: $name, properties: $properties})`,
        {
          id: node.id,
          name: node.name,
          properties: node.properties
        }
      );
    }

    for (const edge of edges) {
      await session.run(
        `MATCH (a {id: $source}), (b {id: $target}) CREATE (a)-[r:${edge.type} $properties]->(b)`,
        {
          source: edge.source,
          target: edge.target,
          properties: edge.properties
        }
      );
    }

    console.log(`✅ Graph salvo em Neo4j e JSON com ${nodes.length} nós.`);
  } catch (error) {
    console.error("⚠️ Falha ao persistir no Neo4j. JSON local foi salvo.", error);
  } finally {
    await session.close();
    await driver.close();
  }
} else {
  console.log(`✅ Graph JSON gerado com ${nodes.length} nós e ${edges.length} arestas em ${outputPath}`);
}
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { faker } from '@faker-js/faker';
import neo4j from 'neo4j-driver';

type NodeType =
  | 'Pessoa'
  | 'Empresa'
  | 'Conta'
  | 'Transacao'
  | 'Produto'
  | 'Fatura'
  | 'Projeto'
  | 'Documento';

type EdgeType =
  | 'EMPLOYED_IN'
  | 'OWNS_ACCOUNT'
  | 'PAYS'
  | 'RECEIVES'
  | 'SUPPLIES'
  | 'CONTAINS_ITEM'
  | 'ISSUED_FOR'
  | 'WORKS_ON'
  | 'HAS_DOCUMENT';

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, unknown>;
}

interface GraphEdge {
  id: string;
  type: EdgeType;
  source: string;
  target: string;
  properties: Record<string, unknown>;
}

const hashIdentifier = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);

const createNode = (type: NodeType, label: string, properties: Record<string, unknown>): GraphNode => ({
  id: `${type}_${faker.string.uuid()}`,
  type,
  label,
  properties
});

const createEdge = (
  type: EdgeType,
  source: string,
  target: string,
  properties: Record<string, unknown> = {}
): GraphEdge => ({
  id: `edge_${faker.string.uuid()}`,
  type,
  source,
  target,
  properties
});

const main = async (): Promise<void> => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const companies = Array.from({ length: 150 }, () =>
    createNode('Empresa', faker.company.name(), {
      sector: faker.commerce.department(),
      country: faker.location.country()
    })
  );
  nodes.push(...companies);

  const products = Array.from({ length: 400 }, () =>
    createNode('Produto', faker.commerce.productName(), {
      category: faker.commerce.department(),
      price: Number(faker.commerce.price({ min: 10, max: 5000 }))
    })
  );
  nodes.push(...products);

  const projects = Array.from({ length: 300 }, () =>
    createNode('Projeto', faker.commerce.productAdjective() + ' Initiative', {
      budget: faker.number.int({ min: 20_000, max: 2_000_000 }),
      status: faker.helpers.arrayElement(['planned', 'active', 'on-hold', 'completed'])
    })
  );
  nodes.push(...projects);

  for (let i = 0; i < 1800; i += 1) {
    const person = createNode('Pessoa', faker.person.fullName(), {
      emailHash: hashIdentifier(faker.internet.email()),
      documentHash: hashIdentifier(faker.string.numeric(11)),
      city: faker.location.city()
    });
    nodes.push(person);

    const company = faker.helpers.arrayElement(companies);
    edges.push(createEdge('EMPLOYED_IN', person.id, company.id, { since: faker.date.past().toISOString() }));

    const account = createNode('Conta', `Conta ${faker.finance.accountNumber(6)}`, {
      accountHash: hashIdentifier(faker.finance.accountNumber(12)),
      bank: faker.company.name(),
      openedAt: faker.date.past().toISOString()
    });
    nodes.push(account);
    edges.push(createEdge('OWNS_ACCOUNT', person.id, account.id));

    const document = createNode('Documento', faker.system.fileName(), {
      docType: faker.helpers.arrayElement(['RG', 'CPF', 'Contrato', 'Comprovante']),
      checksum: hashIdentifier(faker.string.alphanumeric(32))
    });
    nodes.push(document);
    edges.push(createEdge('HAS_DOCUMENT', person.id, document.id));

    const project = faker.helpers.arrayElement(projects);
    edges.push(createEdge('WORKS_ON', person.id, project.id, { role: faker.person.jobTitle() }));
  }

  const accounts = nodes.filter((n) => n.type === 'Conta');

  for (let i = 0; i < 1800; i += 1) {
    const transaction = createNode('Transacao', `TX-${faker.string.alphanumeric(10).toUpperCase()}`, {
      amount: faker.number.float({ min: 100, max: 250000, fractionDigits: 2 }),
      timestamp: faker.date.recent({ days: 365 }).toISOString(),
      currency: 'BRL'
    });
    nodes.push(transaction);

    const payer = faker.helpers.arrayElement(accounts);
    const receiver = faker.helpers.arrayElement(accounts);
    edges.push(createEdge('PAYS', payer.id, transaction.id));
    edges.push(createEdge('RECEIVES', transaction.id, receiver.id));
  }

  for (let i = 0; i < 900; i += 1) {
    const invoice = createNode('Fatura', `INV-${faker.string.alphanumeric(8).toUpperCase()}`, {
      dueDate: faker.date.soon({ days: 60 }).toISOString(),
      total: faker.number.float({ min: 200, max: 50000, fractionDigits: 2 })
    });
    nodes.push(invoice);

    const product = faker.helpers.arrayElement(products);
    edges.push(createEdge('CONTAINS_ITEM', invoice.id, product.id, { quantity: faker.number.int({ min: 1, max: 50 }) }));

    const company = faker.helpers.arrayElement(companies);
    edges.push(createEdge('ISSUED_FOR', invoice.id, company.id));
    edges.push(createEdge('SUPPLIES', company.id, product.id));
  }

  const graph = { nodes, edges };

  const dataDir = path.resolve(process.cwd(), '..', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'graph.json'), JSON.stringify(graph));
  await fs.writeFile(
    path.join(dataDir, 'nodes.csv'),
    ['id,type,label', ...nodes.map((n) => `${n.id},${n.type},"${String(n.label).replaceAll('"', '""')}"`)].join('\n')
  );
  await fs.writeFile(
    path.join(dataDir, 'edges.csv'),
    ['id,type,source,target', ...edges.map((e) => `${e.id},${e.type},${e.source},${e.target}`)].join('\n')
  );

  if (process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD) {
    const driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    );
    const session = driver.session();
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      for (const node of nodes) {
        await session.run(`CREATE (n:${node.type}) SET n = $props`, {
          props: { ...node.properties, id: node.id, type: node.type, label: node.label }
        });
      }
      for (const edge of edges) {
        await session.run(
          `MATCH (a {id: $source}), (b {id: $target})
           CREATE (a)-[r:${edge.type} {id: $id}]->(b)
           SET r += $props`,
          {
            source: edge.source,
            target: edge.target,
            id: edge.id,
            props: edge.properties
          }
        );
      }
      console.log('Dados persistidos no Neo4j.');
    } finally {
      await session.close();
      await driver.close();
    }
  } else {
    console.log('Neo4j não configurado. Dados salvos em data/graph.json e CSV.');
  }

  console.log(`Nós: ${nodes.length}, Arestas: ${edges.length}`);
};

main();
