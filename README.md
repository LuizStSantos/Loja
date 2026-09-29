# Bazar do Luiz

Vitrine de itens à venda. Cada produto é um arquivo Markdown, o visitante filtra por tipo e o botão **Quero comprar** abre o WhatsApp com uma mensagem pronta.

## Postar um item

1. Na pasta `produtos/`, copie o `_modelo.md` e dê um nome novo, por exemplo `geladeira-brastemp.md`.
2. Preencha os dados e a descrição.
3. Se tiver foto, envie para a pasta `fotos/` e coloque o caminho em `imagem:`.
4. Salve (commit). Em cerca de um minuto o site é atualizado.

```markdown
---
titulo: Geladeira Brastemp 375 L
tipo: Eletrodomésticos
preco: 1.400,00
imagem: fotos/geladeira.jpg
estado: Usado
vendido: não
oculto: não
---

Frost free, 110 V. Funcionando perfeitamente.
- Retirada no local
```

| Campo     | Para que serve |
|-----------|----------------|
| `titulo`  | Nome do item |
| `tipo`    | Categoria; os botões de filtro são criados a partir dela |
| `preco`   | Valor em reais (`850`, `850,00` ou `1.200,50`). Sem preço aparece "Consulte" |
| `imagem`  | Caminho da foto (`fotos/...`) ou link de uma imagem |
| `estado`  | Novo, Seminovo, Usado… |
| `vendido` | `sim` deixa o item em cinza com o selo "Vendido" |
| `oculto`  | `sim` tira o item do site sem apagar o arquivo |

Os itens mais novos aparecem primeiro. Arquivos que começam com `_` são ignorados.

## Configuração

Nome da loja, número do WhatsApp e a frase de apresentação ficam no `loja.md`.

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
