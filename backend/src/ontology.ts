export const NODE_TYPES = [
  'Pessoa',
  'Empresa',
  'Conta',
  'Transacao',
  'Produto',
  'Fatura',
  'Projeto',
  'Documento'
] as const;

export const EDGE_TYPES = [
  'EMPLOYED_IN',
  'OWNS_ACCOUNT',
  'PAYS',
  'RECEIVES',
  'SUPPLIES',
  'CONTAINS_ITEM',
  'ISSUED_FOR',
  'WORKS_ON',
  'HAS_DOCUMENT'
] as const;

export type NodeType = (typeof NODE_TYPES)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  type: EdgeType;
  source: string;
  target: string;
  properties: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
