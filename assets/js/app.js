/**
 * Main Application - Entry Point
 */

// Application State
const AppState = {
  isAdmin: false,
  currentView: 'user'
};

/**
 * Initialize application
 */
function initApp() {
  console.log('Initializing ConsultasMinedu Application...');
  
  // Initialize components
  // initAuth(); // Removed: Handled by admin.js
  initSearch();
  initAdmin();
  initPDFUpload();
  initCamera();
  
  // Set initial view
  updateView();
  
  console.log('Application initialized successfully');
}

/**
 * Initialize PDF Upload Functionality
 */
function initPDFUpload() {
  const customBtn = document.getElementById('pdf-upload-btn');
  const realInput = document.getElementById('pdf-upload-input');
  
  if (customBtn && realInput) {
    customBtn.addEventListener('click', () => realInput.click());
    
    realInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const resultsContainer = document.getElementById('search-results');
      resultsContainer.innerHTML = '';
      
      // Validate File Type
      if (file.type === 'application/pdf') {
         // PDF Flow
         showLoading('Analizando Documento PDF...');
         try {
            const record = await processBoletaPDF(file);
            handleProcessingSuccess(file, record, resultsContainer);
         } catch(error) {
            handleProcessingError(error);
         }
      } else if (file.type.startsWith('image/')) {
         // Image Flow (OCR)
         showLoading('Escanear Imagen (OCR)...');
         try {
            // Check if Tesseract is loaded
            if (typeof Tesseract === 'undefined') {
                throw new Error('La librería de escaneo (OCR) no está cargada. Recargue la página.');
            }
            const record = await processBoletaImage(file);
            handleProcessingSuccess(file, record, resultsContainer);
         } catch(error) {
            handleProcessingError(error);
         }
      } else {
        showToast('Formato no soportado. Use PDF o Imágenes (JPG, PNG).', 'error');
        return;
      }
      
      // Reset input
      realInput.value = '';
    });
  }
}

// Shared Handlers
function handleProcessingSuccess(file, record, container) {
  hideLoading();
  if (record) {
    const successCard = createElement('div', { className: 'result-card success' }, [
      createElement('div', { 
        style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;'
      }, [
        createElement('span', { className: 'status-badge success' }, [
            createElement('i', { className: 'fa-solid fa-circle-check', style: 'margin-right: 0.5rem;' }),
            'Documento Leído Exitosamente'
        ]),
        createElement('span', { 
          style: 'color: var(--text-primary); font-weight: 600; font-size: 1.1rem;'
        }, [record['Apellidos y Nombres'] || 'Docente'])
      ])
    ]);
    container.appendChild(successCard);
    renderSplitPdfView(file, record, container);
  } else {
      showToast('No se pudieron extraer datos del documento', 'warning');
  }
}

function handleProcessingError(error) {
  hideLoading();
  console.error('Processing Error:', error);
  showToast(`Error de lectura: ${error.message}`, 'error');
}

/**
 * Initialize Camera Functionality
 */
function initCamera() {
    const cameraBtn = document.getElementById('camera-btn');
    const modal = document.getElementById('camera-modal');
    const closeBtn = document.getElementById('close-camera-modal');
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    let stream = null;

    if (!cameraBtn || !modal) return;

    // Open Camera
    cameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Prefer back camera on mobile
            });
            video.srcObject = stream;
            modal.style.display = 'block';
        } catch (err) {
            console.error(err);
            showToast('No se pudo acceder a la cámara. Verifique los permisos.', 'error');
        }
    });

    // Close Camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        modal.style.display = 'none';
    };

    closeBtn.addEventListener('click', stopCamera);
    window.addEventListener('click', (e) => {
        if (e.target === modal) stopCamera();
    });

    // Capture
    captureBtn.addEventListener('click', () => {
        if (!stream) return;

        // Set dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to Blob/File
        canvas.toBlob(async (blob) => {
            stopCamera();
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            
            // Process
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = '';
            showLoading('Procesando Foto (OCR)...');
            
            try {
                if (typeof Tesseract === 'undefined') {
                    throw new Error('Librería OCR no cargada.');
                }
                const record = await processBoletaImage(file);
                handleProcessingSuccess(file, record, resultsContainer);
            } catch (error) {
                handleProcessingError(error);
            }
        }, 'image/jpeg', 0.95);
    });
}

/**
 * Update view based on current state
 */
function updateView() {
  const userView = document.getElementById('user-view');
  const adminView = document.getElementById('admin-view');
  const loginForm = document.getElementById('login-form');
  const adminStatus = document.getElementById('admin-status');
  const headerModeText = document.getElementById('header-mode-text');
  
  // Check localStorage for admin state since admin.js manages it there
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  // Sync AppState (though mostly unused now)
  AppState.isAdmin = isAdmin;

  if (AppState.isAdmin) {
    // Show admin view
    if (userView) userView.style.display = 'none';
    if (adminView) adminView.style.display = 'block';
    if (loginForm) loginForm.style.display = 'none';
    if (adminStatus) adminStatus.style.display = 'block';
    if (headerModeText) headerModeText.textContent = 'Panel Administrador';
  } else {
    // Show user view
    if (userView) userView.style.display = 'block';
    if (adminView) adminView.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (adminStatus) adminStatus.style.display = 'none';
    if (headerModeText) headerModeText.textContent = 'Portal de Consultas';
  }
}

/**
 * Check configuration on load
 */
function checkConfiguration() {
  if (!isSupabaseConfigured()) {
    console.warn('[WARN] Supabase is not configured. Please update config.js with your credentials.');
    console.warn('The application will work in offline mode with limited functionality.');
  } else {
    console.log('[INFO] Supabase is configured');
  }
  
  if (!window.XLSX) {
    console.warn('[WARN] SheetJS library not loaded. Excel export will not be available.');
  } else {
    console.log('[INFO] SheetJS library loaded');
  }
  
  if (!window.supabase) {
    console.warn('[WARN] Supabase client library not loaded. Database features will not be available.');
  } else {
    console.log('[INFO] Supabase client library loaded');
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkConfiguration();
    initApp();
  });
} else {
  checkConfiguration();
  initApp();
}
