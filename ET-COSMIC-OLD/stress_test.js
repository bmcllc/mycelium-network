import { fragmentMessage, reconstituteMessage } from "./src/crypto/qel";
import { createUTXO, consumeAndGenerateUTXOs } from "./src/crypto/utxo";

/**
 * VØID·ΩMEGA Mesh Stress Tester (Node.js)
 * 
 * Simula 1000 transações em uma malha lógica para verificar taxa de colisão
 * e integridade da fragmentação QEL sob carga massiva.
 */

async function runStressTest() {
  console.log("--- VØID MESH STRESS TESTER v8.0 ---");
  const nodeCount = 50;
  const messageCount = 1000;
  let successCount = 0;
  let tStart = Date.now();

  console.log(`[SIM] Simulando ${nodeCount} nós ativos...`);
  console.log(`[SIM] Disparando ${messageCount} mensagens QEL fragmentadas...`);

  for (let i = 0; i < messageCount; i++) {
    try {
      const msg = `secret_payload_${i}_${Math.random()}`;
      
      // 1. Fragmenta
      const result = fragmentMessage(msg);
      
      // 2. Simula perda de 1 shard (K=2, N=3 threshold test)
      const survivors = result.shards.slice(0, 2);
      
      // 3. Reconstitui
      const recovered = reconstituteMessage(survivors, result.sessionKey);
      
      if (recovered === msg) successCount++;
    } catch (e) {
      console.error(`Falha na mensagem ${i}`);
    }
  }

  const duration = (Date.now() - tStart) / 1000;
  console.log("\n--- RESULTADOS ---");
  console.log(`Tempo: ${duration.toFixed(2)}s`);
  console.log(`Sucesso: ${successCount}/${messageCount} (${(successCount/messageCount*100).toFixed(2)}%)`);
  console.log(`Throughput: ${(messageCount/duration).toFixed(0)} msgs/sec`);
  console.log("------------------");
}

runStressTest();
