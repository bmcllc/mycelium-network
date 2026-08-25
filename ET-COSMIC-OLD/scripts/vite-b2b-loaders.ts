import type { Plugin } from "vite";
import { PANEL_COMPONENT_MAP } from "../src/b2b/componentMap";

const VIRTUAL_ID = "virtual:b2b-panel-loaders";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

export function b2bPanelLoadersPlugin(enabledPaths: ReadonlySet<string> | null): Plugin {
  return {
    name: "b2b-panel-loaders",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;

      const paths =
        enabledPaths === null
          ? Object.keys(PANEL_COMPONENT_MAP)
          : [...enabledPaths].filter((p) => PANEL_COMPONENT_MAP[p]);

      const lines = paths.map(
        (p) =>
          `  ${JSON.stringify(p)}: () => import("@components/${PANEL_COMPONENT_MAP[p]}"),`,
      );

      return [
        "export const B2B_PANEL_LOADERS = {",
        ...lines,
        "};",
        "",
      ].join("\n");
    },
  };
}
