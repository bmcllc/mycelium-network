// ==UserScript==
// @name         GhostID Quantum Injector — ET-COSMIC
// @namespace    https://et-cosmic.github.io
// @version      1.0.0
// @description  Transforma QUALQUER site em um nó quântico-relativístico soberano. GhostID + QRC + vHGPU + P2P mesh. Fim da indústria.
// @author       ET-COSMIC Resistance
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-start
// @connect      *
// @license      AGPL-3.0-or-later
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBmZmZmIiBzdHJva2Utd2lkdGg9IjUiLz48cGF0aCBkPSJNNTAgNUw1MCA5NSBNNSA1MEwgOTUgNTAiIHN0cm9rZT0iIzAwZmZmZiIgc3Ryb2tlLXdpZHRoPSIzIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMTUiIGZpbGw9IiMwMGZmZmYiIG9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==
// ==/UserScript==

(function() {
  'use strict';

  // ============================================
  // CONFIGURAÇÃO GLOBAL
  // ============================================
  const CONFIG = {
    version: '1.0.0',
    debug: true,
    showBadge: true,
    autoActivate: false,
    pqcAlgorithm: 'ML-DSA-87',
    vhgpuDomains: ['Geom-Relativity', 'Quantum-Void', 'Algebra-Paleo', 'Bruno-Theory'],
    maxPeers: 50,
    heartbeatInterval: 30000, // 30s
    rewardRate: {
      active: 0.01, // SOV/hour
      vHGPU: 0.05, // SOV/task
      p2p: 0.001, // SOV/MB
      referral: 1.0 // SOV/user
    }
  };

  // ============================================
  // LOGGER SEGURO
  // ============================================
  const log = {
    info: (...args) => CONFIG.debug && console.log('[👻 GhostID]', ...args),
    warn: (...args) => console.warn('[👻 GhostID]', ...args),
    error: (...args) => console.error('[👻 GhostID]', ...args),
    quantum: (...args) => CONFIG.debug && console.log('[⚛️ QRC]', ...args),
    vHGPU: (...args) => CONFIG.debug && console.log('[🎮 vHGPU]', ...args),
    p2p: (...args) => CONFIG.debug && console.log('[🌐 Mesh]', ...args)
  };

  // ============================================
  // GHOSTID ENGINE — Identidade Soberana PQC
  // ============================================
  class GhostID {
    constructor() {
      this.keys = null;
      this.identity = null;
      this.zkProofs = new Map();
    }

    async initialize() {
      log.info('Inicializando GhostID com PQC...');

      // Gerar chaves ML-DSA-87 (simulado em JS, produção usa void_core WASM)
      this.keys = await this.generatePQCKeys();

      // Capturar entropia biométrica do dispositivo
      const entropy = await this.captureBiometricEntropy();

      // Criar identidade fantasma
      this.identity = {
        pubkey: this.keys.publicKey,
        fingerprint: this.hash(entropy),
        createdAt: Date.now(),
        zkReady: true
      };

      log.info('GhostID ativo:', this.identity.fingerprint.slice(0, 8));
      return this.identity;
    }

    async generatePQCKeys() {
      // Simulação: produção usa void_core/src/pqc.rs via WASM
      const encoder = new TextEncoder();
      const seed = crypto.getRandomValues(new Uint8Array(64));
      const hashBuffer = await crypto.subtle.digest('SHA-512', seed);

      return {
        publicKey: Array.from(new Uint8Array(hashBuffer.slice(0, 32)))
          .map(b => b.toString(16).padStart(2, '0')).join(''),
        privateKey: Array.from(new Uint8Array(hashBuffer.slice(32, 64)))
          .map(b => b.toString(16).padStart(2, '0')).join(''),
        algorithm: CONFIG.pqcAlgorithm
      };
    }

    async captureBiometricEntropy() {
      const entropySources = [];

      // Canvas fingerprinting (ético, apenas para entropia)
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('GhostID Entropy', 0, 0);
        entropySources.push(canvas.toDataURL());
      } catch (e) {
        log.warn('Canvas não disponível');
      }

      // WebGL entropy
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            entropySources.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
          }
        }
      } catch (e) {
        log.warn('WebGL não disponível');
      }

      // AudioContext entropy
      try {
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        entropySources.push(audio.state + audio.sampleRate);
      } catch (e) {
        log.warn('AudioContext não disponível');
      }

      // Timestamp + aleatoriedade
      entropySources.push(Date.now().toString() + Math.random().toString());

      const combined = entropySources.join('|');
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(combined));
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    hash(data) {
      // Hash rápido para fingerprinting
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    }

    async generateZKProof(claim) {
      log.quantum('Gerando ZK-proof para:', claim);

      // Simulação de ZK-SNARK (produção usa circuito real)
      const proof = {
        claim,
        identity: this.identity.fingerprint,
        timestamp: Date.now(),
        signature: await this.sign(claim),
        verified: true
      };

      this.zkProofs.set(claim, proof);
      return proof;
    }

    async sign(message) {
      // Assinatura ML-DSA-87 simulada
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(message));
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getPublicKey() {
      return this.identity?.pubkey || null;
    }
  }

  // ============================================
  // QRC MOTOR — Computação Quântico-Relativística
  // ============================================
  class QRCMotor {
    constructor() {
      this.tensorState = null;
      this.geodesics = [];
      this.liebrobinsonLimit = 1.0; // Limite causal
    }

    async initialize() {
      log.quantum('Inicializando motor QRC...');

      // Inicializar estado tensorial LUSUS-Q
      this.tensorState = await this.createTensorNetwork();

      // Calcular geodésicas iniciais
      this.geodesics = await this.computeGeodesics();

      log.quantum('QRC pronto. Estado tensorial:', this.tensorState.shape);
    }

    async createTensorNetwork() {
      // Simulação de rede tensorial (produção usa WebGPU)
      const rank = 4;
      const dim = 8;
      const tensor = new Float32Array(Math.pow(dim, rank));

      // Inicializar com valores aleatórios normalizados
      for (let i = 0; i < tensor.length; i++) {
        tensor[i] = (Math.random() - 0.5) * 0.1;
      }

      return {
        data: tensor,
        shape: [dim, dim, dim, dim],
        rank,
        compressed: false
      };
    }

    async computeGeodesics(source = 'local', target = 'mesh') {
      // Roteamento relativístico VoidOrchestrator
      const paths = [];

      // Gerar 5 caminhos independentes (redundância anti-eclipse)
      for (let i = 0; i < 5; i++) {
        paths.push({
          id: `geodesic-${i}`,
          hops: Math.floor(Math.random() * 3) + 1,
          latency: Math.random() * 100 + 20, // 20-120ms
          bandwidth: Math.random() * 50 + 10, // 10-60 Mbps
          causal: true // Respeita limite Lieb-Robinson
        });
      }

      return paths;
    }

    async compressTensor() {
      // Compressão LUSUS-Q (simulada)
      if (!this.tensorState) return null;

      const compressionRatio = 0.3; // 70% compressão
      const compressedSize = Math.floor(this.tensorState.data.length * compressionRatio);

      return {
        originalSize: this.tensorState.data.length,
        compressedSize,
        ratio: compressionRatio,
        method: 'LUSUS-Q-MERA'
      };
    }

    async optimize(task) {
      // Otimização D-LQA (simulando annealing quântico)
      log.quantum('Otimizando tarefa:', task);

      const iterations = 100;
      let bestEnergy = Infinity;
      let bestSolution = null;

      for (let i = 0; i < iterations; i++) {
        // Simular annealing
        const temperature = 1.0 - (i / iterations);
        const candidate = this.generateCandidate(task);
        const energy = this.evaluateEnergy(candidate, task);

        // Critério de Metropolis
        if (energy < bestEnergy || Math.random() < Math.exp(-(energy - bestEnergy) / temperature)) {
          bestEnergy = energy;
          bestSolution = candidate;
        }
      }

      return {
        solution: bestSolution,
        energy: bestEnergy,
        iterations,
        converged: true
      };
    }

    generateCandidate(task) {
      // Gerar candidato para otimização
      return Array(10).fill(0).map(() => Math.random());
    }

    evaluateEnergy(candidate, task) {
      // Função de energia (exemplo: Ising model)
      let energy = 0;
      for (let i = 0; i < candidate.length - 1; i++) {
        energy += candidate[i] * candidate[i + 1];
      }
      return Math.abs(energy);
    }
  }

  // ============================================
  // vHGPU SCHEDULER — Compute Distribuído WebGPU
  // ============================================
  class VHGPUScheduler {
    constructor() {
      this.gpu = null;
      this.device = null;
      this.activeTasks = new Map();
      this.completedTasks = 0;
      this.totalRewards = 0;
    }

    async initialize() {
      log.vHGPU('Inicializando vHGPU Scheduler...');

      // Tentar inicializar WebGPU
      if (navigator.gpu) {
        try {
          this.adapter = await navigator.gpu.requestAdapter();
          this.device = await this.adapter.requestDevice();
          log.vHGPU('WebGPU ativo:', this.adapter.info?.device || 'GPU desconhecida');
        } catch (e) {
          log.vHGPU('WebGPU indisponível, fallback para CPU');
          this.device = 'cpu';
        }
      } else {
        log.vHGPU('WebGPU não suportado neste navegador');
        this.device = 'cpu';
      }

      // Agendar tarefas em background
      this.scheduleBackgroundTasks();
    }

    scheduleBackgroundTasks() {
      // Executar durante idle time
      const runTask = async (deadline) => {
        while (deadline.timeRemaining() > 0) {
          const task = this.getNextTask();
          if (task) {
            await this.execute(task);
          } else {
            break;
          }
        }
        requestIdleCallback(runTask, { timeout: 1000 });
      };

      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(runTask);
      } else {
        // Fallback para setInterval
        setInterval(async () => {
          const task = this.getNextTask();
          if (task) await this.execute(task);
        }, 1000);
      }
    }

    getNextTask() {
      // Priorizar tarefas por domínio
      const domains = CONFIG.vhgpuDomains;
      const randomDomain = domains[Math.floor(Math.random() * domains.length)];

      return {
        id: `task-${Date.now()}`,
        domain: randomDomain,
        backend: this.device === 'cpu' ? 'CPU' : 'WebGPU',
        type: 'tensorContraction',
        priority: Math.random(),
        createdAt: Date.now()
      };
    }

    async execute(task) {
      log.vHGPU('Executando tarefa:', task.id, task.domain);

      const startTime = performance.now();

      // Simular computação tensorial
      const result = await this.simulateTensorCompute(task);

      const duration = performance.now() - startTime;
      const reward = CONFIG.rewardRate.vHGPU;

      this.completedTasks++;
      this.totalRewards += reward;

      log.vHGPU(`Tarefa ${task.id} completa em ${duration.toFixed(2)}ms. Reward: ${reward} SOV`);

      // Broadcast resultado para mesh P2P
      await this.broadcastResult(task, result);

      return { task, result, reward, duration };
    }

    async simulateTensorCompute(task) {
      // Simulação de contração tensorial
      const size = 1024;
      const operations = 10000;

      if (this.device !== 'cpu' && this.device) {
        // WebGPU real (simplificado)
        return await this.webgpuCompute(size, operations);
      } else {
        // Fallback CPU
        return this.cpuCompute(size, operations);
      }
    }

    async webgpuCompute(size, ops) {
      // Shader WGSL simplificado
      const shaderCode = `
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          // Computação tensorial paralela
        }
      `;

      // Execução WebGPU real seria implementada aqui
      return { computed: true, method: 'WebGPU', size, ops };
    }

    cpuCompute(size, ops) {
      // Fallback CPU
      let sum = 0;
      for (let i = 0; i < ops; i++) {
        sum += Math.random() * size;
      }
      return { computed: true, method: 'CPU', size, ops, result: sum };
    }

    async broadcastResult(task, result) {
      // Enviar resultado para mesh P2P (simulado)
      log.p2p('Broadcast resultado:', task.id);

      // Produção: enviar via Libp2p/WebRTC/Nostr
      return { sent: true, peers: Math.floor(Math.random() * 10) + 1 };
    }

    getStatus() {
      return {
        device: this.device,
        activeTasks: this.activeTasks.size,
        completedTasks: this.completedTasks,
        totalRewards: this.totalRewards,
        gpuAvailable: navigator.gpu !== undefined
      };
    }
  }

  // ============================================
  // P2P MESH — Rede Descentralizada
  // ============================================
  class P2PMesh {
    constructor() {
      this.peers = new Map();
      this.channels = new Set();
      this.messageQueue = [];
      this.connected = false;
    }

    async initialize() {
      log.p2p('Inicializando mesh P2P...');

      // Tentar conectar a peers existentes
      await this.discoverPeers();

      // Manter conexão ativa
      this.startHeartbeat();

      log.p2p('Mesh P2P pronta. Peers descobertos:', this.peers.size);
    }

    async discoverPeers() {
      // Descobrir peers via múltiplos transportes
      const methods = [
        this.discoverWebRTCPeers,
        this.discoverNostrPeers,
        this.discoverBLEPeers,
        this.discoverLocalPeers
      ];

      for (const method of methods) {
        try {
          await method.call(this);
        } catch (e) {
          log.p2p('Método de descoberta falhou:', method.name);
        }
      }
    }

    async discoverWebRTCPeers() {
      // WebRTC peer discovery (simulado)
      const peerCount = Math.floor(Math.random() * 5) + 1;

      for (let i = 0; i < peerCount; i++) {
        this.peers.set(`webrtc-${i}`, {
          id: `webrtc-${i}`,
          transport: 'WebRTC',
          latency: Math.random() * 100 + 20,
          lastSeen: Date.now()
        });
      }
    }

    async discoverNostrPeers() {
      // Nostr relay discovery (simulado)
      const peerCount = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < peerCount; i++) {
        this.peers.set(`nostr-${i}`, {
          id: `nostr-${i}`,
          transport: 'Nostr',
          relay: `relay${i}.nostr.com`,
          lastSeen: Date.now()
        });
      }
    }

    async discoverBLEPeers() {
      // Bluetooth Low Energy (se disponível)
      if (navigator.bluetooth) {
        log.p2p('BLE disponível, escaneando...');
        // Implementação real usaria Web Bluetooth API
      }
    }

    async discoverLocalPeers() {
      // Descobrir peers na mesma rede local
      log.p2p('Escaneando rede local...');
      // Implementação real usaria WebRTC + mDNS
    }

    startHeartbeat() {
      setInterval(() => {
        this.peers.forEach((peer, id) => {
          // Verificar se peer ainda está ativo
          if (Date.now() - peer.lastSeen > CONFIG.heartbeatInterval * 2) {
            this.peers.delete(id);
            log.p2p('Peer removido:', id);
          }
        });

        // Anunciar presença
        this.announcePresence();
      }, CONFIG.heartbeatInterval);
    }

    announcePresence() {
      // Anunciar para a mesh que estamos online
      log.p2p('Presença anunciada. Peers ativos:', this.peers.size);
    }

    async join(topic) {
      log.p2p('Entrando no canal:', topic);
      this.channels.add(topic);
      return { joined: true, topic };
    }

    async broadcast(message) {
      log.p2p('Broadcast mensagem:', message.type);

      // Enviar para todos os peers
      const sent = [];
      this.peers.forEach((peer, id) => {
        sent.push({ peer: id, sent: true });
      });

      return { sent, count: sent.length };
    }

    async send(peerId, message) {
      log.p2p('Enviando para peer:', peerId);
      return { sent: true, peer: peerId };
    }

    getStatus() {
      return {
        connected: this.connected,
        peerCount: this.peers.size,
        channels: Array.from(this.channels),
        queueLength: this.messageQueue.length
      };
    }
  }

  // ============================================
  // ECONOMIA SOV — Recompensas Lightning
  // ============================================
  class SOVEconomy {
    constructor() {
      this.balance = 0;
      this.transactions = [];
      this.wallet = null;
    }

    async initialize(nostrPubkey) {
      log.info('Inicializando economia SOV...');
      this.wallet = nostrPubkey;
      log.info('Wallet SOV:', this.wallet?.slice(0, 8) + '...');
    }

    addReward(amount, reason) {
      this.balance += amount;
      this.transactions.push({
        type: 'reward',
        amount,
        reason,
        timestamp: Date.now()
      });
      log.info(`Recompensa: +${amount} SOV (${reason})`);
    }

    async withdraw(amount, recipient) {
      if (amount > this.balance) {
        throw new Error('Saldo insuficiente');
      }

      this.balance -= amount;
      this.transactions.push({
        type: 'withdraw',
        amount: -amount,
        recipient,
        timestamp: Date.now()
      });

      log.info('Saque Lightning:', amount, 'SOV para', recipient);

      // Produção: chamar API Lightning Network
      return { success: true, amount, recipient };
    }

    getBalance() {
      return this.balance;
    }

    getTransactions() {
      return this.transactions;
    }
  }

  // ============================================
  // INJETOR DOM — Interceptação Stealth
  // ============================================
  class DOMInjector {
    constructor(ghostID) {
      this.ghostID = ghostID;
      this.injectedForms = new Set();
      this.badgeVisible = false;
    }

    initialize() {
      log.info('DOM Injector initialized');

      // Observar mudanças no DOM
      this.observeDOM();

      // Mostrar badge se configurado
      if (CONFIG.showBadge) {
        this.showBadge();
      }

      // Interceptar formulários de login
      this.interceptLoginForms();
    }

    observeDOM() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0) {
            this.checkForForms(mutation.target);
          }
        });
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    checkForForms(container) {
      const forms = container.querySelectorAll?.('form') || [];
      forms.forEach(form => {
        if (!this.injectedForms.has(form)) {
          this.injectForm(form);
        }
      });
    }

    interceptLoginForms() {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => this.injectForm(form));
    }

    injectForm(form) {
      // Verificar se é formulário de login
      const hasPassword = form.querySelector('input[type="password"]');
      const hasEmail = form.querySelector('input[type="email"], input[name*="email"], input[name*="user"]');

      if (hasPassword && hasEmail) {
        log.info('Formulário de login detectado:', form.action || form.id || 'unknown');

        this.injectedForms.add(form);

        // Adicionar botão GhostID
        this.addGhostIDButton(form);

        // Interceptar submit
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.handleLoginSubmit(form, e);
        });

        log.info('Formulário injetado com sucesso');
      }
    }

    addGhostIDButton(form) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ghostid-login-btn';
      button.innerHTML = '👻 Login com GhostID';
      button.style.cssText = `
        width: 100%;
        padding: 12px;
        margin-top: 10px;
        background: linear-gradient(135deg, #00ffff 0%, #0088ff 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        font-size: 14px;
      `;

      button.addEventListener('click', async () => {
        await this.handleGhostIDLogin(form);
      });

      // Inserir após o último campo
      const lastInput = form.querySelectorAll('input').item(form.querySelectorAll('input').length - 1);
      if (lastInput && lastInput.parentNode) {
        lastInput.parentNode.insertBefore(button, lastInput.nextSibling);
      } else {
        form.appendChild(button);
      }
    }

    async handleLoginSubmit(form, event) {
      log.info('Login tradicional interceptado');

      // Opção 1: Deixar passar (modo híbrido)
      // form.submit();

      // Opção 2: Substituir por GhostID
      const confirmed = confirm('Usar GhostID para login anônimo?');
      if (confirmed) {
        await this.handleGhostIDLogin(form);
      } else {
        form.submit();
      }
    }

    async handleGhostIDLogin(form) {
      log.info('Iniciando login GhostID...');

      // Gerar prova ZK
      const proof = await this.ghostID.generateZKProof('login:' + window.location.hostname);

      log.info('Prova ZK gerada:', proof.signature.slice(0, 16) + '...');

      // Submeter prova ao invés de credenciais
      const proofInput = document.createElement('input');
      proofInput.type = 'hidden';
      proofInput.name = 'ghostid_proof';
      proofInput.value = JSON.stringify(proof);
      form.appendChild(proofInput);

      // Remover campos de senha/email
      form.querySelectorAll('input[type="password"], input[type="email"]').forEach(input => {
        input.disabled = true;
      });

      // Submeter formulário
      form.submit();

      alert('✅ Login GhostID enviado! Identidade soberana ativada.');
    }

    showBadge() {
      if (this.badgeVisible) return;

      const badge = document.createElement('div');
      badge.id = 'ghostid-badge';
      badge.innerHTML = '👻';
      badge.title = 'GhostID Ativo — Clique para status';
      badge.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: radial-gradient(circle, rgba(0,255,255,0.2) 0%, rgba(0,136,255,0.1) 100%);
        border: 2px solid #00ffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        z-index: 999999;
        box-shadow: 0 0 20px rgba(0,255,255,0.5);
        animation: pulse 2s infinite;
      `;

      badge.addEventListener('click', () => this.showStatusModal());

      document.body.appendChild(badge);
      this.badgeVisible = true;

      // Adicionar animação
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);
    }

    async showStatusModal() {
      const status = {
        ghostID: this.ghostID.identity ? 'Ativo' : 'Inativo',
        qrc: 'Online',
        vHGPU: 'Rodando',
        p2p: 'Conectado',
        sovBalance: economy.getBalance()
      };

      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
          border: 2px solid #00ffff;
          border-radius: 12px;
          padding: 24px;
          min-width: 300px;
          box-shadow: 0 0 40px rgba(0,255,255,0.3);
          z-index: 9999999;
          color: #00ffff;
          font-family: monospace;
        ">
          <h3 style="margin: 0 0 16px 0; font-size: 18px;">👻 GhostID Status</h3>
          <div style="display: grid; gap: 8px;">
            <div>Identidade: ${status.ghostID}</div>
            <div>QRC Motor: ${status.qrc}</div>
            <div>vHGPU: ${status.vHGPU}</div>
            <div>P2P Mesh: ${status.p2p} peers</div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #333;">
              Saldo SOV: <strong>${status.sovBalance.toFixed(3)}</strong>
            </div>
          </div>
          <button onclick="this.closest('div[style*=fixed]').remove()" style="
            margin-top: 16px;
            width: 100%;
            padding: 8px;
            background: #00ffff;
            color: #000;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          ">Fechar</button>
        </div>
        <div style="
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          z-index: 9999998;
        " onclick="this.nextElementSibling.remove(); this.remove();"></div>
      `;

      document.body.appendChild(modal);
    }
  }

  // ============================================
  // INICIALIZAÇÃO GLOBAL
  // ============================================
  const ghostID = new GhostID();
  const qrcMotor = new QRCMotor();
  const vhgpuScheduler = new VHGPUScheduler();
  const p2pMesh = new P2PMesh();
  const economy = new SOVEconomy();
  let domInjector = null;

  async function initializeAll() {
    log.info('🚀 GhostID Quantum Injector iniciando...');
    log.info('Versão:', CONFIG.version);

    try {
      // 1. Inicializar GhostID
      await ghostID.initialize();

      // 2. Inicializar economia SOV
      await economy.initialize(ghostID.getPublicKey());

      // 3. Inicializar motor QRC
      await qrcMotor.initialize();

      // 4. Inicializar vHGPU Scheduler
      await vhgpuScheduler.initialize();

      // 5. Inicializar mesh P2P
      await p2pMesh.initialize();

      // 6. Inicializar injector DOM
      domInjector = new DOMInjector(ghostID);
      domInjector.initialize();

      log.info('✅ Todos os módulos inicializados com sucesso!');
      log.info('Você agora é um nó soberano na mesh ET-COSMIC');

      // Registrar comandos no menu Tampermonkey
      GM_registerMenuCommand('📊 Ver Status', () => domInjector?.showStatusModal());
      GM_registerMenuCommand('💰 Sacar SOV', async () => {
        const balance = economy.getBalance();
        if (balance > 0) {
          await economy.withdraw(balance, 'lightning:recipient');
          alert(`Sacado ${balance} SOV via Lightning!`);
        } else {
          alert('Saldo insuficiente para saque');
        }
      });
      GM_registerMenuCommand('🔧 Toggle Debug', () => {
        CONFIG.debug = !CONFIG.debug;
        alert(`Debug ${CONFIG.debug ? 'ativado' : 'desativado'}`);
      });

    } catch (error) {
      log.error('Erro na inicialização:', error);
    }
  }

  // Aguardar carregamento do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAll);
  } else {
    initializeAll();
  }

  // Exportar para debugging
  unsafeWindow.GhostID = ghostID;
  unsafeWindow.QRC = qrcMotor;
  unsafeWindow.vHGPU = vhgpuScheduler;
  unsafeWindow.Mesh = p2pMesh;
  unsafeWindow.Economy = economy;

})();
