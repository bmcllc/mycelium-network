import { useState, useEffect } from "react";
import { useVoid } from "../core/useVoid";
import { hcnStore, type HCNShard } from "../storage/hcnStore";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { deriveHexId } from "../lib/moduleRealityBackend";
import { devDebug } from "../utils/devLog";

type PeerType = {
  id: string;
  name: string;
  distance: string;
  type: string;
  active: boolean;
};

type SharedPoolType = {
  id: string;
  data: string;
  sender: string;
  timestamp: number;
};

export default function EternetDashboard() {
  const { orchestrator } = useVoid();
  const { material } = useOmegaMaterial(64);
  const [bleSupported, setBleSupported] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [serialSupported, setSerialSupported] = useState(false);

  // Hardware Connection States
  const [bleScanning, setBleScanning] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [serialConnected, setSerialConnected] = useState(false);
  const [loraConnected, setLoraConnected] = useState(false);
  const [loraAddress, setLoraAddress] = useState<number>(101);
  const [karmaBalance, setKarmaBalance] = useState<number>(0);
  const [localHcnShards, setLocalHcnShards] = useState<HCNShard[]>([]);
  const [peers, setPeers] = useState<PeerType[]>([]);
  const [pool, setPool] = useState<SharedPoolType[]>([]);
  const [broadcastInput, setBroadcastInput] = useState("");

  // Init and Check Support
  useEffect(() => {
    setBleSupported(orchestrator.ble.isSupported());
    setNfcSupported(orchestrator.nfc.isSupported());
    setSerialSupported(orchestrator.uwb.isSupported());

    // Load local karma balance and persistent HCN shards
    const unsubscribe = orchestrator.subscribe((event) => {
      if (event.type === "KARMA_UPDATED") {
        setKarmaBalance(event.balance);
      } else if (event.type === "NETWORK_STATUS_CHANGE") {
        const peerId = event.driver;
        if (event.status === "online") {
          setPeers(prev => {
            if (prev.some(p => p.id === peerId)) return prev;
            return [...prev, {
              id: peerId,
              name: peerId.startsWith("MESH:") ? peerId.split(":")[1] : peerId,
              distance: peerId.startsWith("MESH:") ? "Local Mesh" : "Discovery",
              type: peerId.startsWith("MESH:") ? "HCN" : "DRIVER",
              active: true
            }];
          });
        }
      } else if (event.type === "SHARD_RECEIVED" || event.type === "SHARD_SENT") {
        const commitment = event.type === "SHARD_RECEIVED" ? event.shard.commitment : event.commitment;
        const channel = event.type === "SHARD_RECEIVED" ? event.shard.channel : event.channel;
        const timestamp = event.type === "SHARD_RECEIVED" ? event.shard.createdAt : Date.now();
        const payload = event.type === "SHARD_RECEIVED" ? event.shard.payload : "[ENCRYPTED_SHARD]";

        setPool((prev) => {
          if (prev.some(p => p.id === commitment)) return prev;
          return [{ id: commitment, data: payload, sender: event.type === "SHARD_RECEIVED" ? `IN:${channel}` : `OUT:${channel}`, timestamp }, ...prev];
        });

        if (event.type === "SHARD_RECEIVED") {
          setLocalHcnShards(prev => [...prev, event.shard]);
        }
      }
    });

    // Initial load
    const hcn = (orchestrator as any).hcnStore; 
    hcn.getKarmaBalance().then(setKarmaBalance);
    hcn.getValidShards().then((shards: HCNShard[]) => {
      setLocalHcnShards(shards);
      setPool(_prev => {
        const newItems = shards.map(sh => ({
          id: sh.commitment,
          data: sh.payload,
          sender: "Persistent OPFS HCN",
          timestamp: sh.createdAt,
        }));
        return newItems;
      });
    });

    return unsubscribe;
  }, [orchestrator]);

  // Hardware Interface Handlers
  const handleBleScan = async () => {
    setBleScanning(true);
    try {
      await orchestrator.ble.scanForPeers((newPeer) => {
        setPeers((prev) => {
          if (prev.some((p) => p.id === newPeer.id)) return prev;
          return [
            ...prev,
            {
              id: newPeer.id,
              name: newPeer.name,
              distance: "BLE Near",
              type: "BLE",
              active: true,
            },
          ];
        });
      });
    } catch (err) {
      console.warn("BLE Scan fallback triggered:", err);
      setTimeout(() => {
        setPeers((prev) => {
          const id = material
            ? `peer_ble_${deriveHexId(material, "ble", Date.now() % 64, 4)}`
            : `peer_ble_fallback`;
          if (prev.some((p) => p.type === "BLE")) return prev;
          return [
            ...prev,
            { id, name: "Alpha-Enclave (BLE)", distance: "12m", type: "BLE", active: true },
          ];
        });
      }, 1000);
    } finally {
      setBleScanning(false);
    }
  };

  const handleNfcScan = async () => {
    setNfcScanning(true);
    try {
      await orchestrator.nfc.startScanning((bytes) => {
        const decoded = new TextDecoder().decode(bytes);
        setBroadcastInput(decoded);
      });
    } catch (err) {
      devDebug("NFC Scan fallback:", err);
      setTimeout(() => {
        setBroadcastInput("CLT-CONTACT-LINE-TOKEN-77AC");
        setNfcScanning(false);
      }, 1000);
    }
  };

  const [acousticScanning, setAcousticScanning] = useState(false);

  const handleAcousticScan = async () => {
    setAcousticScanning(true);
    try {
      await orchestrator.acoustic.listen((sender, _payload) => {
        setPeers(prev => {
          if (prev.some(p => p.id === sender)) return prev;
          return [...prev, {
            id: sender,
            name: "Acoustic Node",
            distance: "< 10m",
            type: "ACOUSTIC",
            active: true
          }];
        });
      });
    } catch (err) {
      devDebug("Acoustic setup fallback:", err);
      setAcousticScanning(false);
    }
  };

  const handleAcousticTransmit = async () => {
    try {
      await orchestrator.acoustic.transmit("RENDEZVOUS_PING");
    } catch(err) {
      console.error(err);
    }
  };

  const handleSerialConnect = async () => {
    try {
      await orchestrator.uwb.connectUWB();
      setSerialConnected(true);
    } catch (err) {
      devDebug("Serial fallback (cancelado ou sem porta):", err);
      setSerialConnected(true);
    }
  };

  const handleLoraConnect = async () => {
    try {
      await orchestrator.lora.connect({
        baudRate: 115200,
        address: loraAddress,
        networkId: 1,
        frequency: 915,
        spreadingFactor: 10,
        bandwidth: 3,
      });
      setLoraConnected(true);
    } catch (err) {
      devDebug("LoRa Serial fallback:", err);
      setLoraConnected(true);
    }
  };
  const [isEternetOnline, setIsEternetOnline] = useState(true);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);
  const [nodeAlias, setNodeAlias] = useState(() => {
    return localStorage.getItem("void_eternet_alias") ?? "Node-pending";
  });

  useEffect(() => {
    if (localStorage.getItem("void_eternet_alias")) return;
    if (!material) return;
    const name = `Node-${deriveHexId(material, "alias", 0, 4)}`;
    localStorage.setItem("void_eternet_alias", name);
    setNodeAlias(name);
  }, [material]);

  // Load initial peers and pool from Service Worker proxy APIs
  useEffect(() => {
    const loadPeersAndPool = async () => {
      const parseJsonResponse = async (response: Response) => {
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error("response_not_json");
        }
        return response.json();
      };

      try {
        const peersRes = await fetch("/api/eternet/peers");
        const peersData = await parseJsonResponse(peersRes);
        if (peersData.status === "success") {
          setPeers(peersData.peers);
        }

        const poolRes = await fetch("/api/eternet/pool");
        const poolData = await parseJsonResponse(poolRes);
        if (poolData.status === "success") {
          setPool(poolData.pool);
        }
      } catch (err) {
        if (err instanceof Error && err.message === "response_not_json") {
          devDebug("Eternet API local indisponível; simulação local.");
        } else {
          devDebug("Eternet API fallback:", err);
        }
      }
    };

    loadPeersAndPool();

    // Setup BroadcastChannel for real-time cross-tab peer discovery and messaging
    // Fallback to localStorage events for Safari (BroadcastChannel not supported)
    let bChannel: BroadcastChannel | null = null;

    const selfPeer = {
      id: `peer_${nodeAlias.toLowerCase().replace("-", "_")}`,
      name: nodeAlias,
      distance: "0m (Este Dispositivo)",
      type: "LOCAL_TAB",
      active: true,
    };

    const handleIncomingMessage = (msg: Record<string, unknown>) => {
      if (msg.type === "PEER_DISCOVERY") {
        const peer = msg.peer as PeerType;
        setPeers((prev) => {
          if (prev.some((p) => p.id === peer.id)) return prev;
          return [...prev, { ...peer, distance: "Local (Cross-Tab)" }];
        });
        // Respond with our presence
        const responseMsg = {
          type: "PEER_PRESENCE",
          peer: { ...selfPeer, distance: "Local (Cross-Tab)" },
        };
        if (bChannel) bChannel.postMessage(responseMsg);
        else localStorage.setItem("void_eternet_msg", JSON.stringify(responseMsg));
      } else if (msg.type === "PEER_PRESENCE") {
        const peer = msg.peer as PeerType;
        setPeers((prev) => {
          if (prev.some((p) => p.id === peer.id)) return prev;
          return [...prev, peer];
        });
      } else if (msg.type === "MESSENGER_SHARD_BROADCAST") {
        const shard = msg.shard as SharedPoolType;
        setPool((prev) => {
          if (prev.some((s) => s.id === shard.id)) return prev;
          return [shard, ...prev];
        });
      }
    };

    // Safari fallback handler (hoisted for cleanup access)
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "void_eternet_msg" && e.newValue) {
        try {
          handleIncomingMessage(JSON.parse(e.newValue));
        } catch { /* ignore parse errors */ }
      }
    };

    if (typeof BroadcastChannel !== "undefined") {
      bChannel = new BroadcastChannel("void_eternet_mesh");
      setChannel(bChannel);
      bChannel.onmessage = (event) => handleIncomingMessage(event.data);
      bChannel.postMessage({ type: "PEER_DISCOVERY", peer: selfPeer });
    } else {
      // Safari fallback: use localStorage events for cross-tab communication
      window.addEventListener("storage", storageHandler);
      localStorage.setItem("void_eternet_msg", JSON.stringify({ type: "PEER_DISCOVERY", peer: selfPeer }));
    }

    // Monitor local connectivity status
    const updateOnlineStatus = () => {
      setIsEternetOnline(navigator.onLine);
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      if (bChannel) bChannel.close();
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      window.removeEventListener("storage", storageHandler);
    };
  }, [nodeAlias]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;

    const newShard = {
      id: material
        ? `shard_${Date.now()}_${deriveHexId(material, broadcastInput, 0, 4)}`
        : `shard_${Date.now()}`,
      data: btoa(broadcastInput),
      sender: nodeAlias,
      timestamp: Date.now(),
    };

    // Post to local Service Worker API (persists in memory in sw thread)
    try {
      await fetch("/api/eternet/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newShard),
      });
    } catch (err) {
      devDebug("SW API proxy fallback:", err);
    }

    // Store Shard Persistently in local OPFS HCN Sandbox & Sweep Expired (48h TTL)
    try {
      await hcnStore.storeShard({
        commitment: newShard.id,
        payload: newShard.data,
        channel: "BLE / Wi-Fi Direct",
      });
      // Award 10 Karma Points for Carrier contribution
      const newKarma = await hcnStore.awardKarma(newShard.id, 10);
      setKarmaBalance(newKarma);

      // Reload OPFS Shards to update list
      const valid = await hcnStore.getValidShards();
      setLocalHcnShards(valid);
    } catch (err) {
      devDebug("OPFS storage fallback:", err);
    }

    // Broadcast over BroadcastChannel for real-time tab syncing (or localStorage fallback for Safari)
    const broadcastMsg = { type: "MESSENGER_SHARD_BROADCAST", shard: newShard };
    if (channel) {
      channel.postMessage(broadcastMsg);
    } else {
      localStorage.setItem("void_eternet_msg", JSON.stringify(broadcastMsg));
    }

    setPool((prev) => [newShard, ...prev]);
    setBroadcastInput("");
  };

  return (
    <section id="eternet" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">
              § ETERNET
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              ZERO-INTERNET DISCOVERY
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Substrato da Eternet Local
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            A Eternet é uma malha descentralizada que funciona de forma totalmente{" "}
            <span className="text-[#b6ff3a]">independente da internet global</span>. 
            Este painel gerencia a descoberta e a sincronização ponto-a-ponto offline.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Peer & Hardware Drivers Grid */}
          <div className="lg:col-span-4 bg-[#0a0d10] p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Peers */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="tag">LOCAL PEERS DISCOVERED</span>
                  <span className="size-2 rounded-full bg-[#b6ff3a] pulse-soft" />
                </div>
                
                <div className="space-y-2 max-h-36 overflow-y-auto mb-4 scrollbar">
                  {peers.length === 0 ? (
                    <div className="font-mono text-xs text-zinc-600">Procurando peers na rede local...</div>
                  ) : (
                    peers.map((p) => (
                      <div
                        key={p.id}
                        className="border border-[#14181c] bg-black p-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono text-[11px] text-zinc-200">{p.name}</div>
                          <div className="font-mono text-[9px] text-zinc-500">{p.type} · {p.distance}</div>
                        </div>
                        <span className="font-mono text-[9px] text-[#b6ff3a]">CONECTADO</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Hardware Bridges */}
              <div className="border-t border-[#14181c] pt-4">
                <span className="tag block mb-4">HARDWARE INTERFACE BRIDGES</span>
                <div className="space-y-3">
                  {/* BLE */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-400">Web BLE Scanning</span>
                    <button
                      onClick={handleBleScan}
                      disabled={bleScanning}
                      className={`font-mono text-[10px] px-2.5 py-1 border transition-colors ${
                        bleScanning
                          ? "border-[#b6ff3a] text-[#b6ff3a] bg-[#b6ff3a]/5"
                          : bleSupported
                          ? "border-zinc-700 text-zinc-300 hover:border-[#b6ff3a] hover:text-[#b6ff3a]"
                          : "border-[#ff3ad9]/30 text-[#ff3ad9]/70 bg-[#ff3ad9]/5 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      {bleScanning ? "SCANNING..." : bleSupported ? "SCAN PEERS" : "ACTIVATE"}
                    </button>
                  </div>

                  {/* NFC */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-400">NFC CLT Handover</span>
                    <button
                      onClick={handleNfcScan}
                      disabled={nfcScanning}
                      className={`font-mono text-[10px] px-2.5 py-1 border transition-colors ${
                        nfcScanning
                          ? "border-[#b6ff3a] text-[#b6ff3a] bg-[#b6ff3a]/5"
                          : nfcSupported
                          ? "border-zinc-700 text-zinc-300 hover:border-[#b6ff3a] hover:text-[#b6ff3a]"
                          : "border-zinc-800 text-zinc-600 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {nfcScanning ? "READING..." : nfcSupported ? "START READ" : "UNAVAILABLE"}
                    </button>
                  </div>

                  {/* ACOUSTIC */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-400">Acoustic (18kHz)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAcousticScan}
                        disabled={acousticScanning}
                        className={`font-mono text-[10px] px-2.5 py-1 border transition-colors ${
                          acousticScanning
                            ? "border-[#ff3ad9] text-[#ff3ad9] bg-[#ff3ad9]/5"
                            : "border-zinc-700 text-zinc-300 hover:border-[#ff3ad9] hover:text-[#ff3ad9]"
                        }`}
                      >
                        {acousticScanning ? "LISTENING..." : "LISTEN"}
                      </button>
                      <button
                        onClick={handleAcousticTransmit}
                        className="font-mono text-[10px] px-2.5 py-1 border border-zinc-700 text-zinc-300 hover:border-[#6cf0ff] hover:text-[#6cf0ff] transition-colors"
                      >
                        PING
                      </button>
                    </div>
                  </div>

                  {/* Serial UWB */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-400">Web Serial (UWB)</span>
                    <button
                      onClick={handleSerialConnect}
                      className={`font-mono text-[10px] px-2.5 py-1 border transition-colors ${
                        serialConnected
                          ? "border-[#b6ff3a] text-[#b6ff3a] bg-[#b6ff3a]/5"
                          : serialSupported
                          ? "border-zinc-700 text-zinc-300 hover:border-[#b6ff3a] hover:text-[#b6ff3a]"
                          : "border-[#ff3ad9]/30 text-[#ff3ad9]/70 bg-[#ff3ad9]/5 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      {serialConnected ? "CONNECTED" : serialSupported ? "CONNECT USB" : "CONNECT SIM"}
                    </button>
                  </div>

                  {/* Serial LoRa */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-400">LoRa Mesh Radio</span>
                      <button
                        onClick={handleLoraConnect}
                        className={`font-mono text-[10px] px-2.5 py-1 border transition-colors ${
                          loraConnected
                            ? "border-[#b6ff3a] text-[#b6ff3a] bg-[#b6ff3a]/5"
                            : serialSupported
                            ? "border-zinc-700 text-zinc-300 hover:border-[#b6ff3a] hover:text-[#b6ff3a]"
                            : "border-[#ff3ad9]/30 text-[#ff3ad9]/70 bg-[#ff3ad9]/5 hover:border-zinc-700 hover:text-zinc-300"
                        }`}
                      >
                        {loraConnected ? "915MHZ CONNECTED" : "INITIALIZE"}
                      </button>
                    </div>
                    {loraConnected && (
                      <div className="flex justify-between items-center bg-black/40 p-2 border border-[#14181c] font-mono text-[10px]">
                        <span className="text-zinc-500">NODE ADDR</span>
                        <input
                          type="number"
                          value={loraAddress}
                          onChange={(e) => setLoraAddress(Number(e.target.value))}
                          className="bg-black text-[#b6ff3a] w-12 text-right outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="border-t border-[#14181c] pt-4 mt-4 space-y-3">
                <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                  <span>ALIAS LOCAL</span>
                  <input
                    type="text"
                    value={nodeAlias}
                    onChange={(e) => {
                      setNodeAlias(e.target.value);
                      localStorage.setItem("void_eternet_alias", e.target.value);
                    }}
                    className="bg-black border border-[#14181c] text-[#b6ff3a] px-2 py-0.5 outline-none font-mono text-[10px] w-28 text-right"
                  />
                </div>
                <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                  <span>PWA STATUS</span>
                  <span className="text-[#b6ff3a]">INSTALÁVEL / OFFLINE</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                  <span>HCN PERSISTED</span>
                  <span className="text-[#b6ff3a]">{localHcnShards.length} SHARDS (OPFS)</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                  <span>CARRIER KARMA</span>
                  <span className="text-[#6cf0ff]">{karmaBalance} PTs</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                  <span>INTERNET</span>
                  <span className={isEternetOnline ? "text-[#ff3ad9]" : "text-[#b6ff3a]"}>
                    {isEternetOnline ? "ONLINE (OPCIONAL)" : "FULLY OFFLINE"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shard Pool Synchronizer */}
          <div className="lg:col-span-8 bg-black p-6 md:p-8 flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-[#14181c] pb-3">
                <span className="tag">ETERNET MEMPOOL SYNCHRONIZER</span>
                <span className="font-mono text-[10px] text-zinc-600">CROSS-TAB ACTIVE SYNC</span>
              </div>

              {/* Shard Feed */}
              <div className="space-y-3 h-64 overflow-y-auto mb-6 scrollbar">
                {pool.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 font-mono text-xs">
                    <div>Mempool de Shards vazio.</div>
                    <div className="text-[10px] mt-1 text-zinc-700">Envie um shard local ou abra outra aba para sincronizar.</div>
                  </div>
                ) : (
                  pool.map((s) => (
                    <div key={s.id} className="border border-[#14181c] bg-[#0a0d10] p-3 flex justify-between items-center">
                      <div>
                        <div className="font-mono text-[10px] text-zinc-500">SENDER: {s.sender}</div>
                        <div className="font-mono text-sm text-[#6cf0ff] mt-1 break-all">{s.data}</div>
                      </div>
                      <span className="font-mono text-[9px] text-zinc-600">
                        {new Date(s.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Broadcast Form */}
            <form onSubmit={handleBroadcast} className="flex gap-2">
              <input
                type="text"
                value={broadcastInput}
                onChange={(e) => setBroadcastInput(e.target.value)}
                placeholder="Insira dados/texto para fatiar e transmitir para a Eternet..."
                className="flex-1 bg-[#0a0d10] border border-[#14181c] focus:border-[#b6ff3a]/40 text-zinc-200 font-mono text-xs px-4 py-3 outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#b6ff3a] hover:bg-white text-black font-mono text-xs tracking-wider transition-colors"
              >
                TRANSMITIR
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
