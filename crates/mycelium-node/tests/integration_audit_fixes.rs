use giggs::{Leaf, Plot};
use mycelium_core::NodeId;
use mycelium_sporebank::SporeBank;
use singularity::{serve_horizon, EventHorizon, Orbit};
use std::sync::{Arc, RwLock};

#[tokio::test]
async fn test_multi_node_gravity_balancing_and_failover() {
    let table = Arc::new(RwLock::new(EventHorizon::new()));
    let node1 = NodeId::derive(b"machine-alpha");
    let node2 = NodeId::derive(b"machine-beta");

    // Registra duas réplicas para o ion "distributed-app"
    {
        let mut guard = table.write().unwrap();
        // Nó 1: mass 20, resistance 0 => gravidade 20.0
        guard.expose(
            "app.mycelium",
            Orbit {
                ion: "distributed-app".into(),
                node: node1,
                mass: 20,
                resistance: 0,
                upstream: "http://10.0.0.1:8080".into(),
            },
        );
        // Nó 2: mass 90, resistance 0 => gravidade 90.0 (maior gravidade)
        guard.expose(
            "app.mycelium",
            Orbit {
                ion: "distributed-app".into(),
                node: node2,
                mass: 90,
                resistance: 0,
                upstream: "http://10.0.0.2:8080".into(),
            },
        );
    }

    // 1. Balanceamento por gravidade escolhe Node 2
    {
        let guard = table.read().unwrap();
        let best = guard.route_ion("distributed-app").unwrap();
        assert_eq!(best.node, node2);
        assert_eq!(best.upstream, "http://10.0.0.2:8080");
    }

    // 2. Simula falha do Node 2 (queda de máquina / desconexão P2P)
    {
        let mut guard = table.write().unwrap();
        guard.collapse(&node2);
    }

    // 3. Failover automático: tráfego cai instantaneamente no Node 1 sobrevivente
    {
        let guard = table.read().unwrap();
        let fallback = guard.route_ion("distributed-app").unwrap();
        assert_eq!(fallback.node, node1);
        assert_eq!(fallback.upstream, "http://10.0.0.1:8080");
    }
}

#[test]
fn test_security_path_traversal_blocked_in_layers_and_leaves() {
    let tmp = tempfile::tempdir().unwrap();
    let rootfs = tmp.path().join("rootfs");

    // Vacuum: Rejeição de zip-slip / path traversal
    let mut layer = vacuum::LayerArchive::new();
    layer.insert("../../../etc/shadow", b"malicious payload");
    let err = layer.apply_to(&rootfs);
    assert!(err.is_err(), "Deveria ter bloqueado path traversal");

    // Inertia: Rejeição de path traversal nas leaves do Plot
    let leaves = vec![
        ("../../crontab".to_string(), b"* * * * * root reboot".to_vec()),
    ];
    let err_inertia = inertia::materialize_leaves(&rootfs, &leaves);
    assert!(err_inertia.is_err(), "Deveria ter bloqueado path traversal no Inertia");
}

#[tokio::test]
async fn test_event_horizon_private_plot_and_security_headers() {
    let tmp = tempfile::tempdir().unwrap();
    let home = tmp.path().to_path_buf();

    let author = NodeId::derive(b"alice-creator");
    let mut bank = SporeBank::open(&home).unwrap();
    let plot = Plot {
        author,
        message: "[private] confidential project".into(),
        parents: vec![],
        leaves: vec![Leaf {
            path: "secret.txt".into(),
            content: b"super secret code".to_vec(),
        }],
    };
    let plot_id = bank.deposit(plot).unwrap();

    let table = Arc::new(RwLock::new(EventHorizon::new()));
    table.write().unwrap().set_home(home);

    let bind: std::net::SocketAddr = "127.0.0.1:0".parse().unwrap();
    let handle = serve_horizon(bind, table).await.expect("horizon bind");
    let base_url = format!("http://{}", handle.bind);

    let client = reqwest::Client::builder().no_proxy().build().unwrap();

    // 1. Acesso a /health com verificação de security headers
    let health_resp = client.get(format!("{base_url}/health")).send().await.unwrap();
    assert_eq!(health_resp.status(), reqwest::StatusCode::OK);
    assert_eq!(
        health_resp.headers().get("x-content-type-options").unwrap(),
        "nosniff"
    );
    assert_eq!(
        health_resp.headers().get("x-frame-options").unwrap(),
        "SAMEORIGIN"
    );

    // 2. Sem capabilities criptográficas, privada nunca sai por HTTP.
    let unauth_resp = client
        .get(format!("{base_url}/plots/{plot_id}"))
        .send()
        .await
        .unwrap();
    assert_eq!(unauth_resp.status(), reqwest::StatusCode::NOT_FOUND);

    // 3. Um NodeId público NÃO é uma credencial de autenticação.
    let auth_resp = client
        .get(format!("{base_url}/plots/{plot_id}"))
        .header("Authorization", format!("Bearer {author}"))
        .send()
        .await
        .unwrap();
    assert_eq!(auth_resp.status(), reqwest::StatusCode::NOT_FOUND);

    // 4. Sem ACL de layer, a rota HTTP não permite exfiltrar bytes.
    let layer = client.get(format!("{base_url}/layers/{}", mycelium_core::ContentId::of(b"x")))
        .send().await.unwrap();
    assert_eq!(layer.status(), reqwest::StatusCode::NOT_FOUND);

    // 5. Plots públicos continuam publicáveis em qualquer Event Horizon.
    let public_plot = Plot {
        author,
        message: "[public] homepage".into(),
        parents: vec![],
        leaves: vec![Leaf { path: "index.html".into(), content: b"hello".to_vec() }],
    };
    let mut bank = SporeBank::open(tmp.path()).unwrap();
    let public_id = bank.deposit(public_plot).unwrap();
    let public_response = client.get(format!("{base_url}/plots/{public_id}"))
        .send().await.unwrap();
    assert_eq!(public_response.status(), reqwest::StatusCode::OK);

    handle.shutdown();
}

#[tokio::test]
async fn test_proxy_read_fallback_to_surviving_replica() {
    let backup_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let backup_port = backup_listener.local_addr().unwrap().port();
    let backup_server = tokio::spawn(async move {
        let app = axum::Router::new().route("/", axum::routing::get(|| async { "backup-alive" }));
        let _ = axum::serve(backup_listener, app).await;
    });

    // Porta reservada e liberada: normalmente connection refused imediato.
    let dead_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let dead_port = dead_listener.local_addr().unwrap().port();
    drop(dead_listener);

    let table = Arc::new(RwLock::new(EventHorizon::new()));
    {
        let mut horizon = table.write().unwrap();
        horizon.expose("h", Orbit {
            ion: "resilient".into(), node: NodeId::derive(b"dead"),
            mass: 100, resistance: 0,
            upstream: format!("http://127.0.0.1:{dead_port}"),
        });
        horizon.expose("h", Orbit {
            ion: "resilient".into(), node: NodeId::derive(b"backup"),
            mass: 1, resistance: 0,
            upstream: format!("http://127.0.0.1:{backup_port}"),
        });
    }
    let horizon = serve_horizon("127.0.0.1:0".parse().unwrap(), table).await.unwrap();
    let client = reqwest::Client::builder().no_proxy().build().unwrap();
    let root = format!("http://{}", horizon.bind);
    let read = client.get(format!("{root}/resilient/")).send().await.unwrap();
    assert_eq!(read.status(), reqwest::StatusCode::OK);
    assert_eq!(read.text().await.unwrap(), "backup-alive");
    // POST não deve ser reenviado para outra máquina após erro de transporte.
    let write = client.post(format!("{root}/resilient/"))
        .body("mutation").send().await.unwrap();
    assert_eq!(write.status(), reqwest::StatusCode::BAD_GATEWAY);
    horizon.shutdown();
    backup_server.abort();
}
