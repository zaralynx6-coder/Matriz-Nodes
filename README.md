# Codex Data Nexus - PoC

PoC de grafo visual empresarial com +5.000 nós usando Next.js, Express, Cytoscape e geração sintética.

## Requisitos

- Node.js 20+
- npm 10+
- (Opcional) Neo4j local

## Instalação

```bash
npm install
```

## Gerar dados sintéticos

```bash
npm run generate
```

Esse comando gera `data/graph.json` com pelo menos 5.000 nós.

## Executar ambiente completo

```bash
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000

## Endpoints principais

- `GET /health`
- `GET /stats`
- `GET /entity/:id?depth=1&limit=200`
- `GET /transactions?minValue=&maxValue=&startDate=&endDate=&limit=`
- `GET /search?q=&types=Pessoa,Empresa`

## Neo4j (opcional)

A PoC usa JSON por padrão. Para produção, o mesmo esquema pode ser persistido em Neo4j e consultado via Cypher.

## Segurança e governança

- IDs sintéticos e dados anonimizados
- Sem uso de dados reais
- Limite de carga por consulta para preservar performance
