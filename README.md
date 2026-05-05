# 📖 Palavra Bíblica

Versículo aleatório + estudo bíblico gerado por IA, com botão de compartilhamento.

## Estrutura

```
palavra-biblica/
├── backend/      → API Node.js (deploy no Render)
└── frontend/     → HTML estático (deploy no GitHub Pages)
```

---

## 🚀 Deploy em 3 passos

### 1. Backend → Render (gratuito)

1. Acesse https://render.com e crie uma conta
2. Clique em **New → Web Service**
3. Conecte o repositório GitHub e aponte para a pasta `backend/`
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Em **Environment Variables**, adicione:
   ```
   ANTHROPIC_API_KEY = sk-ant-...sua chave...
   FRONTEND_URL      = https://danielvduarte.github.io
   PORT              = 3001
   ```
6. Clique em **Create Web Service**
7. Anote a URL gerada, ex: `https://palavra-biblica-api.onrender.com`

---

### 2. Frontend → ajuste a URL da API

Abra `frontend/index.html` e troque na linha:

```js
const API_URL = "https://SEU-BACKEND.onrender.com";
```

pela URL real do seu Render, ex:

```js
const API_URL = "https://palavra-biblica-api.onrender.com";
```

---

### 3. Frontend → GitHub Pages

1. Faça commit do repositório no GitHub
2. Vá em **Settings → Pages**
3. Em **Source**, selecione branch `main` e pasta `/ (root)` ou `/frontend`
   - Se selecionar `/ (root)`, mova o `index.html` para a raiz do repo
   - Se selecionar `/frontend`, mantenha como está
4. Salve — o GitHub vai publicar em `https://danielvduarte.github.io/palavra_biblica/`

---

## 🔧 Rodar localmente

**Backend:**
```bash
cd backend
cp .env.example .env
# edite .env com sua chave
npm install
npm run dev
```

**Frontend:**
Abra `frontend/index.html` no navegador ou use o Live Server do VS Code.
Certifique-se que `API_URL` aponta para `http://localhost:3001`.

---

## ⚠️ Observações

- O plano gratuito do Render "dorme" após 15 min de inatividade — a primeira requisição pode demorar ~30s para "acordar"
- Nunca comite o arquivo `.env` (já está no `.gitignore`)
- A chave da API fica **somente no servidor**, nunca exposta no frontend
