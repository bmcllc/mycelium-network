//! Teste de aceitação: Entrega 3 — Primeira Malha Independente A-B-C (Multissalto)
//!
//! Cenário MESH_MULTIHOP:
//! - Topologia estrita A — B — C
//! - mDNS desativado (sem internet convencional, sem descoberta broadcast LAN)
//! - Nó A conecta APENAS ao Nó B (bootstrap contém apenas B)
//! - Nó C conecta APENAS ao Nó B (bootstrap contém apenas B)
//! - Demonstra que:
//!   1. A e C NÃO possuem conexão direta (`connected_peer_ids` de A não contém C; de C não contém A).
//!   2. A transmite dados via gossipsub (Lattice).
//!   3. B recebe de A e encaminha para C.
//!   4. C recebe os dados originados por A com integridade comprovada.
//!   5. Quando B é desligado, a comunicação A -> C é interrompida, provando que B era o roteador.

use mycelium_hyphae::{HyphaEvent, HyphaeConfig, HyphaeNode};
use std::time::Duration;

#[tokio::test]
async fn test_multihop_topology_a_b_c_without_direct_link() {
    // 1. Nó B: Nó intermediário (relay/ponto de encontro da malha)
    let mut b = HyphaeNode::germinate_with(HyphaeConfig {
        seed: Some([20u8; 32]),
        listen: vec!["/ip4/127.0.0.1/tcp/0".parse().unwrap()],
        bootstrap: vec![],
        enable_mdns: false,
        enable_relay_server: true,
        ..Default::default()
    })
    .expect("Nó B germina");

    let peer_b = b.peer_id();

    // Aguarda B enraizar e obter endereço dialable
    let b_addr = tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            if let Some(HyphaEvent::Rooted { address }) = b.pulse().await {
                if address.to_string().contains("/tcp/") {
                    let mut dialable = address;
                    dialable.push(libp2p::multiaddr::Protocol::P2p(peer_b));
                    return dialable;
                }
            }
        }
    })
    .await
    .expect("B enraíza");

    // 2. Nó A: Conecta EXCLUSIVAMENTE a B (não conhece C)
    let mut a = HyphaeNode::germinate_with(HyphaeConfig {
        seed: Some([10u8; 32]),
        listen: vec!["/ip4/127.0.0.1/tcp/0".parse().unwrap()],
        bootstrap: vec![b_addr.clone()],
        enable_mdns: false,
        ..Default::default()
    })
    .expect("Nó A germina");
    let peer_a = a.peer_id();

    // 3. Nó C: Conecta EXCLUSIVAMENTE a B (não conhece A)
    let mut c = HyphaeNode::germinate_with(HyphaeConfig {
        seed: Some([30u8; 32]),
        listen: vec!["/ip4/127.0.0.1/tcp/0".parse().unwrap()],
        bootstrap: vec![b_addr.clone()],
        enable_mdns: false,
        ..Default::default()
    })
    .expect("Nó C germina");
    let peer_c = c.peer_id();

    // Isolamento topológico estrito: A bloqueia conexões diretas com C, C bloqueia com A.
    // Qualquer tentativa de auto-descoberta LAN ou dial direto é rejeitada.
    a.block_peer(peer_c);
    c.block_peer(peer_a);

    // 4. Executa o loop de eventos até que:
    // - A esteja conectado a B
    // - C esteja conectado a B
    let deadline = tokio::time::Instant::now() + Duration::from_secs(15);
    let mut a_connected_to_b = false;
    let mut c_connected_to_b = false;

    while tokio::time::Instant::now() < deadline && (!a_connected_to_b || !c_connected_to_b) {
        tokio::select! {
            ev = a.pulse() => {
                if let Some(HyphaEvent::Anastomosis { peer }) = ev {
                    if peer == peer_b { a_connected_to_b = true; }
                }
            }
            ev = b.pulse() => {
                if let Some(HyphaEvent::Anastomosis { peer }) = ev {
                    if peer == peer_a { a_connected_to_b = true; }
                    if peer == peer_c { c_connected_to_b = true; }
                }
            }
            ev = c.pulse() => {
                if let Some(HyphaEvent::Anastomosis { peer }) = ev {
                    if peer == peer_b { c_connected_to_b = true; }
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }

    assert!(a_connected_to_b, "Nó A deve anastomosear com Nó B");
    assert!(c_connected_to_b, "Nó C deve anastomosear com Nó B");

    // Dê um breve intervalo para estabilização do mesh gossipsub
    let mesh_settle = tokio::time::Instant::now() + Duration::from_millis(600);
    while tokio::time::Instant::now() < mesh_settle {
        tokio::select! {
            _ = a.pulse() => {}
            _ = b.pulse() => {}
            _ = c.pulse() => {}
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }

    // 5. PROVA 1: Ausência de conexão direta entre A e C
    let peers_of_a = a.connected_peer_ids();
    let peers_of_c = c.connected_peer_ids();

    assert!(
        peers_of_a.contains(&peer_b),
        "A deve ter vizinho B"
    );
    assert!(
        !peers_of_a.contains(&peer_c),
        "VIOLAÇÃO DE ISOLAMENTO: A não pode ter conexão direta com C!"
    );
    assert_eq!(
        peers_of_a.len(),
        1,
        "A deve ter estritamente 1 par conectado (apenas B)"
    );

    assert!(
        peers_of_c.contains(&peer_b),
        "C deve ter vizinho B"
    );
    assert!(
        !peers_of_c.contains(&peer_a),
        "VIOLAÇÃO DE ISOLAMENTO: C não pode ter conexão direta com A!"
    );
    assert_eq!(
        peers_of_c.len(),
        1,
        "C deve ter estritamente 1 par conectado (apenas B)"
    );

    // 6. PROVA 2: Envio de mensagem de A para C via B
    let payload = b"DADOS_MULTISALTO_A_B_C_PROVADOS".to_vec();

    // Em libp2p Gossipsub, após ConnectionEstablished os nós trocam subscrições de tópicos.
    // Pulsamos os três nós até que a subscrição esteja ativa e A consiga publicar (Ok(true)).
    let mut sent = false;
    let subscribe_deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    while tokio::time::Instant::now() < subscribe_deadline {
        if let Ok(true) = a.broadcast_lattice(payload.clone()) {
            sent = true;
            break;
        }
        tokio::select! {
            _ = a.pulse() => {}
            _ = b.pulse() => {}
            _ = c.pulse() => {}
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }
    assert!(sent, "Nó A deve conseguir publicar no tópico Lattice com vizinho B subscrito");

    let mut c_received_payload = false;
    let mut b_relayed_message = false;

    let delivery_deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    while tokio::time::Instant::now() < delivery_deadline && !c_received_payload {
        tokio::select! {
            _ = a.pulse() => {}
            ev_b = b.pulse() => {
                if let Some(HyphaEvent::LatticeReceived { data, .. }) = ev_b {
                    if data == payload {
                        b_relayed_message = true;
                    }
                }
            }
            ev_c = c.pulse() => {
                if let Some(HyphaEvent::LatticeReceived { data, .. }) = ev_c {
                    if data == payload {
                        c_received_payload = true;
                    }
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }

    assert!(
        b_relayed_message,
        "Nó intermediário B deve receber e processar a mensagem no fluxo"
    );
    assert!(
        c_received_payload,
        "Nó destino C deve receber a mensagem transmitida por A através de B!"
    );

    // 7. PROVA 3: Se B é encerrado, A não consegue entregar novos dados a C
    drop(b); // Encerra o nó intermediário B

    let payload_fail = b"DADOS_COM_B_OFFLINE".to_vec();
    let _ = a.broadcast_lattice(payload_fail.clone());

    let mut c_received_after_b_drop = false;
    let fail_deadline = tokio::time::Instant::now() + Duration::from_secs(2);
    while tokio::time::Instant::now() < fail_deadline {
        tokio::select! {
            _ = a.pulse() => {}
            ev_c = c.pulse() => {
                if let Some(HyphaEvent::LatticeReceived { data, .. }) = ev_c {
                    if data == payload_fail {
                        c_received_after_b_drop = true;
                    }
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }

    assert!(
        !c_received_after_b_drop,
        "Com B offline, C não deve receber a mensagem, comprovando a dependência do salto em B"
    );
}

#[tokio::test]
async fn test_unicast_dtn_multihop_without_gossip_flood_and_with_store_and_forward() {
    use mycelium_hyphae::DtnBundle;

    // 1. Nó B: Roteador intermediário / Ponto de encontro
    let mut b = HyphaeNode::germinate_with(HyphaeConfig {
        seed: Some([25u8; 32]),
        listen: vec!["/ip4/127.0.0.1/tcp/0".parse().unwrap()],
        bootstrap: vec![],
        enable_mdns: false,
        enable_relay_server: true,
        ..Default::default()
    })
    .expect("Nó B germina");
    let peer_b = b.peer_id();

    let b_addr = tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            if let Some(HyphaEvent::Rooted { address }) = b.pulse().await {
                if address.to_string().contains("/tcp/") {
                    let mut dialable = address;
                    dialable.push(libp2p::multiaddr::Protocol::P2p(peer_b));
                    return dialable;
                }
            }
        }
    })
    .await
    .expect("B enraíza");

    // 2. Nó A: Emissor (conecta apenas a B)
    let mut a = HyphaeNode::germinate_with(HyphaeConfig {
        seed: Some([15u8; 32]),
        listen: vec!["/ip4/127.0.0.1/tcp/0".parse().unwrap()],
        bootstrap: vec![b_addr.clone()],
        enable_mdns: false,
        ..Default::default()
    })
    .expect("Nó A germina");
    let peer_a = a.peer_id();

    // 3. Nó C: Destino final (conecta apenas a B)
    let mut c = HyphaeNode::germinate_with(HyphaeConfig {
        seed: Some([35u8; 32]),
        listen: vec!["/ip4/127.0.0.1/tcp/0".parse().unwrap()],
        bootstrap: vec![b_addr.clone()],
        enable_mdns: false,
        ..Default::default()
    })
    .expect("Nó C germina");
    let peer_c = c.peer_id();

    // 4. Nó D: Vizinho NÃO ENVOLVIDO (bystander conectado a B, mas alheio a A e C)
    let mut d = HyphaeNode::germinate_with(HyphaeConfig {
        seed: Some([45u8; 32]),
        listen: vec!["/ip4/127.0.0.1/tcp/0".parse().unwrap()],
        bootstrap: vec![b_addr.clone()],
        enable_mdns: false,
        ..Default::default()
    })
    .expect("Nó D germina");
    let peer_d = d.peer_id();

    // Isolamento topológico estrito
    a.block_peer(peer_c);
    a.block_peer(peer_d);
    c.block_peer(peer_a);
    c.block_peer(peer_d);
    d.block_peer(peer_a);
    d.block_peer(peer_c);

    // Aguarda anastomose de A, C e D com B
    let deadline = tokio::time::Instant::now() + Duration::from_secs(15);
    let mut a_connected = false;
    let mut c_connected = false;
    let mut d_connected = false;

    while tokio::time::Instant::now() < deadline && (!a_connected || !c_connected || !d_connected) {
        tokio::select! {
            ev = a.pulse() => {
                if let Some(HyphaEvent::Anastomosis { peer }) = ev {
                    if peer == peer_b { a_connected = true; }
                }
            }
            ev = b.pulse() => {
                if let Some(HyphaEvent::Anastomosis { peer }) = ev {
                    if peer == peer_a { a_connected = true; }
                    if peer == peer_c { c_connected = true; }
                    if peer == peer_d { d_connected = true; }
                }
            }
            ev = c.pulse() => {
                if let Some(HyphaEvent::Anastomosis { peer }) = ev {
                    if peer == peer_b { c_connected = true; }
                }
            }
            ev = d.pulse() => {
                if let Some(HyphaEvent::Anastomosis { peer }) = ev {
                    if peer == peer_b { d_connected = true; }
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }

    assert!(a_connected && c_connected && d_connected, "A, C e D devem estar conectados a B");

    // Prova de topologia estrela centrada em B
    assert_eq!(a.connected_peer_ids(), vec![peer_b]);
    assert_eq!(c.connected_peer_ids(), vec![peer_b]);
    assert_eq!(d.connected_peer_ids(), vec![peer_b]);

    // Estabilização da malha (Identify + subscrições gossipsub dos canais DTN)
    let mesh_settle = tokio::time::Instant::now() + Duration::from_millis(800);
    while tokio::time::Instant::now() < mesh_settle {
        tokio::select! {
            _ = a.pulse() => {}
            _ = b.pulse() => {}
            _ = c.pulse() => {}
            _ = d.pulse() => {}
            _ = tokio::time::sleep(Duration::from_millis(20)) => {}
        }
    }

    // =========================================================================
    // FASE 1: ROTEAMENTO UNICAST MULTISSALTO SEM GOSSIP FLOOD
    // =========================================================================
    let secret_payload = b"DADOS_CONFIDENCIAIS_UNICAST_A_PARA_C".to_vec();
    let bundle_1 = DtnBundle {
        bundle_id: "bundle-unicast-gate-a-1".to_string(),
        src_peer: peer_a.to_string(),
        dst_peer: peer_c.to_string(),
        created_at: 1000,
        ttl_secs: 3600,
        hops: 0,
        max_hops: 16,
        payload: secret_payload.clone(),
    };

    // A envia via DTN unicast direcionado exclusivamente para B
    let mut sent = false;
    let send_deadline = tokio::time::Instant::now() + Duration::from_secs(5);
    while tokio::time::Instant::now() < send_deadline {
        if a.send_unicast_dtn(peer_b, bundle_1.clone()).is_ok() {
            sent = true;
            break;
        }
        tokio::select! {
            _ = a.pulse() => {}
            _ = b.pulse() => {}
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }
    assert!(sent, "A deve conseguir enviar unicast DTN para B");

    let mut c_received_bundle = false;
    let mut d_leaked_message = false;
    let delivery_deadline = tokio::time::Instant::now() + Duration::from_secs(10);

    while tokio::time::Instant::now() < delivery_deadline && !c_received_bundle {
        tokio::select! {
            _ = a.pulse() => {}
            ev_b = b.pulse() => {
                if let Some(HyphaEvent::DtnBundleReceived { bundle, .. }) = ev_b {
                    if bundle.bundle_id == "bundle-unicast-gate-a-1" {
                        // B roteia adiante via forward_or_store_dtn
                        let _ = b.forward_or_store_dtn(bundle);
                    }
                }
            }
            ev_c = c.pulse() => {
                if let Some(HyphaEvent::DtnBundleReceived { bundle, .. }) = ev_c {
                    if bundle.bundle_id == "bundle-unicast-gate-a-1" && bundle.payload == secret_payload {
                        c_received_bundle = true;
                    }
                }
            }
            ev_d = d.pulse() => {
                match ev_d {
                    Some(HyphaEvent::DtnBundleReceived { bundle, .. }) => {
                        if bundle.bundle_id == "bundle-unicast-gate-a-1" {
                            d_leaked_message = true;
                        }
                    }
                    Some(HyphaEvent::LatticeReceived { data, .. }) => {
                        if data == secret_payload {
                            d_leaked_message = true;
                        }
                    }
                    _ => {}
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }

    assert!(c_received_bundle, "Nó C deve receber o bundle DTN unicast encaminhado por B");
    assert!(!d_leaked_message, "VIOLAÇÃO DE PRIVACIDADE: Nó D (não envolvido) não pode receber mensagem unicast!");

    // =========================================================================
    // FASE 2: STORE-AND-FORWARD DTN SOBREVIVENDO À DESCONEXÃO TEMPORÁRIA
    // =========================================================================
    // Nó C desconecta da rede (simula intermitência de campo / nó móvel offline)
    drop(c);

    // Aguarda B detectar que C desconectou
    let atrophy_deadline = tokio::time::Instant::now() + Duration::from_secs(4);
    while tokio::time::Instant::now() < atrophy_deadline {
        tokio::select! {
            _ = b.pulse() => {}
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
        if !b.connected_peer_ids().contains(&peer_c) {
            break;
        }
    }
    assert!(!b.connected_peer_ids().contains(&peer_c), "Nó B deve registrar que C está offline");

    // A emite novo bundle DTN para C enquanto C está completamente fora do ar
    let async_payload = b"DADOS_ASSINCRONOS_STORE_FORWARD_DTN".to_vec();
    let bundle_2 = DtnBundle {
        bundle_id: "bundle-async-gate-a-2".to_string(),
        src_peer: peer_a.to_string(),
        dst_peer: peer_c.to_string(),
        created_at: 2000,
        ttl_secs: 3600,
        hops: 0,
        max_hops: 16,
        payload: async_payload.clone(),
    };

    let mut sent_async = false;
    let send_async_deadline = tokio::time::Instant::now() + Duration::from_secs(5);
    while tokio::time::Instant::now() < send_async_deadline {
        if a.send_unicast_dtn(peer_b, bundle_2.clone()).is_ok() {
            sent_async = true;
            break;
        }
        tokio::select! {
            _ = a.pulse() => {}
            _ = b.pulse() => {}
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }
    assert!(sent_async, "A envia bundle assíncrono para B");

    // B recebe o bundle; como C está offline, armazena no seu DTN bundle store
    let store_deadline = tokio::time::Instant::now() + Duration::from_secs(5);
    while tokio::time::Instant::now() < store_deadline {
        tokio::select! {
            _ = a.pulse() => {}
            ev_b = b.pulse() => {
                if let Some(HyphaEvent::DtnBundleReceived { bundle, .. }) = ev_b {
                    if bundle.bundle_id == "bundle-async-gate-a-2" {
                        let forwarded = b.forward_or_store_dtn(bundle).expect("forward_or_store");
                        assert!(!forwarded, "Com C offline, o bundle deve ser guardado no DTN store (não forwarded)");
                    }
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
        if b.dtn_store_ref().get("bundle-async-gate-a-2").is_some() {
            break;
        }
    }

    assert!(
        b.dtn_store_ref().get("bundle-async-gate-a-2").is_some(),
        "O bundle deve estar retido no DTN bundle store de B aguardando o retorno de C"
    );

    // Agora o Nó C germina novamente com a mesma identidade e reconecta a B
    let mut c_reborn = HyphaeNode::germinate_with(HyphaeConfig {
        seed: Some([35u8; 32]), // Mesma semente -> mesmo PeerId
        listen: vec!["/ip4/127.0.0.1/tcp/0".parse().unwrap()],
        bootstrap: vec![b_addr.clone()],
        enable_mdns: false,
        ..Default::default()
    })
    .expect("Nó C ressurge");
    c_reborn.block_peer(peer_a);
    c_reborn.block_peer(peer_d);
    assert_eq!(c_reborn.peer_id(), peer_c);

    // Ao reconectar (Anastomosis), B descarrega os bundles pendentes no DTN store para C
    let mut c_received_async = false;
    let reconnect_deadline = tokio::time::Instant::now() + Duration::from_secs(12);

    while tokio::time::Instant::now() < reconnect_deadline && !c_received_async {
        tokio::select! {
            _ = a.pulse() => {}
            _ = b.pulse() => {}
            ev_c = c_reborn.pulse() => {
                if let Some(HyphaEvent::DtnBundleReceived { bundle, .. }) = ev_c {
                    if bundle.bundle_id == "bundle-async-gate-a-2" && bundle.payload == async_payload {
                        c_received_async = true;
                    }
                }
            }
            ev_d = d.pulse() => {
                if let Some(HyphaEvent::DtnBundleReceived { bundle, .. }) = ev_d {
                    if bundle.bundle_id == "bundle-async-gate-a-2" {
                        panic!("VAZAMENTO: Nó D não envolvido recebeu bundle DTN durante entrega assíncrona!");
                    }
                }
            }
            _ = tokio::time::sleep(Duration::from_millis(50)) => {}
        }
    }

    assert!(
        c_received_async,
        "Nó C reconectado deve receber o bundle armazenado no DTN store de B durante a intermitência!"
    );
}
