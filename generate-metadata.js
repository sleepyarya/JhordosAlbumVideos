const fs = require('fs');
const path = require('path');

const videosDir = path.join(__dirname, 'videos');
const outputFile = path.join(__dirname, 'videos.json');

function scanVideos() {
  if (!fs.existsSync(videosDir)) {
    console.error("Folder 'videos' tidak ditemukan!");
    return;
  }

  const files = fs.readdirSync(videosDir);
  const videoData = [];

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.mp4') {
      const filePath = path.join(videosDir, file);
      const stats = fs.statSync(filePath);
      
      // Coba deteksi tanggal dari nama file terlebih dahulu (misal: "2026-06-11 23-57-33.mp4")
      let fileDate = '';
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        fileDate = dateMatch[1];
      } else {
        // Fallback ke birthtime (creation time) atau mtime (modification time)
        const targetDate = stats.birthtime && stats.birthtime.getFullYear() > 1970 ? stats.birthtime : stats.mtime;
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        fileDate = `${year}-${month}-${day}`;
      }

      // Nama bersih tanpa ekstensi untuk tampilan
      const displayName = path.basename(file, ext);

      videoData.push({
        name: file,
        displayName: displayName,
        path: `videos/${encodeURIComponent(file)}`, // Encode URL path characters properly
        size: stats.size,
        date: fileDate,
        timestamp: new Date(fileDate).getTime() || stats.mtime.getTime()
      });
    }
  });

  // Urutkan berdasarkan tanggal terbaru sebagai default (descending)
  videoData.sort((a, b) => b.timestamp - a.timestamp);

  fs.writeFileSync(outputFile, JSON.stringify(videoData, null, 2), 'utf-8');
  console.log(`Berhasil menghasilkan metadata untuk ${videoData.length} video di ${outputFile}`);
}

if (require.main === module) {
  scanVideos();
}

module.exports = { scanVideos };

