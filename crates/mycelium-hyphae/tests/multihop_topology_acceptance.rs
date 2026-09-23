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
