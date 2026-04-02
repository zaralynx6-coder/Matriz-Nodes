import GraphExplorer from "../../components/GraphExplorer";

export default function GraphPage() {
  return <GraphExplorer />;
import { GraphView } from '../../components/GraphView';

export default function GraphPage() {
  return (
    <main>
      <h1>Grafo Empresarial</h1>
      <p>Clique em um nó para expandir conexões.</p>
      <GraphView />
    </main>
  );
}
