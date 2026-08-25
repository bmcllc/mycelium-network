import type { VoidAnimusPlugin } from "./voidAnimus";

export class VoidAnimusWeb implements VoidAnimusPlugin {
  async startAnimusService() {
    return { started: false };
  }
  async stopAnimusService() {
    return { stopped: true };
  }
  async updateBleAdvertisingData() {
    return { advertising: false, truncated: false };
  }
  async stopBleAdvertising() {
    return { stopped: true };
  }
  async getDeviceEntropy() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return {
      entropy: Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      source: "web_csprng",
    };
  }
}
