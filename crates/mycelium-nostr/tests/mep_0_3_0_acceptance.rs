use mycelium_core::ContentId;
use mycelium_ghostid::GhostId;
use mycelium_nostr::{
    create_shard_event, decode_shard_content, encode_shard_content, seal_event, NostrError,
    RelayPool, KIND_QEL_SHARD,
};
use mycelium_qel::{
    fragment, reconstruct, QelConfig, QelShard, COMPACT_SHARE_WIRE_HEADER_LEN,
};
use mycelium_sporebank::SporeBank;
use serde_json::json;
use std::path::PathBuf;

const RAW_CID: &str = "ab0bf09ba27d1f8366e255191f6465704a4d2ea50c21e992d75d76405d3141ba";

fn legacy_share_wire(shard: &QelShard) -> Vec<u8> {
    assert!(shard.payload.len() >= COMPACT_SHARE_WIRE_HEADER_LEN);
    let flags = shard.payload[7];
    serde_json::to_vec(&json!({
        "index": shard.payload[4],
        "data": &shard.payload[COMPACT_SHARE_WIRE_HEADER_LEN..],
        "threshold": shard.payload[5],
        "total_shares": shard.payload[6],
        "integrity_check": flags & 1 != 0,
        "compression": flags & 2 != 0,
    }))
    .unwrap()
}

fn legacy_event(ghost: &GhostId, shard: &QelShard) -> mycelium_nostr::NostrEvent {
    let content = serde_json::to_string(shard).unwrap();
    let tags = vec![
        vec!["d".into(), format!("{}:{}", shard.content_id, shard.index)],
        vec!["i".into(), shard.content_id.clone()],
        vec!["shard".into(), format!("{}/{}", shard.index, shard.total)],
        vec!["qel".into(), format!("{},{}", shard.threshold, shard.total)],
        vec!["transport".into(), "nostr".into()],
    ];
    seal_event(ghost, 1_700_000_000, KIND_QEL_SHARD, tags, content).unwrap()
}

/// Medição offline do Plot real do MEP-0.3.0. É ignorada no CI porque depende
/// do SporeBank local; execute com `cargo test ... --ignored --nocapture`.
#[test]
#[ignore = "requer o SporeBank local com o Plot de aceitação"]
fn existing_plot_fits_three_qel_events_and_roundtrips() {
    let home = std::env::var_os("MYCELIUM_ACCEPTANCE_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/home/bruno/mycelium-node-a"));
    let raw_cid = std::env::var("MYCELIUM_ACCEPTANCE_CID").unwrap_or_else(|_| RAW_CID.into());
    let cid: ContentId = raw_cid.parse().unwrap();
    let canonical_cid = cid.to_string();
    let bank = SporeBank::open(home).unwrap();
    let spore_print = bank.spore_print(&cid).unwrap();
    assert_eq!(ContentId::of(&spore_print), cid);

    let shards = fragment(
        &spore_print,
        &canonical_cid,
        &QelConfig {
            threshold: 3,
            total: 7,
            ttl_secs: 86_400,
        },
    )
    .unwrap();
    let ghost = GhostId::spawn_quick(3_600).unwrap();
    let mut legacy_shards = Vec::new();

    println!("spore_print_bytes={}", spore_print.len());
    for shard in &shards {
        let share_bytes = shard.payload.len() - COMPACT_SHARE_WIRE_HEADER_LEN;
        let compact_qel = encode_shard_content(shard).unwrap();
        let event = create_shard_event(&ghost, shard, None).unwrap();
        let frame = RelayPool::serialized_event(&event).unwrap();

        let legacy_share = legacy_share_wire(shard);
        let mut legacy_shard = shard.clone();
        legacy_shard.payload = legacy_share.clone();
        let legacy_qel = serde_json::to_string(&legacy_shard).unwrap();
        let old_event = legacy_event(&ghost, &legacy_shard);
        let old_frame = json!(["EVENT", old_event]).to_string();

        println!(
            "shard={} shamir_share={} share_wire_v0={} share_wire_v1={} qel_v0={} qel_v1={} frame_v0={} frame_v1={}",
            shard.index,
            share_bytes,
            legacy_share.len(),
            shard.payload.len(),
            legacy_qel.len(),
            compact_qel.len(),
            old_frame.len(),
            frame.len(),
        );
        assert!(frame.len() <= 61_440);

        // O leitor novo aceita o envelope QEL legado e o ShareWire legado.
        let decoded = decode_shard_content(&legacy_qel).unwrap();
        assert_eq!(decoded.payload, legacy_share);
        legacy_shards.push(decoded);
    }

    let recovered = reconstruct(&shards[..3]).unwrap();
    assert_eq!(recovered, spore_print);
    assert_eq!(ContentId::of(&recovered), cid);

    let legacy_recovered = reconstruct(&legacy_shards[..3]).unwrap();
    assert_eq!(legacy_recovered, spore_print);
    assert_eq!(ContentId::of(&legacy_recovered), cid);

    // A guarda continua falhando localmente, antes de qualquer socket.
    let mut oversized = shards[0].clone();
    oversized.payload = vec![0; 61_440];
    let oversized_event = create_shard_event(&ghost, &oversized, None).unwrap();
    assert!(matches!(
        RelayPool::serialized_event(&oversized_event),
        Err(NostrError::EventTooLarge { .. })
    ));
}
