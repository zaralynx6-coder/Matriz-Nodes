export type NodeType =
  | 'Pessoa'
  | 'Empresa'
  | 'Conta'
  | 'Transacao'
  | 'Produto'
  | 'Fatura'
  | 'Projeto'
  | 'Documento';

export type EdgeType =
  | 'EMPLOYED_IN'
  | 'OWNS_ACCOUNT'
  | 'PAYS'
  | 'RECEIVES'
  | 'SUPPLIES'
  | 'CONTAINS_ITEM'
  | 'ISSUED_FOR'
  | 'WORKS_ON'
  | 'HAS_DOCUMENT';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  properties: Record<string, string | number | boolean | null>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
