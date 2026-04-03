import 'dotenv/config';
import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { GraphData, GraphEdge, GraphNode, GraphResponse } from '@matriz/shared';

const app = express();
app.use(cors());
app.use(express.json());

const graphPath = path.resolve(process.cwd(), 'data/graph.json');

const readGraph = (): GraphData => {
  if (!fs.existsSync(graphPath)) {
    throw new Error('Arquivo data/graph.json não encontrado. Rode npm run generate primeiro.');
  }

  const raw = fs.readFileSync(graphPath, 'utf-8');
  return JSON.parse(raw) as GraphData;
};

const buildSubgraph = (rootId: string, depth = 1): GraphResponse => {
  const graph = readGraph();
  const nodeMap = new Map<string, GraphNode>(graph.nodes.map((node) => [node.id, node]));
  const edgeMap = new Map<string, GraphEdge>();
  const selectedNodeIds = new Set<string>([rootId]);

  let frontier = new Set<string>([rootId]);
  for (let i = 0; i < depth; i += 1) {
    const next = new Set<string>();
    for (const edge of graph.edges) {
      if (frontier.has(edge.source) || frontier.has(edge.target)) {
        edgeMap.set(edge.id, edge);
        selectedNodeIds.add(edge.source);
        selectedNodeIds.add(edge.target);
        next.add(edge.source);
        next.add(edge.target);
      }
    }
    frontier = next;
  }

  const nodes: GraphNode[] = [...selectedNodeIds]
    .map((id) => nodeMap.get(id))
    .filter((node): node is GraphNode => Boolean(node));

  return { nodes, edges: [...edgeMap.values()] };
};

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'matriz-nodes-api' });
});

app.get('/graph/meta', (_req: Request, res: Response) => {
  const graph = readGraph();
  res.json({
    generatedAt: new Date().toISOString(),
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
  });
});

app.get('/graph/seed', (req: Request, res: Response) => {
  const graph = readGraph();
  const limit = Math.min(Number(req.query.limit ?? 250), 800);
  const selectedNodes = graph.nodes.slice(0, limit);
  const selectedIds = new Set(selectedNodes.map((node) => node.id));

  res.json({
    nodes: selectedNodes,
    edges: graph.edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target)),
  });
});

app.get('/entity/:id', (req: Request, res: Response) => {
  const depth = Math.min(Number(req.query.depth ?? 1), 2);
  const subgraph = buildSubgraph(req.params.id, depth);
  if (!subgraph.nodes.length) {
    return res.status(404).json({ message: 'Entidade não encontrada' });
  }

  return res.json(subgraph);
});

const txFilterSchema = z.object({
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
});

app.get('/transactions', (req: Request, res: Response) => {
  const parsed = txFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  const { minValue, maxValue, startDate, endDate, limit = 250 } = parsed.data;
  const graph = readGraph();

  const txNodes = graph.nodes.filter((node) => {
    if (node.type !== 'Transacao') return false;
    const value = Number(node.properties.valor ?? 0);
    const date = new Date(String(node.properties.data ?? new Date().toISOString()));

    if (minValue !== undefined && value < minValue) return false;
    if (maxValue !== undefined && value > maxValue) return false;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  });

  const selectedTxIds = new Set(txNodes.slice(0, limit).map((tx) => tx.id));
  const selectedNodeIds = new Set<string>(selectedTxIds);

  const selectedEdges = graph.edges.filter((edge) => {
    const hit = selectedTxIds.has(edge.source) || selectedTxIds.has(edge.target);
    if (hit) {
      selectedNodeIds.add(edge.source);
      selectedNodeIds.add(edge.target);
    }
    return hit;
  });

  return res.json({
    nodes: graph.nodes.filter((node) => selectedNodeIds.has(node.id)),
    edges: selectedEdges,
  });
});

app.get('/search', (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').toLowerCase().trim();
  if (!q) {
    return res.json({ nodes: [] });
  }

  const graph = readGraph();
  const results = graph.nodes
    .filter((node) => node.label.toLowerCase().includes(q) || node.id.toLowerCase().includes(q))
    .slice(0, 20)
    .map((node) => ({ id: node.id, label: `${node.label} (${node.type})` }));

  return res.json({ nodes: results });
});

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
