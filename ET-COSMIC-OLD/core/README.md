# VOID-QRC Core (Fase 1)

Módulo Python **LUSUS-Q + D-LQA** — migrado de `quantum/` para estrutura industrial.

```
core/
├── tensor_networks/   spin_networks.py, mera_compiler.py, hermiticity.py
├── hamiltonians/      anderson.py (Jaula de Anderson · SKU-A/B)
└── tests/             gate Hermiticidade (pre-commit)
```

## Testes

```bash
pip install -r core/requirements.txt
npm run core:test
```

## Git hook

```bash
npm run hooks:install
```

Nenhum commit passa se `core/tests/` falhar.

Documento principal: [docs/obsidian/VOID-QRC-PLANO-INDUSTRIA.md](../docs/obsidian/VOID-QRC-PLANO-INDUSTRIA.md)
