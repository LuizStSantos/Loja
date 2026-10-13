// Bazar do Luiz — lê produtos.md, monta a vitrine, filtros e links do WhatsApp
const ARQUIVO_LOJA = "loja.md";        // configuração da loja + lista de produtos
const PASTA_PRODUTOS = "produtos/";    // um arquivo .md por produto
const LISTA = PASTA_PRODUTOS + "lista.json"; // gerada sozinha no GitHub (ferramentas/gerar-lista.py)
const estado = { tipo: "Todos", busca: "", ordem: "padrao" };
let loja = {}, itens = [];

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const semAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Markdown simples para a descrição: parágrafos, listas, **negrito**, *itálico*, [link](url)
function md(txt){
  const inl = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out=[]; let lista=null, par=[];
  const fechaPar=()=>{ if(par.length){out.push("<p>"+inl(par.join(" "))+"</p>");par=[];} };
  const fechaLista=()=>{ if(lista){out.push("<ul>"+lista.join("")+"</ul>");lista=null;} };
  for(const l of txt.split("\n")){
    const t=l.trim();
    if(/^[-*]\s+/.test(t)){ fechaPar(); (lista??=[]).push("<li>"+inl(t.replace(/^[-*]\s+/,""))+"</li>"); }
    else if(!t){ fechaPar(); fechaLista(); }
    else { fechaLista(); par.push(t); }
  }
  fechaPar(); fechaLista();
  return out.join("");
}

function precoNum(v){
  if(!v) return null;
  let s=String(v).replace(/[^\d,.]/g,"");
  if(s.includes(",")) s=s.replace(/\./g,"").replace(",",".");
  const n=parseFloat(s); return isNaN(n)?null:n;
}
const brl = n => n==null ? "Consulte" : n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

// Separa o cabeçalho "---" (chave: valor) do resto do texto
function frontMatter(texto){
  texto = texto.replace(/^\uFEFF/,"").replace(/\r/g,"").replace(/<!--[\s\S]*?-->/g,"");
  const dados={};
  const fm = texto.match(/^\s*---\n([\s\S]*?)\n---[ \t]*(\n|$)/);
  if(fm){
    fm[1].split("\n").forEach(l=>{
      const m=l.match(/^\s*([^:#]+?)\s*:\s*(.*)$/);
      if(m) dados[semAcento(m[1]).replace(/\s+/g,"_")]=m[2].trim().replace(/^["']|["']$/g,"");
    });
    texto = texto.slice(fm[0].length);
  }
  return {dados, corpo:texto.trim()};
}

// loja.md: configuração no cabeçalho + lista de arquivos de produto ("- nome.md")
function lerLoja(texto){
  const {dados, corpo} = frontMatter(texto);
  const arquivos = corpo.split("\n")
    .map(l=>l.match(/^\s*[-*]\s+(\S+\.md)\s*$/i))
    .filter(Boolean).map(m=>m[1]);
  return {cfg:dados, arquivos};
}

// Um arquivo por produto
function lerProduto(texto, arquivo, ordem){
  const {dados, corpo} = frontMatter(texto);
  const it = {...dados, ordem, arquivo};
  let descricao = corpo;
  if(!it.titulo){
    const h = corpo.match(/^#\s+(.+)$/m);
    if(h){ it.titulo=h[1].trim(); descricao=corpo.replace(h[0],"").trim(); }
    else it.titulo = arquivo.replace(/\.md$/i,"").replace(/[-_]+/g," ");
  }
  it.descricao=descricao;
  it.tipo=it.tipo||"Outros";
  it.valor=precoNum(it.preco);
  it.estaVendido=/^(sim|s|true|1|vendido)$/i.test(it.vendido||"");
  return it;
}

function linkWhats(it){
  const num=(loja.whatsapp||"").replace(/\D/g,"");
  const msg=`Olá! Tenho interesse no item: *${it.titulo}* (${brl(it.valor)}). Ainda está disponível?`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function desenharChips(){
  const cont={};
  itens.forEach(i=>cont[i.tipo]=(cont[i.tipo]||0)+1);
  const tipos=["Todos",...Object.keys(cont).sort((a,b)=>a.localeCompare(b,"pt-BR"))];
  document.getElementById("chips").innerHTML = tipos.map(t=>
    `<button class="chip" type="button" data-tipo="${esc(t)}" aria-pressed="${t===estado.tipo}">${esc(t)} <span>${t==="Todos"?itens.length:cont[t]}</span></button>`
  ).join("");
}

function desenhar(){
  const q=semAcento(estado.busca.trim());
  let vis=itens.filter(i=>(estado.tipo==="Todos"||i.tipo===estado.tipo) &&
    (!q || semAcento(i.titulo+" "+i.descricao+" "+i.tipo).includes(q)));
  const v = i => i.valor ?? Infinity;
  if(estado.ordem==="menor") vis.sort((a,b)=>v(a)-v(b));
  else if(estado.ordem==="maior") vis.sort((a,b)=>(b.valor??-1)-(a.valor??-1));
  else vis.sort((a,b)=>b.ordem-a.ordem);
  vis.sort((a,b)=>a.estaVendido-b.estaVendido);

  const disp=vis.filter(i=>!i.estaVendido).length;
  document.getElementById("resumo").textContent =
    `${vis.length} ${vis.length===1?"item":"itens"}${estado.tipo!=="Todos"?" em "+estado.tipo:""} · ${disp} ${disp===1?"disponível":"disponíveis"}`;

  const g=document.getElementById("grade");
  if(!vis.length){ g.innerHTML=`<div class="vazio" style="grid-column:1/-1">Nenhum item encontrado. Tente outra busca ou escolha “Todos”.</div>`; return; }
  const cores=["--ph-1","--ph-2","--ph-3","--ph-4"];
  g.innerHTML = vis.map(it=>{
    const cor=`var(${cores[it.ordem%4]})`;
    const letra=esc(it.titulo.charAt(0).toUpperCase());
    const foto = it.imagem
      ? `<img src="${esc(it.imagem)}" alt="${esc(it.titulo)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'letra',textContent:'${letra}'}))">`
      : `<span class="letra">${letra}</span>`;
    const longa = it.descricao.length>140;
    return `<article class="item${it.estaVendido?" vendido":""}">
      <div class="foto" style="background:${cor}">${foto}
        <span class="etiqueta">${brl(it.valor)}</span>
        ${it.estaVendido?'<span class="vendido-selo">Vendido</span>':""}
      </div>
      <div class="corpo">
        <div class="meta"><b>${esc(it.tipo)}</b>${it.estado?`<span>· ${esc(it.estado)}</span>`:""}</div>
        <h2>${esc(it.titulo)}</h2>
        ${it.descricao?`<div class="desc${longa?" curta":""}">${md(it.descricao)}</div>`:""}
        ${longa?`<button class="mais" type="button">Ver mais</button>`:""}
        ${it.estaVendido
          ? `<a class="comprar" aria-disabled="true">Já vendido</a>`
          : `<a class="comprar" href="${linkWhats(it)}" target="_blank" rel="noopener">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>
               Quero comprar</a>`}
      </div></article>`;
  }).join("");
}

document.getElementById("chips").addEventListener("click",e=>{
  const b=e.target.closest(".chip"); if(!b) return;
  estado.tipo=b.dataset.tipo;
  document.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",c===b));
  desenhar();
});
document.getElementById("busca").addEventListener("input",e=>{estado.busca=e.target.value;desenhar();});
document.getElementById("ordem").addEventListener("change",e=>{estado.ordem=e.target.value;desenhar();});
document.getElementById("grade").addEventListener("click",e=>{
  const b=e.target.closest(".mais"); if(!b) return;
  const d=b.previousElementSibling; const aberto=d.classList.toggle("curta");
  b.textContent=aberto?"Ver mais":"Ver menos";
});

const baixar = url => fetch(url,{cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error(url); return r.text(); });

async function iniciar(){
  let loja_;
  try { loja_ = lerLoja(await baixar(ARQUIVO_LOJA)); }
  catch(e){
    document.getElementById("grade").innerHTML=`<div class="aviso" style="grid-column:1/-1">
      Não consegui abrir o arquivo <strong>${ARQUIVO_LOJA}</strong>. Confira se ele está na mesma pasta do index.html
      e se o site está publicado (GitHub Pages, Netlify etc.). Abrir o index.html direto do computador não funciona em alguns navegadores.</div>`;
    return;
  }
  const {cfg} = loja_; let {arquivos} = loja_;
  loja=cfg;
  const nome=cfg.loja||"Minha Loja";
  document.getElementById("nome-loja").innerHTML=esc(nome).replace("³",'<sup aria-hidden="true">3</sup><span class="sr">³</span>');
  document.title=nome;
  document.getElementById("desc-loja").textContent=cfg.descricao||"";
  if(cfg.whatsapp){
    const c=document.getElementById("contato");
    const n=cfg.whatsapp.replace(/\D/g,"");
    c.href=`https://wa.me/${n}`; c.querySelector("span").textContent="WhatsApp"; c.hidden=false;
  }
  if(cfg.instagram){
    const u=cfg.instagram.replace(/^.*instagram\.com\//i,"").replace(/[@/]/g,"");
    const ig=document.getElementById("instagram");
    ig.href=`https://www.instagram.com/${u}/`; ig.querySelector("span").textContent="@"+u; ig.hidden=false;
    const f=document.getElementById("rodape-ig"); if(f){ f.href=ig.href; f.textContent="@"+u; }
  }

  // Lista gerada pelo GitHub; se não existir, usa a lista escrita no loja.md
  let nomes = arquivos;
  try { const j = JSON.parse(await baixar(LISTA)); if(Array.isArray(j)) nomes = j; } catch(e){}
  arquivos = nomes;

  const resultados = await Promise.allSettled(
    arquivos.map((arq,i)=>baixar(PASTA_PRODUTOS+arq).then(t=>lerProduto(t,arq,i)))
  );
  itens = resultados.filter(r=>r.status==="fulfilled").map(r=>r.value)
    .filter(i=>!/^(sim|s|true|1)$/i.test(i.oculto||""));
  const faltando = arquivos.filter((_,i)=>resultados[i].status==="rejected");
  if(faltando.length) console.warn("Arquivos de produto não encontrados:", faltando.map(f=>PASTA_PRODUTOS+f));

  desenharChips(); desenhar();
}
iniciar();
