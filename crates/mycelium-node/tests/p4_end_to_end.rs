use giggs::{
    merge_three_way, GiggsError, Leaf, Mesh, Plot, RefStore, RefUpdate, SignedRefUpdate,
};
use inertia::{
    collect_artifact, command_manifest, execute, materialize_leaves, AttestationPayload,
    AttestationStore, SignedAttestation, Thrust,
};
use mycelium_core::{ContentId, NodeId};
use mycelium_ghostid::GhostId;
use std::collections::BTreeMap;
use tempfile::tempdir;

fn leaf(path: &str, content: &[u8]) -> Leaf {
    Leaf {
        path: path.into(),
        content: content.to_vec(),
    }
}

fn plot(author: NodeId, message: &str, parents: Vec<ContentId>, leaves: Vec<Leaf>) -> Plot {
    Plot {
        author,
        message: message.into(),
        parents,
        leaves,
    }
}

#[test]
fn p4_versioning_and_provenance_survive_two_nodes_restart_and_tampering() {
    let root = tempdir().unwrap();
    let node_a = root.path().join("node-a");
    let node_b = root.path().join("node-b");
    std::fs::create_dir_all(&node_a).unwrap();
    std::fs::create_dir_all(&node_b).unwrap();

    let identity_a = GhostId::from_secret_bytes([0x41; 32], 3_600).unwrap();
    let identity_b = GhostId::from_secret_bytes([0x42; 32], 3_600).unwrap();
    let author_a = NodeId::derive(identity_a.nostr_pubkey_hex().as_bytes());
    let executor_b = NodeId::derive(identity_b.nostr_pubkey_hex().as_bytes());

    // Cenário 1: publicação no nó A, recuperação byte a byte no nó B e reinício.
    let base_leaves = vec![
        leaf("MESSAGE", b"P4 private two-node fixture\n"),
        leaf("src/main.txt", b"base\n"),
    ];
    let mut mesh_a = Mesh::new();
    let base = mesh_a
        .sow(plot(author_a, "[private] p4 base", vec![], base_leaves.clone()))
        .unwrap();
    let ours = mesh_a
        .sow(plot(
            author_a,
            "[private] p4 ours",
            vec![base],
            vec![
                leaf("MESSAGE", b"P4 private two-node fixture\n"),
                leaf("src/main.txt", b"ours\n"),
            ],
        ))
        .unwrap();
    let theirs = mesh_a
        .sow(plot(
            author_a,
            "[private] p4 theirs",
            vec![base],
            vec![
                leaf("MESSAGE", b"P4 private two-node fixture\n"),
                leaf("src/main.txt", b"theirs\n"),
            ],
        ))
        .unwrap();

    let mut mesh_b = Mesh::new();
    for id in [base, ours, theirs] {
        let wire = mesh_a.spore_print(&id).unwrap();
        assert_eq!(mesh_b.absorb(&wire).unwrap(), id);
        assert_eq!(mesh_a.spore_print(&id).unwrap(), mesh_b.spore_print(&id).unwrap());
    }
    let mesh_b_path = node_b.join("mesh.json");
    std::fs::write(&mesh_b_path, serde_json::to_vec_pretty(&mesh_b).unwrap()).unwrap();
    drop(mesh_b);
    let mut mesh_b: Mesh = serde_json::from_slice(&std::fs::read(&mesh_b_path).unwrap()).unwrap();
    assert_eq!(mesh_b.lineage(&ours).unwrap(), vec![ours, base]);

    // Cenário 2: CAS concorrente rejeita a atualização obsoleta, sem afetar branch paralela.
    let refs = RefStore::open(node_a.join("refs")).unwrap();
    let initial = SignedRefUpdate::sign(
        RefUpdate {
            repository: "p4".into(),
            name: "main".into(),
            target: base,
            previous: None,
            sequence: 0,
        },
        &identity_a,
    )
    .unwrap();
    refs.compare_and_swap(initial).unwrap();
    let winner = SignedRefUpdate::sign(
        RefUpdate {
            repository: "p4".into(),
            name: "main".into(),
            target: ours,
            previous: Some(base),
            sequence: 1,
        },
        &identity_a,
    )
    .unwrap();
    refs.compare_and_swap(winner).unwrap();
    let stale = SignedRefUpdate::sign(
        RefUpdate {
            repository: "p4".into(),
            name: "main".into(),
            target: theirs,
            previous: Some(base),
            sequence: 1,
        },
        &identity_a,
    )
    .unwrap();
    assert!(matches!(
        refs.compare_and_swap(stale),
        Err(GiggsError::RefConflict { .. })
    ));
    let topic = SignedRefUpdate::sign(
        RefUpdate {
            repository: "p4".into(),
            name: "topic".into(),
            target: theirs,
            previous: None,
            sequence: 0,
        },
        &identity_a,
    )
    .unwrap();
    refs.compare_and_swap(topic).unwrap();
    drop(refs);
    let refs = RefStore::open(node_a.join("refs")).unwrap();
    assert_eq!(refs.read("p4", "main").unwrap().unwrap().update.target, ours);
    assert_eq!(refs.read("p4", "topic").unwrap().unwrap().update.target, theirs);

    // Cenário 3: conflito fica explícito; somente a resolução cria merge com dois pais.
    let base_plot = mesh_b.get(&base).unwrap().clone();
    let ours_plot = mesh_b.get(&ours).unwrap().clone();
    let theirs_plot = mesh_b.get(&theirs).unwrap().clone();
    let unresolved = merge_three_way(&base_plot.leaves, &ours_plot.leaves, &theirs_plot.leaves);
    assert_eq!(unresolved.conflicts.len(), 1);
    assert_eq!(unresolved.conflicts[0].path, "src/main.txt");
    assert!(unresolved.leaves.iter().all(|item| item.path != "src/main.txt"));
    let mut resolved = unresolved.leaves;
    resolved.push(leaf("src/main.txt", b"resolved ours + theirs\n"));
    let merge = mesh_b
        .sow(plot(
            author_a,
            "[private] p4 resolved merge",
            vec![ours, theirs],
            resolved,
        ))
        .unwrap();
    assert_eq!(mesh_b.get(&merge).unwrap().parents, vec![ours, theirs]);
    let lineage = mesh_b.lineage(&merge).unwrap();
    assert!(lineage.contains(&ours) && lineage.contains(&theirs) && lineage.contains(&base));
    std::fs::write(&mesh_b_path, serde_json::to_vec_pretty(&mesh_b).unwrap()).unwrap();
    let restarted: Mesh = serde_json::from_slice(&std::fs::read(&mesh_b_path).unwrap()).unwrap();
    assert_eq!(restarted.get(&merge).unwrap().parents, vec![ours, theirs]);

    // Cenário 4: Inertia executa o CID recuperado e vincula comandos, ambiente e artefato.
    let recovered = restarted.get(&merge).unwrap();
    let workbench = node_b.join("workbench");
    let materialized: Vec<_> = recovered
        .leaves
        .iter()
        .map(|item| (item.path.clone(), item.content.clone()))
        .collect();
    materialize_leaves(&workbench, &materialized).unwrap();
    let thrust = Thrust::Build;
    let commands = command_manifest(&thrust, &workbench);
    let momentum = execute(&thrust, executor_b, &workbench);
    assert!(momentum.success);
    let artifacts = collect_artifact(&workbench).unwrap();
    let artifact_ids: Vec<_> = artifacts
        .iter()
        .map(|(_, bytes)| ContentId::of(bytes))
        .collect();
    let attestation = SignedAttestation::sign(
        AttestationPayload {
            input: merge,
            thrust,
            commands,
            environment: BTreeMap::from([
                ("network".into(), "private-loopback".into()),
                ("scenario".into(), "p4".into()),
            ]),
            executor: executor_b,
            success: momentum.success,
            atp_earned: momentum.atp_earned,
            log_digest: ContentId::of(momentum.log.as_bytes()),
            artifacts: artifact_ids.clone(),
        },
        &identity_b,
    )
    .unwrap();
    let store_a = AttestationStore::open(node_a.join("attestations")).unwrap();
    let attestation_id = store_a.persist(&attestation).unwrap();
    let store_b_root = node_b.join("attestations");
    std::fs::create_dir_all(&store_b_root).unwrap();
    std::fs::copy(
        node_a.join("attestations").join(format!("{attestation_id}.json")),
        store_b_root.join(format!("{attestation_id}.json")),
    )
    .unwrap();
    let store_b = AttestationStore::open(&store_b_root).unwrap();
    let verified = store_b.get(&attestation_id).unwrap();
    assert_eq!(verified.payload.input, merge);
    assert_eq!(verified.payload.artifacts, artifact_ids);
    for ((_, bytes), declared) in artifacts.iter().zip(verified.payload.artifacts.iter()) {
        assert_eq!(ContentId::of(bytes), *declared);
    }

    // Cenário 5: cópia adulterada é recusada e não concede ATP nem autoriza deploy.
    let tampered_root = node_b.join("tampered-attestations");
    std::fs::create_dir_all(&tampered_root).unwrap();
    let tampered_path = tampered_root.join(format!("{attestation_id}.json"));
    let mut tampered = std::fs::read(
        node_a.join("attestations").join(format!("{attestation_id}.json")),
    )
    .unwrap();
    let byte = tampered.iter_mut().find(|byte| **byte == b'p').unwrap();
    *byte = b'P';
    std::fs::write(&tampered_path, tampered).unwrap();
    let mut credited_atp = 0_u64;
    let mut deploys = 0_u64;
    if let Ok(value) = AttestationStore::open(&tampered_root).unwrap().get(&attestation_id) {
        credited_atp += value.payload.atp_earned;
        deploys += u64::from(value.payload.success);
    }
    assert_eq!(credited_atp, 0);
    assert_eq!(deploys, 0);
    let mut altered_artifact = artifacts[0].1.clone();
    altered_artifact.push(0xff);
    assert_ne!(ContentId::of(&altered_artifact), artifact_ids[0]);
    assert_eq!(credited_atp, 0);
    assert_eq!(deploys, 0);

    println!("P4 base={base} merge={merge} attestation={attestation_id}");
    println!(
        "P4 artifact_cids={} stale_cas=rejected tamper=rejected",
        artifact_ids
            .iter()
            .map(ToString::to_string)
            .collect::<Vec<_>>()
            .join(",")
    );
}
