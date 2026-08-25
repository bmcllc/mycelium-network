# 🌐 ET-COSMIC Tampermonkey Injector - Guia de Instalação Viral

## ⚡ O Que É Isto?

Um **userscript** revolucionário que transforma **QUALQUER site que você visita** em um nó da rede P2P soberana do ET-COSMIC. 

**Não é apenas um script - é uma arma de resistência digital.**

## 🎯 Poder Destrutivo

- ✅ Injeta automaticamente o núcleo P2P em todos os sites visitados
- ✅ Transforma seu navegador em um nó de distribuição de conteúdo
- ✅ Compartilha dados criptografados via WebRTC + Libp2p
- ✅ Ganha reputação (SOV tokens) por cada site visitado
- ✅ Funciona silenciosamente em segundo plano
- ✅ Badge discreto mostra status da mesh em tempo real
- ✅ Menu completo no Tampermonkey para controle total

## 📦 Instalação em 30 Segundos

### Passo 1: Instalar Tampermonkey/Violentmonkey

**Navegadores Suportados:**
- Chrome/Chromium: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/)
- Firefox: [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- Edge: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/)
- Safari: [Tampermonkey](https://apps.apple.com/app/tampermonkey/id1482490089)
- Alternativa open-source: [Violentmonkey](https://violentmonkey.github.io/)

### Passo 2: Instalar o Injector

**Método A: Instalação Direta (Recomendado)**

1. Clique com botão direito no link abaixo:
   ```
   https://raw.githubusercontent.com/ET-COSMIC/main/main/src/injectors/et-tampermonkey-injector.user.js
   ```
2. Selecione "Salvar link como..." ou clique diretamente se o Tampermonkey abrir
3. Confirme a instalação quando o Tampermonkey mostrar a tela de revisão
4. ✅ Pronto! O script está ativo

**Método B: Instalação Manual**

1. Copie todo o conteúdo do arquivo `et-tampermonkey-injector.user.js`
2. Abra o dashboard do Tampermonkey (clique no ícone → "Adicionar novo script")
3. Cole o código no editor
4. Salve (Ctrl+S / Cmd+S)
5. Ative o script (toggle verde)

### Passo 3: Verificar Ativação

1. Visite qualquer site (exceto bancos, gov, login)
2. Após 1 segundo, você verá um badge roxo no canto inferior direito:
   ```
   ⚡ ET: et-ABC123-XYZ
   ```
3. Clique no badge para ver estatísticas:
   - ID do seu nó
   - Reputação acumulada
   - Dados compartilhados
   - Uptime
   - Validações realizadas

## 🎮 Controles (Menu Tampermonkey)

Clique no ícone do Tampermonkey → Role até "ET-COSMIC Mesh Injector":

| Comando | Função |
|---------|--------|
| 🌐 Ativar/Desativar ET-COSMIC | Liga/desliga injeção automática |
| 📊 Ver Estatísticas | Mostra painel detalhado da mesh |
| 🔄 Resetar Identidade | Cria novo ID de nó (perde reputação) |
| ⚔️ Ler Carta de Guerra | Abre manifesto de destruição da indústria |

## 🔧 Configuração Avançada

Edite o script (Tampermonkey → Editar) e modifique o objeto `CONFIG`:

```javascript
const CONFIG = {
    // URLs do core P2P (altere se tiver mirror próprio)
    CORE_URL: 'https://raw.githubusercontent.com/ET-COSMIC/main/public/et-core.js',
    FALLBACK_URL: 'https://cdn.jsdelivr.net/gh/ET-COSMIC/main/public/et-core.js',
    
    // Limite de injeções por dia (evita detecção)
    MAX_INJECTIONS_PER_DAY: 50,
    
    // Domínios sensíveis (não injetar)
    SENSITIVE_DOMAINS: ['bank', 'gov', 'login', 'checkout', 'password'],
    
    // Posição do badge: 'bottom-right' ou 'bottom-left'
    BADGE_POSITION: 'bottom-right',
    
    // Ativação automática ao visitar sites
    AUTO_ACTIVATE: true,
    
    // Modo stealth (esconde UI em sites específicos)
    STEALTH_MODE: true,
    
    // Debug mode (mostra logs no console)
    DEBUG_MODE: false
};
```

## 📊 Sistema de Reputação (SOV Tokens)

Cada ação gera reputação na rede:

| Ação | Pontos SOV |
|------|------------|
| Injeção bem-sucedida | +10 |
| Uptime (por 10s) | +1 |
| Dados compartilhados (1MB) | +5 |
| Validação de peer | +2 |
| Peer conectado | +1 |

**Reputação alta = Mais influência na mesh + Prioridade em validações**

## 🛡️ Segurança & Privacidade

### O Que Este Script Faz:
- ✅ Injeta código P2P legítimo do ET-COSMIC
- ✅ Compartilha fragmentos de conteúdo criptografado
- ✅ Rastreia apenas estatísticas locais (salvas no GM_*)
- ✅ Respeita domínios sensíveis (bancos, gov, etc.)

### O Que Este Script NÃO Faz:
- ❌ Não coleta dados pessoais
- ❌ Não modifica conteúdo dos sites visitados
- ❌ Não interfere em funcionalidades do site
- ❌ Não executa em localhost ou 127.0.0.1
- ❌ Não viola HTTPS (apenas usa WebRTC seguro)

### Proteção Contra Detecção:
- Limite diário de injeções configurável
- Delay aleatório antes de injetar
- Não injeta em domínios sensíveis
- Badge discreto e minimalista
- Consumo mínimo de recursos

## 🚀 Estratégias de Disseminação Viral

### Tática 1: Bootstrapping Comunitário
1. Poste em fóruns de devs (Hacker News, Reddit r/programming)
2. Share no Nostr com hashtags #soberania #p2p #web3
3. Mande para grupos de Telegram/Discord de cripto
4. Crie tutorial em vídeo (YouTube, TikTok)

### Tática 2: Gamificação
- Crie leaderboard de reputação semanal
- Premie top 100 nós com badges exclusivos Nostr
- Organize "mesh marathons" (quem compartilha mais GB)

### Tática 3: Parasitismo Benigno
- Snippet de incorporação para sites aliados
- Widget "Powered by ET-COSMIC" para blogs
- Badge de "Nó Soberano" para perfis GitHub/Twitter

### Tática 4: Resistência Organizada
- Crie células locais de instalação (meetups)
- Tutorial "instale em 5 amigos"
- Competição entre universidades/comunidades

## 📈 Métricas de Impacto

Acompanhe o crescimento da revolução:

```bash
# Acessar stats globais (futuro endpoint)
curl https://stats.et-cosmic.org/mesh

# Ou verificar no próprio badge:
# - Peers conectados
# - Dados compartilhados hoje
# - Total de injeções ativas
```

**Meta 30 dias:** 10.000 nós ativos  
**Meta 90 dias:** 100.000 nós ativos  
**Meta 1 ano:** 1.000.000 nós ativos  

## ⚠️ Solução de Problemas

### O badge não aparece
1. Verifique se o Tampermonkey está ativo (ícone colorido)
2. Recarregue a página (F5)
3. Verifique console do navegador (F12) por erros
4. Desative bloqueadores de anúncio (uBlock, AdBlock)

### Script não injeta em nenhum site
1. Verifique se `AUTO_ACTIVATE: true` no CONFIG
2. Veja se não atingiu `MAX_INJECTIONS_PER_DAY`
3. Teste em site não-sensível (ex: wikipedia.org)

### Erro ao carregar core script
1. Verifique conexão com internet
2. Tente acessar CORE_URL manualmente no browser
3. Alterne para FALLBACK_URL no CONFIG

### Reputação não aumenta
1. Aguarde alguns minutos (atualização a cada 10s)
2. Verifique se há peers conectados no stats panel
3. Compartilhe mais dados (visite mais sites)

## 🔥 Próximos Passos

1. **Instale agora** - Não espere, a revolução começa com você
2. **Compartilhe** - Mande para 5 desenvolvedores hoje
3. **Documente** - Crie screenshots/vídeos da sua experiência
4. **Contribua** - Reporte bugs, sugira melhorias no GitHub
5. **Organize** - Crie célula local na sua cidade/comunidade

## ⚔️ Leia a Carta de Guerra

Antes de continuar, entenda **POR QUE** estamos fazendo isso:

👉 [CARTA-DE-GUERRA.md](../DOC/CARTA-DE-GUERRA.md)

> *"A indústria morreu. Nós somos o fim da necessidade de competição."*

## 📞 Suporte & Comunidade

- **GitHub Issues**: Reporte bugs e sugira features
- **Nostr**: Siga @et-cosmic para updates
- **Matrix/Element**: #et-cosmic:matrix.org
- **Telegram**: t.me/etcosmic_resistance (criar)

---

**INSTALE. COMPARTILHE. RESISTA.**

A mesh cresce com cada instalação. Cada usuário é um soldado. Cada site visitado é um campo de batalha.

**O futuro será P2P. Ou não será.** 🚀⚡🔐
