const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const multer = require('multer');
const { authRequired } = require('../middleware/auth');
const { resolveSafePath, isPathAllowed } = require('../storage');
const { notify } = require('../mailer');

const router = express.Router();
router.use(authRequired);

function checkAccess(req, res, next) {
  const relPath = (req.query.path ?? req.body?.path ?? '/').toString();
  if (!isPathAllowed(req.user.allowedPaths, relPath)) {
    return res.status(403).json({ error: 'Access denied to this path' });
  }
  try {
    req.safePath = resolveSafePath(relPath);
    req.relPath = relPath;
  } catch {
    return res.status(400).json({ error: 'Invalid path' });
  }
  next();
}

// --- Listing ---
router.get('/list', checkAccess, async (req, res) => {
  try {
    const stat = await fsp.stat(req.safePath);
    if (!stat.isDirectory()) return res.status(400).json({ error: 'Not a directory' });
    const entries = await fsp.readdir(req.safePath, { withFileTypes: true });
    const items = await Promise.all(
      entries.map(async (entry) => {
        const entryRel = path.posix.join(req.relPath.replace(/\\/g, '/'), entry.name);
        if (!isPathAllowed(req.user.allowedPaths, entryRel) && req.user.role !== 'admin') {
          return null;
        }
        const full = path.join(req.safePath, entry.name);
        const st = await fsp.stat(full).catch(() => null);
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size: st ? st.size : 0,
          modifiedAt: st ? st.mtime : null,
        };
      })
    );
    res.json({ path: req.relPath, items: items.filter(Boolean) });
  } catch (e) {
    res.status(404).json({ error: 'Path not found' });
  }
});

// --- Download ---
router.get('/download', checkAccess, async (req, res) => {
  try {
    const stat = await fsp.stat(req.safePath);
    if (stat.isDirectory()) return res.status(400).json({ error: 'Cannot download a directory' });
    res.download(req.safePath);
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

// --- Upload ---
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 * 1024 } });

router.post('/upload', checkAccess, upload.array('files'), async (req, res) => {
  try {
    const stat = await fsp.stat(req.safePath).catch(() => null);
    if (!stat || !stat.isDirectory()) return res.status(400).json({ error: 'Target is not a directory' });
    for (const file of req.files || []) {
      const dest = path.join(req.safePath, path.basename(file.originalname));
      await fsp.writeFile(dest, file.buffer);
    }
    const names = (req.files || []).map((f) => f.originalname);
    res.json({ ok: true, uploaded: names });
    notify('upload', { File: names.join(', '), Folder: req.relPath }, req.user.username);
  } catch (e) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// --- Create folder ---
router.post('/mkdir', checkAccess, async (req, res) => {
  const { name } = req.body || {};
  if (!name || /[\\/]/.test(name)) return res.status(400).json({ error: 'Invalid folder name' });
  try {
    await fsp.mkdir(path.join(req.safePath, name), { recursive: false });
    res.json({ ok: true });
    notify('mkdir', { Folder: `${req.relPath}/${name}` }, req.user.username);
  } catch (e) {
    if (e.code === 'EEXIST') return res.status(409).json({ error: 'Folder already exists' });
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// --- Delete (file or folder, recursive) ---
router.delete('/delete', checkAccess, async (req, res) => {
  try {
    await fsp.rm(req.safePath, { recursive: true, force: false });
    res.json({ ok: true });
    notify('delete', { Path: req.relPath }, req.user.username);
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// --- Rename ---
router.post('/rename', async (req, res) => {
  const { path: relPath, newName } = req.body || {};
  if (!newName || /[\\/]/.test(newName)) return res.status(400).json({ error: 'Invalid new name' });
  if (!isPathAllowed(req.user.allowedPaths, relPath)) {
    return res.status(403).json({ error: 'Access denied to this path' });
  }
  try {
    const src = resolveSafePath(relPath);
    const dest = path.join(path.dirname(src), newName);
    await fsp.rename(src, dest);
    res.json({ ok: true });
    notify('rename', { From: relPath, To: newName }, req.user.username);
  } catch (e) {
    res.status(500).json({ error: 'Rename failed' });
  }
});

// --- Move ---
router.post('/move', async (req, res) => {
  const { path: relPath, newPath } = req.body || {};
  if (
    !isPathAllowed(req.user.allowedPaths, relPath) ||
    !isPathAllowed(req.user.allowedPaths, newPath)
  ) {
    return res.status(403).json({ error: 'Access denied to this path' });
  }
  try {
    const src = resolveSafePath(relPath);
    const dest = resolveSafePath(newPath);
    await fsp.rename(src, dest);
    res.json({ ok: true });
    notify('move', { From: relPath, To: newPath }, req.user.username);
  } catch (e) {
    res.status(500).json({ error: 'Move failed' });
  }
});

module.exports = router;
