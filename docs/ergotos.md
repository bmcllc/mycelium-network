# ErgotOS — o OS que a indústria não pode matar

> Nome fechado pelo Bruno. *Claviceps purpurea*: o fungo do centeio que fez
> impérios tremerem sem CEO, servidor central ou licença.

## Visão

Um **OS que simula nativamente qualquer máquina** — computadores, consoles,
mobile, pads — rodando jogos, software e SDKs de tudo, **e** dando controle
total das suas máquinas físicas e dos softwares delas. O computador é a rede:
o navegador é o terminal, o micélio é o ferro.

## Pilares (mapeados no código)

| Pilar | Onde vive hoje |
|---|---|
| Qualquer app no navegador, zero instalação | Event Horizon `/{ion}/` → vira o shell do ErgotOS (`/console`) |
| Máquinas legadas renascem | `lattice resurrect firmware.bin` + Forja (`base-fw/bir/evolve/hil/pcb`) |
| Controle total do hardware | B.A.S.E.: descobrir, destravar, descrever, interagir |
| Rodar de graça, pagar em nutrientes | Vouchers ATP por hospedagem/janela; Inertia paga computação |
| Estado que te segue | GhostID + Nucleus + Spore Bank (sessão itinerante) |

## Encaixe das marcas-irmãs

- **RIZOMORFO** = camada de transporte da rede: o stack que atravessa
  CGNAT/5G/firewall sem pedir licença (Nostr transport, QEL, CandidateRelay,
  DistanceBridge). *"A rede que não pede IP."*
- **REVENANT** = pipeline de ressurreição de máquinas mortas: `resurrect`
  firmware.bin/ROM/ISO → análise B.A.S.E. → Plot → Ion executável.
  *"Nenhum hardware morre de verdade."*

## Tecnologias novas a cultivar (roadmap ErgotOS)

1. **Shell ErgotOS no `/console`**: desktop no navegador — Ions vivos de toda
   a rede (Growth Zones/Direct), terminal web → socket de controle, arquivos
   via Spore Bank, janelas = Ions
2. **Cápsulas de máquina**: Ions com emuladores (QEMU/RetroArch headless como
   layers Vacuum) — console/mobile/pad nativo dentro do micélio
3. **Índice global de Ions**: diretório pesquisável "o que está vivo agora"
4. **SDK Ergot**: empacotar qualquer software como Ion declarativo (Void +
   layers + manifest)
5. **Reputação anti-Sybil** para a economia aguentar escala
