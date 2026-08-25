/**
 * Limites e classificação anacróclasta — transparência na UI.
 */

export const HEPTARY_MAX_QUSEPTS = 4;
export const HEPTARY_DEFAULT_QUSEPTS = 3;
export const HEPTARY_DIM_WARNING = 7 ** 4; // 2401

export const ANACROCLASTIC_CLASSIFICATION = {
  red: {
    label: "Impossível classicamente",
    items: [
      "Superposição quântica real",
      "Emaranhamento não-local",
      "Aleatoriedade certificada / QRNG",
      "Não-clonagem como garantia criptográfica",
      "Aceleração exponencial QC tolerante a falhas",
    ],
  },
  orange: {
    label: "Exponencialmente inviável",
    items: [
      ">30 qubits/qusepts exatos",
      "Matriz densidade >20 qubits",
      "Espumas de spin muito grandes",
      "SDF planetário sem compressão",
    ],
  },
  yellow: {
    label: "Especulativo mas testável",
    items: [
      "Campo χ cosmológico (matéria escura)",
      "Gravidade / Higgs com memória",
      "Transição de fase causal como emergência",
      "CQR como arquitetura quântica real",
    ],
  },
  green: {
    label: "Realizável agora",
    items: [
      "Redes de spin pequenas",
      "SDF + advecção",
      "Leis LSC fenomenológicas",
      "Operadores MCM",
      "PQC clássico",
      "VPS / Nostr / DEX / ScrapScanner",
      "LUSUS (Ising, TF, caos sincronizado)",
      "Isossupramulação VOID-500–600 (iso+supra)",
    ],
  },
} as const;

export const AQRE_DISCLAIMER_PT =
  "AQRE: emulador clássico. Nunca executa computação quântica real; recusa tarefas além dos limites LSC (HTTP 429).";

export const LUSUS_DISCLAIMER_PT =
  "LUSUS: fenômenos clássicos na fronteira do colapso — parece quântico, viola o hype, não a física.";

export const ISOSSUPRA_DISCLAIMER_PT =
  "Isossupramulação: gêmeo digital fiel ao fenómeno físico (iso), amplificado pela malha ET-COSMIC (supra). Sem qubits.";

export const CLASSICAL_ENTROPY_DISCLAIMER_PT =
  "Entropia clássica de alta qualidade (CSPRNG ou emulação) — não aleatoriedade quântica certificada.";
