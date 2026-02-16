/**
 * Admin Component - Admin Panel Logic
 */

let uploadedData = null;

/**
 * Initialize admin panel functionality
 */
function initAdmin() {
  const lockBtn = document.getElementById('admin-lock-btn');
  const modal = document.getElementById('login-modal');
  const closeModalBtn = document.querySelector('.close-modal');
  const loginForm = document.getElementById('admin-login-form');

  // Initial UI Check


  // File upload button
  const fileUploadBtn = document.getElementById('file-upload-btn');
  const fileInput = document.getElementById('file-input');
  
  if (fileUploadBtn && fileInput) {
    fileUploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
  }
  
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });



  // Modal Close Logic
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  // Logout Modal Logic
  const logoutModal = document.getElementById('logout-modal');
  const confirmLogoutBtn = document.getElementById('confirm-logout-btn');
  const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
  
  // Close logout modal when clicking X or Cancel
  const closeLogout = () => logoutModal.classList.remove('active');
  
  if (logoutModal) {
    const closeBtns = logoutModal.querySelectorAll('.close-modal');
    closeBtns.forEach(btn => btn.addEventListener('click', closeLogout));
    if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', closeLogout);
  }

  // Handle Logout Confirmation
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', () => {
      handleLogout();
      document.getElementById('logout-modal').classList.remove('active');
    });
  }

  // Click outside modal
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
    if (e.target === logoutModal) {
      logoutModal.classList.remove('active');
    }
  });

  // Check current session
  supabase.auth.getSession().then(({ data: { session } }) => {
    updateAuthUI(session);
    updateAppView(!!session);
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session);
    updateAppView(!!session);
    
    if (!session) {
      if (document.getElementById('admin-view').style.display === 'block') {
         showToast('Sesión expirada', 'info');
      }
    }
  });

  // Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById('admin-email');
      const passwordInput = document.getElementById('admin-password');
      const loginBtnText = document.getElementById('login-btn-text');
      const loginSpinner = document.getElementById('login-spinner');
      
      const email = emailInput.value;
      const password = passwordInput.value;

      // UI Loading
      if(loginBtnText) loginBtnText.style.display = 'none';
      if(loginSpinner) loginSpinner.style.display = 'inline-block';

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw error;

        modal.classList.remove('active');
        showToast('Bienvenido, Administrador', 'success');
        
        emailInput.value = '';
        passwordInput.value = '';
        
        // Switch view handled by onAuthStateChange

      } catch (error) {
        showToast('Error de credenciales: ' + error.message, 'error');
        passwordInput.value = '';
        passwordInput.focus();
        passwordInput.classList.add('error-shake');
        setTimeout(() => passwordInput.classList.remove('error-shake'), 500);
      } finally {
        if(loginBtnText) loginBtnText.style.display = 'inline';
        if(loginSpinner) loginSpinner.style.display = 'none';
      }
    });
  }
}

/**
 * Update UI based on authentication state
 */
/**
 * Update UI based on authentication state
 * @param {Object} session - Supabase session object
 */
function updateAuthUI(session) {
  const isAdmin = !!session;
  const lockBtn = document.getElementById('admin-lock-btn');
  
  if (lockBtn) {
    lockBtn.innerHTML = isAdmin ? '<i class="fa-solid fa-lock-open" style="font-size: 1.2rem"></i>' : '<i class="fa-solid fa-lock" style="font-size: 1.2rem"></i>';
    lockBtn.title = isAdmin ? 'Cerrar Sesión Admin' : 'Acceso Administrativo';
    lockBtn.style.color = isAdmin ? 'var(--success)' : 'var(--text-secondary)';
    
    // Update click handler to use latest session state
    lockBtn.onclick = () => {
      if (isAdmin) {
        // Logout logic
        const logoutModal = document.getElementById('logout-modal');
        if (logoutModal) {
          logoutModal.classList.add('active');
        } else if (confirm('¿Desea cerrar la sesión de administrador?')) {
           handleLogout();
        }
      } else {
        // Open Login Modal
        document.getElementById('login-modal').classList.add('active');
        document.getElementById('admin-email').focus();
      }
    };
  }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showToast('Error al cerrar sesión', 'error');
    } else {
        showToast('Sesión cerrada correctamente', 'info');
    }
}

/**
 * Switch between tabs
 * @param {string} tabName - Tab name to switch to
 */
function switchTab(tabName) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

/**
 * Update Application View state
 * @param {boolean} isAdmin - Is admin logged in
 */
function updateAppView(isAdmin) {
  const userView = document.getElementById('user-view');
  const adminView = document.getElementById('admin-view');
  const loginForm = document.getElementById('login-form'); // Note: login-form ID might not exist in index.html, checking
  const headerModeText = document.getElementById('header-mode-text');
  
  if (isAdmin) {
    if (userView) userView.style.display = 'none';
    if (adminView) adminView.style.display = 'block';
    if (headerModeText) headerModeText.textContent = 'Panel Administrador';
  } else {
    if (userView) userView.style.display = 'block';
    if (adminView) adminView.style.display = 'none';
    if (headerModeText) headerModeText.textContent = 'Portal de Consultas';
  }
}

/**
 * Handle file upload
 * @param {Event} e - Change event
 */
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const resultsContainer = document.getElementById('processing-results');
  resultsContainer.innerHTML = '';
  
  showLoading('Analizando archivo...');
  
  try {
    // Read file as Latin-1
    const content = await readFileAsLatin1(file);
    
    // Parse content
    const data = parseLISContent(content);
    
    hideLoading();
    
    if (data.length === 0) {
      showToast('No se encontraron registros válidos en el archivo', 'warning');
      return;
    }
    
    // Store data
    uploadedData = data;
    
    // Show success message
    const successMsg = createElement('div', { className: 'success-message' }, [
      createElement('p', {}, [
        createElement('i', { className: 'fa-solid fa-circle-check', style: 'margin-right: 0.5rem;' }),
        `Archivo procesado: ${data.length} registros válidos`
      ]),
      createElement('p', {}, [
        createElement('i', { className: 'fa-regular fa-lightbulb', style: 'color: var(--warning); margin-right: 0.5rem;' }),
        'Los datos están disponibles para exportar y sincronizar'
      ])
    ]);
    
    resultsContainer.appendChild(successMsg);
    
    // Show preview
    const previewContainer = createElement('div', { className: 'data-preview' });
    renderDataTable(data, previewContainer, 10);
    resultsContainer.appendChild(previewContainer);
    
    // Show action buttons
    const actionsContainer = createElement('div', { className: 'action-buttons' });
    
    // Excel download button
    if (CONFIG.ENABLE_EXCEL_EXPORT) {
      const excelBtn = createElement('button', {
        className: 'btn btn-primary',
        onclick: handleExcelDownload
      }, [
        createElement('i', { className: 'fa-solid fa-file-excel', style: 'margin-right: 0.5rem;' }),
        'Descargar Excel'
      ]);
      actionsContainer.appendChild(excelBtn);
    }
    
    // Supabase sync button
    if (CONFIG.ENABLE_SUPABASE_SYNC) {
      const syncBtn = createElement('button', {
        className: 'btn btn-primary',
        onclick: handleSupabaseSync
      }, [
        createElement('i', { className: 'fa-solid fa-cloud-arrow-up', style: 'margin-right: 0.5rem;' }),
        'Sincronizar a Supabase'
      ]);
      actionsContainer.appendChild(syncBtn);
    }
    
    resultsContainer.appendChild(actionsContainer);
    
    showToast(`Archivo procesado: ${data.length} registros`, 'success');
    
  } catch (error) {
    hideLoading();
    console.error('File processing error:', error);
    showToast(`Error al procesar archivo: ${error.message}`, 'error');
    
    resultsContainer.innerHTML = `
      <div class="result-card error">
        <h4 style="margin: 0 0 0.5rem 0; color: var(--error-dark);">Error al procesar archivo</h4>
        <p style="margin: 0; color: var(--text-secondary);">${error.message}</p>
      </div>
    `;
  }
  
  // Reset file input
  e.target.value = '';
}

/**
 * Handle Excel download
 */
function handleExcelDownload() {
  if (!uploadedData || uploadedData.length === 0) {
    showToast('No hay datos para exportar', 'warning');
    return;
  }
  
  try {
    showLoading('<i class="fa-solid fa-file-excel"></i> Generando archivo Excel...');
    
    const excelBlob = convertToExcel(uploadedData);
    const url = URL.createObjectURL(excelBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boletas_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    hideLoading();
    showToast('Excel descargado exitosamente', 'success');
    
  } catch (error) {
    hideLoading();
    console.error('Excel export error:', error);
    showToast(`Error al exportar Excel: ${error.message}`, 'error');
  }
}

/**
 * Handle Supabase synchronization
 */
async function handleSupabaseSync() {
  if (!uploadedData || uploadedData.length === 0) {
    showToast('No hay datos para sincronizar', 'warning');
    return;
  }
  
  if (!isSupabaseConfigured()) {
    showToast('Supabase no está configurado. Actualice config.js con sus credenciales', 'error', 5000);
    return;
  }
  
  const resultsContainer = document.getElementById('processing-results');
  
  // Create progress bar
  const progressContainer = createElement('div', { 
    style: 'margin-top: var(--spacing-lg);'
  }, [
    createElement('p', { 
      style: 'margin-bottom: var(--spacing-sm); font-weight: 600; color: var(--text-primary);'
    }, ['Sincronizando con Supabase...']),
    createElement('div', { className: 'progress-bar' }, [
      createElement('div', { 
        className: 'progress-fill',
        id: 'sync-progress',
        style: 'width: 0%;'
      })
    ]),
    createElement('p', { 
      id: 'sync-status',
      style: 'margin-top: var(--spacing-sm); font-size: 0.875rem; color: var(--text-secondary);'
    }, ['0 de ' + uploadedData.length + ' registros'])
  ]);
  
  resultsContainer.appendChild(progressContainer);
  
  try {
    const count = await syncDataToSupabase(uploadedData, (current, total) => {
      const percentage = Math.round((current / total) * 100);
      const progressFill = document.getElementById('sync-progress');
      const statusText = document.getElementById('sync-status');
      
      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
      }
      
      if (statusText) {
        statusText.textContent = `${current} de ${total} registros (${percentage}%)`;
      }
    });
    
    if (count > 0) {
      showToast(`${count} registros sincronizados exitosamente`, 'success', 5000);
      
      // Update status
      const statusText = document.getElementById('sync-status');
      if (statusText) {
        statusText.innerHTML = `<i class="fa-solid fa-circle-check"></i> Sincronización completada: ${count} registros`;
        statusText.style.color = 'var(--success)';
        statusText.style.fontWeight = '600';
      }
    } else {
      showToast('Error en la sincronización', 'error');
    }
    
  } catch (error) {
    console.error('Sync error:', error);
    showToast(`Error en la sincronización: ${error.message}`, 'error');
  }
}
