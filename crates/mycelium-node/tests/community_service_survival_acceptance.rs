//! Teste de aceitação: Entrega 4 — Primeiro Serviço Comunitário (Sobrevivência de Conteúdo sem Gateway Público)
//!
//! Cenários testados:
//! - `CONTENT_SURVIVAL`: Publicador desligado -> Conteúdo preservado e recuperável na Réplica
//! - `SERVICE_NATIVE`: Sem gateway público, sem DNS externo, sem internet convencional
//!
//! Fluxo:
//! 1. Nó 1 (Publicador): Semeia o serviço comunitário ("index.html" com página Web nativa) no Spore Bank.
//! 2. Nó 2 (Custodiante / Réplica): Conectado via malha nativa ao Nó 1, absorve o SporePrint automaticamente via Lattice Gossipsub.
//! 3. O Publicador (Nó 1) é encerrado e desligado completamente (OFFLINE).
//! 4. Nó 2 (Réplica Comunitária): Sem contato com o Nó 1, atende à solicitação `RecallCode` e materializa o serviço.
//! 5. Conteúdo é verificado byte a byte com integridade criptográfica ContentId (BLAKE3).

use mycelium_node::{call, run_daemon, DaemonOptions, Request, Response};
use std::time::Duration;
use tempfile::tempdir;

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

#[tokio::test]
async fn test_community_service_content_survival_after_publisher_shutdown() {
    let dir_1 = tempdir().unwrap();
    let home_1 = dir_1.path().to_path_buf();
    let sock_1 = home_1.join("mycelium.sock");

    let dir_2 = tempdir().unwrap();
    let home_2 = dir_2.path().to_path_buf();
    let sock_2 = home_2.join("mycelium.sock");

    // 1. Inicia Nó 1 (Publicador Comunitário)
    let opts_1 = DaemonOptions {
        listen: vec!["/ip4/127.0.0.1/tcp/0".to_string()],
        horizon_port: 0, // Efêmero / sem gateway externo obrigatório
        no_mdns: true,
        ..Default::default()
    };

    let h1_clone = home_1.clone();
    let daemon_1_task = tokio::spawn(async move {
        if let Err(e) = run_daemon(h1_clone, opts_1).await {
            eprintln!("DAEMON 1 ERROR: {e:?}");
        }
    });
    wait_for_sock(&sock_1).await;

    // Obtém o endereço de escuta do Nó 1 para bootstrap do Nó 2
    let status_1 = call(&sock_1, Request::Status).await.expect("Status Nó 1");
    let _node_1_peer_id = match &status_1 {
        Response::Status(s) => s.node_id.clone(),
        other => panic!("Esperado Status, obtido {:?}", other),
    };

    // Lê os endereços anunciados pelo Nó 1 em listen_addrs.json
    let listen_addrs_file = home_1.join("listen_addrs.json");
    let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
    while tokio::time::Instant::now() < deadline && !listen_addrs_file.exists() {
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    let addrs_json = std::fs::read_to_string(&listen_addrs_file).expect("ler listen_addrs Nó 1");
    let addrs: Vec<String> = serde_json::from_str(&addrs_json).expect("parse listen_addrs");
    let node_1_tcp = addrs
        .into_iter()
        .find(|a| a.contains("/tcp/") && !a.contains("/quic"))
        .expect("Endereço TCP do Nó 1");
    let node_1_addr = node_1_tcp;

    // 2. Inicia Nó 2 (Réplica / Custodiante Comunitário) conectado ao Nó 1
    let opts_2 = DaemonOptions {
        listen: vec!["/ip4/127.0.0.1/tcp/0".to_string()],
        bootstrap: vec![node_1_addr],
        horizon_port: 0,
        no_mdns: true,
        ..Default::default()
    };

    let h2_clone = home_2.clone();
    let daemon_2_task = tokio::spawn(async move {
        if let Err(e) = run_daemon(h2_clone, opts_2).await {
            eprintln!("DAEMON 2 ERROR: {e:?}");
        }
    });
    wait_for_sock(&sock_2).await;

    // Aguarda anastomose entre Nó 1 e Nó 2
    let connect_deadline = tokio::time::Instant::now() + Duration::from_secs(15);
    let mut connected = false;
    while tokio::time::Instant::now() < connect_deadline {
        if let Ok(Response::Status(s2)) = call(&sock_2, Request::Status).await {
            if s2.neighbors >= 1 {
                connected = true;
                break;
            }
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    assert!(connected, "Nó 2 deve conectar ao Nó 1 pela rede nativa");

    // 3. Nó 1 semeia um serviço comunitário ("portal de saúde e notícias locais")
    let service_html = "<!doctype html><html><body><h1>Rede Comunitária Autônoma</h1><p>Serviço vivo sem DNS nem gateway central.</p></body></html>";
    let sow_resp = call(
        &sock_1,
        Request::Sow {
            message: "[public] Serviço Comunitário: Guia Solar v1".to_string(),
            path: "index.html".to_string(),
            content: service_html.to_string(),
            qel: None,
            nostr: false,
            ghost: false,
            recipient: None,
        },
    )
    .await
    .expect("Sow no Nó 1");

    let plot_cid_str = match sow_resp {
        Response::Ok { message } => {
            assert!(message.starts_with("plot semeado: "));
            message.trim_start_matches("plot semeado: ").to_string()
        }
        other => panic!("Esperado Ok do sow, obtido {:?}", other),
    };

    // 4. Aguarda replicação do SporePrint para o Nó 2 através do Lattice gossipsub
    let plot_cid: mycelium_core::ContentId = plot_cid_str.parse().expect("valid CID");

    let sync_deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    let mut replicated = false;
    while tokio::time::Instant::now() < sync_deadline {
        if let Ok(replica_bank) = mycelium_sporebank::SporeBank::open(&home_2) {
            if let Some(plot) = replica_bank.recall(&plot_cid) {
                assert_eq!(plot.leaves.len(), 1);
                assert_eq!(&plot.leaves[0].content, service_html.as_bytes());
                replicated = true;
                break;
            }
        }
        tokio::time::sleep(Duration::from_millis(150)).await;
    }
    assert!(
        replicated,
        "Nó 2 deve absorver e persistir o Plot semeado pelo Nó 1 via Lattice gossip"
    );

    // 5. DESLIGAMENTO TOTAL DO PUBLICADOR (Nó 1)
    // O Publicador é encerrado. A máquina / processo deixa de existir na rede.
    let shutdown_1 = call(&sock_1, Request::Shutdown).await.expect("Shutdown Nó 1");
    assert!(matches!(shutdown_1, Response::Ok { .. }));
    let _ = tokio::time::timeout(Duration::from_secs(3), daemon_1_task).await;

    // Confirma que o Nó 1 está completamente offline
    assert!(
        tokio::net::UnixStream::connect(&sock_1).await.is_err(),
        "Nó 1 deve estar completamente desligado"
    );

    // 6. SERVIÇO SOBREVIVE: Nó 2 atende à solicitação e materializa o conteúdo
    // Sem qualquer contato com o Nó 1 (que está morto), o Nó 2 serve o conteúdo
    let output_restore_dir = home_2.join("restored_service");
    let recall_resp = call(
        &sock_2,
        Request::RecallCode {
            plot: plot_cid_str.clone(),
            output_dir: Some(output_restore_dir.to_string_lossy().to_string()),
        },
    )
    .await
    .expect("RecallCode no Nó 2");

    assert!(matches!(recall_resp, Response::Ok { .. }), "Nó 2 deve servir o código do plot");

    // 7. Verificação byte a byte do arquivo servido pela réplica
    let restored_file = output_restore_dir.join("index.html");
    assert!(restored_file.exists(), "index.html deve ter sido materializado pelo Nó 2");
    let restored_content = std::fs::read_to_string(&restored_file).expect("ler index.html restaurado");
    assert_eq!(
        restored_content, service_html,
        "Conteúdo servido pela réplica deve ser idêntico ao publicado originalmente"
    );

    // 8. CONTINUIDADE REAL DE SERVIÇO HTTP (GATE B):
    // Nó 2 mantém e serve o serviço ativo no seu Event Horizon local.
    // Uma requisição HTTP real ao endpoint do Event Horizon do Nó 2 deve retornar HTTP 200 OK.
    let status_2 = call(&sock_2, Request::Status).await.expect("Status Nó 2");
    let horizon_2_url = match status_2 {
        Response::Status(s) => s.event_horizon,
        other => panic!("Esperado Status, obtido {:?}", other),
    };

    let http_client = reqwest::Client::builder().no_proxy().build().unwrap();
    let service_endpoint = format!("{}/guia-solar/index.html", horizon_2_url);

    let http_deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    let mut http_served = false;
    let mut dynamic_body = String::new();
    while tokio::time::Instant::now() < http_deadline {
        if let Ok(resp) = http_client.get(&service_endpoint).send().await {
            if resp.status().is_success() {
                dynamic_body = resp.text().await.unwrap_or_default();
                http_served = true;
                break;
            }
        }
        tokio::time::sleep(Duration::from_millis(150)).await;
    }

    assert!(http_served, "Nó 2 deve servir a requisição HTTP dinamicamente no Event Horizon com HTTP 200");
    assert_eq!(
        dynamic_body, service_html,
        "Resposta HTTP servida pelo Nó 2 deve ser idêntica ao serviço publicado originalmente"
    );

    // 9. Encerramento limpo do Nó 2
    let shutdown_2 = call(&sock_2, Request::Shutdown).await.expect("Shutdown Nó 2");
    assert!(matches!(shutdown_2, Response::Ok { .. }));
    let _ = tokio::time::timeout(Duration::from_secs(3), daemon_2_task).await;
}
