import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { GraphData, GraphEdge, GraphNode, GraphResponse } from "../../../shared/types";

const app = express();
app.use(cors());
app.use(express.json());

const graphPath = path.resolve(process.cwd(), "data/graph.json");

const readGraph = (): GraphData => {
  if (!fs.existsSync(graphPath)) {
    throw new Error("Arquivo data/graph.json não encontrado. Rode npm run generate primeiro.");
  }

  const raw = fs.readFileSync(graphPath, "utf-8");
  return JSON.parse(raw) as GraphData;
};

const buildSubgraph = (rootId: string, depth = 1): GraphResponse => {
  const graph = readGraph();
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const edgeMap = new Map<string, GraphEdge>();
  const selectedNodeIds = new Set<string>([rootId]);

  let frontier = new Set<string>([rootId]);
  for (let d = 0; d < depth; d++) {
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

  const nodes: GraphNode[] = Array.from(selectedNodeIds)
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => Boolean(n));

  return { nodes, edges: Array.from(edgeMap.values()) };
};

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "matriz-nodes-api" });
});

app.get("/graph/meta", (_, res) => {
  const graph = readGraph();
  res.json(graph.meta);
});

app.get("/graph/seed", (req, res) => {
  const graph = readGraph();
  const limit = Math.min(Number(req.query.limit ?? 250), 800);
  res.json({
    nodes: graph.nodes.slice(0, limit),
    edges: graph.edges.filter(
      (e) =>
        graph.nodes.slice(0, limit).some((n) => n.id === e.source) &&
        graph.nodes.slice(0, limit).some((n) => n.id === e.target)
    )
  });
});

app.get("/entity/:id", (req, res) => {
  const depth = Math.min(Number(req.query.depth ?? 1), 2);
  const subgraph = buildSubgraph(req.params.id, depth);
  if (!subgraph.nodes.length) {
    return res.status(404).json({ message: "Entidade não encontrada" });
  }
  res.json(subgraph);
});

const txFilterSchema = z.object({
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(500).optional()
});

app.get("/transactions", (req, res) => {
  const parsed = txFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  const { minValue, maxValue, startDate, endDate, limit = 250 } = parsed.data;
  const graph = readGraph();

  const txNodes = graph.nodes.filter((n) => {
    if (n.type !== "Transacao") return false;
    const value = Number(n.properties.valor ?? 0);
    const date = new Date(String(n.properties.data ?? new Date().toISOString()));

    if (minValue !== undefined && value < minValue) return false;
    if (maxValue !== undefined && value > maxValue) return false;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  });

  const selectedTxIds = new Set(txNodes.slice(0, limit).map((tx) => tx.id));
  const selectedNodeIds = new Set<string>(selectedTxIds);
  const selectedEdges = graph.edges.filter((e) => {
    const hit = selectedTxIds.has(e.source) || selectedTxIds.has(e.target);
    if (hit) {
      selectedNodeIds.add(e.source);
      selectedNodeIds.add(e.target);
    }
    return hit;
  });

  res.json({
    nodes: graph.nodes.filter((n) => selectedNodeIds.has(n.id)),
    edges: selectedEdges
  });
});

app.get("/search", (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase().trim();
  if (!q) {
    return res.json({ nodes: [] });
  }

  const graph = readGraph();
  const results = graph.nodes
    .filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
    .slice(0, 20)
    .map((n) => ({ id: n.id, label: `${n.name} (${n.type})` }));

  res.json({ nodes: results });
});

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
