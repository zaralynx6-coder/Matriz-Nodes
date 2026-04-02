# Matriz Nodes

Base de projeto com frontend + backend para exploração de grafos com ontologia mínima, geração sintética de dados e persistência em Neo4j com fallback em arquivos locais.

## Estrutura

- `frontend/`: Next.js + TypeScript + Tailwind + Cytoscape.js
- `backend/`: Node.js + Express + TypeScript
- `scripts/`: geração de dados sintéticos
- `data/`: saída JSON/CSV gerada pelo script

## Ontologia mínima

### Tipos de nós
`Pessoa`, `Empresa`, `Conta`, `Transacao`, `Produto`, `Fatura`, `Projeto`, `Documento`

### Tipos de arestas
`EMPLOYED_IN`, `OWNS_ACCOUNT`, `PAYS`, `RECEIVES`, `SUPPLIES`, `CONTAINS_ITEM`, `ISSUED_FOR`, `WORKS_ON`, `HAS_DOCUMENT`

## 1) Instalação

```bash
npm install
```

## 2) Como iniciar o Neo4j (opcional, preferencial)

Exemplo com Docker:

```bash
docker run --name neo4j-matriz \
  -p7474:7474 -p7687:7687 \
  -e NEO4J_AUTH=neo4j/password123 \
  -d neo4j:5
```

Variáveis necessárias para persistir no banco:

```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=password123
```

> Se não configurar Neo4j, o sistema usa fallback em `data/graph.json`, `data/nodes.csv` e `data/edges.csv`.

## 3) Gerar dados sintéticos (>= 5.000 nós)

```bash
npm run generate
```

- Script: `scripts/generateGraph.ts`
- Usa `faker`
- Anonimiza identificadores sensíveis via hash SHA-256 (ex.: documento, email, conta)
- Gera milhares de nós e arestas e tenta persistir no Neo4j quando configurado

## 4) Subir backend

```bash
npm run dev:backend
```

Backend por padrão em `http://localhost:4000`.

### Endpoints mínimos

- `GET /entity/:id`: retorna subgrafo de 1º grau (nó + vizinhos imediatos)
- `GET /transactions?minValue=100&maxValue=5000&startDate=2026-01-01&endDate=2026-03-31`

## 5) Subir frontend

```bash
npm run dev:frontend
```

Frontend em `http://localhost:3000/graph`.

Variável opcional para API:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Página `/graph`

- Layout force-directed com `cose` (Cytoscape.js)
- Filtros por classe
- Busca por label
- Legenda por classe
- Expansão por clique no nó (busca 1º grau no backend)
- Destaque visual (tooltip simples via payload serializado)

## Limites de carregamento e performance

- Recomenda-se carregar por entidade e expandir incrementalmente por clique.
- Evitar renderizar dezenas de milhares de elementos simultaneamente no frontend.
- Para grandes volumes, aplicar paginação de transações e limitação de profundidade no backend.
- No Neo4j, preferir índices em `id` e filtros temporais para reduzir custo de consulta.
