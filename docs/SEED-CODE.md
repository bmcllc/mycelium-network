# Seed Code — Distribuição de Código via Mycelium Network

Guia completo para publicar e baixar código-fonte diretamente pela rede P2P,
**sem git, sem GitHub, sem servidor central**.

---

## O que é

O Mycelium Network é capaz de distribuir código-fonte entre nós usando
seu próprio protocolo P2P. Todo código é content-addressed (hash SHA-256),
armazenado no Spore Bank local e propagado via gossipsub.

```
┌──────────────────────┐          ┌──────────────────────┐
│   Nó A (publicador)  │          │   Nó B (receptor)    │
│                      │          │                      │
│  seed-code ──────────┼─ gossip →│  ── recall-code      │
│  (código → Plot)     │          │  (Plot → código)     │
└──────────────────────┘          └──────────────────────┘
        sem git                           sem git
        sem GitHub                        sem GitHub
        sem IP/chave                      sem IP/chave
```

---

## Passo a passo: Publicar código

### 1. Tenha o Mycelium compilado

```bash
# Compila o daemon + CLI
cargo build -p mycelium-cli
```

### 2. Inicia um nó (se ainda não tem)

```bash
# Sprout (gera identidade)
./target/debug/mycelium sprout --contribute 2cpu,4gb,50gb

# Daemon (fica rodando em background)
RUST_LOG=info ./target/debug/mycelium daemon \
  --contribute 2cpu,4gb,50gb \
  --sporocarp \
  --horizon-port 7474 \
  --listen "/ip4/0.0.0.0/tcp/4001"
```

### 3. Publica o código

```bash
# Opção A: seed-code (direto, sem git)
./target/debug/mycelium seed-code \
  --path /caminho/do/seu/projeto \
  --name "meu-projeto" \
  --description "Descrição do que o projeto faz"

# Saída:
# [🍄] seed-code: 12 arquivos (4523 bytes) de '/caminho/do/seu/projeto'
# [🍄] 📦 'meu-projeto' semead na rede: plot=QmXXX..., 12 arquivos, 4523 bytes
#
# Para baixar em outro nó:
#   mycelium recall-code --plot QmXXX...
```

### 4. (Opcional) Anuncia também no gossip

```bash
# Anuncia o repo via gossip (outros nós recebem o nome + URL)
./target/debug/mycelium seed-repo \
  --name "meu-projeto" \
  --url "https://github.com/meu-usuario/meu-projeto.git" \
  --commit "$(git rev-parse --short HEAD)" \
  --description "Descrição do projeto"
```

---

## Passo a passo: Baixar código

### 1. Inicia um nó receptor

```bash
# Bootstrap em algum nó da rede (ou --public-bootstrap)
./target/debug/mycelium daemon \
  --bootstrap "/ip4/192.168.1.100/tcp/4001/p2p/PEER_ID" \
  --no-mdns
```

### 2. Lista repositórios anunciados

```bash
# Mostra repos que peers anunciaram via gossip
./target/debug/mycelium repos

# Saída:
# 📦 meu-projeto
#    url: mycelium://plot/QmXXX...
#    commit: 52ea21689265e033
#    desc: Descrição do projeto
#    from: 2a05114bee7f...
```

### 3. Baixa o código

```bash
# Opção A: recall-code (extrai os arquivos)
./target/debug/mycelium recall-code --plot QmXXX...

# Saída:
# 📦 12 arquivos extraídos em meu-projeto/

# Opção B: download via HTTP (Event Horizon)
curl http://127.0.0.1:7474/code/QmXXX.../main.rs
```

### 4. Verifica o conteúdo

```bash
ls meu-projeto/
# main.rs  Cargo.toml  README.md

cat meu-projeto/main.rs
# fn main() { println!("olá!"); }
```

---

## Fluxo completo (do zero)

```bash
# === NO NÓ A (publicador) ===

# 1. Compila
cargo build -p mycelium-cli

# 2. Inicia nó
./target/debug/mycelium sprout --contribute 2cpu,4gb,50gb
RUST_LOG=info ./target/debug/mycelium daemon --sporocarp --horizon-port 7474 &

# 3. Publica código
./target/debug/mycelium seed-code \
  --path ./meu-projeto \
  --name "meu-projeto" \
  --description "Meu app P2P"
# → plot=QmXXX...

# === NO NÓ B (receptor, qualquer lugar do mundo) ===

# 4. Inicia nó com bootstrap no A
./target/debug/mycelium sprout --contribute 2cpu,4gb,50gb
./target/debug/mycelium daemon \
  --bootstrap "/ip4/IP-DO-A/tcp/4001/p2p/PEER_ID_A" &

# 5. Baixa o código
./target/debug/mycelium recall-code --plot QmXXX...
# → 📦 12 arquivos extraídos em meu-projeto/
```

---

## Como funciona por baixo dos panos

### Seed Code → Plot → Spore Bank

```
1. seed-code lê os arquivos do diretório
2. Cada arquivo vira uma Leaf { path, content }
3. Cria um Plot { author, message, leaves }
4. SporeBank::deposit(plot) → ContentId (hash)
5. fruit_ion() → ion visível no Event Horizon
6. Envelope::RepoAnnounce → gossipsub → peers recebem
```

### Recall Code ← Plot ← Spore Bank

```
1. recall-code recebe um ContentId (Qm...)
2. SporeBank::recall(plot_id) → Plot
3. Para cada Leaf → extrai arquivo no disco
4. Pronto! Código fonte restaurado.
```

### Segurança

| Aspecto | Como funciona |
|---------|---------------|
| **Integridade** | Content-addressed (hash SHA-256) — qualquer alteração muda o ContentId |
| **Imutabilidade** | Plot é append-only, não pode ser modificado depois de semeado |
| **Privacidade** | Sem dados sensíveis trafegam (IPs, chaves, senhas) |
| **Distribuição** | Gossipsub propaga automaticamente entre peers conectados |

---

## Comparação: Git vs Mycelium

| | Git | Mycelium |
|---|-----|----------|
| **Requer servidor** | GitHub, GitLab, etc. | Nenhum (P2P) |
| **Requer auth** | Token, SSH key | Nenhum |
| **Requer internet** | Sim | Sim (mas via relay se NAT) |
| **Content-addressed** | Sim (SHA-1) | Sim (SHA-256) |
| **Distribuído** | Parcialmente | Totalmente |
| **Propagação manual** | `git push` | Automático (gossipsub) |
| **Ponto central** | GitHub | Nenhum |

---

## Resumo dos comandos

```bash
# Publicar código (sem git):
mycelium seed-code --path ./projeto --name "nome" --desc "descrição"

# Anunciar repo git (opcional):
mycelium seed-repo --name "repo" --url "https://..." --commit "abc123" --desc "desc"

# Listar repos anunciados:
mycelium repos

# Baixar código:
mycelium recall-code --plot QmXXX...

# Download via HTTP:
curl http://127.0.0.1:7474/code/QmXXX.../arquivo.rs
```
