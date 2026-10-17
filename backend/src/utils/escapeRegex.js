// Escape user input before using it inside a RegExp (prevents regex injection / ReDoS).
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
