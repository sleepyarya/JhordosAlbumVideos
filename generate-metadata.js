const fs = require('fs');
const path = require('path');

const videosDir = path.join(__dirname, 'videos');
const outputFile = path.join(__dirname, 'videos.json');

function scanVideos() {
  if (!fs.existsSync(videosDir)) {
    console.error("Folder 'videos' tidak ditemukan!");
    return;
  }

  // Load existing metadata to preserve dates for previously scanned videos
  const existingMap = {};
  if (fs.existsSync(outputFile)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      if (Array.isArray(existingData)) {
        existingData.forEach(item => {
          if (item.name) {
            existingMap[item.name] = {
              date: item.date,
              timestamp: item.timestamp
            };
          }
        });
      }
    } catch (e) {
      console.warn("Gagal membaca videos.json lama, metadata baru akan dibuat:", e.message);
    }
  }

  const files = fs.readdirSync(videosDir);
  const videoData = [];

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.mp4') {
      const filePath = path.join(videosDir, file);
      const stats = fs.statSync(filePath);
      
      let fileDate = '';
      let fileTimestamp = 0;

      // Jika file sudah pernah terdaftar, gunakan data lama agar tidak berubah
      if (existingMap[file]) {
        fileDate = existingMap[file].date;
        fileTimestamp = existingMap[file].timestamp;
      } else {
        // Deteksi apakah nama file diawali dengan tanggal YYYY-MM-DD
        const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          fileDate = dateMatch[1];
          fileTimestamp = new Date(fileDate).getTime();
        } else {
          // File baru yang diupload saat ini: gunakan tanggal sekarang
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          fileDate = `${year}-${month}-${day}`;
          fileTimestamp = now.getTime();
        }
      }

      // Nama bersih tanpa ekstensi untuk tampilan
      const displayName = path.basename(file, ext);

      videoData.push({
        name: file,
        displayName: displayName,
        path: `videos/${encodeURIComponent(file)}`, // Encode URL path characters properly
        size: stats.size,
        date: fileDate,
        timestamp: fileTimestamp
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


