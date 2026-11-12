// Canonical JSON and byte helpers for panel digests and traces.
//
// Documents use a deliberately small JSON subset: null, boolean, string, finite
// number, dense array and plain object. Object keys sort by UTF-16 code unit,
// arrays keep their order and no insignificant whitespace is emitted. An
// independent implementation must reproduce this byte for byte or its digests
// will not match.
const encoder = new TextEncoder();

export const CANONICAL_LIMITS = Object.freeze({
  maxDepth: 32,
  maxNodes: 10000,
  maxStringLength: 262144,
  maxOutputLength: 65536,
});

/** Serialize a document-shaped value to its canonical bytes. */
export function canonicalJson(value, limits = {}) {
  const { maxDepth, maxNodes, maxStringLength, maxOutputLength } = {
    ...CANONICAL_LIMITS,
    ...limits,
  };
  const seen = new Set();
  let nodes = 0;

  function encode(item, depth) {
    if (depth > maxDepth) throw new RangeError("document_too_deep");
    if (++nodes > maxNodes) throw new RangeError("document_too_large: node count");

    if (item === null) return "null";
    const type = typeof item;

    if (type === "boolean") return item ? "true" : "false";
    if (type === "string") {
      if (item.length > maxStringLength) throw new RangeError("document_too_large: string");
      return JSON.stringify(item);
    }
    if (type === "number") {
      if (!Number.isFinite(item)) throw new RangeError("document_number_invalid");
      return JSON.stringify(item);
    }
    if (type !== "object") throw new TypeError(`document_type_invalid: ${type}`);
    if (seen.has(item)) throw new TypeError("document_cycle");

    seen.add(item);
    let out;
    if (Object.getOwnPropertySymbols(item).length || Object.values(Object.getOwnPropertyDescriptors(item)).some((entry) => entry.get || entry.set)) {
      throw new TypeError("document_object_invalid: symbols or accessors");
    }

    if (Array.isArray(item)) {
      if (Object.keys(item).length !== item.length) throw new TypeError("document_sparse_array");
      out = `[${Array.from(item, (entry) => encode(entry, depth + 1)).join(",")}]`;
    } else {
      const proto = Object.getPrototypeOf(item);
      if (proto !== Object.prototype && proto !== null) {
        throw new TypeError("document_object_invalid: not a plain object");
      }
      const body = Object.keys(item)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${encode(item[key], depth + 1)}`)
        .join(",");
      out = `{${body}}`;
    }

    seen.delete(item);
    if (encoder.encode(out).byteLength > maxOutputLength) throw new RangeError("document_too_large: output");
    return out;
  }

  const result = encode(value, 0);
  if (encoder.encode(result).byteLength > maxOutputLength) throw new RangeError("document_too_large: output");
  return result;
}

export function canonicalBytes(value, limits) {
  return encoder.encode(canonicalJson(value, limits));
}
