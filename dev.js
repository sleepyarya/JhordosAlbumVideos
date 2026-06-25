const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { scanVideos } = require('./generate-metadata');

const videosDir = path.join(__dirname, 'videos');

// Jalankan scan pertama kali saat start
console.log('Menjalankan scan awal metadata video...');
scanVideos();

// Setup debouncing untuk file watcher
let watchTimeout = null;
function handleWatchChange(eventType, filename) {
  if (watchTimeout) clearTimeout(watchTimeout);
  
  watchTimeout = setTimeout(() => {
    console.log(`[Watcher] Deteksi perubahan file: ${filename || ''} (${eventType}). Memperbarui metadata...`);
    try {
      scanVideos();
    } catch (err) {
      console.error('[Watcher] Gagal memperbarui metadata:', err);
    }
  }, 500);
}

// Watch folder videos
if (fs.existsSync(videosDir)) {
  console.log(`[Watcher] Mulai mengawasi folder: ${videosDir}`);
  fs.watch(videosDir, { recursive: false }, (eventType, filename) => {
    // Saring agar hanya merespon perubahan file .mp4
    if (!filename || filename.toLowerCase().endsWith('.mp4')) {
      handleWatchChange(eventType, filename);
    }
  });
} else {
  console.error(`Folder 'videos' tidak ditemukan di ${videosDir}`);
}

// Start dev server (npx serve)
console.log('Menjalankan server statik...');
const isWindows = process.platform === 'win32';
const serveCommand = isWindows ? 'npx.cmd' : 'npx';

const devServer = spawn(serveCommand, ['serve', '.'], {
  stdio: 'inherit',
  shell: true
});

devServer.on('error', (err) => {
  console.error('Gagal menjalankan server statik:', err);
});

// Bersihkan child process jika parent dihentikan
process.on('SIGINT', () => {
  console.log('\nMenghentikan server dan watcher...');
  devServer.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  devServer.kill();
  process.exit();
});
