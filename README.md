# Matriz Nodes — Codex Data Nexus (PoC)

Prova de conceito para visualização de grafo empresarial com **5.000+ nós** usando **Next.js + TypeScript** (frontend), **Node.js/Express** (API) e geração de dados sintéticos com **Faker**.

## Stack

- Frontend: Next.js, React, Tailwind, Cytoscape.js
- Backend: Express, TypeScript
- Dados: JSON local (`data/graph.json`) e opcionalmente Neo4j

## Estrutura

```txt
apps/
  api/
  web/
scripts/
  generateGraph.ts
shared/
  types.ts
data/
  graph.json (gerado)
```

## Pré-requisitos

- Node.js 20+
- npm 10+
- (Opcional) Neo4j local

## Instalação

```bash
npm install
```

## Geração de dados sintéticos

```bash
npm run generate
```

Isso cria `data/graph.json` com no mínimo 5.000 nós e arestas relacionais.

### Persistência opcional em Neo4j

Defina as variáveis de ambiente antes de rodar o gerador:

```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=senha
npm run generate
```

## Executando em desenvolvimento

```bash
npm run dev
```

Serviços:

- API: `http://localhost:4000`
- Frontend: `http://localhost:3000`
- Visualização: `http://localhost:3000/graph`

## Endpoints da API

- `GET /health`
- `GET /graph/meta`
- `GET /graph/seed?limit=350`
- `GET /entity/:id?depth=1`
- `GET /transactions?minValue=&maxValue=&startDate=&endDate=&limit=`
- `GET /search?q=`

## Requisitos atendidos

- [x] Ontologia com 8 tipos de nós e 9 tipos de arestas
- [x] Script para gerar grafo com 5.000+ nós
- [x] Renderização interativa com zoom/pan
- [x] Filtros por tipo e valor
- [x] Busca por nome/ID
- [x] Expansão de conexões via clique
- [x] Dados sintéticos e anonimização de documento

## Observações de performance e governança

- Carregamento inicial parcial (`/graph/seed`) para reduzir custo no navegador.
- Expansão sob demanda por entidade (`/entity/:id`).
- Filtro transacional via API para limitar subgrafo.
- Documentos e identificadores sensíveis são mascarados/sintéticos.
