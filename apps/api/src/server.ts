import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { getNeighbors, loadGraphData } from './storage.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.get('/stats', (_req, res) => {
  const graph = loadGraphData();
  const byType = graph.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.type] = (acc[node.type] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    byType,
  });
});

app.get('/entity/:id', (req, res) => {
  const schema = z.object({
    id: z.string(),
    depth: z.coerce.number().min(1).max(3).default(1),
    limit: z.coerce.number().min(10).max(2000).default(200),
  });

  const parsed = schema.safeParse({
    id: req.params.id,
    depth: req.query.depth,
    limit: req.query.limit,
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const graph = getNeighbors(parsed.data.id, parsed.data.depth, parsed.data.limit);
  return res.json(graph);
});

app.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').toLowerCase();
  const typeSet = new Set(String(req.query.types ?? '').split(',').filter(Boolean));
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  const graph = loadGraphData();
  const nodes = graph.nodes
    .filter((node) => {
      const matchesQuery = !q || node.label.toLowerCase().includes(q) || node.id.toLowerCase().includes(q);
      const matchesType = typeSet.size === 0 || typeSet.has(node.type);
      return matchesQuery && matchesType;
    })
    .slice(0, limit);

  return res.json({ nodes });
});

app.get('/transactions', (req, res) => {
  const schema = z.object({
    minValue: z.coerce.number().optional(),
    maxValue: z.coerce.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.coerce.number().min(10).max(2000).default(300),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const graph = loadGraphData();
  const txNodes = graph.nodes.filter((node) => {
    if (node.type !== 'Transacao') return false;

    const value = Number(node.properties.valor ?? 0);
    const date = String(node.properties.data ?? '');

    if (parsed.data.minValue != null && value < parsed.data.minValue) return false;
    if (parsed.data.maxValue != null && value > parsed.data.maxValue) return false;
    if (parsed.data.startDate && date < parsed.data.startDate) return false;
    if (parsed.data.endDate && date > parsed.data.endDate) return false;
    return true;
  }).slice(0, parsed.data.limit);

  const txIds = new Set(txNodes.map((n) => n.id));
  const edges = graph.edges.filter((e) => txIds.has(e.source) || txIds.has(e.target));
  const nodeIds = new Set<string>(txNodes.map((n) => n.id));
  edges.forEach((e) => {
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  });

  return res.json({
    nodes: graph.nodes.filter((n) => nodeIds.has(n.id)),
    edges,
  });
});

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
