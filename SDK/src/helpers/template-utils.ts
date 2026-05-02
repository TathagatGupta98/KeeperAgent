/**
 * Template utilities for parsing and building KeeperHub template references.
 *
 * Template format: `{{@nodeId:Label.field}}`
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedTemplateRef {
  nodeId: string;
  label: string;
  field: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Regex to match KeeperHub template references. */
const TEMPLATE_REGEX = /\{\{@([^:]+):([^.]+)\.([^}]+)\}\}/g;

/** Regex to match a single template reference. */
const SINGLE_TEMPLATE_REGEX = /^\{\{@([^:]+):([^.]+)\.([^}]+)\}\}$/;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a single template reference string.
 *
 * @example
 * parseTemplateRef("{{@node_1:Check Balance.result.balance}}")
 * // → { nodeId: "node_1", label: "Check Balance", field: "result.balance" }
 */
export function parseTemplateRef(ref: string): ParsedTemplateRef | null {
  const match = SINGLE_TEMPLATE_REGEX.exec(ref);
  if (!match) return null;

  return {
    nodeId: match[1]!,
    label: match[2]!,
    field: match[3]!,
  };
}

/**
 * Extract all template references from a string.
 */
export function extractTemplateRefs(text: string): ParsedTemplateRef[] {
  const refs: ParsedTemplateRef[] = [];
  let match: RegExpExecArray | null;

  // Reset the regex lastIndex for global matching
  TEMPLATE_REGEX.lastIndex = 0;

  while ((match = TEMPLATE_REGEX.exec(text)) !== null) {
    refs.push({
      nodeId: match[1]!,
      label: match[2]!,
      field: match[3]!,
    });
  }

  return refs;
}

/**
 * Build a template reference string.
 *
 * @example
 * buildTemplateRef("node_1", "Check Balance", "result.balance")
 * // → "{{@node_1:Check Balance.result.balance}}"
 */
export function buildTemplateRef(
  nodeId: string,
  label: string,
  field: string,
): string {
  return `{{@${nodeId}:${label}.${field}}}`;
}

/**
 * Interpolate template references in a string using a value resolver.
 *
 * @param text - The string containing template references.
 * @param resolver - A function that takes a parsed ref and returns the replacement value.
 */
export function interpolateTemplates(
  text: string,
  resolver: (ref: ParsedTemplateRef) => string | undefined,
): string {
  TEMPLATE_REGEX.lastIndex = 0;

  return text.replace(TEMPLATE_REGEX, (fullMatch, nodeId, label, field) => {
    const ref: ParsedTemplateRef = {
      nodeId: nodeId as string,
      label: label as string,
      field: field as string,
    };
    const value = resolver(ref);
    return value !== undefined ? value : fullMatch;
  });
}

/**
 * Check whether a string contains any template references.
 */
export function hasTemplateRefs(text: string): boolean {
  TEMPLATE_REGEX.lastIndex = 0;
  return TEMPLATE_REGEX.test(text);
}
