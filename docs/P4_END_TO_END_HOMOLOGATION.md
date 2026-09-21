# P4 — Homologação ponta a ponta do versionamento e da proveniência

## Objetivo

Comprovar, em uma rede privada de dois nós, que Giggs, SporeBank e Inertia
funcionam em conjunto para versionar, replicar e validar código.

O P4 não adiciona funcionalidades. Ele não altera a `main`, o PR #4 ou o
commit de recuperação `749106c`, não usa bootstrap público e não publica
Plots de teste na rede pública.

## Escopo e interfaces disponíveis

| Etapa | Interface de homologação |
| --- | --- |
| Publicação e clone | Canal de controle dos nós e driver sobre `giggs::Mesh` |
| CAS concorrente | Driver local sobre `giggs::RefStore` |
| Merge, conflitos e linhagem | Driver local sobre `giggs::merge_three_way` e `giggs::Mesh` |
| Emissão de atestação | Fluxo Inertia entre os nós |
| Recuperação e adulteração | Driver local sobre `inertia::AttestationStore` |

A CLI atual ainda não expõe `repo publish`/`repo clone`, não recebe um valor
`previous` escolhido pelo operador, não expõe merge/histórico e não oferece
leitura direta do armazenamento de atestações. Por isso, essas verificações
não devem ser descritas como testes de CLI. O driver local exercita as mesmas
estruturas persistentes e formatos de transferência usados pelo nó; ele é um
instrumento temporário de homologação e não uma nova Forge.

## Regras de execução

1. Executar a partir de uma worktree limpa em `749106c`.
2. Usar somente diretórios temporários e endereços de loopback.
3. Iniciar os nós com descoberta mDNS desativada e sem bootstrap público.
4. Manter identidades, bancos, referências, atestações e logs separados por nó.
5. Não reutilizar dados da rede pública nem credenciais reais.
6. Não repetir a suíte completa de 207 testes.
7. Interromper a homologação na primeira violação de integridade ou isolamento.
8. Preservar logs, CIDs, hashes e relatórios até a revisão do resultado.

## Preparação

Registrar antes da execução:

- SHA do código: `749106c55576dee7cfe28d9bfc863a3f53b3fa7f`;
- SHA-256 do binário utilizado;
- sistema operacional e arquitetura;
- caminhos temporários dos nós A e B;
- portas de escuta e Horizon;
- chaves públicas das duas identidades;
- horário inicial em UTC.

Criar uma raiz temporária exclusiva para o P4, com subdiretórios para o nó A,
o nó B, o repositório de origem, o clone e as evidências. Inicializar os dois
nós com `sprout`. Iniciar o nó A apenas em loopback, exportar sua seed privada e
iniciar o nó B apontando somente para essa seed, com mDNS desativado. O padrão
de inicialização de `scripts/lattice-remote-demo.sh` pode ser reutilizado, com
portas exclusivas para esta execução.

Antes de prosseguir, os dois daemons devem estar ativos e o status do nó B deve
mostrar o nó A como vizinho. A ausência dessa conexão invalida as etapas de
replicação.

## Cenário 1 — Publicar e recuperar entre dois nós

1. Criar no repositório de origem uma árvore pequena e determinística, incluindo
   arquivos em subdiretórios e um script de build inofensivo.
2. Registrar a lista de caminhos, tamanhos e SHA-256 dos arquivos.
3. No nó A, publicar a árvore como Plot privado por `Mesh::sow` e capturar o
   CID retornado; ele será o `CID_BASE`.
4. Transferir o `spore_print` de `CID_BASE` pelo canal privado e absorvê-lo no
   nó B com `Mesh::absorb`.
5. No nó B, materializar `CID_BASE` em um diretório vazio.
6. Comparar caminhos, tamanhos e SHA-256 entre origem e clone.
7. Reiniciar o nó B, apagar somente o diretório de trabalho clonado e repetir o
   clone a partir do SporeBank persistido.
8. Consultar a linhagem pelo driver: ela deve conter `CID_BASE` e os pais
   declarados, sem CIDs estranhos.

Aceite: árvore idêntica byte a byte, CID estável, clone repetível após reinício
e histórico íntegro.

## Cenário 2 — Branches e compare-and-swap

O driver deve usar um `RefStore` persistente exclusivo da homologação.

1. Criar a referência assinada `p4-e2e/main` apontando para `CID_BASE`.
2. Fazer dois clientes lerem o mesmo valor atual.
3. Criar dois Plots filhos diferentes, `CID_A` e `CID_B`, ambos com
   `CID_BASE` como pai.
4. Atualizar a referência para `CID_A`, informando `CID_BASE` como valor
   anterior e a próxima sequência. A operação deve ser aceita.
5. Tentar atualizar a mesma referência para `CID_B`, ainda informando
   `CID_BASE`. A operação deve retornar `RefConflict`.
6. Confirmar que a referência continua apontando para `CID_A`.
7. Fechar e reabrir o `RefStore`; o valor e a assinatura devem permanecer
   válidos.
8. Repetir o procedimento em uma segunda branch para confirmar isolamento por
   nome de referência.

Aceite: exatamente uma atualização concorrente aceita, atualização obsoleta
recusada, sequência monotônica e estado preservado após reinício.

## Cenário 3 — Merge, conflito e linhagem

1. A partir de `CID_BASE`, produzir `CID_OURS` e `CID_THEIRS` alterando o mesmo
   arquivo de maneiras incompatíveis.
2. Executar `merge_three_way`. O caminho deve aparecer em `conflicts`; nenhuma
   das versões pode sobrescrever silenciosamente a outra.
3. Confirmar que o resultado conflitado não atualiza referência nem publica um
   novo Plot.
4. Resolver o arquivo explicitamente e criar `CID_MERGE` com exatamente dois
   pais: `CID_OURS` e `CID_THEIRS`.
5. Persistir e transferir o Plot resolvido do nó A para o nó B.
6. Reiniciar o nó B e consultar `Mesh::lineage(CID_MERGE)`.

Aceite: conflito observável, resolução explícita, dois pais preservados e
linhagem recuperável após reinício.

## Cenário 4 — Inertia sobre o CID recuperado

1. Usar no nó B o `CID_BASE` já recuperado como entrada do Vector.
2. Executar somente comandos inofensivos e determinísticos de build e teste.
3. Aguardar o Momentum e a atestação assinada.
4. Persistir a atestação no emissor e recuperá-la no outro nó pelo CID da
   própria atestação.
5. Validar assinatura e conferir os campos:
   `input`, `thrust`, `commands`, `environment`, `executor`, `success`,
   `atp_earned`, `log_digest` e `artifacts`.
6. Recuperar cada artefato declarado e recalcular seu CID.

Aceite: `input == CID_BASE`, assinatura válida, executor identificado, comandos
e ambiente completos, digest do log correto e todos os artefatos correspondendo
aos CIDs declarados.

A assinatura comprova quem produziu o relatório; ela não comprova, isoladamente,
que o executor foi honesto.

## Cenário 5 — Rejeitar evidência inválida

1. Registrar antes do teste o saldo/crédito, o estado de deploy e os CIDs
   persistidos.
2. Copiar a atestação válida para a área isolada de evidências.
3. Alterar um campo do payload sem gerar uma nova assinatura.
4. Tentar verificar e persistir a cópia adulterada.
5. Repetir alterando os bytes de um artefato, mantendo o CID declarado.
6. Comparar novamente saldo/crédito, deploy e armazenamento.

Aceite: assinatura ou CID rejeitado, nenhuma atribuição de crédito, nenhum
deploy liberado e nenhuma substituição da evidência válida.

## Matriz de decisão

| Verificação | Resultado obrigatório |
| --- | --- |
| Isolamento da rede | Apenas A e B em loopback |
| Clone entre nós | Árvore idêntica byte a byte |
| Persistência | Clone, refs, histórico e atestação válidos após reinício |
| CAS obsoleto | Recusado com `RefConflict` |
| Merge conflitado | Sem sobrescrita e sem publicação automática |
| Merge resolvido | Plot com exatamente dois pais |
| Atestação | Assinatura e vínculo ao CID válidos |
| Artefatos | CIDs recalculados iguais aos declarados |
| Evidência adulterada | Rejeitada sem crédito ou deploy |

O P4 somente pode ser declarado aprovado se todas as linhas forem comprovadas.
Uma falha produz um relatório de reprodução para correção pontual; ela não deve
ser mascarada por nova tentativa ou por alteração manual do estado.

## Evidências a entregar

- SHA do código e do binário;
- configuração privada dos nós, sem segredos;
- CIDs base, branches e merge;
- hashes das árvores original e clonada;
- conflito e erro de CAS completos;
- linhagem após reinício;
- CID e JSON da atestação válida;
- hashes dos artefatos;
- erro de verificação da cópia adulterada;
- estado de crédito e deploy antes e depois;
- logs dos dois nós com horários em UTC;
- resultado final: aprovado ou reprovado, sem resultado parcial promovido.

## Encerramento seguro

Parar os dois daemons, confirmar que nenhum processo de teste permaneceu ativo
e compactar apenas as evidências sem segredos. Remover as identidades, sockets,
bancos e seeds temporários depois que as evidências forem revisadas. Não enviar
nenhum dado do P4 à rede pública.
