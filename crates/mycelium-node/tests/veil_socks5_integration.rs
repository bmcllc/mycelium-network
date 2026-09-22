#[cfg(feature = "veil")]
mod veil_tests {
    use mycelium_node::{call, run_daemon, DaemonOptions, Request, Response};
    use std::net::SocketAddr;
    use std::time::Duration;
    use tempfile::tempdir;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpStream;

    async fn wait_for_sock(sock_path: &std::path::Path) {
        let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
        while tokio::time::Instant::now() < deadline {
            if sock_path.exists() {
                // Tenta conectar
                if tokio::net::UnixStream::connect(sock_path).await.is_ok() {
                    return;
                }
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        panic!("Timeout aguardando socket de controle {:?}", sock_path);
    }

    #[tokio::test]
    async fn test_veil_socks5_daemon_lifecycle_and_anti_ssrf() {
        let dir = tempdir().unwrap();
        let home = dir.path().to_path_buf();
        let sock_path = home.join("mycelium.sock");

        let mut opts = DaemonOptions::default();
        opts.veil_enabled = true;
        // Bind na porta 0 para alocação de porta efêmera pelo SO
        opts.veil_socks5_addr = Some("127.0.0.1:0".parse().unwrap());
        opts.veil_mode = Some("veil".to_string());
        opts.horizon_port = 0; // Efêmero
        opts.no_mdns = true;

        let home_clone = home.clone();
        let daemon_task = tokio::spawn(async move {
            if let Err(e) = run_daemon(home_clone, opts).await {
                eprintln!("Daemon terminou com erro: {e}");
            }
        });

        wait_for_sock(&sock_path).await;

        // 1. Consulta StatusReport geral do nó
        let resp = call(&sock_path, Request::Status).await.expect("call Status");
        let socks5_addr_str = match resp {
            Response::Status(rep) => {
                assert!(rep.veil_socks5.is_some(), "veil_socks5 deve constar no StatusReport");
                rep.veil_socks5.unwrap()
            }
            other => panic!("Esperado Response::Status, obtido {:?}", other),
        };

        // 2. Consulta VeilStatus específico
        let resp = call(&sock_path, Request::VeilStatus).await.expect("call VeilStatus");
        let (socks5_addr, session_id) = match resp {
            Response::VeilStatusResult {
                active,
                mode,
                socks5_addr,
                session_id,
                kill_switch,
                active_layers,
                ..
            } => {
                assert!(active, "VEIL Ω deve estar ativo no boot");
                assert_eq!(mode.as_deref(), Some("veil"));
                assert_eq!(kill_switch, "armed");
                assert_eq!(active_layers, 7, "Todas as 7 camadas devem estar ativas");
                assert!(session_id.is_some(), "Deve possuir SessionID gerado");
                let addr = socks5_addr.expect("socks5_addr deve estar definido");
                assert_eq!(addr, socks5_addr_str);
                (addr, session_id.unwrap())
            }
            other => panic!("Esperado Response::VeilStatusResult, obtido {:?}", other),
        };
        assert!(session_id.starts_with("veil_"));

        let socks_sock_addr: SocketAddr = socks5_addr.parse().expect("valid socket addr");
        assert!(socks_sock_addr.ip().is_loopback(), "SOCKS5 deve escutar exclusivamente em loopback");

        // 3. Teste do fluxo SOCKS5 RFC 1928 e Anti-SSRF (bloqueio de IP privado 127.0.0.1)
        {
            let mut client = TcpStream::connect(socks_sock_addr).await.expect("connect to socks5");

            // Handshake de autenticação: VER=5, NMETHODS=1, METHOD=0 (Sem autenticação)
            client.write_all(&[0x05, 0x01, 0x00]).await.unwrap();
            let mut auth_rep = [0u8; 2];
            client.read_exact(&mut auth_rep).await.unwrap();
            assert_eq!(auth_rep, [0x05, 0x00], "SOCKS5 deve aceitar método No Auth");

            // Solicitação CONNECT para 127.0.0.1:80 (IPv4 loopback proibido por Anti-SSRF)
            // [VER=5] [CMD=1 CONNECT] [RSV=0] [ATYP=1 IPv4] [127, 0, 0, 1] [PORT=80 (0x00, 0x50)]
            client.write_all(&[0x05, 0x01, 0x00, 0x01, 127, 0, 0, 1, 0x00, 0x50]).await.unwrap();

            let mut connect_rep = [0u8; 10];
            client.read_exact(&mut connect_rep).await.unwrap();
            assert_eq!(connect_rep[0], 0x05, "Versão deve ser 5");
            assert_eq!(
                connect_rep[1], 0x02,
                "REP deve ser 0x02 (Connection not allowed by ruleset) para loopback privado"
            );
        }

        // 4. Teste Anti-SSRF para RFC 1918 (10.0.0.1:443)
        {
            let mut client = TcpStream::connect(socks_sock_addr).await.expect("connect to socks5");
            client.write_all(&[0x05, 0x01, 0x00]).await.unwrap();
            let mut auth_rep = [0u8; 2];
            client.read_exact(&mut auth_rep).await.unwrap();
            assert_eq!(auth_rep, [0x05, 0x00]);

            // CONNECT 10.0.0.1:443
            client.write_all(&[0x05, 0x01, 0x00, 0x01, 10, 0, 0, 1, 0x01, 0xbb]).await.unwrap();
            let mut connect_rep = [0u8; 10];
            client.read_exact(&mut connect_rep).await.unwrap();
            assert_eq!(
                connect_rep[1], 0x02,
                "REP deve ser 0x02 (Connection not allowed by ruleset) para RFC 1918 (10.0.0.1)"
            );
        }

        // 5. Teste Zero DNS Leak: Solicitação por Domínio (ATYP=0x03)
        // O cliente envia o domínio cru (ex: mock.remote.invalid); o daemon NÃO resolve localmente.
        {
            let mut client = TcpStream::connect(socks_sock_addr).await.expect("connect to socks5");
            client.write_all(&[0x05, 0x01, 0x00]).await.unwrap();
            let mut auth_rep = [0u8; 2];
            client.read_exact(&mut auth_rep).await.unwrap();
            assert_eq!(auth_rep, [0x05, 0x00]);

            let domain = b"mock.remote.invalid";
            let mut req = vec![0x05, 0x01, 0x00, 0x03, domain.len() as u8];
            req.extend_from_slice(domain);
            req.extend_from_slice(&80u16.to_be_bytes());
            client.write_all(&req).await.unwrap();

            let mut connect_rep = [0u8; 10];
            client.read_exact(&mut connect_rep).await.unwrap();
            // A resolução remota de domínio inválido resulta em Host Unreachable (0x04)
            assert!(
                connect_rep[1] == 0x04 || connect_rep[1] == 0x05,
                "Domínio não resolvível remotamente deve devolver erro apropriado (0x04 ou 0x05), recebido: 0x{:02x}",
                connect_rep[1]
            );
        }

        // 6. Teste de controle: VeilStop e VeilStart
        let stop_resp = call(&sock_path, Request::VeilStop).await.expect("call VeilStop");
        assert!(matches!(stop_resp, Response::Ok { .. }));

        let status_after_stop = call(&sock_path, Request::VeilStatus).await.expect("call VeilStatus");
        match status_after_stop {
            Response::VeilStatusResult { active, .. } => {
                assert!(!active, "VEIL deve constar como inativo após VeilStop");
            }
            other => panic!("Esperado VeilStatusResult, obtido {:?}", other),
        }

        // O listener anterior deve ter sido encerrado
        assert!(TcpStream::connect(socks_sock_addr).await.is_err(), "Porta SOCKS5 antiga deve estar fechada");

        // Reinicia o VEIL com porta efêmera
        let start_resp = call(
            &sock_path,
            Request::VeilStart {
                mode: Some("geo".to_string()),
                socks5_port: Some(0),
                role: None,
                listen: None,
                trust: vec![],
            },
        )
        .await
        .expect("call VeilStart");
        assert!(matches!(start_resp, Response::Ok { .. }));

        let status_after_restart = call(&sock_path, Request::VeilStatus).await.expect("call VeilStatus");
        match status_after_restart {
            Response::VeilStatusResult { active, mode, socks5_addr, .. } => {
                assert!(active, "VEIL deve estar ativo após restart");
                assert_eq!(mode.as_deref(), Some("geo"));
                assert!(socks5_addr.is_some());
            }
            other => panic!("Esperado VeilStatusResult, obtido {:?}", other),
        }

        // 7. Encerramento gracioso do daemon
        let shutdown_resp = call(&sock_path, Request::Shutdown).await.expect("call Shutdown");
        assert!(matches!(shutdown_resp, Response::Ok { .. }));

        let _ = tokio::time::timeout(Duration::from_secs(3), daemon_task).await;
    }
}
