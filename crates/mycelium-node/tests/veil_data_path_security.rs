#[cfg(feature = "veil")]
mod tests {
    use mycelium_pqc::mlkem_keygen;
    use mycelium_veil::{
        proxy_socks5_connection, CircuitHopNode, ExitPolicy, KillSwitch, LiveCircuitClient,
        Socks5Server, VeilHopRouter,
    };
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};
    use tokio::sync::oneshot;

    #[tokio::test]
    async fn test_e2e_real_circuit_exit_origin_and_no_direct_client_leak() {
        // 1. Mock Target Server na porta T
        let target_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target_addr = target_listener.local_addr().unwrap();
        let (peer_tx, peer_rx) = oneshot::channel();

        tokio::spawn(async move {
            if let Ok((mut stream, peer)) = target_listener.accept().await {
                let _ = peer_tx.send(peer);
                let mut buf = [0u8; 1024];
                if let Ok(n) = stream.read(&mut buf).await {
                    if n > 0 {
                        // Ecoa com confirmação
                        let mut resp = b"ACK:".to_vec();
                        resp.extend_from_slice(&buf[..n]);
                        let _ = stream.write_all(&resp).await;
                    }
                }
            }
        });

        // 2. Nó Exit (com política permitindo porta do target para o teste)
        let exit_kp = mlkem_keygen();
        let exit_policy = ExitPolicy {
            allowed_ports: vec![target_addr.port()],
            blocked_ports: vec![],
            block_private_networks: false, // Permite conexão ao mock target local
            max_bandwidth_bps: 0,
        };
        let exit_router = VeilHopRouter::new(exit_kp, Some(exit_policy));
        let exit_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let exit_addr = exit_listener.local_addr().unwrap();
        let exit_desc = exit_router.descriptor("exit-node".into(), exit_addr.to_string());
        let exit_handle = tokio::spawn(async move {
            let _ = exit_router.run(exit_listener).await;
        });

        // 3. Nó Middle
        let middle_kp = mlkem_keygen();
        let middle_router = VeilHopRouter::new(middle_kp, None);
        let middle_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let middle_addr = middle_listener.local_addr().unwrap();
        let middle_desc = middle_router.descriptor("middle-node".into(), middle_addr.to_string());
        let middle_handle = tokio::spawn(async move {
            let _ = middle_router.run(middle_listener).await;
        });

        // 4. Nó Guard
        let guard_kp = mlkem_keygen();
        let guard_router = VeilHopRouter::new(guard_kp, None);
        let guard_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let guard_addr = guard_listener.local_addr().unwrap();
        let guard_desc = guard_router.descriptor("guard-node".into(), guard_addr.to_string());
        let guard_handle = tokio::spawn(async move {
            let _ = guard_router.run(guard_listener).await;
        });

        // 5. Cliente monta circuito de 3 saltos via handshake telescópico ML-KEM-1024
        let hops = vec![
            CircuitHopNode::from_descriptor(guard_desc),
            CircuitHopNode::from_descriptor(middle_desc),
            CircuitHopNode::from_descriptor(exit_desc),
        ];

        let circuit_client = Arc::new(
            LiveCircuitClient::connect(888, hops)
                .await
                .expect("circuito de 3 saltos conectado"),
        );

        // 6. Servidor SOCKS5 local conectado ao circuito (SEM ExitForwarder local!)
        let socks_server = Socks5Server::new("127.0.0.1:0".parse().unwrap());
        let socks_listener = socks_server.bind().await.unwrap();
        let socks_addr = socks_listener.local_addr().unwrap();

        let kill_switch = KillSwitch::new(true);
        let ks_clone = kill_switch.clone();
        let c_clone = Arc::clone(&circuit_client);

        let socks_handle = tokio::spawn(async move {
            while let Ok((stream, _)) = socks_listener.accept().await {
                let c = Arc::clone(&c_clone);
                let ks = ks_clone.clone();
                tokio::spawn(async move {
                    let _ = proxy_socks5_connection(stream, c, ks).await;
                });
            }
        });

        // 7. Aplicação cliente conecta ao proxy SOCKS5 local
        let mut app_client = TcpStream::connect(socks_addr).await.expect("conecta no SOCKS5");
        let app_local_addr = app_client.local_addr().expect("local addr");

        // Handshake SOCKS5 RFC 1928: No Auth
        app_client.write_all(&[0x05, 0x01, 0x00]).await.unwrap();
        let mut auth_rep = [0u8; 2];
        app_client.read_exact(&mut auth_rep).await.unwrap();
        assert_eq!(auth_rep, [0x05, 0x00]);

        // Solicita CONNECT para o Mock Target Server
        let mut req = vec![0x05, 0x01, 0x00, 0x01];
        match target_addr.ip() {
            std::net::IpAddr::V4(v4) => req.extend_from_slice(&v4.octets()),
            _ => panic!("Esperado IPv4 para o teste"),
        }
        req.extend_from_slice(&target_addr.port().to_be_bytes());
        app_client.write_all(&req).await.unwrap();

        let mut conn_rep = [0u8; 10];
        app_client.read_exact(&mut conn_rep).await.unwrap();
        assert_eq!(conn_rep[0], 0x05);
        assert_eq!(conn_rep[1], 0x00, "Conexão SOCKS5 através do circuito deve suceder");

        // 8. Envia payload da aplicação através do SOCKS5
        let test_payload = b"MENSAGEM_ANONIMA_VIA_VEIL_OMEGA";
        app_client.write_all(test_payload).await.unwrap();

        // 9. Verifica resposta devolvida pela saída
        let mut resp_buf = vec![0u8; 4 + test_payload.len()];
        app_client.read_exact(&mut resp_buf).await.unwrap();
        assert_eq!(&resp_buf[..4], b"ACK:");
        assert_eq!(&resp_buf[4..], test_payload);

        // 10. COMPROVAÇÃO DE SEGURANÇA E ZERO-LEAK:
        // O Mock Target Server observou uma conexão com peer_addr originada pelo nó Exit.
        // O nó Exit abriu um socket de saída e sua porta NUNCA é a porta da aplicação cliente!
        let observed_peer = peer_rx.await.expect("peer observado pelo target");
        assert_ne!(
            observed_peer.port(),
            app_local_addr.port(),
            "VIOLAÇÃO DE SEGURANÇA: O target recebeu conexão direta da porta da aplicação cliente!"
        );
        assert_ne!(
            observed_peer.port(),
            guard_addr.port(),
            "VIOLAÇÃO: O Guard nunca deve abrir conexão direta com o target!"
        );
        assert_ne!(
            observed_peer.port(),
            middle_addr.port(),
            "VIOLAÇÃO: O Middle nunca deve abrir conexão direta com o target!"
        );

        // Limpeza
        socks_handle.abort();
        guard_handle.abort();
        middle_handle.abort();
        exit_handle.abort();
    }

    #[tokio::test]
    async fn test_e2e_circuit_disruption_fail_closed_no_fallback() {
        // 1. Mock Target Server
        let target_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target_addr = target_listener.local_addr().unwrap();
        let target_connected = Arc::new(AtomicBool::new(false));
        let tc_clone = Arc::clone(&target_connected);

        tokio::spawn(async move {
            while let Ok((mut stream, _)) = target_listener.accept().await {
                tc_clone.store(true, Ordering::SeqCst);
                let mut buf = [0u8; 100];
                let _ = stream.read(&mut buf).await;
            }
        });

        // 2. Monta nós Guard e Exit
        let exit_kp = mlkem_keygen();
        let exit_policy = ExitPolicy {
            allowed_ports: vec![target_addr.port()],
            blocked_ports: vec![],
            block_private_networks: false,
            max_bandwidth_bps: 0,
        };
        let exit_router = VeilHopRouter::new(exit_kp, Some(exit_policy));
        let exit_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let exit_addr = exit_listener.local_addr().unwrap();
        let exit_desc = exit_router.descriptor("exit".into(), exit_addr.to_string());
        let exit_handle = tokio::spawn(async move {
            let _ = exit_router.run(exit_listener).await;
        });

        let guard_kp = mlkem_keygen();
        let guard_router = VeilHopRouter::new(guard_kp, None);
        let guard_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let guard_addr = guard_listener.local_addr().unwrap();
        let guard_desc = guard_router.descriptor("guard".into(), guard_addr.to_string());
        let guard_handle = tokio::spawn(async move {
            let _ = guard_router.run(guard_listener).await;
        });

        // Circuito de 2 saltos: Guard -> Exit
        let hops = vec![
            CircuitHopNode::from_descriptor(guard_desc),
            CircuitHopNode::from_descriptor(exit_desc),
        ];

        let circuit_client = Arc::new(LiveCircuitClient::connect(999, hops).await.unwrap());

        let socks_server = Socks5Server::new("127.0.0.1:0".parse().unwrap());
        let socks_listener = socks_server.bind().await.unwrap();
        let socks_addr = socks_listener.local_addr().unwrap();

        let kill_switch = KillSwitch::new(true);

        // TESTE A: Kill Switch disparado antes da conexão
        kill_switch.trigger("Simulação de perda de rota");

        let ks_clone = kill_switch.clone();
        let c_clone = Arc::clone(&circuit_client);

        let socks_handle = tokio::spawn(async move {
            while let Ok((stream, _)) = socks_listener.accept().await {
                let c = Arc::clone(&c_clone);
                let ks = ks_clone.clone();
                tokio::spawn(async move {
                    let _ = proxy_socks5_connection(stream, c, ks).await;
                });
            }
        });

        // Aplicação tenta conectar com Kill Switch ativado
        let mut app_client = TcpStream::connect(socks_addr).await.unwrap();
        let _ = app_client.write_all(&[0x05, 0x01, 0x00]).await;
        let mut rep = [0u8; 2];
        let res = app_client.read_exact(&mut rep).await;
        // Deve falhar imediatamente (conexão fechada pelo proxy sem tráfego)
        assert!(res.is_err() || rep != [0x05, 0x00]);

        // Target NUNCA deve ter recebido qualquer pacote direto (Zero Direct Fallback)
        assert!(
            !target_connected.load(Ordering::SeqCst),
            "VIOLAÇÃO CRÍTICA: Houve tentativa de conexão direta ao alvo mesmo com Kill Switch acionado!"
        );

        socks_handle.abort();
        guard_handle.abort();
        exit_handle.abort();
    }
}
