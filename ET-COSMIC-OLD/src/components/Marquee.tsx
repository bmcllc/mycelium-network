export default function Marquee() {
  const items = [
    "ZERO PERSISTENT IDENTITY",
    "K=2 OF N=3 SHAMIR SHARDS",
    "HKDF-SHA3-512 · ARGON2id",
    "ML-KEM-1024 · ML-DSA-87",
    "RAM ONLY · ZERO DISK",
    "BLE · UWB · LoRa · DTN",
    "HUMAN CARRIER NETWORK",
    "PEDERSEN COMMITMENTS",
    "eBPF · SGX · WebGPU",
    "PERCOLATION R₀ > 3",
  ];
  const all = [...items, ...items];
  return (
    <section className="border-y border-[#14181c] bg-[#0a0d10] overflow-hidden">
      <div className="flex marquee-track whitespace-nowrap py-4">
        {all.map((t, i) => (
          <span
            key={i}
            className="px-8 font-mono text-[11px] tracking-[0.3em] text-zinc-500"
          >
            <span className="text-[#b6ff3a] mr-3">◆</span>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
