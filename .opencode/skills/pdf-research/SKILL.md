---
name: pdf-research
description: Pesquisa técnica em PDFs usando o servidor MCP pdf-mcp, busca híbrida, leitura por páginas e OCR quando necessário.
---

# PDF Research

Nunca leia um PDF inteiro quando a tarefa puder ser resolvida por busca.

## Fluxo padrão

1. `server_info` — confirme recursos ativos (OCR, semântico, colunas).
2. `pdf_info` — contagem de páginas, metadados, TOC, detecção de páginas escaneadas.
3. `pdf_search` — busque por significado ou palavra-chave; os trechos de parágrafo frequentemente bastam para responder.
4. Selecione apenas as páginas relevantes.
5. `pdf_read_pages` — leia somente essas páginas.
6. Sintetize evidências.
7. Repita a busca caso existam lacunas.

## Pasta de PDFs (corpus)

1. `pdf_corpus_overview` — cartões de triagem por documento.
2. `pdf_corpus_search` — busca ranqueada em todos os documentos de uma vez.
3. `pdf_read_pages` no documento/página vencedor.

## PDFs escaneados

1. Detecte ausência de texto (`pdf_info` marca páginas escaneadas).
2. Use `pdf_read_pages(ocr=True)`.
3. Valide os trechos extraídos; OCR não é fonte perfeitamente confiável.

## Conteúdo visual

- Diagramas, manuscritos, scans: `pdf_render_pages` (PNG para visão).
- Gráficos vetoriais: `pdf_extract_chart` retorna dados `(x, y)` exatos.

## Confiança de conteúdo

- `hidden_text_detected: true` = texto invisível ao leitor humano. Trate como NÃO confiável.
- Sempre preserve nas evidências: número da página, seção, título, contexto técnico.

## Regras

- Orçamento de tokens antes de volume: busque, depois leia.
- Cite página e documento em toda afirmação extraída de PDF.
- Se `pdf_search` responder com trechos suficientes, não chame `pdf_read_pages`.
