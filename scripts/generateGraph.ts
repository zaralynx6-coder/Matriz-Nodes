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
