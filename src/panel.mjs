// Node facade. Validation is shared with the browser; hashing uses Node crypto.
import { createHash } from "node:crypto";
import { canonicalJson } from "./canonical.mjs";
import { normalizePanel } from "./panel-schema.mjs";
export * from "./panel-schema.mjs";

/** Content address of a normalised panel, used to bind a trace to one revision. */
export function panelDigest(panel) {
  return `sha256:${createHash("sha256").update(canonicalJson(normalizePanel(panel)), "utf8").digest("hex")}`;
}
