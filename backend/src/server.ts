import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRepository } from './storage.js';

const app = express();
const repo = createRepository();

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/entity/:id', async (req, res) => {
  const subgraph = await repo.getEntitySubgraph(req.params.id);
  if (subgraph.nodes.length === 0) {
    return res.status(404).json({ message: 'Entidade não encontrada' });
  }
  return res.json(subgraph);
});

app.get('/transactions', async (req, res) => {
  const minValue = req.query.minValue ? Number(req.query.minValue) : undefined;
  const maxValue = req.query.maxValue ? Number(req.query.maxValue) : undefined;
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

  const transactions = await repo.getTransactions({ minValue, maxValue, startDate, endDate });
  return res.json({ total: transactions.length, items: transactions });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Backend executando em http://localhost:${port}`);
});
