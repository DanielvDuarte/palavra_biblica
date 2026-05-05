require("dotenv").config();
const express = require("express");
const cors = require("cors");
const https = require("https");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado para: ${origin}`));
  },
}));
app.use(express.json());

// ─── Anthropic client ─────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Lista de referências bíblicas para sorteio ───────────────────────────────
// bible-api.com aceita referências no formato "book+chapter:verse" em inglês
const REFERENCIAS = [
  "john 3:16","john 14:6","john 15:13","john 1:1","john 11:35",
  "romans 8:28","romans 8:38-39","romans 5:8","romans 3:23","romans 6:23",
  "psalms 23:1","psalms 27:1","psalms 46:1","psalms 91:1","psalms 119:105",
  "psalms 121:1-2","psalms 34:8","psalms 16:8","psalms 37:4","psalms 103:1-2",
  "proverbs 3:5-6","proverbs 16:3","proverbs 31:25","proverbs 18:10","proverbs 4:23",
  "isaiah 40:31","isaiah 41:10","isaiah 43:2","isaiah 26:3","isaiah 53:5",
  "jeremiah 29:11","jeremiah 33:3",
  "philippians 4:13","philippians 4:6-7","philippians 4:19","philippians 1:6",
  "matthew 6:33","matthew 11:28","matthew 28:20","matthew 5:16","matthew 22:37-39",
  "luke 1:37","luke 6:31","luke 15:7",
  "genesis 1:1","genesis 1:27",
  "deuteronomy 31:6","deuteronomy 6:5",
  "joshua 1:9","joshua 24:15",
  "1 corinthians 13:4-7","1 corinthians 10:13","1 corinthians 15:57",
  "2 corinthians 5:17","2 corinthians 12:9",
  "galatians 5:22-23","galatians 2:20",
  "ephesians 2:8-9","ephesians 6:10-11",
  "hebrews 11:1","hebrews 4:12","hebrews 12:1-2",
  "james 1:2-3","james 1:17",
  "1 john 4:8","1 john 1:9","1 john 4:19",
  "revelation 21:4","revelation 3:20",
  "micah 6:8","habakkuk 3:19","zephaniah 3:17",
  "lamentations 3:22-23","numbers 6:24-26",
];

// ─── Helper: fetch simples via https nativo ───────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON inválido da bible-api")); }
      });
    }).on("error", reject);
  });
}

// ─── Helper: Claude só para o estudo ─────────────────────────────────────────
async function gerarEstudo(versiculo, referencia) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: `Você é um estudioso bíblico. Retorne APENAS JSON válido, sem markdown.
Campo "estudo": parágrafo curto (4 a 6 linhas) com contexto histórico, significado teológico e aplicação prática.
Escrita clara, edificante e acessível.`,
    messages: [{ role: "user", content: `Faça um pequeno estudo bíblico sobre: "${versiculo}" — ${referencia}` }],
  });
  const raw = msg.content.find((b) => b.type === "text")?.text ?? "";
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  if (!parsed.estudo) throw new Error("Campo 'estudo' ausente");
  return parsed.estudo;
}

// ─── Tradução de nomes de livros inglês → português ───────────────────────────
const LIVROS_PT = {
  "Genesis":"Gênesis","Exodus":"Êxodo","Leviticus":"Levítico","Numbers":"Números",
  "Deuteronomy":"Deuteronômio","Joshua":"Josué","Judges":"Juízes","Ruth":"Rute",
  "1 Samuel":"1 Samuel","2 Samuel":"2 Samuel","1 Kings":"1 Reis","2 Kings":"2 Reis",
  "1 Chronicles":"1 Crônicas","2 Chronicles":"2 Crônicas","Ezra":"Esdras","Nehemiah":"Neemias",
  "Esther":"Ester","Job":"Jó","Psalms":"Salmos","Proverbs":"Provérbios",
  "Ecclesiastes":"Eclesiastes","Song of Solomon":"Cânticos","Isaiah":"Isaías",
  "Jeremiah":"Jeremias","Lamentations":"Lamentações","Ezekiel":"Ezequiel","Daniel":"Daniel",
  "Hosea":"Oséias","Joel":"Joel","Amos":"Amós","Obadiah":"Obadias","Jonah":"Jonas",
  "Micah":"Miquéias","Nahum":"Naum","Habakkuk":"Habacuque","Zephaniah":"Sofonias",
  "Haggai":"Ageu","Zechariah":"Zacarias","Malachi":"Malaquias",
  "Matthew":"Mateus","Mark":"Marcos","Luke":"Lucas","John":"João","Acts":"Atos",
  "Romans":"Romanos","1 Corinthians":"1 Coríntios","2 Corinthians":"2 Coríntios",
  "Galatians":"Gálatas","Ephesians":"Efésios","Philippians":"Filipenses",
  "Colossians":"Colossenses","1 Thessalonians":"1 Tessalonicenses",
  "2 Thessalonians":"2 Tessalonicenses","1 Timothy":"1 Timóteo","2 Timothy":"2 Timóteo",
  "Titus":"Tito","Philemon":"Filemom","Hebrews":"Hebreus","James":"Tiago",
  "1 Peter":"1 Pedro","2 Peter":"2 Pedro","1 John":"1 João","2 John":"2 João",
  "3 John":"3 João","Jude":"Judas","Revelation":"Apocalipse",
};

function traduzirReferencia(ref) {
  for (const [en, pt] of Object.entries(LIVROS_PT)) {
    if (ref.startsWith(en)) return ref.replace(en, pt);
  }
  return ref;
}

// ─── ROUTE: versículo + estudo (híbrido) ──────────────────────────────────────
app.get("/api/versiculo", async (req, res) => {
  try {
    // 1. Sorteia referência e busca na bible-api.com (gratuito, sem chave)
    const refEn = REFERENCIAS[Math.floor(Math.random() * REFERENCIAS.length)];
    const url = `https://bible-api.com/${encodeURIComponent(refEn)}?translation=almeida`;
    const bibleData = await fetchJson(url);

    if (!bibleData.text) throw new Error("Versículo não encontrado na bible-api");

    const versiculo = bibleData.text.replace(/\n/g, " ").trim();
    const referencia = traduzirReferencia(bibleData.reference);

    // 2. Claude gera apenas o estudo (~metade do custo anterior)
    const estudo = await gerarEstudo(versiculo, referencia);

    res.json({ versiculo, referencia, estudo });

  } catch (err) {
    console.error("Erro /api/versiculo:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok" }));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  API híbrida rodando em http://localhost:${PORT}`);
  console.log(`   Versículos: bible-api.com (gratuito)`);
  console.log(`   Estudo:     Claude claude-sonnet-4-6 (~$0.01/req)`);
});