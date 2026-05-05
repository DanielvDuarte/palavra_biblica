require("dotenv").config();
const express = require("express");
const cors = require("cors");
const https = require("https");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON invalido da bible-api")); }
      });
    }).on("error", reject);
  });
}

const LIVROS_PT = {
  "Genesis":"Geneses","Exodus":"Exodo","Leviticus":"Levitico","Numbers":"Numeros",
  "Deuteronomy":"Deuteronomio","Joshua":"Josue","Judges":"Juizes","Ruth":"Rute",
  "1 Samuel":"1 Samuel","2 Samuel":"2 Samuel","1 Kings":"1 Reis","2 Kings":"2 Reis",
  "1 Chronicles":"1 Cronicas","2 Chronicles":"2 Cronicas","Ezra":"Esdras","Nehemiah":"Neemias",
  "Esther":"Ester","Job":"Jo","Psalms":"Salmos","Proverbs":"Proverbios",
  "Ecclesiastes":"Eclesiastes","Song of Solomon":"Canticos","Isaiah":"Isaias",
  "Jeremiah":"Jeremias","Lamentations":"Lamentacoes","Ezekiel":"Ezequiel","Daniel":"Daniel",
  "Hosea":"Oseias","Joel":"Joel","Amos":"Amos","Obadiah":"Obadias","Jonah":"Jonas",
  "Micah":"Miqueias","Nahum":"Naum","Habakkuk":"Habacuque","Zephaniah":"Sofonias",
  "Haggai":"Ageu","Zechariah":"Zacarias","Malachi":"Malaquias",
  "Matthew":"Mateus","Mark":"Marcos","Luke":"Lucas","John":"Joao","Acts":"Atos",
  "Romans":"Romanos","1 Corinthians":"1 Corintios","2 Corinthians":"2 Corintios",
  "Galatians":"Galatas","Ephesians":"Efesios","Philippians":"Filipenses",
  "Colossians":"Colossenses","1 Thessalonians":"1 Tessalonicenses",
  "2 Thessalonians":"2 Tessalonicenses","1 Timothy":"1 Timoteo","2 Timothy":"2 Timoteo",
  "Titus":"Tito","Philemon":"Filemom","Hebrews":"Hebreus","James":"Tiago",
  "1 Peter":"1 Pedro","2 Peter":"2 Pedro","1 John":"1 Joao","2 John":"2 Joao",
  "3 John":"3 Joao","Jude":"Judas","Revelation":"Apocalipse",
};

function traduzirReferencia(ref) {
  for (const [en, pt] of Object.entries(LIVROS_PT)) {
    if (ref.startsWith(en)) return ref.replace(en, pt);
  }
  return ref;
}

// ROTA 1: versiculo gratuito
app.get("/api/versiculo", async (req, res) => {
  try {
    const refEn = REFERENCIAS[Math.floor(Math.random() * REFERENCIAS.length)];
    const url = `https://bible-api.com/${encodeURIComponent(refEn)}?translation=almeida`;
    const bibleData = await fetchJson(url);
    if (!bibleData.text) throw new Error("Versiculo nao encontrado");
    const versiculo = bibleData.text.replace(/\n/g, " ").trim();
    const referencia = traduzirReferencia(bibleData.reference);
    res.json({ versiculo, referencia });
  } catch (err) {
    console.error("Erro /api/versiculo:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ROTA 2: estudo completo via Claude
app.post("/api/estudo", async (req, res) => {
  const { versiculo, referencia } = req.body || {};
  if (!versiculo || !referencia) {
    return res.status(400).json({ error: "Campos versiculo e referencia sao obrigatorios" });
  }
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `Voce e um estudioso biblico experiente. Retorne APENAS JSON valido, sem markdown.
Campo "estudo": um estudo biblico completo e enriquecedor (6 a 10 linhas) contendo:
1. Contexto historico e cultural do livro/autor
2. Significado teologico profundo do versiculo
3. Conexoes com outros textos biblicos
4. Aplicacao pratica para a vida atual
Escrita clara, edificante e acessivel ao leitor comum.`,
      messages: [{ role: "user", content: `Faca um estudo biblico completo sobre: "${versiculo}" - ${referencia}` }],
    });
    const raw = msg.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!parsed.estudo) throw new Error("Campo estudo ausente");
    res.json({ estudo: parsed.estudo });
  } catch (err) {
    console.error("Erro /api/estudo:", err.message);
    const semCredito = err.message?.includes("credit balance") || err.message?.includes("invalid_request_error");
    if (semCredito) {
      return res.status(402).json({
        error: "sem_creditos",
        message: "Creditos da IA esgotados. O estudo biblico nao pode ser gerado no momento."
      });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
  console.log(`  Versiculos: bible-api.com (gratuito)`);
  console.log(`  Estudo:     Claude claude-sonnet-4-6 (~$0.01/req)`);
});