// 3D³ Creative — lê loja.md e os produtos, monta a vitrine, filtros, página de detalhes e links do WhatsApp
const ARQUIVO_LOJA = "loja.md";               // configuração da loja
const PASTA_PRODUTOS = "produtos/";           // um arquivo .md por produto
const LISTA = PASTA_PRODUTOS + "lista.json";  // gerada sozinha no GitHub (ferramentas/gerar-lista.py)

const ORDENS = [
  { valor: "padrao", rotulo: "Mais recentes" },
  { valor: "menor",  rotulo: "Menor preço" },
  { valor: "maior",  rotulo: "Maior preço" },
];
const estado = { tipo: "Todos", busca: "", ordem: "padrao" };
let loja = {}, itens = [];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const semAcento = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ehSim = v => /^(sim|s|true|1|vendido)$/i.test(String(v ?? "").trim());

const ICONE_WHATS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>';
const ICONE_PLAY = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
const SETA = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d === "esq" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}"/></svg>`;

/* ---------- YouTube ---------- */
function idYoutube(url){
  const s = String(url).trim();
  if(/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/i);
  return m ? m[1] : null;
}
const embedYoutube = id => `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="Vídeo do produto" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;

/* ---------- Markdown ----------
   Títulos (#, ##, ###), parágrafos, listas (- e 1.), tabelas (| a | b |), citações (>),
   linha (---), imagens ![texto](foto.jpg), links, **negrito**, *itálico*,
   e um link do YouTube sozinho numa linha vira vídeo. */
function inline(s){
  return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
function md(txt){
  const linhas = String(txt || "").split("\n");
  const out = []; let i = 0;
  const celulas = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  while(i < linhas.length){
    const l = linhas[i], t = l.trim();
    if(!t){ i++; continue; }
    let m;
    if((m = t.match(/^(#{1,4})\s+(.*)$/))){
      const n = Math.min(m[1].length + 2, 6);           // # vira h3 (o título do item já é h2)
      out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue;
    }
    if(/^(-{3,}|\*{3,})$/.test(t)){ out.push("<hr>"); i++; continue; }
    if(idYoutube(t) && /^https?:\/\//.test(t)){ out.push(embedYoutube(idYoutube(t))); i++; continue; }
    if(t.startsWith("|") && linhas[i+1] && /^\s*\|?\s*:?-{2,}/.test(linhas[i+1])){
      const cab = celulas(t); i += 2; const corpo = [];
      while(i < linhas.length && linhas[i].trim().startsWith("|")) corpo.push(celulas(linhas[i++]));
      out.push(`<div class="tabela"><table><thead><tr>${cab.map(c=>`<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${
        corpo.map(r=>`<tr>${r.map(c=>`<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if(/^[-*+]\s+/.test(t) || /^\d+[.)]\s+/.test(t)){
      const ord = /^\d/.test(t), itensL = [];
      while(i < linhas.length && (ord ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/).test(linhas[i]))
        itensL.push(`<li>${inline(linhas[i++].trim().replace(/^([-*+]|\d+[.)])\s+/, ""))}</li>`);
      out.push(ord ? `<ol>${itensL.join("")}</ol>` : `<ul>${itensL.join("")}</ul>`); continue;
    }
    if(t.startsWith(">")){
      const q = [];
      while(i < linhas.length && linhas[i].trim().startsWith(">")) q.push(linhas[i++].trim().replace(/^>\s?/, ""));
      out.push(`<blockquote>${inline(q.join(" "))}</blockquote>`); continue;
    }
    const par = [];
    while(i < linhas.length && linhas[i].trim() && !/^(#{1,4}\s|[-*+]\s|\d+[.)]\s|>|\||-{3,}$)/.test(linhas[i].trim()))
      par.push(linhas[i++].trim());
    if(!par.length){ par.push(t); i++; }
    out.push(`<p>${inline(par.join(" "))}</p>`);
  }
  return out.join("");
}
// Texto puro do primeiro parágrafo, para o cartão
function primeiroParagrafo(txt){
  for(const bloco of String(txt || "").split(/\n\s*\n/)){
    const b = bloco.trim();
    if(b && !/^(#|\||[-*+]\s|\d+[.)]\s|>|!\[|https?:\/\/)/.test(b))
      return b.replace(/\s*\n\s*/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "");
  }
  return "";
}

/* ---------- Leitura dos arquivos ---------- */
function precoNum(v){
  if(!v) return null;
  let s = String(v).replace(/[^\d,.]/g, "");
  if(s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
const brl = n => n == null ? "Consulte" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Cabeçalho "---": aceita "chave: valor" e listas ("chave:" seguido de linhas "- item")
function frontMatter(texto){
  texto = texto.replace(/^﻿/, "").replace(/\r/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const dados = {};
  const fm = texto.match(/^\s*---\n([\s\S]*?)\n---[ \t]*(\n|$)/);
  if(fm){
    let ultima = null;
    fm[1].split("\n").forEach(l => {
      const item = l.match(/^\s+-\s+(.*)$/) || (ultima && l.match(/^-\s+(.*)$/));
      if(item && ultima){
        if(!Array.isArray(dados[ultima])) dados[ultima] = dados[ultima] ? [dados[ultima]] : [];
        dados[ultima].push(item[1].trim().replace(/^["']|["']$/g, "")); return;
      }
      const m = l.match(/^\s*([^:#\-][^:]*?)\s*:\s*(.*)$/);
      if(m){ ultima = semAcento(m[1]).replace(/\s+/g, "_"); dados[ultima] = m[2].trim().replace(/^["']|["']$/g, ""); }
    });
    texto = texto.slice(fm[0].length);
  }
  return { dados, corpo: texto.trim() };
}
const lista = v => (Array.isArray(v) ? v : String(v || "").split(/\s*,\s*(?=\S)/)).map(s => s.trim()).filter(Boolean);

function lerLoja(texto){
  const { dados, corpo } = frontMatter(texto);
  const arquivos = corpo.split("\n").map(l => l.match(/^\s*[-*]\s+(\S+\.md)\s*$/i)).filter(Boolean).map(m => m[1]);
  return { cfg: dados, arquivos };
}

function lerProduto(texto, arquivo, ordem){
  const { dados, corpo } = frontMatter(texto);
  const it = { ...dados, ordem, arquivo, slug: arquivo.replace(/\.md$/i, "").replace(/[^\w.~-]+/g, "-") };
  let descricao = corpo;
  if(!it.titulo){
    const h = corpo.match(/^#\s+(.+)$/m);
    if(h){ it.titulo = h[1].trim(); descricao = corpo.replace(h[0], "").trim(); }
    else it.titulo = it.slug.replace(/[-_]+/g, " ");
  }
  it.descricao = descricao;
  it.fotos = [...lista(it.imagem), ...lista(it.fotos), ...lista(it.imagens)].filter((f, i, a) => a.indexOf(f) === i);
  it.videos = [...lista(it.video), ...lista(it.videos)].map(idYoutube).filter(Boolean);
  it.resumoTexto = it.resumo || primeiroParagrafo(descricao);
  it.tipo = it.tipo || "Outros";
  it.valor = precoNum(it.preco);
  it.estaVendido = ehSim(it.vendido);
  return it;
}

function linkWhats(it){
  const num = (loja.whatsapp || "").replace(/\D/g, "");
  const msg = `Olá! Tenho interesse no item: *${it.titulo}* (${brl(it.valor)}). Ainda está disponível?`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}
const botaoComprar = it => it.estaVendido
  ? `<span class="comprar" aria-disabled="true">Já vendido</span>`
  : `<a class="comprar" href="${linkWhats(it)}" target="_blank" rel="noopener">${ICONE_WHATS} Quero comprar</a>`;

/* ---------- Galeria (cartão e detalhes) ---------- */
const CORES = ["--ph-1", "--ph-2", "--ph-3", "--ph-4"];
function galeria(it, { carregar = "lazy" } = {}){
  const letra = esc(it.titulo.charAt(0).toUpperCase());
  if(!it.fotos.length) return `<div class="trilho"><div class="slide"><span class="letra">${letra}</span></div></div>`;
  const slides = it.fotos.map((f, i) =>
    `<div class="slide"><img src="${esc(f)}" alt="${esc(it.titulo)}${it.fotos.length > 1 ? ` — foto ${i+1}` : ""}" loading="${i ? "lazy" : carregar}" data-letra="${letra}"></div>`).join("");
  const varias = it.fotos.length > 1;
  return `<div class="trilho" tabindex="-1">${slides}</div>${varias ? `
    <button class="seta esq" type="button" aria-label="Foto anterior" tabindex="-1">${SETA("esq")}</button>
    <button class="seta dir" type="button" aria-label="Próxima foto" tabindex="-1">${SETA("dir")}</button>
    <div class="pontos" aria-hidden="true">${it.fotos.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>` : ""}`;
}
// Foto que não carrega vira a letra inicial
document.addEventListener("error", e => {
  const img = e.target;
  if(img.tagName === "IMG" && img.dataset.letra){
    const s = document.createElement("span"); s.className = "letra"; s.textContent = img.dataset.letra; img.replaceWith(s);
  }
}, true);

function ligarGaleria(raiz){
  raiz.querySelectorAll(".trilho").forEach(tr => {
    const box = tr.parentElement, pontos = box.querySelectorAll(".pontos i"), miniaturas = box.closest(".det-galeria")?.querySelectorAll(".miniaturas button");
    const atual = () => Math.round(tr.scrollLeft / tr.clientWidth);
    const marcar = () => {
      const n = atual();
      pontos.forEach((p, i) => p.classList.toggle("on", i === n));
      miniaturas?.forEach((b, i) => b.setAttribute("aria-current", i === n));
    };
    tr.addEventListener("scroll", () => requestAnimationFrame(marcar), { passive: true });
    const ir = n => tr.scrollTo({ left: n * tr.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    box.querySelector(".seta.esq")?.addEventListener("click", e => { e.stopPropagation(); ir(Math.max(0, atual() - 1)); });
    box.querySelector(".seta.dir")?.addEventListener("click", e => { e.stopPropagation(); const n = tr.children.length; ir(atual() + 1 >= n ? 0 : atual() + 1); });
    miniaturas?.forEach((b, i) => b.addEventListener("click", () => ir(i)));
    tr._ir = ir; tr._atual = atual;
  });
}

/* ---------- Vitrine ---------- */
function desenharChips(){
  const cont = {};
  itens.forEach(i => cont[i.tipo] = (cont[i.tipo] || 0) + 1);
  const tipos = ["Todos", ...Object.keys(cont).sort((a, b) => a.localeCompare(b, "pt-BR"))];
  $("chips").innerHTML = tipos.map(t =>
    `<button class="chip" type="button" data-tipo="${esc(t)}" aria-pressed="${t === estado.tipo}">${esc(t)} <span>${t === "Todos" ? itens.length : cont[t]}</span></button>`).join("");
}

function desenhar(){
  const q = semAcento(estado.busca.trim());
  const vis = itens.filter(i => (estado.tipo === "Todos" || i.tipo === estado.tipo) &&
    (!q || semAcento(i.titulo + " " + i.descricao + " " + i.tipo + " " + (i.resumo || "")).includes(q)));
  if(estado.ordem === "menor") vis.sort((a, b) => (a.valor ?? Infinity) - (b.valor ?? Infinity));
  else if(estado.ordem === "maior") vis.sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
  else vis.sort((a, b) => b.ordem - a.ordem);
  vis.sort((a, b) => a.estaVendido - b.estaVendido);

  const disp = vis.filter(i => !i.estaVendido).length;
  $("resumo").textContent = `${vis.length} ${vis.length === 1 ? "item" : "itens"}${estado.tipo !== "Todos" ? " em " + estado.tipo : ""} · ${disp} ${disp === 1 ? "disponível" : "disponíveis"}`;

  const g = $("grade");
  if(!vis.length){ g.innerHTML = `<div class="vazio">Nenhum item encontrado. Tente outra busca ou escolha “Todos”.</div>`; return; }
  g.innerHTML = vis.map(it => `
    <article class="item${it.estaVendido ? " vendido" : ""}" data-slug="${esc(it.slug)}">
      <div class="foto" style="background:var(${CORES[it.ordem % 4]})">
        ${galeria(it)}
        <span class="etiqueta">${brl(it.valor)}</span>
        <div class="selos">
          ${it.estaVendido ? '<span class="selo vendido-selo">Vendido</span>' : ""}
          ${it.videos.length ? `<span class="selo">${ICONE_PLAY} Vídeo</span>` : ""}
          ${it.fotos.length > 1 ? `<span class="selo">${it.fotos.length} fotos</span>` : ""}
        </div>
      </div>
      <div class="corpo">
        <div class="meta"><b>${esc(it.tipo)}</b>${it.estado ? `<span>· ${esc(it.estado)}</span>` : ""}</div>
        <h2><a class="abrir" href="#${esc(it.slug)}">${esc(it.titulo)}</a></h2>
        ${it.resumoTexto ? `<p class="desc">${esc(it.resumoTexto)}</p>` : ""}
        <div class="acoes">
          ${botaoComprar(it)}
          <a class="detalhes" href="#${esc(it.slug)}">Ver detalhes</a>
        </div>
      </div>
    </article>`).join("");
  ligarGaleria(g);
}

$("chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if(!b) return;
  estado.tipo = b.dataset.tipo;
  document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c === b));
  desenhar();
});
$("busca").addEventListener("input", e => { estado.busca = e.target.value; desenhar(); });
// Clicar na foto do cartão abre os detalhes
$("grade").addEventListener("click", e => {
  if(e.target.closest("a, button")) return;
  const card = e.target.closest(".item");
  if(card && e.target.closest(".foto")){ abertoPorClique = true; location.hash = card.dataset.slug; }
});

/* ---------- Seletor de ordenação ---------- */
(function seletor(){
  const raiz = $("ordem"), botao = raiz.querySelector("button"), menu = raiz.querySelector("ul"), rotulo = botao.querySelector(".rotulo");
  menu.innerHTML = ORDENS.map((o, i) => `<li role="option" id="ordem-${o.valor}" data-valor="${o.valor}" aria-selected="${i === 0}">${o.rotulo}</li>`).join("");
  const opcoes = [...menu.children];
  let foco = 0;
  const marcarFoco = n => { foco = (n + opcoes.length) % opcoes.length; opcoes.forEach((o, i) => o.classList.toggle("foco", i === foco)); menu.setAttribute("aria-activedescendant", opcoes[foco].id); };
  const abrir = () => { raiz.classList.add("aberto"); botao.setAttribute("aria-expanded", "true"); menu.hidden = false; marcarFoco(ORDENS.findIndex(o => o.valor === estado.ordem)); menu.focus(); };
  const fechar = (devolverFoco = true) => { raiz.classList.remove("aberto"); botao.setAttribute("aria-expanded", "false"); menu.hidden = true; if(devolverFoco) botao.focus(); };
  const escolher = n => {
    estado.ordem = ORDENS[n].valor; rotulo.textContent = ORDENS[n].rotulo;
    opcoes.forEach((o, i) => o.setAttribute("aria-selected", i === n));
    fechar(); desenhar();
  };
  botao.addEventListener("click", () => menu.hidden ? abrir() : fechar());
  botao.addEventListener("keydown", e => { if(["ArrowDown", "ArrowUp"].includes(e.key)){ e.preventDefault(); abrir(); } });
  menu.addEventListener("click", e => { const li = e.target.closest("li"); if(li) escolher(opcoes.indexOf(li)); });
  menu.addEventListener("mousemove", e => { const li = e.target.closest("li"); if(li) marcarFoco(opcoes.indexOf(li)); });
  menu.addEventListener("keydown", e => {
    if(e.key === "ArrowDown"){ e.preventDefault(); marcarFoco(foco + 1); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); marcarFoco(foco - 1); }
    else if(e.key === "Home"){ e.preventDefault(); marcarFoco(0); }
    else if(e.key === "End"){ e.preventDefault(); marcarFoco(opcoes.length - 1); }
    else if(e.key === "Enter" || e.key === " "){ e.preventDefault(); escolher(foco); }
    else if(e.key === "Escape" || e.key === "Tab"){ fechar(e.key === "Escape"); }
  });
  document.addEventListener("pointerdown", e => { if(!raiz.contains(e.target) && !menu.hidden) fechar(false); });
})();

/* ---------- Página de detalhes ---------- */
const dlg = $("detalhe");
let abertoPorClique = false;

function abrirDetalhe(it){
  const miniaturas = it.fotos.length > 1
    ? `<div class="miniaturas">${it.fotos.map((f, i) => `<button type="button" aria-label="Ver foto ${i+1}" aria-current="${i === 0}"><img src="${esc(f)}" alt="" loading="lazy" data-letra="${i+1}"></button>`).join("")}</div>` : "";
  const videos = it.videos.length
    ? `<section class="det-videos"><h3>Vídeo${it.videos.length > 1 ? "s" : ""}</h3>${it.videos.map(embedYoutube).join("")}</section>` : "";
  $("det-conteudo").innerHTML = `
    <div class="det-topo">
      <div class="det-galeria">
        <div class="foto grande" style="background:var(${CORES[it.ordem % 4]})">
          ${galeria(it, { carregar: "eager" })}
          ${it.estaVendido ? '<div class="selos"><span class="selo vendido-selo">Vendido</span></div>' : ""}
        </div>
        ${miniaturas}
      </div>
      <div class="det-info">
        <div class="meta"><b>${esc(it.tipo)}</b>${it.estado ? `<span>· ${esc(it.estado)}</span>` : ""}</div>
        <h2 id="det-titulo">${esc(it.titulo)}</h2>
        <p class="det-preco">${brl(it.valor)}</p>
        ${it.resumo ? `<p class="det-resumo">${esc(it.resumo)}</p>` : ""}
        ${botaoComprar(it)}
        <button class="copiar" type="button">Copiar link deste item</button>
      </div>
    </div>
    ${it.descricao ? `<div class="det-texto">${md(it.descricao)}</div>` : ""}
    ${videos}`;
  ligarGaleria(dlg);
  dlg.querySelector(".copiar").addEventListener("click", async e => {
    const b = e.currentTarget, url = location.href;
    try { await navigator.clipboard.writeText(url); b.textContent = "Link copiado"; }
    catch { b.textContent = url; }
    setTimeout(() => b.textContent = "Copiar link deste item", 2500);
  });
  document.title = `${it.titulo} · ${loja.loja || "Loja"}`;
  if(!dlg.open) dlg.showModal();
  $("det-conteudo").focus({ preventScroll: true });
  dlg.scrollTop = 0; $("det-conteudo").scrollTop = 0;
  document.body.classList.add("travado");
}
function fecharDetalhe(){
  if(dlg.open) dlg.close();
}
dlg.addEventListener("close", () => {
  $("det-conteudo").innerHTML = "";               // para o vídeo
  document.body.classList.remove("travado");
  document.title = loja.loja || "Loja";
  if(location.hash){
    if(abertoPorClique) history.back();
    else history.replaceState(null, "", location.pathname + location.search);
  }
  abertoPorClique = false;
});
$("det-fechar").addEventListener("click", fecharDetalhe);
dlg.addEventListener("click", e => { if(e.target === dlg) fecharDetalhe(); });   // clique fora da caixa
dlg.addEventListener("keydown", e => {
  const tr = dlg.querySelector(".trilho");
  if(!tr?._ir || e.target.closest("iframe, button, a")) return;
  if(e.key === "ArrowRight") tr._ir(Math.min(tr.children.length - 1, tr._atual() + 1));
  if(e.key === "ArrowLeft") tr._ir(Math.max(0, tr._atual() - 1));
});
document.addEventListener("click", e => { if(e.target.closest("a.abrir, a.detalhes")) abertoPorClique = true; });

function seguirEndereco(){
  const slug = decodeURIComponent(location.hash.slice(1));
  const it = slug && itens.find(i => i.slug === slug);
  if(it) abrirDetalhe(it);
  else if(dlg.open){ abertoPorClique = false; dlg.close(); }
}
window.addEventListener("hashchange", seguirEndereco);

/* ---------- Barra de rolagem no celular ----------
   Navegadores de celular não deixam estilizar a barra nativa, então desenhamos uma:
   um traço fino que aparece ao rolar e some depois. Só em telas de toque. */
function indicadorRolagem(rolavel, onde, fixo){
  const barra = document.createElement("div");
  barra.className = "rolagem" + (fixo ? " fixa" : "");
  barra.setAttribute("aria-hidden", "true");
  barra.innerHTML = "<i></i>";
  onde.appendChild(barra);
  const polegar = barra.firstChild;
  const doc = rolavel === window ? document.documentElement : rolavel;
  let tempo;
  const atualizar = () => {
    const total = doc.scrollHeight, visivel = rolavel === window ? window.innerHeight : doc.clientHeight;
    if(total <= visivel + 2){ barra.classList.remove("ver"); return; }
    const trilho = barra.clientHeight;
    const altura = Math.max(36, trilho * visivel / total);
    const pos = (trilho - altura) * (rolavel === window ? window.scrollY : doc.scrollTop) / (total - visivel);
    polegar.style.height = altura + "px";
    polegar.style.transform = `translateY(${pos}px)`;
    barra.classList.add("ver");
    clearTimeout(tempo); tempo = setTimeout(() => barra.classList.remove("ver"), 900);
  };
  rolavel.addEventListener("scroll", () => requestAnimationFrame(atualizar), { passive: true });
}
if(matchMedia("(hover: none) and (pointer: coarse)").matches){
  document.documentElement.classList.add("toque");
  indicadorRolagem(window, document.body, true);
  indicadorRolagem($("det-conteudo"), dlg.querySelector(".det-caixa"), false);
}

/* ---------- Início ---------- */
const baixar = url => fetch(url, { cache: "no-store" }).then(r => { if(!r.ok) throw new Error(url); return r.text(); });

async function iniciar(){
  let dadosLoja;
  try { dadosLoja = lerLoja(await baixar(ARQUIVO_LOJA)); }
  catch(e){
    $("grade").innerHTML = `<div class="aviso">Não consegui abrir o arquivo <strong>${ARQUIVO_LOJA}</strong>. Confira se ele está na mesma pasta do index.html
      e se o site está publicado (GitHub Pages, Netlify etc.). Abrir o index.html direto do computador não funciona em alguns navegadores.</div>`;
    return;
  }
  const { cfg } = dadosLoja; let { arquivos } = dadosLoja;
  loja = cfg;
  const nome = cfg.loja || "Minha Loja";
  $("nome-loja").innerHTML = esc(nome).replace("³", '<sup aria-hidden="true">3</sup><span class="sr">³</span>');
  document.title = nome;
  $("desc-loja").textContent = cfg.descricao || "";
  if(cfg.whatsapp){
    const c = $("contato"), n = cfg.whatsapp.replace(/\D/g, "");
    c.href = `https://wa.me/${n}`; c.hidden = false;
  }
  if(cfg.instagram){
    const u = cfg.instagram.replace(/^.*instagram\.com\//i, "").replace(/[@/]/g, "");
    const ig = $("instagram");
    ig.href = `https://www.instagram.com/${u}/`; ig.querySelector("span").textContent = "@" + u; ig.hidden = false;
    const f = $("rodape-ig"); if(f){ f.href = ig.href; f.textContent = "@" + u; }
  }

  // Lista gerada pelo GitHub; se não existir, usa a lista escrita no loja.md
  try { const j = JSON.parse(await baixar(LISTA)); if(Array.isArray(j)) arquivos = j; } catch(e){}

  const resultados = await Promise.allSettled(arquivos.map((arq, i) => baixar(PASTA_PRODUTOS + arq).then(t => lerProduto(t, arq, i))));
  itens = resultados.filter(r => r.status === "fulfilled").map(r => r.value).filter(i => !ehSim(i.oculto));
  const faltando = arquivos.filter((_, i) => resultados[i].status === "rejected");
  if(faltando.length) console.warn("Arquivos de produto não encontrados:", faltando.map(f => PASTA_PRODUTOS + f));

  desenharChips(); desenhar(); seguirEndereco();
}
iniciar();
