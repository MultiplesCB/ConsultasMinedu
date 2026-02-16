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

  
  // Initialize components
  initSupabase(); // Initialize Supabase Client first
  initSearch();
  initAdmin();
  initPDFUpload();

  
  // Set initial view
  updateView();
  

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
 * Update view based on current state
 */
/**
 * Update view based on current state
 * Initially sets to User view. Admin view is handled asynchronously by admin.js
 */
function updateView() {
    // Default to User View
    const userView = document.getElementById('user-view');
    const adminView = document.getElementById('admin-view');
    const headerModeText = document.getElementById('header-mode-text');

    if (userView) userView.style.display = 'block';
    if (adminView) adminView.style.display = 'none';
    if (headerModeText) headerModeText.textContent = 'Portal de Consultas';
}

/**
 * Check configuration on load
 */
function checkConfiguration() {
  if (!isSupabaseConfigured()) {
    console.warn('[WARN] Supabase is not configured. Please update config.js with your credentials.');
    console.warn('The application will work in offline mode with limited functionality.');
  } else {

  }
  
  if (!window.XLSX) {
    console.warn('[WARN] SheetJS library not loaded. Excel export will not be available.');
  } else {

  }
  
  if (!window.supabase) {
    console.warn('[WARN] Supabase client library not loaded. Database features will not be available.');
  } else {

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
