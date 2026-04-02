import fs from 'node:fs';
import path from 'node:path';
import { GraphData } from '@matriz/shared';

const DATA_PATH = path.resolve(process.cwd(), '../../data/graph.json');

export function loadGraphData(): GraphData {
  if (!fs.existsSync(DATA_PATH)) {
    return { nodes: [], edges: [] };
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw) as GraphData;
}

export function getNeighbors(id: string, depth = 1, limit = 200): GraphData {
  const graph = loadGraphData();
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));

  if (!nodeMap.has(id)) {
    return { nodes: [], edges: [] };
  }

  const visited = new Set<string>([id]);
  const frontier = new Set<string>([id]);
  const selectedEdges = new Set<string>();

  for (let i = 0; i < depth; i += 1) {
    const next = new Set<string>();

    for (const edge of graph.edges) {
      if (frontier.has(edge.source) || frontier.has(edge.target)) {
        selectedEdges.add(edge.id);
        visited.add(edge.source);
        visited.add(edge.target);
        next.add(edge.source);
        next.add(edge.target);
      }
      if (visited.size >= limit) {
        break;
      }
    }

    frontier.clear();
    for (const item of next) frontier.add(item);

    if (visited.size >= limit) {
      break;
    }
  }

  return {
    nodes: [...visited].slice(0, limit).map((nodeId) => nodeMap.get(nodeId)!).filter(Boolean),
    edges: graph.edges.filter((edge) => selectedEdges.has(edge.id)).slice(0, limit * 3),
  };
}
