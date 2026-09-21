# P5 — Interface Mycelium para o MicroEasy

## Contrato exposto

O P5 reutiliza Giggs, SporeBank e Inertia; não cria uma Forge ou um sistema paralelo.

- `repo publish --expected-previous-cid <CID>` publica uma nova revisão somente quando a referência atual ainda aponta para o pai esperado. A divergência é rejeitada, preservando compare-and-swap explícito.
- `repo validate --cid <CID>` executa build e testes Inertia sobre o snapshot informado e devolve os CIDs das atestações e do artefato.
- `repo attestation --cid <CID>` recupera uma atestação persistida. O nó verifica o CID do conteúdo e a assinatura antes da resposta; a CLI verifica novamente a assinatura recebida.

Os pedidos equivalentes no protocolo de controle são `repo_publish` com `expected_previous_cid`, `inertia_run` e `inertia_attestation`.

## Semântica da validação

O build é executado antes dos testes. Se falhar, uma atestação negativa é persistida e nenhum teste ou artefato aprovado é emitido. Quando ambos passam, as atestações ficam vinculadas ao CID de entrada, comandos, ambiente, executor, resultado, logs e CID do artefato.

O formato de CID aceito permanece compatível com o identificador hexadecimal de 64 caracteres e com sua representação prefixada por `Qm`.

## Limites e segurança

- A assinatura comprova autoria e integridade da atestação; não comprova que o executor é honesto.
- O CAS protege a atualização da referência, mas o chamador ainda deve escolher e conferir o pai esperado.
- A interface não promove releases nem publica conteúdo automaticamente na rede pública.
- O P4 não é reaberto. Esta alteração apenas disponibiliza para o MicroEasy as primitivas já homologadas.
