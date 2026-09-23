//! Testes de aceitação P1.3.2: VEIL Ω sobre o Daemon real
//!
//! Exercita os quatro critérios de aceitação:
//! 1. Conexão via bridge única pelo daemon + tráfego SOCKS5 + status reportando bridge-1.
//! 2. Failover transparente entre bridges (bridge A falha -> bridge B assume com telemetria).
//! 3. Fail-closed estrito quando todas as bridges falham, garantindo zero vazamento ao destino.
//! 4. Ciclo de vida e papel `bridge` dedicado (forwarding opaco e encerramento limpo via VeilStop).

#[cfg(feature = "veil")]
mod acceptance_tests {
    use mycelium_node::{call, run_daemon, DaemonOptions, Request, Response};
    use mycelium_pqc::mlkem_keygen;
    use mycelium_veil::{BridgeRelay, ExitPolicy, VeilHopRouter};
    use std::net::SocketAddr;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use std::time::Duration;
    use tempfile::tempdir;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    async fn wait_for_sock(sock_path: &std::path::Path) {
        let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
        while tokio::time::Instant::now() < deadline {
            if sock_path.exists() && tokio::net::UnixStream::connect(sock_path).await.is_ok() {
                return;
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        panic!("Timeout aguardando socket de controle {:?}", sock_path);
    }

    /// Spawns standard Guard, Middle and Exit routers for live circuit testing.
    async fn setup_live_relays(target_port: u16) -> (String, String, String) {
        // Exit
        let exit_kp = mlkem_keygen();
        let exit_policy = ExitPolicy {
            allowed_ports: vec![target_port],
            blocked_ports: vec![],
            block_private_networks: false,
            max_bandwidth_bps: 0,
        };
        let exit_router = VeilHopRouter::new(exit_kp, Some(exit_policy));
        let exit_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let exit_addr = exit_listener.local_addr().unwrap();
        let exit_desc = exit_router.descriptor("exit-acc".into(), exit_addr.to_string());
        tokio::spawn(async move {
            let _ = exit_router.run(exit_listener).await;
        });

        // Middle
        let middle_kp = mlkem_keygen();
        let middle_router = VeilHopRouter::new(middle_kp, None);
        let middle_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let middle_addr = middle_listener.local_addr().unwrap();
        let middle_desc = middle_router.descriptor("middle-acc".into(), middle_addr.to_string());
        tokio::spawn(async move {
            let _ = middle_router.run(middle_listener).await;
        });

        // Guard
        let guard_kp = mlkem_keygen();
        let guard_router = VeilHopRouter::new(guard_kp, None);
        let guard_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let guard_addr = guard_listener.local_addr().unwrap();
        let guard_desc = guard_router.descriptor("guard-acc".into(), guard_addr.to_string());
        tokio::spawn(async move {
            let _ = guard_router.run(guard_listener).await;
        });

        (
            guard_desc.to_json().unwrap(),
            middle_desc.to_json().unwrap(),
            exit_desc.to_json().unwrap(),
        )
    }

    /// Mock target server que ecoa bytes recebidos prefixando com "ACK:"
    async fn spawn_echo_target() -> (SocketAddr, tokio::task::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let handle = tokio::spawn(async move {
            loop {
                let Ok((mut socket, _)) = listener.accept().await else { break };
                tokio::spawn(async move {
                    let mut buf = [0u8; 512];
                    if let Ok(n) = socket.read(&mut buf).await {
                        if n > 0 {
                            let mut resp = b"ACK:".to_vec();
                            resp.extend_from_slice(&buf[..n]);
                            let _ = socket.write_all(&resp).await;
                        }
                    }
                });
            }
        });
        (addr, handle)
    }

    // =========================================================================
    // Critério 1: Conexão via bridge única + tráfego SOCKS5 + status reportando bridge-1
    // =========================================================================
    #[tokio::test]
    async fn test_acceptance_1_single_bridge_daemon_circuit_and_socks5() {
        let (target_addr, _target_handle) = spawn_echo_target().await;
        let (guard_json, middle_json, exit_json) = setup_live_relays(target_addr.port()).await;

        let guard_desc: mycelium_veil::planes::live::NodeDescriptor =
            serde_json::from_str(&guard_json).unwrap();
        let guard_endpoint: SocketAddr = guard_desc.endpoint.parse().unwrap();

        // Bridge operacional encaminhando para o Guard
        let bridge = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_endpoint)
            .await
            .expect("bridge relay sobe");
        let bridge_addr = bridge.listen_addr();

        let dir = tempdir().unwrap();
        let home = dir.path().to_path_buf();
        let sock_path = home.join("mycelium.sock");

        let mut opts = DaemonOptions::default();
        opts.veil_enabled = true;
        opts.veil_role = Some("client".to_string());
        opts.veil_mode = Some("veil".to_string());
        opts.veil_guards = vec![guard_json];
        opts.veil_middles = vec![middle_json];
        opts.veil_exits = vec![exit_json];
        opts.veil_bridges = vec![bridge_addr.to_string()];
        opts.veil_socks5_addr = Some("127.0.0.1:0".parse().unwrap());
        opts.horizon_port = 0;
        opts.no_mdns = true;

        let home_clone = home.clone();
        let daemon_task = tokio::spawn(async move {
            let _ = run_daemon(home_clone, opts).await;
        });

        wait_for_sock(&sock_path).await;

        // 1. Consulta status e valida observabilidade da bridge
        let status = call(&sock_path, Request::VeilStatus).await.expect("VeilStatus");
        let socks5_addr = match status {
            Response::VeilStatusResult {
                active,
                socks5_addr,
                entrada_ativa,
                entradas,
                tentativas_failover,
                ..
            } => {
                assert!(active, "VEIL deve estar ativo");
                assert_eq!(entrada_ativa.as_deref(), Some("bridge-1"));
                assert_eq!(entradas, vec!["bridge-1"]);
                assert_eq!(tentativas_failover, 0);
                socks5_addr.expect("socks5 addr")
            }
            other => panic!("Esperado VeilStatusResult, obtido {:?}", other),
        };

        // 2. Realiza tráfego através do proxy SOCKS5 até o target via circuito VEIL
        let socks_addr: SocketAddr = socks5_addr.parse().unwrap();
        let mut client = TcpStream::connect(socks_addr).await.expect("connect socks5");

        // SOCKS5 greeting: VER=5, NMETHODS=1, METHOD=0 (No Auth)
        client.write_all(&[0x05, 0x01, 0x00]).await.unwrap();
        let mut auth_rep = [0u8; 2];
        client.read_exact(&mut auth_rep).await.unwrap();
        assert_eq!(auth_rep, [0x05, 0x00]);

        // SOCKS5 CONNECT para o target local
        let ip_bytes = match target_addr.ip() {
            std::net::IpAddr::V4(v4) => v4.octets(),
            _ => panic!("Esperado IPv4"),
        };
        let mut req = vec![0x05, 0x01, 0x00, 0x01];
        req.extend_from_slice(&ip_bytes);
        req.extend_from_slice(&target_addr.port().to_be_bytes());
        client.write_all(&req).await.unwrap();

        let mut connect_rep = [0u8; 10];
        client.read_exact(&mut connect_rep).await.unwrap();
        assert_eq!(connect_rep[1], 0x00, "SOCKS5 CONNECT deve suceder");

        // Envia payload e verifica eco
        client.write_all(b"TESTE_P1_3_2").await.unwrap();
        let mut echo_buf = [0u8; 16];
        let n = client.read(&mut echo_buf).await.unwrap();
        assert_eq!(&echo_buf[..n], b"ACK:TESTE_P1_3_2");

        // Shutdown
        let _ = call(&sock_path, Request::Shutdown).await;
        let _ = tokio::time::timeout(Duration::from_secs(3), daemon_task).await;
        bridge.stop().await;
    }

    // =========================================================================
    // Critério 2: Failover transparente entre bridges
    // =========================================================================
    #[tokio::test]
    async fn test_acceptance_2_bridge_failover_transparent() {
        let (target_addr, _target_handle) = spawn_echo_target().await;
        let (guard_json, middle_json, exit_json) = setup_live_relays(target_addr.port()).await;

        let guard_desc: mycelium_veil::planes::live::NodeDescriptor =
            serde_json::from_str(&guard_json).unwrap();
        let guard_endpoint: SocketAddr = guard_desc.endpoint.parse().unwrap();

        // Bridge A defeituosa: listener que aceita e fecha imediatamente
        let defective_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let defective_addr = defective_listener.local_addr().unwrap();
        tokio::spawn(async move {
            loop {
                let Ok((sock, _)) = defective_listener.accept().await else { break };
                drop(sock); // mata conexão
            }
        });

        // Bridge B operacional encaminhando para o Guard
        let bridge_b = BridgeRelay::spawn("127.0.0.1:0".parse().unwrap(), guard_endpoint)
            .await
            .expect("bridge B sobe");
        let bridge_b_addr = bridge_b.listen_addr();

        let dir = tempdir().unwrap();
        let home = dir.path().to_path_buf();
        let sock_path = home.join("mycelium.sock");

        let mut opts = DaemonOptions::default();
        opts.veil_enabled = true;
        opts.veil_role = Some("client".to_string());
        opts.veil_mode = Some("veil".to_string());
        opts.veil_guards = vec![guard_json];
        opts.veil_middles = vec![middle_json];
        opts.veil_exits = vec![exit_json];
        // Bridge A vem primeiro; deve falhar e comutar para Bridge B
        opts.veil_bridges = vec![defective_addr.to_string(), bridge_b_addr.to_string()];
        opts.veil_socks5_addr = Some("127.0.0.1:0".parse().unwrap());
        opts.horizon_port = 0;
        opts.no_mdns = true;

        let home_clone = home.clone();
        let daemon_task = tokio::spawn(async move {
            let _ = run_daemon(home_clone, opts).await;
        });

        wait_for_sock(&sock_path).await;

        // Consulta status e valida observabilidade de failover
        let status = call(&sock_path, Request::VeilStatus).await.expect("VeilStatus");
        let socks5_addr = match status {
            Response::VeilStatusResult {
                active,
                socks5_addr,
                entrada_ativa,
                entradas,
                tentativas_failover,
                motivos_falha,
                ..
            } => {
                assert!(active, "VEIL deve estar ativo via secundária");
                assert_eq!(entrada_ativa.as_deref(), Some("bridge-2"));
                assert_eq!(entradas, vec!["bridge-1", "bridge-2"]);
                assert_eq!(tentativas_failover, 1, "Deve registrar exatamente 1 failover");
                assert!(!motivos_falha.is_empty(), "Deve conter registro do motivo da falha");
                assert!(motivos_falha[0].contains("bridge-1"));
                socks5_addr.expect("socks5 addr")
            }
            other => panic!("Esperado VeilStatusResult, obtido {:?}", other),
        };

        // Tráfego funcional através da secundária
        let socks_addr: SocketAddr = socks5_addr.parse().unwrap();
        let mut client = TcpStream::connect(socks_addr).await.expect("connect socks5");
        client.write_all(&[0x05, 0x01, 0x00]).await.unwrap();
        let mut auth_rep = [0u8; 2];
        client.read_exact(&mut auth_rep).await.unwrap();
        assert_eq!(auth_rep, [0x05, 0x00]);

        let ip_bytes = match target_addr.ip() {
            std::net::IpAddr::V4(v4) => v4.octets(),
            _ => panic!("Esperado IPv4"),
        };
        let mut req = vec![0x05, 0x01, 0x00, 0x01];
        req.extend_from_slice(&ip_bytes);
        req.extend_from_slice(&target_addr.port().to_be_bytes());
        client.write_all(&req).await.unwrap();

        let mut connect_rep = [0u8; 10];
        client.read_exact(&mut connect_rep).await.unwrap();
        assert_eq!(connect_rep[1], 0x00);

        client.write_all(b"FAILOVER_OK").await.unwrap();
        let mut echo_buf = [0u8; 15];
        let n = client.read(&mut echo_buf).await.unwrap();
        assert_eq!(&echo_buf[..n], b"ACK:FAILOVER_OK");

        let _ = call(&sock_path, Request::Shutdown).await;
        let _ = tokio::time::timeout(Duration::from_secs(3), daemon_task).await;
        bridge_b.stop().await;
    }

    // =========================================================================
    // Critério 3: Fail-closed estrito (todas as bridges bloqueadas)
    // =========================================================================
    #[tokio::test]
    async fn test_acceptance_3_fail_closed_when_all_bridges_fail_no_destination_leak() {
        // Mock target com contador atômico de conexões diretas
        let dest_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let dest_addr = dest_listener.local_addr().unwrap();
        let direct_hits = Arc::new(AtomicUsize::new(0));
        let hits_clone = direct_hits.clone();
        tokio::spawn(async move {
            loop {
                let Ok((_sock, _)) = dest_listener.accept().await else { break };
                hits_clone.fetch_add(1, Ordering::SeqCst);
            }
        });

        let (guard_json, middle_json, exit_json) = setup_live_relays(dest_addr.port()).await;

        // Duas bridges apontando para portas fechadas/mortas
        let dead_port_a = "127.0.0.1:1".to_string();
        let dead_port_b = "127.0.0.1:2".to_string();

        let dir = tempdir().unwrap();
        let home = dir.path().to_path_buf();
        let sock_path = home.join("mycelium.sock");

        let mut opts = DaemonOptions::default();
        opts.veil_enabled = false; // Começa desligado para testar via VeilStart RPC
        opts.veil_guards = vec![guard_json];
        opts.veil_middles = vec![middle_json];
        opts.veil_exits = vec![exit_json];
        opts.horizon_port = 0;
        opts.no_mdns = true;

        let home_clone = home.clone();
        let daemon_task = tokio::spawn(async move {
            let _ = run_daemon(home_clone, opts).await;
        });

        wait_for_sock(&sock_path).await;

        // Inicia o cliente com bridges mortas
        let start_resp = call(
            &sock_path,
            Request::VeilStart {
                mode: Some("veil".to_string()),
                socks5_port: Some(0),
                role: Some("client".to_string()),
                listen: None,
                trust: vec![],
                advertise: None,
                identity: None,
                rotate_identity: false,
                egress_bind: None,
                bridges: vec![dead_port_a, dead_port_b],
                bridge_listen: None,
                bridge_target: None,
            },
        )
        .await
        .expect("call VeilStart");

        match start_resp {
            Response::Err { message } => {
                assert!(
                    message.contains("fail-closed"),
                    "Mensagem de erro deve conter 'fail-closed', obtido: {message}"
                );
            }
            Response::Ok { .. } => {
                panic!("VeilStart com todas as pontes caídas NÃO pode retornar Ok!");
            }
            other => panic!("Esperado Response::Err, obtido {:?}", other),
        }

        // Aguarda e valida ausência absoluta de conexões diretas
        tokio::time::sleep(Duration::from_millis(150)).await;
        assert_eq!(
            direct_hits.load(Ordering::SeqCst),
            0,
            "VIOLAÇÃO CRÍTICA: Houve tentativa de conexão direta ao destino com bridges caídas!"
        );

        let _ = call(&sock_path, Request::Shutdown).await;
        let _ = tokio::time::timeout(Duration::from_secs(3), daemon_task).await;
    }

    // =========================================================================
    // Critério 4: Ciclo de vida e papel `bridge` dedicado
    // =========================================================================
    #[tokio::test]
    async fn test_acceptance_4_bridge_role_dedicated_lifecycle_and_shutdown() {
        // Mock Guard listener que responde eco
        let (guard_addr, _guard_handle) = spawn_echo_target().await;

        let dir = tempdir().unwrap();
        let home = dir.path().to_path_buf();
        let sock_path = home.join("mycelium.sock");

        let mut opts = DaemonOptions::default();
        opts.veil_enabled = true;
        opts.veil_role = Some("bridge".to_string());
        opts.veil_bridge_listen = Some("127.0.0.1:0".to_string());
        opts.veil_bridge_target = Some(guard_addr.to_string());
        opts.horizon_port = 0;
        opts.no_mdns = true;

        let home_clone = home.clone();
        let daemon_task = tokio::spawn(async move {
            let _ = run_daemon(home_clone, opts).await;
        });

        wait_for_sock(&sock_path).await;

        // 1. Verifica VeilStatus
        let status = call(&sock_path, Request::VeilStatus).await.expect("VeilStatus");
        let bridge_listen_addr = match status {
            Response::VeilStatusResult {
                active,
                role,
                listen_addr,
                ..
            } => {
                assert!(active, "Papel bridge deve estar ativo");
                assert_eq!(role.as_deref(), Some("bridge"));
                listen_addr.expect("listen_addr da bridge")
            }
            other => panic!("Esperado VeilStatusResult, obtido {:?}", other),
        };

        // 2. Conecta na bridge e verifica forwarding até o Guard
        let bridge_socket_addr: SocketAddr = bridge_listen_addr.parse().unwrap();
        {
            let mut client = TcpStream::connect(bridge_socket_addr)
                .await
                .expect("conectar na bridge");
            client.write_all(b"HELLO_GUARD_VIA_BRIDGE").await.unwrap();
            let mut buf = [0u8; 32];
            let n = client.read(&mut buf).await.unwrap();
            assert_eq!(&buf[..n], b"ACK:HELLO_GUARD_VIA_BRIDGE");
        }

        // 3. Encerra o serviço VEIL via VeilStop
        let stop_resp = call(&sock_path, Request::VeilStop).await.expect("VeilStop");
        assert!(matches!(stop_resp, Response::Ok { .. }));

        // 4. Verifica que a porta da bridge foi fechada
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert!(
            TcpStream::connect(bridge_socket_addr).await.is_err(),
            "Listener da bridge deve estar encerrado após VeilStop"
        );

        let _ = call(&sock_path, Request::Shutdown).await;
        let _ = tokio::time::timeout(Duration::from_secs(3), daemon_task).await;
    }
}
