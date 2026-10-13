# 3D³ Creative

Vitrine de itens à venda. Cada produto é um arquivo Markdown, o visitante filtra por tipo e o botão **Quero comprar** abre o WhatsApp com uma mensagem pronta.

## Postar um item

1. Na pasta `produtos/`, copie o `_modelo.md` e dê um nome novo, por exemplo `luminaria-lua.md`. Esse nome também vira o link do item: `.../Loja/#luminaria-lua`.
2. Envie as fotos para a pasta `fotos/`.
3. Preencha os dados e a descrição.
4. Salve (commit). Em cerca de um minuto o site é atualizado.

```markdown
---
titulo: Luminária Lua
tipo: Decoração
preco: 90,00
estado: Novo
resumo: Textura de superfície lunar, LED com 3 tons.
fotos:
  - fotos/luminaria-lua-1.jpg
  - fotos/luminaria-lua-2.jpg
video: https://youtu.be/CODIGO
---

Texto de apresentação.

## Especificações

| Item     | Detalhe   |
|----------|-----------|
| Tamanho  | 12 cm     |
| Energia  | Cabo USB  |
```

| Campo     | Para que serve |
|-----------|----------------|
| `titulo`  | Nome do item |
| `tipo`    | Categoria; os botões de filtro são criados a partir dela |
| `preco`   | Valor em reais (`850`, `850,00` ou `1.200,50`). Sem preço aparece "Consulte" |
| `estado`  | Novo, Seminovo, Sob encomenda… |
| `resumo`  | Frase curta do cartão. Sem ela, o cartão usa o primeiro parágrafo do texto |
| `fotos`   | Uma ou mais fotos, em lista (como acima) ou separadas por vírgula. A primeira é a capa. `imagem:` também funciona para uma foto só |
| `video`   | Link do YouTube (normal, `youtu.be` ou Shorts). Para vários, use lista, como nas fotos |
| `vendido` | `sim` deixa o item em cinza com o selo "Vendido" |
| `oculto`  | `sim` tira o item do site sem apagar o arquivo |

### Página de detalhes

Clicar na foto, no nome ou em **Ver detalhes** abre a página do item, com todas as fotos, o vídeo e o texto completo. O texto aceita:

- títulos (`## Especificações`)
- listas (`- item` ou `1. item`)
- tabelas (`| Item | Detalhe |`)
- fotos no meio do texto (`![descrição](fotos/arquivo.jpg)`)
- **negrito**, *itálico*, links e citações (`> dica`)
- um link do YouTube sozinho numa linha vira vídeo

Os itens mais novos aparecem primeiro. Arquivos que começam com `_` são ignorados.

## Configuração

Nome da loja, WhatsApp, Instagram e a frase de apresentação ficam no `loja.md`.

## Como funciona

- `index.html`, `style.css` e `script.js`: a página.
- `.github/workflows/publicar.yml`: a cada envio para a branch `main`, gera a lista de produtos e publica no GitHub Pages.
- `ferramentas/gerar-lista.py`: cria `produtos/lista.json` com todos os produtos.

Para testar no computador:

```bash
python3 ferramentas/gerar-lista.py
python3 -m http.server
```

e abra http://localhost:8000.
