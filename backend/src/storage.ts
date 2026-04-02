import fs from 'node:fs/promises';
import path from 'node:path';
import neo4j from 'neo4j-driver';
import type { GraphData, GraphEdge, GraphNode } from './ontology.js';

const DATA_PATH = process.env.DATA_PATH ?? path.resolve(process.cwd(), '..', 'data', 'graph.json');

interface GraphRepository {
  getEntitySubgraph(id: string): Promise<GraphData>;
  getTransactions(filters: {
    minValue?: number;
    maxValue?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<GraphNode[]>;
}

class JsonGraphRepository implements GraphRepository {
  private cache: GraphData | null = null;

  private async readGraph(): Promise<GraphData> {
    if (!this.cache) {
      const raw = await fs.readFile(DATA_PATH, 'utf8');
      this.cache = JSON.parse(raw) as GraphData;
    }
    return this.cache;
  }

  async getEntitySubgraph(id: string): Promise<GraphData> {
    const graph = await this.readGraph();
    const center = graph.nodes.find((node) => node.id === id);
    if (!center) {
      return { nodes: [], edges: [] };
    }

    const oneHopEdges = graph.edges.filter((edge) => edge.source === id || edge.target === id);
    const nodeIds = new Set<string>([id]);
    oneHopEdges.forEach((edge) => {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    });

    const nodes = graph.nodes.filter((node) => nodeIds.has(node.id));
    return { nodes, edges: oneHopEdges };
  }

  async getTransactions(filters: {
    minValue?: number;
    maxValue?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<GraphNode[]> {
    const graph = await this.readGraph();
    return graph.nodes.filter((node) => {
      if (node.type !== 'Transacao') return false;
      const value = Number(node.properties.amount ?? 0);
      const date = new Date(String(node.properties.timestamp ?? 0));
      if (filters.minValue !== undefined && value < filters.minValue) return false;
      if (filters.maxValue !== undefined && value > filters.maxValue) return false;
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      return true;
    });
  }
}

class Neo4jGraphRepository implements GraphRepository {
  private driver = neo4j.driver(
    process.env.NEO4J_URI as string,
    neo4j.auth.basic(process.env.NEO4J_USER as string, process.env.NEO4J_PASSWORD as string)
  );

  async getEntitySubgraph(id: string): Promise<GraphData> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (n {id: $id})-[r]-(m)
         RETURN n, r, m, startNode(r).id as sourceId, endNode(r).id as targetId`,
        { id }
      );

      const nodesMap = new Map<string, GraphNode>();
      const edges: GraphEdge[] = [];

      for (const record of result.records) {
        const n = record.get('n');
        const m = record.get('m');
        const r = record.get('r');

        [n, m].forEach((raw) => {
          const props = raw.properties as Record<string, unknown>;
          nodesMap.set(String(props.id), {
            id: String(props.id),
            type: String(props.type) as GraphNode['type'],
            label: String(props.label),
            properties: props
          });
        });

        const rProps = r.properties as Record<string, unknown>;
        edges.push({
          id: String(rProps.id),
          type: String(r.type) as GraphEdge['type'],
          source: String(record.get('sourceId')),
          target: String(record.get('targetId')),
          properties: rProps
        });
      }

      return { nodes: [...nodesMap.values()], edges };
    } finally {
      await session.close();
    }
  }

  async getTransactions(filters: {
    minValue?: number;
    maxValue?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (t:Transacao)
         WHERE ($minValue IS NULL OR t.amount >= $minValue)
           AND ($maxValue IS NULL OR t.amount <= $maxValue)
           AND ($startDate IS NULL OR datetime(t.timestamp) >= datetime($startDate))
           AND ($endDate IS NULL OR datetime(t.timestamp) <= datetime($endDate))
         RETURN t`,
        {
          minValue: filters.minValue ?? null,
          maxValue: filters.maxValue ?? null,
          startDate: filters.startDate?.toISOString() ?? null,
          endDate: filters.endDate?.toISOString() ?? null
        }
      );

      return result.records.map((record) => {
        const t = record.get('t');
        const props = t.properties as Record<string, unknown>;
        return {
          id: String(props.id),
          type: 'Transacao',
          label: String(props.label),
          properties: props
        };
      });
    } finally {
      await session.close();
    }
  }
}

export const createRepository = (): GraphRepository => {
  const hasNeo4j = process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD;
  if (hasNeo4j) {
    return new Neo4jGraphRepository();
  }
  return new JsonGraphRepository();
};
