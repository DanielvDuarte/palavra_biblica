require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────────────────────
// Em produção, troque pela URL do seu GitHub Pages
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // ex: https://danielvduarte.github.io
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // permite requisições sem origin (ex: curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS bloqueado para: ${origin}`));
    },
  })
);

app.use(express.json());

// ─── Anthropic client ────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helper ──────────────────────────────────────────────────────────────────
async function askClaude(system, user) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    system,
    messages: [{ role: "user", content: user }],
  });
  return msg.content.find((b) => b.type === "text")?.text ?? "";
}

// ─── ROUTE: versículo + estudo ────────────────────────────────────────────────
app.get("/api/versiculo", async (req, res) => {
  try {
    // 1. Versículo aleatório
    const raw1 = await askClaude(
      `Retorne APENAS JSON válido, sem markdown. 
Campos: "versiculo" (texto completo em português, tradução NVI ou ARA) e "referencia" (ex: "João 3:16").`,
      "Me dê um versículo bíblico aleatório, variando entre todos os livros da Bíblia."
    );

    const versiculoData = JSON.parse(raw1.replace(/```json|```/g, "").trim());
    if (!versiculoData.versiculo || !versiculoData.referencia) {
      throw new Error("Campos ausentes no versículo");
    }

    // 2. Estudo bíblico
    const raw2 = await askClaude(
      `Você é um estudioso bíblico. Retorne APENAS JSON válido, sem markdown.
Campo "estudo": parágrafo curto (4 a 6 linhas) com contexto histórico, significado teológico e aplicação prática. 
Escrita clara, edificante e acessível.`,
      `Faça um pequeno estudo bíblico sobre: "${versiculoData.versiculo}" — ${versiculoData.referencia}`
    );

    const studyData = JSON.parse(raw2.replace(/```json|```/g, "").trim());
    if (!studyData.estudo) throw new Error("Campo 'estudo' ausente");

    res.json({
      versiculo: versiculoData.versiculo,
      referencia: versiculoData.referencia,
      estudo: studyData.estudo,
    });
  } catch (err) {
    console.error("Erro /api/versiculo:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok" }));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  API rodando em http://localhost:${PORT}`);
});
