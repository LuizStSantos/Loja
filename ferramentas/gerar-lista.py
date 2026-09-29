#!/usr/bin/env python3
"""Gera produtos/lista.json com todos os arquivos .md da pasta produtos/.

Roda sozinho no GitHub a cada envio. Os arquivos que começam com "_"
(como o _modelo.md) ficam de fora. A ordem é a data em que cada arquivo
entrou no repositório, do mais antigo ao mais novo; o site mostra os
mais novos primeiro.

Para testar no computador: python3 ferramentas/gerar-lista.py
"""
import json
import subprocess
from pathlib import Path

PASTA = Path(__file__).resolve().parent.parent / "produtos"


def data_de_entrada(arquivo: Path) -> int:
    try:
        saida = subprocess.run(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%ct", "--", str(arquivo)],
            capture_output=True, text=True, cwd=PASTA.parent,
        ).stdout.split()
        return int(saida[-1]) if saida else 10**12  # ainda não enviado: conta como o mais novo
    except (OSError, ValueError):
        return int(arquivo.stat().st_mtime)


arquivos = [a for a in PASTA.glob("*.md") if not a.name.startswith("_")]
arquivos.sort(key=lambda a: (data_de_entrada(a), a.name))
lista = [a.name for a in arquivos]

(PASTA / "lista.json").write_text(json.dumps(lista, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"{len(lista)} produtos em produtos/lista.json")
