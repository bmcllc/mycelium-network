# P4 — Relatório de homologação ponta a ponta

**Data:** 2026-09-21  
**Resultado:** APROVADO

## Escopo executado

O P4 foi executado sem ampliar o produto e sem repetir a suíte completa de 207
testes. A homologação combinou uma execução real com dois nós privados e um
teste de integração focado nas estruturas persistentes de Giggs, SporeBank e
Inertia.

| Item | Evidência |
| --- | --- |
| Código homologado | `749106c55576dee7cfe28d9bfc863a3f53b3fa7f` |
| SHA-256 do binário | `5bb4c6ee6df47d37fd800c8187a48dc2f0068e878f057bc8c5d3a70c516cce0f` |
| Plataforma | Linux `6.12.107+deb13-amd64`, `x86_64` |
| Rede | Loopback apenas; A `14011`, B `14012`; mDNS desativado; sem bootstrap público |
| Horizon | A `17511`, B `17512` |
| Teste focado | 1 suíte, 1 teste aprovado |
| Alcance WAN | Não alcançável |

## Resultado por cenário

| Cenário | Resultado | Evidência decisiva |
| --- | --- | --- |
| Publicação e recuperação A → B | Aprovado | Plot transferido pela rede privada, reconstruído byte a byte e recuperado após reinicialização |
| Branches e CAS | Aprovado | Uma atualização concorrente aceita; atualização com valor anterior obsoleto recusada; referências persistiram após reabertura |
| Merge e conflitos | Aprovado | Conflito exposto sem sobrescrita; resolução explícita gerou merge com exatamente dois pais; linhagem persistiu após reinicialização |
| Inertia sobre conteúdo recuperado | Aprovado | Atestação assinada e persistida, com entrada, comandos, ambiente, executor, resultado e artefatos vinculados aos respectivos CIDs |
| Evidência adulterada | Aprovado | Payload com assinatura inválida e artefato com bytes alterados foram recusados; crédito e deploy permaneceram em zero |

## Identificadores registrados

- CID base: `Qm76b03b17c0f26ddec1679222c2dc0d99fb2590739403b434f00b5983cb77c56f`
- CID do merge: `Qmb074f9876dc62de867b895002053ae04f28124e26bf8684951cbd7bc4f7f4b56`
- CID da atestação: `Qm2cf82b0b6f647e541c440caed5feedad920fbf5ae1b920e786d50e7edd191a31`
- CID completo do artefato: `Qm974eb46fd4e34a687aa889865b20eb4987d5f9172111655efd09204385674c43`

## Rede privada e isolamento

Os dois daemons foram iniciados com armazenamento, identidade e portas
separados. O nó B usou exclusivamente a seed privada do nó A. Ambos observaram
um único vizinho, a replicação A → B foi concluída e o fluxo remoto do Inertia
produziu o `MomentumReport`. O deploy permaneceu restrito ao nó de origem. Os
processos e diretórios temporários foram removidos pelo encerramento do roteiro.

## Observação sobre a interface

A CLI atual não expõe `repo publish`, `repo clone`, merge, histórico ou leitura
direta da loja de atestações. Por isso, os critérios de persistência e segurança
foram exercitados pelo teste focado usando `Mesh`, `RefStore`,
`merge_three_way` e `AttestationStore`, isto é, as estruturas e formatos
persistentes usados pelo nó. A execução real de dois nós comprovou em separado
o transporte privado, a replicação, o Inertia remoto e o isolamento do deploy.
Essa limitação de superfície foi registrada no roteiro e não foi mascarada como
um teste de CLI.

## Conclusão

Todos os critérios decisivos foram atendidos: CAS obsoleto recusado, linhagem
recuperada após reinicialização e evidências adulteradas recusadas sem crédito
nem deploy. Nenhum Plot foi publicado na rede pública. A `main` e o PR #4 não
foram alterados, e não houve push, merge ou commit automático.
