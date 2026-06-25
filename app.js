document.addEventListener('DOMContentLoaded', () => {
  // --- State Variables ---
  let videos = [];
  let filteredVideos = [];
  let currentPage = 1;
  const itemsPerPage = 9;
  let autoOpenTimeout = null;

  // --- DOM Elements ---
  const overlay = document.getElementById('album-overlay');
  const book = document.getElementById('album-book');
  const btnOpenAlbum = document.getElementById('btn-open-album');
  const coverLoader = document.getElementById('cover-loader');
  const appContent = document.getElementById('app-content');
  
  const videoGrid = document.getElementById('video-grid');
  const paginationContainer = document.getElementById('pagination-container');
  const paginationSection = document.getElementById('pagination-section');
  const emptyState = document.getElementById('empty-state');
  
  const statsTotal = document.getElementById('stats-total');
  const statsShowing = document.getElementById('stats-showing');
  const statsFiltered = document.getElementById('stats-filtered');
  
  const startDateInput = document.getElementById('filter-start-date');
  const endDateInput = document.getElementById('filter-end-date');
  const sortSelect = document.getElementById('filter-sort');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const searchInput = document.getElementById('filter-search');
  
  // Modal Elements
  const videoModal = document.getElementById('video-modal');
  const modalVideoPlayer = document.getElementById('modal-video-player');
  const modalVideoTitle = document.getElementById('modal-video-title');
  const modalVideoDate = document.getElementById('modal-video-date');
  const modalVideoSize = document.getElementById('modal-video-size');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const fpsSelector = document.getElementById('fps-selector');
  const modalVideoCanvas = document.getElementById('modal-video-canvas');
  
  // Canvas FPS Render Loop State
  let canvasContext = modalVideoCanvas.getContext('2d');
  let animationFrameId = null;
  let lastFrameTime = 0;

  // --- 1. Load Data ---
  fetch('videos.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load video metadata');
      }
      return response.json();
    })
    .then(data => {
      videos = data;
      filteredVideos = [...videos];
      statsTotal.textContent = videos.length;
      
      // Data berhasil dimuat, sembunyikan spinner & tampilkan tombol Buka
      coverLoader.classList.add('hide');
      btnOpenAlbum.classList.remove('hide');
      
      // Auto open setelah 2 detik jika user tidak mengklik
      autoOpenTimeout = setTimeout(() => {
        openAlbum();
      }, 2200);
    })
    .catch(error => {
      console.error('Error fetching videos.json:', error);
      // Tampilkan error di cover
      coverLoader.classList.add('hide');
      const subtitle = document.querySelector('.cover-subtitle');
      subtitle.innerHTML = `<span style="color: #ff3838">Error: ${error.message}</span><br>Pastikan Anda sudah menjalankan <code>node generate-metadata.js</code>.`;
    });

  // --- 2. Album Opening Logic ---
  btnOpenAlbum.addEventListener('click', () => {
    if (autoOpenTimeout) clearTimeout(autoOpenTimeout);
    openAlbum();
  });

  function openAlbum() {
    if (overlay.classList.contains('opened')) return;
    
    // Trigger CSS 3D rotation
    overlay.classList.add('opened');
    
    // Tampilkan konten utama sedikit sebelum overlay selesai memudar
    setTimeout(() => {
      appContent.className = 'app-content-visible';
    }, 1100);

    // Memudarkan overlay dan hapus dari display
    setTimeout(() => {
      overlay.classList.add('fade-out');
    }, 1500);

    setTimeout(() => {
      overlay.style.display = 'none';
      // Inisialisasi tampilan data
      applyFilters();
    }, 2500);
  }

  // --- 3. Format Helpers ---
  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatIndoDate(dateStr) {
    if (!dateStr) return 'Unknown date';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const day = parseInt(parts[2], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    
    return `${day} ${months[monthIndex]} ${year}`;
  }

  // --- 4. Filtering & Sorting Logic ---
  function applyFilters() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const sortVal = sortSelect.value;
    const searchTerm = searchInput.value.toLowerCase().trim();

    filteredVideos = videos.filter(video => {
      // Filter Search
      if (searchTerm) {
        const cleanTitle = video.displayName.replace(/_/g, ' ').toLowerCase();
        const cleanName = video.name.toLowerCase();
        if (!cleanTitle.includes(searchTerm) && !cleanName.includes(searchTerm)) {
          return false;
        }
      }
      // Filter Tanggal Mulai
      if (startDate && video.date < startDate) {
        return false;
      }
      // Filter Tanggal Selesai
      if (endDate && video.date > endDate) {
        return false;
      }
      return true;
    });

    // Sorting
    if (sortVal === 'newest') {
      filteredVideos.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortVal === 'oldest') {
      filteredVideos.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortVal === 'name-asc') {
      filteredVideos.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    currentPage = 1;
    render();
  }

  function resetFilters() {
    startDateInput.value = '';
    endDateInput.value = '';
    sortSelect.value = 'newest';
    searchInput.value = '';
    applyFilters();
  }

  // Event Listeners for Filters
  searchInput.addEventListener('input', applyFilters);
  startDateInput.addEventListener('change', applyFilters);
  endDateInput.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', applyFilters);
  btnResetFilters.addEventListener('click', resetFilters);

  // --- 5. Render Video & Pagination ---
  function render() {
    // Kosongkan grid kontainer
    videoGrid.innerHTML = '';

    // Handle Empty State
    if (filteredVideos.length === 0) {
      emptyState.classList.remove('hide');
      paginationSection.classList.add('hide');
      statsShowing.textContent = '0';
      statsFiltered.textContent = '0';
      return;
    }

    emptyState.classList.add('hide');
    paginationSection.classList.remove('hide');

    // Hitung Slicing Pagination
    const totalItems = filteredVideos.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Boundary check
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pageItems = filteredVideos.slice(startIndex, endIndex);

    // Update Stats Text
    statsShowing.textContent = `${startIndex + 1}-${endIndex}`;
    statsFiltered.textContent = totalItems;

    // Render Cards
    pageItems.forEach(video => {
      const card = document.createElement('div');
      card.className = 'video-card';
      
      const readableDate = formatIndoDate(video.date);
      const readableSize = formatBytes(video.size);

      // Gunakan URL decoded name untuk judul agar kelihatan rapi
      const title = video.displayName.replace(/_/g, ' ');

      card.innerHTML = `
        <div class="video-wrapper">
          <video src="${video.path}" preload="metadata" playsinline muted></video>
          <div class="video-overlay-play">
            <div class="play-icon-btn">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="video-info">
          <h4 class="video-title" title="${title}">${title}</h4>
          <div class="video-meta-row">
            <span class="video-date">📅 ${readableDate}</span>
            <span class="video-size">💾 ${readableSize}</span>
          </div>
        </div>
      `;

      // Event click untuk membuka modal player
      const videoIndex = startIndex + pageItems.indexOf(video);
      card.addEventListener('click', () => {
        openVideoModal(video, videoIndex);
      });

      // Hover preview: silently play the video card thumbnail on hover
      const videoEl = card.querySelector('video');
      let playPromise = null;

      card.addEventListener('mouseenter', () => {
        if (videoEl) {
          playPromise = videoEl.play();
          playPromise.catch(err => {
            // Muted autoplay block check
          });
        }
      });

      card.addEventListener('mouseleave', () => {
        if (videoEl) {
          if (playPromise !== null) {
            playPromise.then(() => {
              videoEl.pause();
              videoEl.currentTime = 0;
            }).catch(() => {
              videoEl.pause();
              videoEl.currentTime = 0;
            });
          } else {
            videoEl.pause();
            videoEl.currentTime = 0;
          }
        }
      });

      videoGrid.appendChild(card);
    });

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) {
      paginationSection.classList.add('hide');
      return;
    }
    paginationSection.classList.remove('hide');

    // Tombol Prev
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-page btn-page-text';
    prevBtn.textContent = 'Sebelumnya';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      currentPage--;
      render();
      scrollToContent();
    });
    paginationContainer.appendChild(prevBtn);

    // Angka Halaman
    for (let i = 1; i <= totalPages; i++) {
      // Tampilkan semua angka halaman jika sedikit, jika banyak bisa di-truncate (tapi untuk video personal biasanya cukup dirender semua)
      const pageBtn = document.createElement('button');
      pageBtn.className = `btn-page ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        render();
        scrollToContent();
      });
      paginationContainer.appendChild(pageBtn);
    }

    // Tombol Next
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-page btn-page-text';
    nextBtn.textContent = 'Berikutnya';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      currentPage++;
      render();
      scrollToContent();
    });
    paginationContainer.appendChild(nextBtn);
  }

  function scrollToContent() {
    // Scroll mulus kembali ke filter section agar user tidak bingung setelah ganti page
    appContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- 6. Modal Video Player ---
  let rVFCId = null;
  let currentVideoIndex = -1;

  // Nav button refs
  const btnModalPrev = document.getElementById('btn-modal-prev');
  const btnModalNext = document.getElementById('btn-modal-next');
  const modalNavInfo = document.getElementById('modal-nav-info');
  const resSelector  = document.getElementById('res-selector');

  // Custom Controls refs
  const customControls  = document.getElementById('custom-controls');
  const ccPlayBtn       = document.getElementById('cc-play-btn');
  const ccPlayIcon      = document.getElementById('cc-play-icon');
  const ccPauseIcon     = document.getElementById('cc-pause-icon');
  const ccScrubber      = document.getElementById('cc-scrubber');
  const ccPlayed        = document.getElementById('cc-played');
  const ccBuffered      = document.getElementById('cc-buffered');
  const ccTime          = document.getElementById('cc-time');
  const ccVolBtn        = document.getElementById('cc-vol-btn');
  const ccVolOn         = document.getElementById('cc-vol-on');
  const ccVolOff        = document.getElementById('cc-vol-off');
  const ccVolumeSlider  = document.getElementById('cc-volume-slider');
  const ccFsBtn         = document.getElementById('cc-fs-btn');

  // --- Format time helper ---
  function formatTime(secs) {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // --- Custom controls toggle ---
  function isNativeMode() {
    return fpsSelector.value === 'native' && resSelector.value === 'original';
  }

  function showNativeControls() {
    modalVideoPlayer.setAttribute('controls', '');
    customControls.classList.add('hide');
  }

  function showCustomControls() {
    modalVideoPlayer.removeAttribute('controls');
    customControls.classList.remove('hide');
  }

  // --- Custom Controls Logic ---
  function updateCCProgress() {
    if (!modalVideoPlayer.duration) return;
    const pct = (modalVideoPlayer.currentTime / modalVideoPlayer.duration) * 100;
    ccScrubber.value = pct;
    ccPlayed.style.width = pct + '%';
    ccTime.textContent = `${formatTime(modalVideoPlayer.currentTime)} / ${formatTime(modalVideoPlayer.duration)}`;
  }

  function updateCCBuffered() {
    if (modalVideoPlayer.buffered.length > 0 && modalVideoPlayer.duration) {
      const end = modalVideoPlayer.buffered.end(modalVideoPlayer.buffered.length - 1);
      ccBuffered.style.width = (end / modalVideoPlayer.duration * 100) + '%';
    }
  }

  function updateCCVolIcon() {
    if (modalVideoPlayer.muted || modalVideoPlayer.volume === 0) {
      ccVolOn.classList.add('hide');
      ccVolOff.classList.remove('hide');
    } else {
      ccVolOn.classList.remove('hide');
      ccVolOff.classList.add('hide');
    }
  }

  // Bind custom controls events once
  modalVideoPlayer.addEventListener('timeupdate',  updateCCProgress);
  modalVideoPlayer.addEventListener('progress',    updateCCBuffered);
  modalVideoPlayer.addEventListener('loadedmetadata', () => {
    updateCCProgress();
    if (!isNativeMode()) {
      const res = getTargetResolution();
      modalVideoCanvas.width  = res.width;
      modalVideoCanvas.height = res.height;
    }
  });
  modalVideoPlayer.addEventListener('play', () => {
    ccPlayIcon.classList.add('hide');
    ccPauseIcon.classList.remove('hide');
    startCanvasRenderLoop();
  });
  modalVideoPlayer.addEventListener('pause', () => {
    ccPlayIcon.classList.remove('hide');
    ccPauseIcon.classList.add('hide');
  });
  modalVideoPlayer.addEventListener('ended', () => {
    ccPlayIcon.classList.remove('hide');
    ccPauseIcon.classList.add('hide');
  });
  modalVideoPlayer.addEventListener('volumechange', () => {
    updateCCVolIcon();
    ccVolumeSlider.value = modalVideoPlayer.muted ? 0 : modalVideoPlayer.volume;
  });

  ccPlayBtn.addEventListener('click', () => {
    modalVideoPlayer.paused ? modalVideoPlayer.play() : modalVideoPlayer.pause();
  });

  ccScrubber.addEventListener('input', () => {
    if (modalVideoPlayer.duration) {
      modalVideoPlayer.currentTime = (ccScrubber.value / 100) * modalVideoPlayer.duration;
    }
  });

  ccVolBtn.addEventListener('click', () => {
    modalVideoPlayer.muted = !modalVideoPlayer.muted;
  });

  ccVolumeSlider.addEventListener('input', () => {
    modalVideoPlayer.volume = parseFloat(ccVolumeSlider.value);
    modalVideoPlayer.muted  = parseFloat(ccVolumeSlider.value) === 0;
  });

  ccFsBtn.addEventListener('click', () => {
    // Fullscreen the video container only, so only video fills the screen
    const target = document.querySelector('.modal-video-container');
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      target.requestFullscreen && target.requestFullscreen();
    }
  });

  // --- Resolution helper ---
  function getTargetResolution() {
    const resMode = resSelector.value;
    if (resMode === 'original') {
      return {
        width:  modalVideoPlayer.videoWidth  || 1920,
        height: modalVideoPlayer.videoHeight || 1080
      };
    }
    const targetH  = parseInt(resMode, 10);
    const aspect   = (modalVideoPlayer.videoWidth || 16) / (modalVideoPlayer.videoHeight || 9);
    const targetW  = Math.round(targetH * aspect);
    return { width: targetW, height: targetH };
  }

  // --- Canvas FPS Render Loop ---
  function stopCanvasRenderLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (rVFCId && modalVideoPlayer.cancelVideoFrameCallback) {
      modalVideoPlayer.cancelVideoFrameCallback(rVFCId);
      rVFCId = null;
    }
  }

  function startCanvasRenderLoop() {
    stopCanvasRenderLoop();

    // Determine if we need canvas at all
    if (isNativeMode()) {
      modalVideoCanvas.classList.add('hide');
      showNativeControls();
      return;
    }

    // Canvas mode: show canvas, use custom controls
    showCustomControls();
    modalVideoCanvas.classList.remove('hide');

    // Set canvas resolution (downscale = lower quality like 480p)
    const res = getTargetResolution();
    if (modalVideoCanvas.width !== res.width || modalVideoCanvas.height !== res.height) {
      modalVideoCanvas.width  = res.width;
      modalVideoCanvas.height = res.height;
    }

    const fpsMode = fpsSelector.value;
    let throttle  = true;
    let targetFps = 60;

    if (fpsMode === 'native') {
      // Resolution-only mode: just use device refresh rate
      throttle = false;
    } else if (fpsMode === 'canvas-hz') {
      throttle = false;
    } else {
      targetFps = parseInt(fpsMode.replace('canvas-', ''), 10);
    }

    const fpsInterval = 1000 / targetFps;
    let lastDrawTime  = performance.now();

    function drawFrame(timestamp) {
      if (!modalVideoPlayer.paused && !modalVideoPlayer.ended) {
        let shouldDraw = true;
        if (throttle) {
          const elapsed = timestamp - lastDrawTime;
          if (elapsed < fpsInterval - 1.5) {
            shouldDraw = false;
          } else {
            lastDrawTime = timestamp - (elapsed % fpsInterval);
          }
        }
        if (shouldDraw) {
          try {
            canvasContext.drawImage(
              modalVideoPlayer, 0, 0,
              modalVideoCanvas.width, modalVideoCanvas.height
            );
          } catch (e) {}
        }
      }
      scheduleNextFrame();
    }

    function scheduleNextFrame() {
      if (modalVideoPlayer.requestVideoFrameCallback) {
        rVFCId = modalVideoPlayer.requestVideoFrameCallback((now) => drawFrame(now));
      } else {
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    }

    scheduleNextFrame();
  }

  fpsSelector.addEventListener('change', startCanvasRenderLoop);
  resSelector.addEventListener('change', startCanvasRenderLoop);

  // --- Navigation ---
  function updateNavButtons() {
    btnModalPrev.disabled = currentVideoIndex <= 0;
    btnModalNext.disabled = currentVideoIndex >= filteredVideos.length - 1;
    modalNavInfo.textContent = `${currentVideoIndex + 1} / ${filteredVideos.length}`;
  }

  function openVideoModal(video, index) {
    currentVideoIndex = (index !== undefined) ? index : filteredVideos.indexOf(video);

    stopCanvasRenderLoop();
    modalVideoCanvas.classList.add('hide');
    showNativeControls();

    modalVideoPlayer.src = video.path;
    modalVideoTitle.textContent = video.displayName.replace(/_/g, ' ');
    modalVideoDate.textContent  = `📅 ${formatIndoDate(video.date)}`;
    modalVideoSize.textContent  = `💾 ${formatBytes(video.size)}`;
    fpsSelector.value = 'native';
    resSelector.value = 'original';

    // Reset custom controls state
    ccScrubber.value  = 0;
    ccPlayed.style.width   = '0%';
    ccBuffered.style.width = '0%';
    ccTime.textContent = '0:00 / 0:00';
    ccPlayIcon.classList.remove('hide');
    ccPauseIcon.classList.add('hide');

    updateNavButtons();
    videoModal.classList.remove('hide');
    document.body.style.overflow = 'hidden';
  }

  function navigateModal(direction) {
    const newIndex = currentVideoIndex + direction;
    if (newIndex < 0 || newIndex >= filteredVideos.length) return;
    openVideoModal(filteredVideos[newIndex], newIndex);
  }

  function closeVideoModal() {
    modalVideoPlayer.pause();
    modalVideoPlayer.src = '';
    stopCanvasRenderLoop();
    modalVideoCanvas.classList.add('hide');
    showNativeControls();
    videoModal.classList.add('hide');
    document.body.style.overflow = '';
    currentVideoIndex = -1;
  }

  btnModalPrev.addEventListener('click', () => navigateModal(-1));
  btnModalNext.addEventListener('click', () => navigateModal(+1));
  btnCloseModal.addEventListener('click', closeVideoModal);
  modalOverlay.addEventListener('click', closeVideoModal);

  document.addEventListener('keydown', (e) => {
    if (videoModal.classList.contains('hide')) return;
    if (e.key === 'Escape')     closeVideoModal();
    if (e.key === 'ArrowLeft')  navigateModal(-1);
    if (e.key === 'ArrowRight') navigateModal(+1);
    if (e.key === ' ') {
      e.preventDefault();
      modalVideoPlayer.paused ? modalVideoPlayer.play() : modalVideoPlayer.pause();
    }
  });
});
