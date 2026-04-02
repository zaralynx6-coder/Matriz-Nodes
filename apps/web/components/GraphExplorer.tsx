"use client";

import cytoscape, { Core } from "cytoscape";
import { useEffect, useMemo, useRef, useState } from "react";

type ApiNode = {
  id: string;
  type: string;
  name: string;
  properties: Record<string, string | number | boolean | null>;
};

type ApiEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, string | number | boolean | null>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const colorByType: Record<string, string> = {
  Pessoa: "#22d3ee",
  Empresa: "#f59e0b",
  Conta: "#8b5cf6",
  Transacao: "#10b981",
  Produto: "#f43f5e",
  Fatura: "#eab308",
  Projeto: "#3b82f6",
  Documento: "#a3e635"
};

export default function GraphExplorer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const [search, setSearch] = useState("");
  const [nodeTypeFilter, setNodeTypeFilter] = useState("all");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [status, setStatus] = useState("Carregando grafo inicial...");

  const style = useMemo(
    () => [
      {
        selector: "node",
        style: {
          label: "data(name)",
          "font-size": 9,
          color: "#e2e8f0",
          "background-color": "data(color)",
          width: 10,
          height: 10
        }
      },
      {
        selector: "edge",
        style: {
          width: 1,
          "line-color": "#475569",
          "curve-style": "bezier",
          opacity: 0.55
        }
      },
      {
        selector: ".highlighted",
        style: {
          "border-width": 3,
          "border-color": "#fff"
        }
      }
    ],
    []
  );

  const upsertElements = (nodes: ApiNode[], edges: ApiEdge[]) => {
    const cy = cyRef.current;
    if (!cy) return;

    const nodeElements = nodes.map((n) => ({
      group: "nodes",
      data: {
        id: n.id,
        name: `${n.name} [${n.type}]`,
        type: n.type,
        raw: n.properties,
        color: colorByType[n.type] ?? "#94a3b8"
      }
    }));

    const edgeElements = edges.map((e) => ({
      group: "edges",
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type,
        raw: e.properties
      }
    }));

    cy.batch(() => {
      cy.add(nodeElements.filter((el) => cy.getElementById(el.data.id).empty()));
      cy.add(edgeElements.filter((el) => cy.getElementById(el.data.id).empty()));
    });

    cy.layout({ name: "cose", animate: true, fit: true, padding: 20 }).run();
    setStatus(`Nós carregados: ${cy.nodes().length} | Arestas: ${cy.edges().length}`);
  };

  const loadSeed = async () => {
    const response = await fetch(`${API_URL}/graph/seed?limit=350`);
    const json = (await response.json()) as { nodes: ApiNode[]; edges: ApiEdge[] };
    upsertElements(json.nodes, json.edges);
  };

  const loadEntity = async (id: string) => {
    const response = await fetch(`${API_URL}/entity/${id}?depth=1`);
    if (!response.ok) return;
    const json = (await response.json()) as { nodes: ApiNode[]; edges: ApiEdge[] };
    upsertElements(json.nodes, json.edges);
  };

  const filterTransactions = async () => {
    const params = new URLSearchParams();
    if (minValue) params.set("minValue", minValue);
    if (maxValue) params.set("maxValue", maxValue);
    params.set("limit", "250");
    const response = await fetch(`${API_URL}/transactions?${params.toString()}`);
    const json = (await response.json()) as { nodes: ApiNode[]; edges: ApiEdge[] };

    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().remove();
    upsertElements(json.nodes, json.edges);
  };

  const searchAndFocus = async () => {
    if (!search.trim()) return;
    const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(search)}`);
    const json = (await response.json()) as { nodes: Array<{ id: string; label: string }> };
    if (!json.nodes.length) {
      setStatus("Nenhum nó encontrado.");
      return;
    }

    const first = json.nodes[0];
    await loadEntity(first.id);
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("highlighted");
    const target = cy.getElementById(first.id);
    target.addClass("highlighted");
    cy.center(target);
    setStatus(`Foco em ${first.label}`);
  };

  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style,
      layout: { name: "cose" },
      wheelSensitivity: 0.15
    });

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const id = node.id();
      void loadEntity(id);
      const raw = node.data("raw") as Record<string, string | number | boolean | null>;
      const rawText = Object.entries(raw)
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      setStatus(`${node.data("name")} :: ${rawText}`);
    });

    cy.on("mouseover", "edge", (evt) => {
      setStatus(`Relação ${evt.target.data("label")}`);
    });

    cyRef.current = cy;
    void loadSeed();

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [style]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((n) => {
      const type = n.data("type") as string;
      const visible = nodeTypeFilter === "all" || type === nodeTypeFilter;
      n.style("display", visible ? "element" : "none");
    });
  }, [nodeTypeFilter]);

  return (
    <div className="grid min-h-screen grid-cols-12 gap-3 p-3">
      <aside className="col-span-12 rounded-lg border border-slate-700 bg-slate-900 p-4 md:col-span-3">
        <h2 className="mb-3 text-lg font-semibold">Filtros</h2>

        <label className="mb-2 block text-sm">Tipo de nó</label>
        <select
          className="mb-4 w-full rounded bg-slate-800 p-2"
          value={nodeTypeFilter}
          onChange={(e) => setNodeTypeFilter(e.target.value)}
        >
          <option value="all">Todos</option>
          {Object.keys(colorByType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label className="text-sm">Faixa de valor (Transações)</label>
        <div className="mb-3 mt-2 grid grid-cols-2 gap-2">
          <input
            className="rounded bg-slate-800 p-2"
            placeholder="Mínimo"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
          />
          <input
            className="rounded bg-slate-800 p-2"
            placeholder="Máximo"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
          />
        </div>
        <button className="mb-4 w-full rounded bg-emerald-500 p-2 font-semibold text-slate-950" onClick={filterTransactions}>
          Aplicar filtro
        </button>

        <label className="text-sm">Busca por nome ou ID</label>
        <div className="mt-2 flex gap-2">
          <input
            className="w-full rounded bg-slate-800 p-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex: P-12"
          />
          <button className="rounded bg-cyan-500 px-3 font-semibold text-slate-950" onClick={searchAndFocus}>
            Buscar
          </button>
        </div>

        <div className="mt-4 rounded bg-slate-800 p-2 text-xs text-slate-300">{status}</div>
      </aside>

      <section className="col-span-12 rounded-lg border border-slate-700 bg-slate-900 md:col-span-9">
        <div ref={containerRef} className="h-[78vh] w-full" />
        <div className="border-t border-slate-700 p-2 text-xs text-slate-300">
          Clique em um nó para expandir conexões e ver detalhes. Zoom e arraste habilitados.
        </div>
      </section>
    </div>
  );
}
