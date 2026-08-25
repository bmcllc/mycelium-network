import { describe, it, expect } from "vitest";
import {
  getAiUseReservationNotice,
  ETRNET_REQUIRED_LEGAL_FILES,
} from "./etrnetSovereignty";

describe("etrnetSovereignty", () => {
  it("inclui AI-USE-RESERVATION nos ficheiros legais obrigatórios", () => {
    expect(ETRNET_REQUIRED_LEGAL_FILES).toContain("AI-USE-RESERVATION.md");
  });

  it("getAiUseReservationNotice menciona treino de IA", () => {
    const n = getAiUseReservationNotice();
    expect(n).toContain("ET-COSMIC");
    expect(n.toLowerCase()).toMatch(/ia|treino/);
  });
});
