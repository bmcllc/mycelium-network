import { useState, useEffect, useRef } from "react";
import { loadOmegaMaterial, unit } from "../lib/moduleRealityBackend";

export interface Node {
  id: string;
  x: number;
  y: number;
  type: "MOBILE" | "GATEWAY" | "SOURCE" | "DEST";
  shards: string[];
  range: number; // in pixels for sim
  velocity: { x: number; y: number };
}

export interface ShardTrace {
  traceId: string;
  id: string;
  from: string;
  to: string;
  progress: number;
  startTime: number;
}

export function useNetworkSimulation(nodeCount = 15) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [traces, setTraces] = useState<ShardTrace[]>([]);
  const tracesRef = useRef<ShardTrace[]>([]);
  const lastUpdate = useRef(Date.now());

  const materialRef = useRef<Uint8Array | null>(null);
  const simTick = useRef(0);

  useEffect(() => {
    void loadOmegaMaterial(128).then((r) => {
      materialRef.current = r.material;
      const mat = r.material;
      const initialNodes: Node[] = [];
      initialNodes.push({
        id: "src",
        x: 60,
        y: 80,
        type: "SOURCE",
        shards: ["S1", "S2", "S3"],
        range: 60,
        velocity: { x: 0, y: 0 },
      });
      initialNodes.push({
        id: "dst",
        x: 600,
        y: 300,
        type: "DEST",
        shards: [],
        range: 60,
        velocity: { x: 0, y: 0 },
      });
      initialNodes.push({
        id: "gw1",
        x: 330,
        y: 150,
        type: "GATEWAY",
        shards: [],
        range: 200,
        velocity: { x: 0, y: 0 },
      });
      for (let i = 0; i < nodeCount; i++) {
        initialNodes.push({
          id: `mob_${i}`,
          x: 100 + unit(mat, i) * 460,
          y: 50 + unit(mat, i + 16) * 320,
          type: "MOBILE",
          shards: [],
          range: 80,
          velocity: {
            x: (unit(mat, i + 32) - 0.5) * 2,
            y: (unit(mat, i + 48) - 0.5) * 2,
          },
        });
      }
      setNodes(initialNodes);
    });
  }, [nodeCount]);

  // Simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastUpdate.current) / 1000;
      lastUpdate.current = now;

      setNodes(prevNodes => {
        const nextNodes = prevNodes.map(node => {
          if (node.type !== "MOBILE") return node;

          let nx = node.x + node.velocity.x * 20 * dt;
          let ny = node.y + node.velocity.y * 20 * dt;

          // Bounce off walls
          let vx = node.velocity.x;
          let vy = node.velocity.y;
          if (nx < 20 || nx > 640) vx *= -1;
          if (ny < 20 || ny > 400) vy *= -1;

          return { ...node, x: nx, y: ny, velocity: { x: vx, y: vy } };
        });

        // Check for shard transfers (HCN Logic)
        const newTraces: ShardTrace[] = [];
        
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = 0; j < nextNodes.length; j++) {
            if (i === j) continue;
            const a = nextNodes[i];
            const b = nextNodes[j];
            
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < a.range && a.shards.length > 0 && b.shards.length === 0) {
              // Transfer probability or logic
              const mat = materialRef.current;
              const p = mat ? unit(mat, simTick.current++ % 64) : 0.05;
              if (p < 0.05) {
                const shard = a.shards[0];
                const activeTraces = tracesRef.current;
                const alreadyRouting = activeTraces.some(
                  (t) => t.id === shard && t.from === a.id && t.to === b.id && t.progress < 1,
                );
                if (!alreadyRouting) {
                  newTraces.push({
                    traceId: `${shard}-${a.id}-${b.id}-${now}-${mat ? unit(mat, simTick.current) : 0}`,
                    id: shard,
                    from: a.id,
                    to: b.id,
                    progress: 0,
                    startTime: now
                  });
                }
              }
            }
          }
        }

        if (newTraces.length > 0) {
           setTraces(prev => {
            const merged = [...prev, ...newTraces];
            tracesRef.current = merged;
            return merged;
           });
        }

        return nextNodes;
      });

      // Update traces
      setTraces(prev => {
        const updated = prev.map(t => ({ ...t, progress: t.progress + 2 * dt }))
                             .filter(t => t.progress < 1);
        tracesRef.current = updated;
        
        // When trace finishes, move shard to target node
        updated.forEach(t => {
          if (t.progress >= 0.95) {
            setNodes(nodes => nodes.map(n => {
              if (n.id === t.to && !n.shards.includes(t.id)) {
                return { ...n, shards: [...n.shards, t.id] };
              }
              return n;
            }));
          }
        });

        return updated;
      });

    }, 50);

    return () => clearInterval(interval);
  }, []);

  return { nodes, traces };
}
