# Integração MicroEasy Projects

Base auditada em 21 de setembro de 2026: `main@a6cc5c78f7c814c9d0898de5e72a506b8af0ef41`.

O núcleo já contém QEL, transporte Nostr, SporeBank, armazenamento, CLI, controle do nó e testes de aceitação MEP. A conclusão do MVP de lojinha, biblioteca, conquistas e comunidade foi mantida no repositório MicroEasy Studio para não alterar o transporte homologado sem necessidade.

## Fronteira preservada

- Um pacote é identificado pelo CID; catálogo não altera os bytes.
- ACK de relay e réplica persistente continuam métricas distintas.
- Importação/recuperação deve verificar integridade antes de registrar instalação.
- Mycelium não é requisito para executar conteúdo local já instalado.
- Sincronização social e de biblioteca será opt-in.
- Nenhum coordenador, gateway, relay ou identidade central é obrigatório.

## Extensão futura preparada

Quando os testes locais forem aprovados, os documentos versionados do MicroEasy poderão ser distribuídos como eventos/Plots assinados: manifestos de catálogo, associações de biblioteca, conquistas compartilhadas e perfis/posts. Essa etapa exige definição de kinds/tags, política de conflitos, limites de tamanho e testes de spam antes de modificar o protocolo.

Estado: **DOCUMENTADO; IMPLEMENTAÇÃO DE SINCRONIZAÇÃO NÃO INICIADA**, evitando regressão do QEL compacto já homologado.
