/**
 * Capacitor — VoidAnimus (BLE + Foreground Service + entropia hardware).
 */

import { registerPlugin } from "@capacitor/core";

export interface VoidAnimusPlugin {
  startAnimusService(): Promise<{ started: boolean }>;
  stopAnimusService(): Promise<{ stopped: boolean }>;
  updateBleAdvertisingData(options: {
    payload: string;
  }): Promise<{ advertising: boolean; truncated: boolean }>;
  stopBleAdvertising(): Promise<{ stopped: boolean }>;
  getDeviceEntropy(): Promise<{ entropy: string; source: string }>;
  addListener?(
    eventName: string,
    handler: (data: { address: string; rssi: number }) => void,
  ): Promise<{ remove: () => void }>;
}

const VoidAnimus = registerPlugin<VoidAnimusPlugin>("VoidAnimus", {
  web: () =>
    import("./voidAnimusWeb").then((m) => new m.VoidAnimusWeb()),
});

export { VoidAnimus };
