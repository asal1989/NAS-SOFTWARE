const path = require('path');
const fs = require('fs');

const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT);

if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

// Resolves a user-supplied relative path against STORAGE_ROOT and guarantees
// the result stays inside STORAGE_ROOT (blocks path traversal).
function resolveSafePath(relativePath) {
  const cleaned = (relativePath || '').replace(/\\/g, '/');
  const resolved = path.resolve(STORAGE_ROOT, '.' + path.sep + cleaned);
  const rootWithSep = STORAGE_ROOT.endsWith(path.sep) ? STORAGE_ROOT : STORAGE_ROOT + path.sep;
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(rootWithSep)) {
    throw new Error('Path escapes storage root');
  }
  return resolved;
}

// Checks whether `relativePath` is inside (or equal to) one of the user's allowed folders.
function isPathAllowed(allowedPaths, relativePath) {
  const normalized = '/' + (relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (allowedPaths.includes('/')) return true;
  return allowedPaths.some((allowed) => {
    const a = '/' + allowed.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return normalized === a || normalized.startsWith(a + '/');
  });
}

module.exports = { STORAGE_ROOT, resolveSafePath, isPathAllowed };
