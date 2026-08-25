/**
 * VØID — Native Hardware Bridge
 *
 * Conecta TypeScript/WASM com o OS nativo via Capacitor.
 * Suporta dois modos:
 *
 * Modo A — Capacitor (Android/iOS):
 *   Detectado via `window.Capacitor.isNativePlatform()`.
 *   Usa `@capacitor/core` para comunicação com plugins nativos.
 *   Plugin necessário no Android: VoidAnimusPlugin (Foreground Service + BLE adv).
 *
 * Modo B — Stub (browser puro):
 *   Loga aviso, não quebra. Advertising fica a cargo do BluetoothDriver.
 *
 * Para criar o plugin Android:
 *   npx @capacitor/cli plugin:generate
 *   Implementar VoidAnimusPlugin.kt com startAnimusService() e updateBleAdvertisingData()
 */

import { assertOperationAllowed } from "../protocol/amp/consentLattice";
import { consentReceiptStore } from "../protocol/amp/consentReceiptStore";
import { type HCNShard } from "../storage/hcnStore";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import { VoidAnimus } from "../plugins/voidAnimus";

function getCapacitor() {
  return (window as typeof window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
}

export class NativeBridge {
  private static instance: NativeBridge;

  public static getInstance(): NativeBridge {
    if (!NativeBridge.instance) {
      NativeBridge.instance = new NativeBridge();
    }
    return NativeBridge.instance;
  }

  private constructor() {
    this.listenToNativeEvents();
  }

  /**
   * Verdadeiro quando rodando dentro do Capacitor (Android/iOS).
   */
  public isNative(): boolean {
    return getCapacitor()?.isNativePlatform?.() === true;
  }

  /** @deprecated Use isNative() */
  public isAvailable(): boolean {
    return this.isNative();
  }

  /**
   * Ativa o Foreground Service Android que mantém BLE vivo com tela apagada.
   * Requer plugin VoidAnimusPlugin registrado no MainActivity.kt.
   */
  public async activateCarrierService(): Promise<void> {
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), "symbiont_cycles");
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), "ble_advertise");

    if (!this.isNative()) {
      console.warn("[NativeBridge] Não é ambiente Capacitor — Foreground Service indisponível.");
      return;
    }

    try {
      await VoidAnimus.startAnimusService();
      console.log("[NativeBridge] Foreground Service ativado via Capacitor.");
    } catch (err) {
      console.error("[NativeBridge] Falha ao ativar Foreground Service:", err);
    }
  }

  /**
   * Passa shards para o Android Foreground Service anunciar via BLE
   * mesmo com a WebView suspensa (tela apagada).
   */
  public async pushShardsToNativeCache(shards: HCNShard[]): Promise<void> {
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), "ble_advertise");
    if (!this.isNative()) return;

    try {
      const payload = JSON.stringify(
        shards.map(s => ({ id: s.commitment, data: s.payload })),
      );
      await VoidAnimus.updateBleAdvertisingData({ payload });
    } catch (err) {
      console.error("[NativeBridge] Falha ao injetar shards:", err);
    }
  }

  /**
   * Escuta eventos do plugin nativo (peer BLE descoberto, shard recebido).
   */
  private listenToNativeEvents(): void {
    window.addEventListener("NATIVE_BLE_PEER", (e: Event) => {
      const { address, rssi } = (e as CustomEvent).detail ?? {};
      console.log(`[NativeBridge] Peer BLE descoberto: ${address} (${rssi}dBm)`);
      voidOrchestrator.handleIncomingShard({}, `NATIVE_BLE:${address}`);
    });

    window.addEventListener("NATIVE_SHARD_RECEIVED", (e: Event) => {
      const { shard } = (e as CustomEvent).detail ?? {};
      console.log("[NativeBridge] Shard recebido em background.");
      voidOrchestrator.handleIncomingShard(shard, "NATIVE_BACKGROUND");
    });

    void VoidAnimus.addListener?.("blePeerDiscovered", (data: { address: string; rssi: number }) => {
      voidOrchestrator.handleIncomingShard({}, `NATIVE_BLE:${data.address}`);
    });
  }
}

export const nativeBridge = NativeBridge.getInstance();
