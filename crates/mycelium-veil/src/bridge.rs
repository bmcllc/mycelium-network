//! Pontes de entrada intercambiáveis (P1.3).
//!
//! O transporte de entrada — como o cliente alcança o **Guard** (primeiro
//! salto do circuito) — é abstraído atrás da trait [`EntryTransport`].
//! Isso permite alternar entre **duas entradas independentes** diante do
//! bloqueio da entrada primária, sem alterar a semântica onion do circuito
//! (Guard → Middle → Exit, células de 512 bytes, pins GhostId, QEL).
//!
//! Transportes fornecidos:
//! - [`DirectEntry`]: TCP direto ao endpoint anunciado do Guard (baseline);
//! - [`BridgeEntry`]: conexão através de um nó bridge independente
//!   ([`BridgeRelay`]), que encaminha o enlace bruto para o Guard.
//!
//! # Fail-closed
//!
//! [`EntryPool::connect`] tenta as entradas em ordem; se a primária ficar
//! inacessível, alterna para a secundária. Se **todas** falharem, o circuito
//! falha fechado: **nenhuma** tentativa de conexão direta ao destino final da
//! aplicação é feita — o erro é explícito.
//!
//! # Segurança em relação à bridge
//!
//! A bridge é um shim de transporte **não confiável**: ela só repassa bytes
//! opacos entre cliente e Guard. O handshake de enlace (ML-KEM-1024 +
//! autenticação GhostId) ocorre **ponta a ponta** cliente↔Guard, através do
//! relay. Uma bridge que desvie ou substitua o fluxo falha a autenticação em
//! `link_handshake_client` e o circuito é abortado — nunca há downgrade para
//! conexão direta nem salto sem pin.

use std::fmt;
use std::future::Future;
use std::net::SocketAddr;
use std::pin::Pin;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;
use std::time::Duration;

use tokio::io::copy_bidirectional;
use tokio::net::{TcpListener, TcpStream};

use crate::VeilError;

/// Conexão de entrada estabelecida: o fluxo TCP bruto para o Guard e o
/// identificador do transporte que venceu (para logs e seleção futura).
#[derive(Debug)]
pub struct EntryConnection {
    /// Stream cru até o Guard. O handshake de enlace PQC acontece **depois**,
    /// ponta a ponta, através desta stream.
    pub stream: TcpStream,
    /// Identificador do transporte de entrada utilizado.
    pub entry_id: String,
}

/// Transporte de entrada intercambiável (P1.3).
///
/// Contrato de segurança: nenhuma implementação pode conectar ao **destino
/// final** da aplicação — apenas ao Guard (diretamente ou via bridge).
pub trait EntryTransport: Send + Sync + fmt::Debug {
    /// Identificador estável do transporte (para logs e seleção).
    fn id(&self) -> &str;

    /// Estabelece o enlace TCP até o Guard através deste transporte.
    ///
    /// `guard_endpoint` é o endpoint anunciado do Guard no formato `host:porta`
    /// (aceita hostname, como o descritor assinado). É usado pelo [`DirectEntry`];
    /// implementações de bridge conectam no relay da bridge, que conhece o alvo.
    /// O tempo de conexão é limitado internamente.
    fn connect<'a>(
        &'a self,
        guard_endpoint: &'a str,
    ) -> Pin<Box<dyn Future<Output = Result<TcpStream, VeilError>> + Send + 'a>>;
}

/// Tempo limite padrão para estabelecimento de uma entrada.
pub const DEFAULT_ENTRY_TIMEOUT: Duration = Duration::from_secs(15);

/// Tempo limite padrão para o handshake autenticado de uma entrada (pós-TCP).
///
/// Cobre o caso de bridge que aceita a conexão e não responde (blackhole) ou
/// encerra/corrompe o fluxo no meio do handshake com o Guard.
pub const ENTRY_HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(15);

/// Entrada direta: TCP ao endpoint anunciado do Guard (sem bridge).
///
/// É o comportamento histórico do cliente; mantido como baseline intercambiável.
#[derive(Clone, Debug)]
pub struct DirectEntry {
    id: String,
    timeout: Duration,
}

impl DirectEntry {
    /// Cria uma entrada direta com o identificador fornecido.
    pub fn new(id: impl Into<String>) -> Self {
        Self::with_timeout(id, DEFAULT_ENTRY_TIMEOUT)
    }

    /// Cria uma entrada direta com tempo limite customizado.
    pub fn with_timeout(id: impl Into<String>, timeout: Duration) -> Self {
        Self { id: id.into(), timeout }
    }
}

impl EntryTransport for DirectEntry {
    fn id(&self) -> &str {
        &self.id
    }

    fn connect<'a>(
        &'a self,
        guard_endpoint: &'a str,
    ) -> Pin<Box<dyn Future<Output = Result<TcpStream, VeilError>> + Send + 'a>> {
        let id = self.id.clone();
        let timeout = self.timeout;
        let guard_ep = guard_endpoint.to_string();
        Box::pin(async move {
            match tokio::time::timeout(timeout, TcpStream::connect(guard_ep.as_str())).await {
                Ok(Ok(stream)) => Ok(stream),
                Ok(Err(e)) => Err(VeilError::Circuit(format!(
                    "entrada direta '{id}' falhou ao conectar no Guard ({guard_ep}): {e}"
                ))),
                Err(_) => Err(VeilError::Circuit(format!(
                    "entrada direta '{id}' excedeu {timeout:?} ao conectar no Guard {guard_ep}"
                ))),
            }
        })
    }
}

/// Entrada através de uma bridge: conecta no relay da bridge, que encaminha o
/// fluxo bruto para o Guard.
///
/// O cliente **nunca** diala o endpoint do Guard nem o destino final; a bridge
/// é um relay opaco (`BridgeRelay`) que só repassa bytes. A autenticação
/// cliente↔Guard permanece ponta a ponta.
#[derive(Clone, Debug)]
pub struct BridgeEntry {
    id: String,
    bridge_endpoint: SocketAddr,
    timeout: Duration,
}

impl BridgeEntry {
    /// Cria uma entrada de bridge apontando para o relay da bridge.
    pub fn new(id: impl Into<String>, bridge_endpoint: SocketAddr) -> Self {
        Self::with_timeout(id, bridge_endpoint, DEFAULT_ENTRY_TIMEOUT)
    }

    /// Cria uma entrada de bridge com tempo limite customizado.
    pub fn with_timeout(id: impl Into<String>, bridge_endpoint: SocketAddr, timeout: Duration) -> Self {
        Self { id: id.into(), bridge_endpoint, timeout }
    }
}

impl EntryTransport for BridgeEntry {
    fn id(&self) -> &str {
        &self.id
    }

    fn connect<'a>(
        &'a self,
        _guard_endpoint: &'a str,
    ) -> Pin<Box<dyn Future<Output = Result<TcpStream, VeilError>> + Send + 'a>> {
        let id = self.id.clone();
        let bridge_endpoint = self.bridge_endpoint;
        let timeout = self.timeout;
        Box::pin(async move {
            match tokio::time::timeout(timeout, TcpStream::connect(bridge_endpoint)).await {
                Ok(Ok(stream)) => Ok(stream),
                Ok(Err(e)) => Err(VeilError::Circuit(format!(
                    "bridge '{id}' inacessível ({bridge_endpoint}): {e}"
                ))),
                Err(_) => Err(VeilError::Circuit(format!(
                    "bridge '{id}' excedeu {timeout:?} em {bridge_endpoint}"
                ))),
            }
        })
    }
}

/// Pool de entradas de transporte (P1.3).
///
/// Tenta as entradas em ordem — começando pela que funcionou por último —
/// e comuta para a próxima diante de falha. Se todas falharem, falha fechado:
/// **nenhuma** conexão direta ao destino final é tentada.
#[derive(Debug)]
pub struct EntryPool {
    entries: Vec<Arc<dyn EntryTransport>>,
    /// Tempo limite aplicado ao handshake autenticado por tentativa.
    handshake_timeout: Duration,
    /// Índice da entrada que funcionou por último (ordem preferencial).
    active: StdMutex<Option<usize>>,
    /// Entrada que autenticou com o Guard na última chamada bem-sucedida.
    last_successful: StdMutex<Option<String>>,
    /// Número de entradas que falharam antes do sucesso (ou até esgotar) na última chamada.
    last_failover_attempts: StdMutex<usize>,
    /// Motivos de falha por entrada/estágio da última chamada (observabilidade p/ status).
    last_failures: StdMutex<Vec<String>>,
}

impl Default for EntryPool {
    fn default() -> Self {
        Self::new()
    }
}

impl EntryPool {
    /// Pool vazio (use [`EntryPool::push`] para registrar as entradas).
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
            handshake_timeout: ENTRY_HANDSHAKE_TIMEOUT,
            active: StdMutex::new(None),
            last_successful: StdMutex::new(None),
            last_failover_attempts: StdMutex::new(0),
            last_failures: StdMutex::new(Vec::new()),
        }
    }

    /// Ajusta o tempo limite do handshake autenticado por tentativa de entrada.
    pub fn set_handshake_timeout(&mut self, timeout: Duration) -> &mut Self {
        self.handshake_timeout = timeout;
        self
    }

    /// Registra uma entrada de transporte (ordem = prioridade inicial).
    pub fn push(&mut self, entry: Arc<dyn EntryTransport>) -> &mut Self {
        self.entries.push(entry);
        self
    }

    /// Quantidade de entradas registradas.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Verdadeiro se nenhuma entrada foi registrada.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Entradas registradas, na ordem atual.
    pub fn entries(&self) -> &[Arc<dyn EntryTransport>] {
        &self.entries
    }

    /// Conecta ao Guard tentando as entradas em ordem.
    ///
    /// A entrada que funcionou por último é tentada primeiro (rotação); após
    /// todas as tentativas falharem, retorna erro **fail-closed** — nunca
    /// conecta ao destino final da aplicação.
    pub async fn connect(&self, guard_endpoint: &str) -> Result<EntryConnection, VeilError> {
        if self.entries.is_empty() {
            return Err(VeilError::Circuit(
                "fail-closed: nenhuma entrada de transporte registrada no pool".into(),
            ));
        }

        let active_idx = self.active.lock().unwrap().unwrap_or(0);
        let mut failures: Vec<String> = Vec::new();

        for offset in 0..self.entries.len() {
            let idx = (active_idx + offset) % self.entries.len();
            let entry = &self.entries[idx];
            match entry.connect(guard_endpoint).await {
                Ok(stream) => {
                    let entry_id = entry.id().to_string();
                    *self.active.lock().unwrap() = Some(idx);
                    *self.last_successful.lock().unwrap() = Some(entry_id.clone());
                    *self.last_failover_attempts.lock().unwrap() = failures.len();
                    *self.last_failures.lock().unwrap() = failures.clone();
                    tracing::info!(entry = %entry_id, guard = %guard_endpoint, "entrada de transporte estabelecida");
                    return Ok(EntryConnection { stream, entry_id });
                }
                Err(e) => {
                    tracing::warn!(entry = %entry.id(), error = %e, "entrada de transporte falhou; tentando próxima");
                    failures.push(format!("{}(TCP): {e}", entry.id()));
                }
            }
        }

        *self.last_successful.lock().unwrap() = None;
        *self.last_failover_attempts.lock().unwrap() = failures.len();
        *self.last_failures.lock().unwrap() = failures.clone();

        Err(VeilError::Circuit(format!(
            "fail-closed: todas as {} entradas de transporte inacessíveis — circuito abortado \
             sem fallback direto ao destino (falhas: {})",
            self.entries.len(),
            failures.join("; ")
        )))
    }

    /// Estabelece a entrada **e só a considera operacional após o handshake
    /// autenticado com o Guard** concluir com sucesso (P1.3.1).
    ///
    /// `handshake` recebe a stream TCP de cada tentativa e executa o handshake
    /// de enlace + autenticação de identidade — nunca reduzindo a exigência de
    /// autenticação. Uma falha nesse estágio (erro ou timeout) libera a
    /// conexão e tenta a próxima entrada, cobrindo bridges que aceitam TCP mas
    /// bloqueiam, encerram ou corrompem o fluxo depois. Se todas falharem,
    /// retorna erro **fail-closed**, sem qualquer conexão direta ao destino.
    ///
    /// `T` é o artefato produzido pelo handshake (ex.: stream segura + chaves
    /// do primeiro salto); o par retornado inclui o identificador da entrada
    /// que autenticou.
    pub async fn connect_authenticated<T, F>(
        &self,
        guard_endpoint: &str,
        handshake: &mut F,
    ) -> Result<(T, String), VeilError>
    where
        F: FnMut(TcpStream) -> Pin<Box<dyn Future<Output = Result<T, VeilError>> + Send>>,
    {
        if self.entries.is_empty() {
            return Err(VeilError::Circuit(
                "fail-closed: nenhuma entrada de transporte registrada no pool".into(),
            ));
        }

        let active_idx = self.active.lock().unwrap().unwrap_or(0);
        let mut failures: Vec<String> = Vec::new();

        for offset in 0..self.entries.len() {
            let idx = (active_idx + offset) % self.entries.len();
            let entry = &self.entries[idx];
            let attempted_id = entry.id().to_string();

            // Estágio 1: estabelecimento TCP.
            let stream = match entry.connect(guard_endpoint).await {
                Ok(s) => s,
                Err(e) => {
                    tracing::warn!(entry = %attempted_id, error = %e, "entrada falhou no TCP; tentando próxima");
                    failures.push(format!("{attempted_id} (TCP): {e}"));
                    continue;
                }
            };

            // Estágio 2: handshake autenticado com o Guard. Aceitar TCP sem
            // encaminhar corretamente NÃO conta como entrada operacional.
            match tokio::time::timeout(self.handshake_timeout, handshake(stream)).await {
                Ok(Ok(result)) => {
                    *self.active.lock().unwrap() = Some(idx);
                    *self.last_successful.lock().unwrap() = Some(attempted_id.clone());
                    *self.last_failover_attempts.lock().unwrap() = failures.len();
                    *self.last_failures.lock().unwrap() = failures.clone();
                    tracing::info!(entry = %attempted_id, guard = %guard_endpoint, "entrada autenticada com o Guard");
                    return Ok((result, attempted_id));
                }
                Ok(Err(e)) => {
                    tracing::warn!(entry = %attempted_id, error = %e, "entrada falhou no handshake autenticado; tentando próxima");
                    failures.push(format!("{attempted_id} (handshake): {e}"));
                }
                Err(_) => {
                    let msg = format!("handshake excedeu {:?}", self.handshake_timeout);
                    tracing::warn!(entry = %attempted_id, error = %msg, "entrada silenciosa no handshake; tentando próxima");
                    failures.push(format!("{attempted_id} (handshake): {msg}"));
                }
            }
        }

        *self.last_successful.lock().unwrap() = None;
        *self.last_failover_attempts.lock().unwrap() = failures.len();
        *self.last_failures.lock().unwrap() = failures.clone();

        Err(VeilError::Circuit(format!(
            "fail-closed: todas as {} entradas falharam no TCP ou no handshake autenticado — \
             circuito abortado sem fallback direto ao destino (falhas: {})",
            self.entries.len(),
            failures.join("; ")
        )))
    }

    /// Identificador da entrada que autenticou com o Guard na última chamada
    /// bem-sucedida (observabilidade: "bridge selecionada" no status).
    pub fn last_successful_entry(&self) -> Option<String> {
        self.last_successful.lock().unwrap().clone()
    }

    /// Quantas entradas falharam antes do sucesso na última chamada (ou o total
    /// de falhas quando todas falharam). Observabilidade de failover.
    pub fn last_failover_attempts(&self) -> usize {
        *self.last_failover_attempts.lock().unwrap()
    }

    /// Motivos de falha por entrada/estágio da última chamada
    /// (ex.: `"bridge-1 (handshake): ..."`). Vazio quando a primeira entrada vence.
    pub fn last_failure_reasons(&self) -> Vec<String> {
        self.last_failures.lock().unwrap().clone()
    }
}

/// Relay de bridge: aceita conexões em `listen` e repassa o fluxo TCP bruto
/// para `target` (o Guard). A bridge não participa do handshake de enlace —
/// o tráfego é repassado opaco, célula a célula.
pub struct BridgeRelay;

impl BridgeRelay {
    /// Sobe um relay de bridge em `listen` encaminhando para `target`.
    ///
    /// Devolve um [`BridgeHandle`]; ao dropá-lo, o listener é encerrado.
    pub async fn spawn(listen: SocketAddr, target: SocketAddr) -> Result<BridgeHandle, VeilError> {
        let listener = TcpListener::bind(listen)
            .await
            .map_err(|e| VeilError::Circuit(format!("bridge não pode escutar em {listen}: {e}")))?;
        let listen_addr = listener.local_addr().unwrap_or(listen);

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::mpsc::channel::<()>(1);

        let accept_task = tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = shutdown_rx.recv() => break,
                    accepted = listener.accept() => {
                        match accepted {
                            Ok((client, _peer)) => {
                                tokio::spawn(async move {
                                    let _ = forward_opaque(client, target).await;
                                });
                            }
                            Err(e) => tracing::warn!(error = %e, "bridge: falha no accept"),
                        }
                    }
                }
            }
        });

        Ok(BridgeHandle {
            listen_addr,
            shutdown: shutdown_tx,
            accept_task,
        })
    }
}

/// Handle de uma bridge em execução. Ao ser dropado, o relay é encerrado.
pub struct BridgeHandle {
    listen_addr: SocketAddr,
    shutdown: tokio::sync::mpsc::Sender<()>,
    accept_task: tokio::task::JoinHandle<()>,
}

impl BridgeHandle {
    /// Endereço de escuta efetivo da bridge (útil quando a porta é 0).
    pub fn listen_addr(&self) -> SocketAddr {
        self.listen_addr
    }

    /// Encerra a bridge (equivalente ao drop do handle, porém explícito).
    pub async fn stop(self) {
        let _ = self.shutdown.send(()).await;
        self.accept_task.abort();
    }
}

impl Drop for BridgeHandle {
    fn drop(&mut self) {
        // Encerra o loop de accept; a task é abortada no drop.
        self.accept_task.abort();
    }
}

/// Repassa um fluxo TCP bruto (cliente ↔ Guard) sem inspecionar células.
async fn forward_opaque(mut client: TcpStream, target: SocketAddr) -> std::io::Result<()> {
    let mut upstream = match TcpStream::connect(target).await {
        Ok(u) => u,
        Err(_) => return Ok(()), // Guard inacessível: encerra a ponta cliente
    };
    let _ = copy_bidirectional(&mut client, &mut upstream).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::SocketAddr;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    /// Servidor de eco usado como Guard fake nos testes de unidade do pool.
    async fn spawn_echo(listen: SocketAddr) -> SocketAddr {
        let listener = TcpListener::bind(listen).await.expect("bind echo");
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            loop {
                let Ok((mut sock, _peer)) = listener.accept().await else { break };
                tokio::spawn(async move {
                    let mut buf = [0u8; 1024];
                    loop {
                        match sock.read(&mut buf).await {
                            Ok(0) | Err(_) => break,
                            Ok(n) => {
                                if sock.write_all(&buf[..n]).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                });
            }
        });
        addr
    }

    #[tokio::test]
    async fn test_direct_entry_reaches_guard_endpoint() {
        let guard_addr = spawn_echo("127.0.0.1:0".parse().unwrap()).await;
        let entry = DirectEntry::new("direto");
        let stream = entry.connect(&guard_addr.to_string()).await.expect("conexão direta ao Guard");

        let mut stream = tokio::io::BufStream::new(stream);
        stream.write_all(b"ping").await.unwrap();
        stream.flush().await.unwrap();
        let mut buf = [0u8; 4];
        stream.read_exact(&mut buf).await.unwrap();
        assert_eq!(&buf, b"ping", "eco direto deve retornar a mensagem");
    }

    #[tokio::test]
    async fn test_bridge_entry_reaches_guard_through_opaque_relay() {
        let guard_addr = spawn_echo("127.0.0.1:0".parse().unwrap()).await;
        let bridge = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge sobe");
        let bridge_addr = bridge.listen_addr();
        let entry = BridgeEntry::new("bridge-1", bridge_addr);

        let stream = entry.connect(&guard_addr.to_string()).await.expect("conexão via bridge");
        let mut stream = tokio::io::BufStream::new(stream);
        stream.write_all(b"ola-bridge").await.unwrap();
        stream.flush().await.unwrap();
        let mut buf = [0u8; 10];
        stream.read_exact(&mut buf).await.unwrap();
        assert_eq!(&buf, b"ola-bridge", "eco através do relay opaco da bridge");

        bridge.stop().await;
    }

    #[tokio::test]
    async fn test_pool_switches_to_secondary_when_primary_blocked() {
        let guard_addr = spawn_echo("127.0.0.1:0".parse().unwrap()).await;

        // Duas bridges independentes em endereços distintos (porta 0).
        let bridge_a = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge A sobe");
        let bridge_b = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge B sobe");
        let addr_a = bridge_a.listen_addr();
        let addr_b = bridge_b.listen_addr();

        let mut pool = EntryPool::new();
        pool.push(Arc::new(BridgeEntry::new("bridge-a", addr_a)));
        pool.push(Arc::new(BridgeEntry::new("bridge-b", addr_b)));

        // Fase 1: primária responde.
        let conn = pool.connect(&guard_addr.to_string()).await.expect("circuito pela bridge primária");
        assert_eq!(conn.entry_id, "bridge-a", "primária deve vencer inicialmente");

        // Bloqueio da entrada primária (queda da bridge A).
        bridge_a.stop().await;

        // Fase 2: comutação para a secundária, sem qualquer tentativa ao
        // destino final (o pool só diala as bridges).
        let conn2 = pool.connect(&guard_addr.to_string()).await.expect("comutação para a bridge secundária");
        assert_eq!(conn2.entry_id, "bridge-b", "após bloqueio da primária, a secundária assume");

        bridge_b.stop().await;
    }

    #[tokio::test]
    async fn test_pool_fail_closed_when_all_entries_blocked() {
        let guard_addr = spawn_echo("127.0.0.1:0".parse().unwrap()).await;

        // "Destino final" monitorado: contabiliza conexões diretas indevidas.
        let dest_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let direct_hits = Arc::new(AtomicUsize::new(0));
        let counter = direct_hits.clone();
        tokio::spawn(async move {
            loop {
                let Ok((_sock, _peer)) = dest_listener.accept().await else { break };
                counter.fetch_add(1, Ordering::SeqCst);
            }
        });

        let bridge_a = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge A sobe");
        let bridge_b = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge B sobe");
        let addr_a = bridge_a.listen_addr();
        let addr_b = bridge_b.listen_addr();

        let mut pool = EntryPool::new();
        pool.push(Arc::new(BridgeEntry::new("bridge-a", addr_a)));
        pool.push(Arc::new(BridgeEntry::new("bridge-b", addr_b)));

        // Tudo bloqueado: primária e secundária fora do ar.
        bridge_a.stop().await;
        bridge_b.stop().await;

        let err = pool.connect(&guard_addr.to_string()).await.expect_err("todas as bridges bloqueadas devem falhar");
        let msg = err.to_string();
        assert!(msg.contains("fail-closed"), "erro deve ser fail-closed, obtido: {msg}");
        assert!(msg.contains("bridge-a") && msg.contains("bridge-b"), "erro deve citar as bridges, obtido: {msg}");

        // Nenhuma conexão direta ao destino final durante a tentativa.
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert_eq!(
            direct_hits.load(Ordering::SeqCst),
            0,
            "fail-closed violado: houve conexão direta ao destino final"
        );
    }

    #[tokio::test]
    async fn test_pool_prefers_last_working_entry() {
        let guard_addr = spawn_echo("127.0.0.1:0".parse().unwrap()).await;

        let bridge_a = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge A sobe");
        let bridge_b = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge B sobe");
        let addr_a = bridge_a.listen_addr();
        let addr_b = bridge_b.listen_addr();

        let mut pool = EntryPool::new();
        pool.push(Arc::new(BridgeEntry::new("bridge-a", addr_a)));
        pool.push(Arc::new(BridgeEntry::new("bridge-b", addr_b)));

        // Primária cai logo no início: a secundária vence e vira a ativa.
        bridge_a.stop().await;
        let conn = pool.connect(&guard_addr.to_string()).await.expect("secundária assume");
        assert_eq!(conn.entry_id, "bridge-b");

        // Agora a secundária volta a ser tentada primeiro (rotação ativa).
        let conn2 = pool.connect(&guard_addr.to_string()).await.expect("entrada ativa preferida");
        assert_eq!(conn2.entry_id, "bridge-b", "a entrada que funcionou por último é tentada primeiro");

        bridge_b.stop().await;
    }

    #[tokio::test]
    async fn test_pool_empty_fails_closed() {
        let pool = EntryPool::new();
        let err = pool.connect("127.0.0.1:1").await.expect_err("pool vazio deve falhar");
        assert!(err.to_string().contains("fail-closed"));
    }

    // ----- P1.3.1: comutação também quando o handshake autenticado falha -----

    /// Guard de teste que responde `PONG` a `PING` (contrato do probe de teste).
    async fn spawn_guard_handshake_ok() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            loop {
                let Ok((mut sock, _peer)) = listener.accept().await else { break };
                tokio::spawn(async move {
                    let mut buf = [0u8; 4];
                    if sock.read_exact(&mut buf).await.is_ok() && &buf == b"PING" {
                        let _ = sock.write_all(b"PONG").await;
                    }
                });
            }
        });
        addr
    }

    /// Bridge defeituosa: aceita a conexão e a encerra imediatamente.
    async fn spawn_defective_bridge_accept_and_close() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            loop {
                let Ok((sock, _peer)) = listener.accept().await else { break };
                drop(sock); // aceita e fecha: o handshake seguinte morre com EOF
            }
        });
        addr
    }

    /// Bridge defeituosa: aceita a conexão e não responde (blackhole).
    async fn spawn_defective_bridge_blackhole() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            loop {
                let Ok((sock, _peer)) = listener.accept().await else { break };
                // Segura o socket vivo sem ler nem escrever: o handshake expira.
                tokio::spawn(async move {
                    let _ = tokio::time::timeout(Duration::from_secs(30), sock.readable()).await;
                });
            }
        });
        addr
    }

    /// Bridge defeituosa: aceita e despeja bytes inválidos no fluxo.
    async fn spawn_defective_bridge_garbage() -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            loop {
                let Ok((mut sock, _peer)) = listener.accept().await else { break };
                tokio::spawn(async move {
                    let _ = sock.write_all(b"NAO-E-UM-GUARD").await;
                });
            }
        });
        addr
    }

    /// Probe de handshake de teste: envia `PING` e exige `PONG` de volta.
    /// Modela o estágio de autenticação independente dos internals do LIVE.
    fn test_handshake_probe(
    ) -> impl FnMut(TcpStream) -> Pin<Box<dyn Future<Output = Result<(), VeilError>> + Send>> {
        |stream: TcpStream| {
            Box::pin(async move {
                let (mut r, mut w) = tokio::io::split(stream);
                w.write_all(b"PING")
                    .await
                    .map_err(|e| VeilError::Circuit(format!("envio no handshake: {e}")))?;
                let mut buf = [0u8; 4];
                r.read_exact(&mut buf)
                    .await
                    .map_err(|e| VeilError::Circuit(format!("leitura no handshake: {e}")))?;
                if &buf != b"PONG" {
                    return Err(VeilError::Crypto(format!("resposta inválida do Guard no handshake: {buf:?}")));
                }
                Ok(())
            })
        }
    }

    #[tokio::test]
    async fn test_pool_switches_when_entry_accepts_tcp_and_closes() {
        let guard_addr = spawn_guard_handshake_ok().await;

        // Entrada A: aceita TCP e fecha — o TCP "sucede", o handshake não.
        let defective = spawn_defective_bridge_accept_and_close().await;
        let bridge_b = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge B sobe");
        let addr_b = bridge_b.listen_addr();

        let mut pool = EntryPool::new();
        pool.push(Arc::new(BridgeEntry::new("bridge-a", defective)));
        pool.push(Arc::new(BridgeEntry::new("bridge-b", addr_b)));

        let mut probe = test_handshake_probe();
        let ((), entry_id) = pool
            .connect_authenticated(&guard_addr.to_string(), &mut probe)
            .await
            .expect("handshake deve comutar para a entrada B");
        assert_eq!(entry_id, "bridge-b", "aceitar TCP e fechar não pode contar como entrada operacional");

        bridge_b.stop().await;
    }

    #[tokio::test]
    async fn test_pool_switches_when_entry_accepts_tcp_and_stays_silent() {
        let guard_addr = spawn_guard_handshake_ok().await;

        // Entrada A: blackhole — o handshake expira e a comutação ocorre.
        let blackhole = spawn_defective_bridge_blackhole().await;
        let bridge_b = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge B sobe");
        let addr_b = bridge_b.listen_addr();

        let mut pool = EntryPool::new();
        pool.set_handshake_timeout(Duration::from_millis(400));
        pool.push(Arc::new(BridgeEntry::new("bridge-a", blackhole)));
        pool.push(Arc::new(BridgeEntry::new("bridge-b", addr_b)));

        let started = std::time::Instant::now();
        let mut probe = test_handshake_probe();
        let ((), entry_id) = pool
            .connect_authenticated(&guard_addr.to_string(), &mut probe)
            .await
            .expect("handshake deve comutar para a entrada B após timeout");
        assert_eq!(entry_id, "bridge-b", "blackhole deve ser abandonado por timeout no handshake");
        assert!(
            started.elapsed() < Duration::from_secs(5),
            "comutação deve respeitar o timeout curto configurado"
        );

        bridge_b.stop().await;
    }

    #[tokio::test]
    async fn test_pool_switches_when_entry_forwards_garbage() {
        let guard_addr = spawn_guard_handshake_ok().await;

        // Entrada A: encaminha dados inválidos — o handshake falha na autenticação.
        let garbage = spawn_defective_bridge_garbage().await;
        let bridge_b = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_addr)
            .await
            .expect("bridge B sobe");
        let addr_b = bridge_b.listen_addr();

        let mut pool = EntryPool::new();
        pool.push(Arc::new(BridgeEntry::new("bridge-a", garbage)));
        pool.push(Arc::new(BridgeEntry::new("bridge-b", addr_b)));

        let mut probe = test_handshake_probe();
        let ((), entry_id) = pool
            .connect_authenticated(&guard_addr.to_string(), &mut probe)
            .await
            .expect("handshake deve comutar para a entrada B após dados inválidos");
        assert_eq!(entry_id, "bridge-b", "fluxo corrompido não pode contar como entrada operacional");

        bridge_b.stop().await;
    }

    #[tokio::test]
    async fn test_pool_fail_closed_when_all_handshakes_fail() {
        let guard_addr = spawn_guard_handshake_ok().await;

        // Todas as entradas aceitam TCP mas nenhuma conclui o handshake.
        let bad_a = spawn_defective_bridge_accept_and_close().await;
        let bad_b = spawn_defective_bridge_blackhole().await;

        let mut pool = EntryPool::new();
        pool.set_handshake_timeout(Duration::from_millis(400));
        pool.push(Arc::new(BridgeEntry::new("bridge-a", bad_a)));
        pool.push(Arc::new(BridgeEntry::new("bridge-b", bad_b)));

        let mut probe = test_handshake_probe();
        let err = pool
            .connect_authenticated(&guard_addr.to_string(), &mut probe)
            .await
            .expect_err("todas as entradas falhando no handshake devem abortar o circuito");
        let msg = err.to_string();
        assert!(msg.contains("fail-closed"), "erro deve ser fail-closed, obtido: {msg}");
        assert!(msg.contains("bridge-a") && msg.contains("bridge-b"), "erro deve citar as bridges, obtido: {msg}");
        assert!(msg.contains("handshake"), "erro deve indicar falha de handshake, obtido: {msg}");
    }
}