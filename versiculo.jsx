import { useState, useRef } from "react";

const STARS = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 2.2 + 0.4,
  duration: (Math.random() * 4 + 2).toFixed(1),
  delay: (Math.random() * 6).toFixed(1),
}));

export default function App() {
  const [verse, setVerse] = useState(null);
  const [ref, setRef] = useState(null);
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | verse | studying | done

  async function callAPI(systemPrompt, userMessage) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`API ${response.status}: ${data?.error?.message || ""}`);
    return data.content?.find((b) => b.type === "text")?.text ?? "";
  }

  async function fetchAll() {
    setLoading(true);
    setError(null);
    setVisible(false);
    setVerse(null);
    setRef(null);
    setStudy(null);
    setPhase("verse");

    try {
      // Step 1: get verse
      const raw1 = await callAPI(
        `Retorne APENAS JSON válido, sem markdown. Campos: "versiculo" (texto em português NVI ou ARA) e "referencia" (ex: "João 3:16").`,
        "Me dê um versículo bíblico aleatório, variando entre todos os livros da Bíblia."
      );
      const parsed = JSON.parse(raw1.replace(/```json|```/g, "").trim());
      if (!parsed.versiculo || !parsed.referencia) throw new Error("Campos ausentes no versículo");

      setVerse(parsed.versiculo);
      setRef(parsed.referencia);
      setPhase("studying");

      // Step 2: get study
      const raw2 = await callAPI(
        `Você é um estudioso bíblico. Retorne APENAS JSON válido, sem markdown. Campo "estudo": um parágrafo curto (4 a 6 linhas) com contexto histórico, significado teológico e aplicação prática do versículo. Escrita clara, edificante e acessível.`,
        `Faça um pequeno estudo bíblico sobre: "${parsed.versiculo}" — ${parsed.referencia}`
      );
      const parsed2 = JSON.parse(raw2.replace(/```json|```/g, "").trim());
      if (!parsed2.estudo) throw new Error("Campo 'estudo' ausente");

      setStudy(parsed2.estudo);
      setPhase("done");
      setTimeout(() => setVisible(true), 60);
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }

  async function shareImage() {
    if (!verse || !ref || !study) return;
    setSharing(true);

    try {
      // Build canvas
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
      bg.addColorStop(0, "#1e1408");
      bg.addColorStop(1, "#0e0a05");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1350);

      // Subtle radial glow center
      const glow = ctx.createRadialGradient(540, 500, 0, 540, 500, 700);
      glow.addColorStop(0, "rgba(201,168,76,0.07)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 1350);

      // Gold top line
      const lineGrad = ctx.createLinearGradient(140, 0, 940, 0);
      lineGrad.addColorStop(0, "transparent");
      lineGrad.addColorStop(0.5, "#c9a84c");
      lineGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(140, 90);
      ctx.lineTo(940, 90);
      ctx.stroke();

      // Title
      ctx.fillStyle = "#f0d080";
      ctx.font = "bold 38px Georgia, serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "8px";
      ctx.fillText("PALAVRA DE DEUS", 540, 155);

      // Gold divider after title
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(340, 180);
      ctx.lineTo(740, 180);
      ctx.stroke();

      // Verse text (italic, wrapped)
      ctx.fillStyle = "#f5ead6";
      ctx.font = "italic 36px Georgia, serif";
      ctx.textAlign = "center";
      const verseLines = wrapText(ctx, `"${verse}"`, 820);
      let y = 260;
      for (const line of verseLines) {
        ctx.fillText(line, 540, y);
        y += 54;
      }

      // Reference
      ctx.fillStyle = "#c9a84c";
      ctx.font = "bold 28px Georgia, serif";
      ctx.fillText(`— ${ref}`, 540, y + 30);

      // Study section divider
      y += 100;
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(140, y);
      ctx.lineTo(940, y);
      ctx.stroke();

      // Study label
      y += 50;
      ctx.fillStyle = "#f0d080";
      ctx.font = "bold 26px Georgia, serif";
      ctx.letterSpacing = "4px";
      ctx.fillText("ESTUDO BÍBLICO", 540, y);

      // Study text
      y += 40;
      ctx.fillStyle = "#d4c4a0";
      ctx.font = "22px Georgia, serif";
      ctx.letterSpacing = "0px";
      const studyLines = wrapText(ctx, study, 860);
      for (const line of studyLines) {
        y += 38;
        ctx.fillText(line, 540, y);
      }

      // Bottom ornament
      ctx.fillStyle = "#3a2a10";
      ctx.font = "22px Georgia, serif";
      ctx.fillText("✦  ✦  ✦", 540, 1290);

      // Bottom gold line
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(140, 1310);
      ctx.lineTo(940, 1310);
      ctx.stroke();

      // Export
      canvas.toBlob(async (blob) => {
        const file = new File([blob], "versiculo.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: ref, text: `${verse} — ${ref}` });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "versiculo.png";
          a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, "image/png");
    } catch (err) {
      console.error(err);
      setSharing(false);
    }
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  const phaseLabel = {
    verse: "Buscando versículo...",
    studying: "Preparando estudo bíblico...",
    done: "",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0e0a05", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", position:"relative", overflow:"hidden", padding:"24px 0" }}>

      {STARS.map(s => (
        <div key={s.id} style={{
          position:"fixed", borderRadius:"50%", background:"#fff",
          width:s.size, height:s.size,
          top:`${s.top}%`, left:`${s.left}%`,
          animation:`twinkle ${s.duration}s ${s.delay}s infinite ease-in-out`,
          opacity:0, pointerEvents:"none",
        }} />
      ))}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        @keyframes twinkle { 0%,100%{opacity:0;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes bounce { 0%,80%,100%{transform:scale(.7);opacity:.4} 40%{transform:scale(1.2);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .dot{width:8px;height:8px;border-radius:50%;background:#c9a84c;display:inline-block;animation:bounce 1.1s infinite ease-in-out}
        .dot2{animation-delay:.18s!important}.dot3{animation-delay:.36s!important}
        .fade-up{animation:fadeUp .7s ease forwards}
        .fade-up-d{animation:fadeUp .7s ease .18s forwards;opacity:0}
        .fade-up-d2{animation:fadeUp .7s ease .35s forwards;opacity:0}
        .gold-btn{font-family:'Cinzel Decorative',serif;font-size:.8rem;letter-spacing:.12em;color:#1a120b;background:linear-gradient(135deg,#d4a83a 0%,#f0d080 50%,#c9922a 100%);border:none;border-radius:2px;padding:14px 32px;cursor:pointer;box-shadow:0 4px 24px rgba(201,168,76,.35);transition:transform .15s,box-shadow .15s}
        .gold-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(201,168,76,.5)}
        .gold-btn:active{transform:translateY(1px)}
        .gold-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .share-btn{font-family:'Cinzel Decorative',serif;font-size:.75rem;letter-spacing:.1em;color:#c9a84c;background:transparent;border:1px solid #3a2a10;border-radius:2px;padding:12px 28px;cursor:pointer;transition:border-color .2s,color .2s,transform .15s}
        .share-btn:hover{border-color:#c9a84c;color:#f0d080;transform:translateY(-1px)}
        .share-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
      `}</style>

      <div style={{ position:"relative", zIndex:1, width:"min(680px,93vw)", display:"flex", flexDirection:"column", gap:0 }}>

        {/* MAIN CARD */}
        <div style={{ background:"linear-gradient(160deg,#1e1408 0%,#150e04 100%)", border:"1px solid #3a2a10", borderRadius:"4px 4px 0 0", padding:"52px 44px 40px", boxShadow:"0 0 0 1px #5a3d10,0 0 60px 10px rgba(201,168,76,.08),0 32px 80px rgba(0,0,0,.6)", textAlign:"center" }}>

          <div style={{ width:"80%", height:1, background:"linear-gradient(90deg,transparent,#c9a84c,transparent)", margin:"0 auto 32px" }} />

          <h1 style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:"clamp(.9rem,3vw,1.3rem)", color:"#f0d080", letterSpacing:".08em", marginBottom:36 }}>
            Palavra de Deus
          </h1>

          {/* VERSE AREA */}
          <div style={{ minHeight:160, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, marginBottom:36 }}>
            {!loading && !verse && !error && (
              <p style={{ color:"#4a3820", fontStyle:"italic", fontSize:"1rem" }}>Pressione o botão para receber uma palavra</p>
            )}
            {loading && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
                <div style={{ display:"flex", gap:8 }}>
                  <span className="dot"/><span className="dot dot2"/><span className="dot dot3"/>
                </div>
                <p style={{ color:"#6a4e20", fontSize:".85rem", fontStyle:"italic" }}>{phaseLabel[phase]}</p>
              </div>
            )}
            {error && <p style={{ color:"#c97060", fontStyle:"italic", fontSize:".85rem", maxWidth:480, lineHeight:1.6 }}>⚠ {error}</p>}
            {verse && (
              <div className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
                <p style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:"clamp(1.05rem,2.3vw,1.3rem)", fontStyle:"italic", color:"#f5ead6", lineHeight:1.82, maxWidth:520 }}>
                  "{verse}"
                </p>
                <p style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:".78rem", color:"#c9a84c", letterSpacing:".12em" }}>
                  — {ref}
                </p>
              </div>
            )}
          </div>

          <button className="gold-btn" onClick={fetchAll} disabled={loading}>
            ✦ Novo Versículo ✦
          </button>

          <div style={{ marginTop:36, color:"#3a2a10", fontSize:".68rem", letterSpacing:".5em" }}>✦ ✦ ✦</div>
        </div>

        {/* STUDY CARD */}
        {(study || (loading && phase === "studying")) && (
          <div style={{ background:"linear-gradient(160deg,#17100600 0%,#120d03 100%)", border:"1px solid #3a2a10", borderTop:"none", borderRadius:"0 0 4px 4px", padding:"36px 44px 40px", boxShadow:"0 0 0 1px #5a3d10,0 24px 60px rgba(0,0,0,.5)", textAlign:"center" }}>

            <div style={{ width:"60%", height:1, background:"linear-gradient(90deg,transparent,#5a3d10,transparent)", margin:"0 auto 28px" }} />

            <p className="fade-up-d" style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:".78rem", color:"#c9a84c", letterSpacing:".16em", marginBottom:20 }}>
              ESTUDO BÍBLICO
            </p>

            {loading && phase === "studying" && !study && (
              <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:12 }}>
                <span className="dot"/><span className="dot dot2"/><span className="dot dot3"/>
              </div>
            )}

            {study && (
              <>
                <p className="fade-up-d2" style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:"clamp(.95rem,2.1vw,1.12rem)", color:"#c8b890", lineHeight:1.85, maxWidth:540, margin:"0 auto 32px" }}>
                  {study}
                </p>

                <button
                  className="share-btn"
                  onClick={shareImage}
                  disabled={sharing}
                >
                  {sharing ? "Gerando imagem..." : "↗ Compartilhar Imagem"}
                </button>
              </>
            )}

            <div style={{ marginTop:28, color:"#2a1c08", fontSize:".65rem", letterSpacing:".45em" }}>✦ ✦ ✦</div>
          </div>
        )}
      </div>
    </div>
  );
}
