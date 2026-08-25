// ==UserScript==
// @name         ET-COSMIC Mesh Injector
// @namespace    https://et-cosmic.org
// @version      1.0.0
// @description  Injeta o núcleo P2P do ET-COSMIC em QUALQUER site visitado, transformando navegadores em nós da mesh soberana. Revolução silenciosa.
// @author       ET-COSMIC Resistance
// @match        *://*/*
// @exclude      *://localhost/*
// @exclude      *://127.0.0.1/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        unsafeWindow
// @connect      *
// @run-at       document-start
// @license      AGPL-3.0-or-later
// @icon         data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='%236366f1'/><text x='50' y='65' font-size='40' text-anchor='middle' fill='white' font-weight='bold'>ET</text></svg>
// ==/UserScript==

(function() {
    'use strict';

    // ========================================================================
    // ET-COSMIC MESH INJECTOR - Tampermonkey REVOLUTIONARY CORE
    // ========================================================================
    // Transforma CADA site visitado em um nó da rede soberana
    // Injeção silenciosa, execução poderosa, resistência total
    // ========================================================================

    const CONFIG = {
        CORE_URL: 'https://raw.githubusercontent.com/ET-COSMIC/main/public/et-core.js',
        FALLBACK_URL: 'https://cdn.jsdelivr.net/gh/ET-COSMIC/main/public/et-core.js',
        STORAGE_KEY: 'et_cosmic_node_id',
        REPUTATION_KEY: 'et_cosmic_reputation',
        INJECTION_DELAY: 1000, // 1s após load da página
        MAX_INJECTIONS_PER_DAY: 50,
        DEBUG_MODE: false,
        STEALTH_MODE: true, // Não mostrar UI em sites sensíveis
        SENSITIVE_DOMAINS: ['bank', 'gov', 'login', 'checkout', 'password'],
        BADGE_POSITION: 'bottom-right',
        AUTO_ACTIVATE: true
    };

    class ETMeshInjector {
        constructor() {
            this.nodeId = this.getNodeId();
            this.reputation = this.getReputation();
            this.injectionCount = this.getDailyInjectionCount();
            this.isActive = false;
            this.injectedSites = new Set();
            this.meshPeers = 0;
            this.dataShared = 0;
            this.init();
        }

        // ======================================================================
        // IDENTIDADE SOBERANA & REPUTAÇÃO
        // ======================================================================

        getNodeId() {
            let id = GM_getValue(CONFIG.STORAGE_KEY);
            if (!id) {
                // Gerar ID único baseado em fingerprint + timestamp + random
                const fp = this.fingerprint();
                id = `et-${fp}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                GM_setValue(CONFIG.STORAGE_KEY, id);
                this.notify('🚀 Nó ET-COSMIC criado!', `ID: ${id.substr(0, 16)}...`);
            }
            return id;
        }

        getReputation() {
            return GM_getValue(CONFIG.REPUTATION_KEY) || {
                score: 0,
                uptime: 0,
                sharedBytes: 0,
                validations: 0,
                lastUpdate: Date.now()
            };
        }

        updateReputation(metrics) {
            const rep = this.getReputation();
            rep.score += metrics.score || 0;
            rep.uptime += metrics.uptime || 0;
            rep.sharedBytes += metrics.sharedBytes || 0;
            rep.validations += metrics.validations || 0;
            rep.lastUpdate = Date.now();
            GM_setValue(CONFIG.REPUTATION_KEY, rep);
            this.reputation = rep;
            this.updateBadge();
        }

        fingerprint() {
            // Fingerprint simples baseado em navigator + screen + timezone
            const components = [
                navigator.userAgent,
                navigator.language,
                screen.width,
                screen.height,
                new Date().getTimezoneOffset(),
                navigator.hardwareConcurrency || 4,
                navigator.deviceMemory || 4
            ];
            const str = components.join('|');
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(36).toUpperCase();
        }

        // ======================================================================
        // LÓGICA DE INJEÇÃO VIRAL
        // ======================================================================

        init() {
            // Registrar comandos no menu Tampermonkey
            GM_registerMenuCommand('🌐 Ativar/Desativar ET-COSMIC', () => this.toggle());
            GM_registerMenuCommand('📊 Ver Estatísticas', () => this.showStats());
            GM_registerMenuCommand('🔄 Resetar Identidade', () => this.resetIdentity());
            GM_registerMenuCommand('⚔️ Ler Carta de Guerra', () => this.openWarLetter());

            // Verificar se deve injetar neste site
            if (this.shouldInject()) {
                setTimeout(() => this.inject(), CONFIG.INJECTION_DELAY);
            } else {
                console.log('[ET-COSMIC] Injeção bloqueada neste domínio');
            }

            // Listener para mudanças de página (SPA)
            this.observeNavigation();
        }

        shouldInject() {
            if (!CONFIG.AUTO_ACTIVATE) return false;
            if (this.injectionCount >= CONFIG.MAX_INJECTIONS_PER_DAY) {
                console.log('[ET-COSMIC] Limite diário de injeções atingido');
                return false;
            }

            const url = window.location.href.toLowerCase();
            const domain = window.location.hostname.toLowerCase();

            // Não injetar em domínios sensíveis
            for (const sensitive of CONFIG.SENSITIVE_DOMAINS) {
                if (url.includes(sensitive) || domain.includes(sensitive)) {
                    return false;
                }
            }

            // Não injetar se já foi injetado nesta sessão
            if (this.injectedSites.has(domain)) {
                return false;
            }

            return true;
        }

        async inject() {
            if (this.isActive) return;

            console.log('[ET-COSMIC] 🚀 Iniciando injeção em:', window.location.hostname);

            try {
                // Carregar core P2P
                const coreScript = await this.loadCoreScript();
                
                // Injetar no DOM
                this.injectScript(coreScript);
                
                // Injetar estilos
                this.injectStyles();
                
                // Criar badge de status
                this.createBadge();
                
                // Inicializar nó P2P
                this.initializeNode();
                
                // Marcar como injetado
                this.injectedSites.add(window.location.hostname);
                this.incrementDailyCount();
                this.isActive = true;

                // Atualizar reputação
                this.updateReputation({ score: 10, uptime: 1 });

                console.log('[ET-COSMIC] ✅ Injeção bem-sucedida!');
                this.notify('🌐 Nó ativo!', 'Participando da mesh soberana');

            } catch (error) {
                console.error('[ET-COSMIC] ❌ Falha na injeção:', error);
                this.notify('⚠️ Erro na injeção', 'Tente recarregar a página');
            }
        }

        async loadCoreScript() {
            return new Promise((resolve, reject) => {
                // Tentar URL principal
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: CONFIG.CORE_URL,
                    onload: (response) => {
                        if (response.status === 200) {
                            resolve(response.responseText);
                        } else {
                            // Fallback para CDN
                            GM_xmlhttpRequest({
                                method: 'GET',
                                url: CONFIG.FALLBACK_URL,
                                onload: (fallbackResponse) => {
                                    if (fallbackResponse.status === 200) {
                                        resolve(fallbackResponse.responseText);
                                    } else {
                                        reject(new Error('Falha ao carregar core script'));
                                    }
                                },
                                onerror: reject
                            });
                        }
                    },
                    onerror: reject
                });
            });
        }

        injectScript(scriptContent) {
            const script = document.createElement('script');
            script.textContent = scriptContent;
            script.id = 'et-cosmic-core';
            script.setAttribute('data-node-id', this.nodeId);
            
            // Injetar no head ou body
            (document.head || document.documentElement).appendChild(script);
            
            // Configurar variáveis globais
            unsafeWindow.ET_COSMIC_CONFIG = {
                nodeId: this.nodeId,
                reputation: this.reputation,
                currentSite: window.location.hostname,
                injectorVersion: GM_info.script.version
            };
        }

        injectStyles() {
            const styles = `
                .et-cosmic-badge {
                    position: fixed;
                    ${CONFIG.BADGE_POSITION === 'bottom-right' ? 'bottom: 20px; right: 20px;' : 'bottom: 20px; left: 20px;'}
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    font-weight: bold;
                    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
                    z-index: 999999;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .et-cosmic-badge:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
                }
                .et-cosmic-badge.active {
                    animation: pulse 2s infinite;
                }
                .et-cosmic-stats {
                    position: fixed;
                    top: 20px;
                    ${CONFIG.BADGE_POSITION === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
                    background: rgba(0, 0, 0, 0.9);
                    color: #00ff88;
                    padding: 15px;
                    border-radius: 10px;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    z-index: 999998;
                    display: none;
                    max-width: 300px;
                    border: 1px solid #00ff88;
                }
                .et-cosmic-stats.visible {
                    display: block;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .et-cosmic-hidden {
                    display: none !important;
                }
            `;
            
            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }

        createBadge() {
            const badge = document.createElement('div');
            badge.className = 'et-cosmic-badge active';
            badge.id = 'et-cosmic-badge';
            badge.innerHTML = `⚡ ET: ${this.getShortId()}`;
            badge.title = 'Clique para ver estatísticas';
            
            badge.addEventListener('click', () => this.toggleStats());
            
            document.body.appendChild(badge);
        }

        updateBadge() {
            const badge = document.getElementById('et-cosmic-badge');
            if (badge) {
                badge.innerHTML = `⚡ ET: ${this.getShortId()} | Rep: ${this.reputation.score}`;
            }
        }

        toggleStats() {
            const statsPanel = document.getElementById('et-cosmic-stats');
            if (statsPanel) {
                statsPanel.classList.toggle('visible');
            } else {
                this.showStatsPanel();
            }
        }

        showStatsPanel() {
            const stats = document.createElement('div');
            stats.className = 'et-cosmic-stats visible';
            stats.id = 'et-cosmic-stats';
            stats.innerHTML = `
                <div style="border-bottom: 1px solid #00ff88; padding-bottom: 5px; margin-bottom: 10px;">
                    <strong>🌐 ET-COSMIC MESH</strong>
                </div>
                <div>ID: ${this.getShortId()}</div>
                <div>Reputação: ${this.reputation.score}</div>
                <div>Uptime: ${this.reputation.uptime}s</div>
                <div>Dados Compartilhados: ${(this.reputation.sharedBytes / 1024 / 1024).toFixed(2)} MB</div>
                <div>Validações: ${this.reputation.validations}</div>
                <div style="margin-top: 10px; font-size: 9px; color: #888;">
                    Injeções hoje: ${this.injectionCount}/${CONFIG.MAX_INJECTIONS_PER_DAY}
                </div>
                <div style="margin-top: 10px; font-size: 9px; color: #ff6b6b;">
                    ⚔️ Carta de Guerra: <a href="https://github.com/ET-COSMIC/main/blob/main/DOC/CARTA-DE-GUERRA.md" target="_blank" style="color: #ff6b6b;">Ler</a>
                </div>
            `;
            
            document.body.appendChild(stats);
            
            // Fechar ao clicar fora
            setTimeout(() => {
                document.addEventListener('click', function close(e) {
                    if (!stats.contains(e.target) && !document.getElementById('et-cosmic-badge').contains(e.target)) {
                        stats.classList.remove('visible');
                        document.removeEventListener('click', close);
                    }
                });
            }, 100);
        }

        initializeNode() {
            // Aguardar o core script inicializar
            const checkInit = setInterval(() => {
                if (unsafeWindow.ETCosmicMesh && typeof unsafeWindow.ETCosmicMesh.start === 'function') {
                    unsafeWindow.ETCosmicMesh.start({
                        nodeId: this.nodeId,
                        site: window.location.hostname,
                        reputation: this.reputation
                    });
                    clearInterval(checkInit);
                    
                    // Monitorar atividade
                    this.monitorActivity();
                }
            }, 500);
            
            // Timeout de segurança
            setTimeout(() => clearInterval(checkInit), 10000);
        }

        monitorActivity() {
            // Monitorar peers e dados compartilhados
            setInterval(() => {
                if (unsafeWindow.ETCosmicMesh && unsafeWindow.ETCosmicMesh.getStats) {
                    const stats = unsafeWindow.ETCosmicMesh.getStats();
                    if (stats) {
                        this.meshPeers = stats.peers || 0;
                        this.dataShared = stats.sharedBytes || 0;
                        this.updateReputation({
                            uptime: 10,
                            sharedBytes: stats.sharedBytes || 0,
                            validations: stats.validations || 0
                        });
                    }
                }
            }, 10000);
        }

        // ======================================================================
        // UTILITÁRIOS & NOTIFICAÇÕES
        // ======================================================================

        getShortId() {
            return this.nodeId.split('-').slice(0, 3).join('-');
        }

        getDailyInjectionCount() {
            const today = new Date().toDateString();
            const stored = GM_getValue('et_daily_injections');
            
            if (!stored || stored.date !== today) {
                return 0;
            }
            
            return stored.count || 0;
        }

        incrementDailyCount() {
            const today = new Date().toDateString();
            const current = this.getDailyInjectionCount();
            GM_setValue('et_daily_injections', {
                date: today,
                count: current + 1
            });
            this.injectionCount = current + 1;
        }

        notify(title, message) {
            GM_notification({
                title: title,
                text: message,
                icon: 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><circle cx=\'50\' cy=\'50\' r=\'40\' fill=\'%236366f1\'/><text x=\'50\' y=\'65\' font-size=\'40\' text-anchor=\'middle\' fill=\'white\' font-weight=\'bold\'>ET</text></svg>',
                timeout: 5000,
                onclick: () => this.showStats()
            });
        }

        toggle() {
            CONFIG.AUTO_ACTIVATE = !CONFIG.AUTO_ACTIVATE;
            this.notify(
                CONFIG.AUTO_ACTIVATE ? '✅ ET-COSMIC Ativado' : '⏸️ ET-COSMIC Pausado',
                CONFIG.AUTO_ACTIVATE ? 'Injeção automática ligada' : 'Injeção automática desligada'
            );
        }

        showStats() {
            this.showStatsPanel();
        }

        resetIdentity() {
            if (confirm('Tem certeza que deseja resetar sua identidade? Isso criará um novo nó.')) {
                GM_deleteValue(CONFIG.STORAGE_KEY);
                GM_deleteValue(CONFIG.REPUTATION_KEY);
                location.reload();
            }
        }

        openWarLetter() {
            window.open('https://github.com/ET-COSMIC/main/blob/main/DOC/CARTA-DE-GUERRA.md', '_blank');
        }

        observeNavigation() {
            // Observer para SPAs (React, Vue, etc.)
            let lastUrl = location.href;
            new MutationObserver(() => {
                const url = location.href;
                if (url !== lastUrl) {
                    lastUrl = url;
                    console.log('[ET-COSMIC] Navegação detectada:', url);
                    setTimeout(() => {
                        if (this.shouldInject() && !this.isActive) {
                            this.inject();
                        }
                    }, CONFIG.INJECTION_DELAY);
                }
            }).observe(document, { subtree: true, childList: true });
        }
    }

    // ========================================================================
    // INICIALIZAÇÃO
    // ========================================================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new ETMeshInjector());
    } else {
        new ETMeshInjector();
    }

})();
