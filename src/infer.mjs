// Network adapter. Static inference remains usable without Node or a network.
import { HardwireError } from "./panel-schema.mjs";
import { inferFromHtml } from "./infer-html.mjs";
import { assertPublicOrigin, fetchPage } from "./probe.mjs";
export * from "./infer-html.mjs";

/** Fetch a page and infer from it. */
export async function inferFromUrl(origin, options = {}) {
  const base = assertPublicOrigin(origin, { allowPrivate: options.allowPrivate });
  const page = await fetchPage(base, {
    ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
  });
  if (page.status !== 200 || !/text\/html|application\/xhtml\+xml/i.test(page.contentType)) {
    throw new HardwireError("hardwire_infer_failed", "origin", `page returned ${page.status || page.error}`);
  }
  return inferFromHtml(page.body, { origin: base });
}
