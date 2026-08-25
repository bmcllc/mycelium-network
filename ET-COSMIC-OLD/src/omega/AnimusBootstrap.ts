/**
 * VØID·ΩMEGA — ANIMUS Bootstrap (Stratum 3)
 * 
 * O "Viroid" do sistema. Este módulo é responsável por:
 * 1. INOCULAÇÃO: Esconder o binário/estado do VØID em ativos benignos (Imagens, Modelos).
 * 2. ATIVAÇÃO: Extrair e executar o código a partir de fontes esteganográficas.
 * 3. PERSISTÊNCIA: Garantir que o Service Worker recupere o ANIMUS se o cache for limpo.
 */

import { consentContract } from "../ethics/consentContract";
import { hideInPixels, extractFromPixels } from "./steganography";

export class AnimusBootstrap {
  private static instance: AnimusBootstrap;

  public static getInstance(): AnimusBootstrap {
    if (!AnimusBootstrap.instance) {
      AnimusBootstrap.instance = new AnimusBootstrap();
    }
    return AnimusBootstrap.instance;
  }

  /**
   * Inocula o Orquestrador em uma imagem de sistema (ex: ícone do PWA).
   * Isso cria o "Stratum 3" de persistência.
   */
  public async inoculate(orchestratorBlob: Uint8Array, sourceImageUrl: string): Promise<Blob> {
    consentContract.requireConsent("ANIMUS_PERSISTENCE");
    console.log("[ANIMUS] Inoculação local (steganografia LSB — apenas neste dispositivo)...");
    
    // 1. Carrega a imagem original
    const img = new Image();
    img.src = sourceImageUrl;
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 2. Esconde o payload via LSB (Blue Channel)
    const infectedData = hideInPixels(imageData.data, orchestratorBlob);
    imageData.data.set(infectedData);
    ctx.putImageData(imageData, 0, 0);

    console.log(`[ANIMUS] Inoculação completa. Payload de ${orchestratorBlob.length} bytes injetado em ${sourceImageUrl}`);
    
    return new Promise(resolve => canvas.toBlob(b => resolve(b!), "image/png"));
  }

  /**
   * Ativa o sistema a partir de um ativo infectado.
   * Usado pelo Service Worker para "ressuscitar" o nó.
   */
  public async activateFromImage(blob: Blob): Promise<Uint8Array> {
    const img = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      const payload = extractFromPixels(imageData.data);
      console.log("[ANIMUS] Ativação bem-sucedida. Payload extraído.");
      return payload;
    } catch (e) {
      console.error("[ANIMUS] Falha na ativação: ativo não contém payload válido.");
      throw e;
    }
  }

  /**
   * Comunica o novo payload para o Service Worker para persistência em background.
   */
  public async syncWithServiceWorker(payload: Uint8Array) {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "ANIMUS_INOCULATION",
        payload: Array.from(payload)
      });
    }
  }
}

export const animusBootstrap = AnimusBootstrap.getInstance();
