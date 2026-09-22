# VEIL Ω P1.2 — Homologação WAN física (pendente)

Base auditada: `e85639d8ee33b62912a04cf07854ef2956d405fe`. Este documento é um roteiro de execução, **não** um certificado de segurança nem um resultado de campo. Os testes existentes com `127.0.0.2/3/4` são uma prova em loopback de processos distintos, não de redes distintas. Não repetir a homologação de QEL/MicroEasy/P4.

## Bloqueadores observados na base

- `crates/mycelium-node/src/organism.rs`: os papéis `relay` e `exit` usam `0.0.0.0:9050/9051` por padrão e assinam `listener.local_addr()` como endpoint. `0.0.0.0` é endereço de escuta, não endereço de anúncio acessível remotamente. Separar `veil_listen` de `veil_advertise`; validar endpoint anunciável e nunca publicar wildcard/loopback fora do modo de teste.
- `crates/mycelium-veil/src/planes/live.rs`: `VeilHopRouter::new()` usa `GhostId::spawn_quick(...)`. Persistir e recuperar identidade de nó (e chave KEM/descritor conforme política de rotação) antes de habilitar pinning durável; reiniciar não pode trocar silenciosamente a identidade. Identidade rotacionada exige atualização explícita dos pins confiáveis.
- `crates/mycelium-node/src/organism.rs` vincula `Exit` ao `actual_addr.ip()`. Para `0.0.0.0` isto não seleciona um IP público específico. Não equiparar IP de bind com IP público observado quando houver NAT; separar bind de origem opcional e anúncio de endpoint, com famílias IP compatíveis.
- CLI `--veil-guard/--veil-middle/--veil-exit` recebe descritores JSON ou arquivos; `--veil-trust papel:hex` deve receber fingerprints por canal independente e confiável. O caminho sem pins não deve ser denominado produção.

Critério de saída dos bloqueadores: um relay inicia, anuncia endpoint roteável e identidade estável, reinicia, continua verificável pelos mesmos pins e é acessível a partir de outra rede. Guard e Middle nunca exercem a política de egress do Exit.

## Ambiente mínimo

- Quatro processos em hosts ou namespaces efetivamente isolados, preferencialmente quatro máquinas: C (cliente), G (Guard), M (Middle), E (Exit). Para comprovar WAN real, pelo menos C e E em redes físicas/ISPs distintos; idealmente cada salto numa rede distinta. Um destino T controlado em outra rede, com log de IP/porta de origem; não usar serviço de terceiro como oráculo único.
- Cada host registra `hostname`, horário UTC, interfaces e IPs efetivos, versão do binário e SHA do commit. Não registrar chaves privadas, URL de navegação nem IDs de sessões. Sincronizar relógio: TTL do descritor = 24 h; tolerância de drift = 5 min.
- DNS e firewall controlados. Isolar o ambiente de tráfego pessoal. Configurar explicitamente IP/porta de escuta e anúncio após a correção acima. NAT precisa de encaminhamento de porta ou conectividade IPv6 efetiva verificada externamente; endereço `0.0.0.0` nunca aparece no JSON distribuído.
- Não declarar navegador inteiro protegido: SOCKS5 cobre apenas aplicativos que usam o proxy. O kill switch existente é do fluxo VEIL e não uma garantia de firewall global; WebRTC, DoH, UDP e outros aplicativos podem sair por fora.

## Procedimento de campo — somente depois de corrigir bloqueadores

1. Build num commit idêntico em C/G/M/E: `cargo build -p mycelium-cli --features veil`. Confirmar caminho do executável e `mycelium daemon --help` / `mycelium veil --help` localmente (não assumir nome de pacote ou flags não verificadas). Usar diretórios de estado separados por host e backups das identidades.
2. Iniciar G e M como `mycelium daemon --veil --veil-role relay --veil-listen <IP_LOCAL>:9050`; iniciar E como `mycelium daemon --veil --veil-role exit --veil-listen <IP_LOCAL>:9051`, com opção de anúncio roteável adicionada na correção. Expor apenas portas VEIL necessárias ao teste. `--veil-listen 0.0.0.0:PORT` significa escutar, nunca anunciar esse IP.
3. Em cada nó, executar `mycelium veil descriptor`; conferir JSON, endpoint roteável e identidade persistente. Transferir o descritor ao cliente e pins GhostId por canais separados autenticados. Arquivos sugeridos: `guard.json`, `middle.json`, `exit.json` (não contêm chave privada).
4. Iniciar C com `mycelium daemon --veil --veil-role client --veil-mode veil --veil-socks5 127.0.0.1:1080 --veil-guard guard.json --veil-middle middle.json --veil-exit exit.json --veil-trust guard:<HEX_G> --veil-trust middle:<HEX_M> --veil-trust exit:<HEX_E>`. Confirmar que o parser aceita as opções na versão implantada.
5. Executar um serviço TCP de eco ou HTTP sob controle em T. Usar cliente SOCKS5 com resolução de domínio remota (`curl --socks5-hostname 127.0.0.1:1080 http://<DOMINIO_DO_T>:<PORTA>/`, se T oferecer HTTP). Conferir resposta e IP de origem observado por T. Não usar apenas portas de origem como prova de anonimato.
6. Capturar tráfego em C/G/M/E/T com `tcpdump` ou ferramenta equivalente, filtrando por IPs/portas dos nós e T. Em C: conexões VEIL somente com G; **nenhuma conexão direta C→T**. Em G: próximo salto M; em M: próximo salto E; em E: conexão E→T. T deve observar o IP público do Exit (considerar NAT). Preservar hash SHA-256, local e horário das capturas, sem publicar traces sensíveis.
7. Interromper G ou M durante um fluxo; verificar encerramento/falha fechada e nenhuma tentativa de C→T. Repetir com descritor adulterado, pin errado, TTL expirado, relógio fora da tolerância e endpoint inatingível: todos devem falhar antes de expor dados. Reiniciar G e verificar manutenção da identidade e validade do pin.
8. Testar resolução de DNS via Exit e capturar DNS/DoH no cliente; `ATYP=0x03` isoladamente não é prova de ausência de vazamentos. Testar destinos internos, IPv6 e DNS rebinding com serviço controlado; não tentar sondar redes de terceiros.

## Evidências e critérios de aprovação

- `WAN_PHYSICAL`: nomes/horários/redes distintos registrados, com traces demonstrando a cadeia C→G→M→E→T; T observa IP público de E e não de C.
- `FAIL_CLOSED`: queda de G/M e adulteração de descritores rejeitadas, sem C→T.
- `IDENTITY_RESTART`: mesmo pin GhostId continua válido após reinício normal; rotação só mediante operação explícita.
- `DNS_AND_EXIT_POLICY`: sem resolução direta do domínio de teste por C; todos os destinos proibidos rejeitados antes da conexão.
- `TRANSPORT_CONFIDENTIALITY`: amostras em enlaces independentes não contêm plaintext HTTP/URL e metadados de rota completos; não interpretar células fixas como proteção absoluta contra análise temporal.
- Todos os itens são `PENDING` até relatório assinado, capturas e logs minimizados serem anexados. Os testes `cargo test --workspace --features veil` publicados permanecem evidência automatizada relatada, não substituem os critérios acima.

## Próxima etapa P1.3 (após WAN_PHYSICAL)

Abstrair o transporte de entrada atrás de interface intercambiável, sem alterar semântica onion e sem fallback direto. Implantar duas bridges independentes e descritores autenticados via múltiplos canais não exclusivos. Testar bloqueio de bridge A, recuperação por B, preservação de identidade/pins, latência, perda e ausência de DNS/direct leak. Avaliação de censura real deve ser separada do laboratório. Manter QEL e economia fora deste marco.
