/**
 * Search Component - Search Interface Logic
 */

/**
 * Initialize search functionality
 */
function initSearch() {
  // User search form
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleUserSearch);
  }
  
  // Admin search form
  const adminSearchForm = document.getElementById('admin-search-form');
  if (adminSearchForm) {
    adminSearchForm.addEventListener('submit', handleAdminSearch);
  }
}

/**
 * Handle user search submission
 * @param {Event} e - Submit event
 */
async function handleUserSearch(e) {
  e.preventDefault();
  
  const dniInput = document.getElementById('search-dni');
  const dni = dniInput.value.trim();
  
  if (!validateDNI(dni)) {
    showToast('Por favor ingrese un DNI válido (8 dígitos)', 'error');
    return;
  }
  
  await performSearch(dni, 'search-results');
}

/**
 * Handle admin search submission
 * @param {Event} e - Submit event
 */
async function handleAdminSearch(e) {
  e.preventDefault();
  
  const dniInput = document.getElementById('admin-search-dni');
  const dni = dniInput.value.trim();
  
  if (!validateDNI(dni)) {
    showToast('Por favor ingrese un DNI válido (8 dígitos)', 'error');
    return;
  }
  
  await performSearch(dni, 'admin-search-results');
}

/**
 * Perform search and display results
 * @param {string} dni - DNI to search
 * @param {string} resultsContainerId - ID of results container
 */
async function performSearch(dni, resultsContainerId) {
  const resultsContainer = document.getElementById(resultsContainerId);
  if (!resultsContainer) return;
  
  // Clear previous results
  resultsContainer.innerHTML = '';
  
  showLoading('Buscando información...');
  
  try {
    const records = await searchRecordByDNI(dni);
    
    hideLoading();
    
    if (records && records.length > 0) {
      // 1. Identify valid records (latest period)
      // Since records are ordered by period desc, the first one has the latest period
      const latestPeriod = records[0].Periodo;
      const currentRecords = records.filter(r => r.Periodo === latestPeriod);
      
      // Show success message
      const successCard = createElement('div', { className: 'result-card success' }, [
        createElement('div', { 
          style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 0;'
        }, [
          createElement('span', { className: 'status-badge success' }, [
              createElement('i', { className: 'fa-solid fa-circle-check', style: 'margin-right: 0.5rem;' }),
              `${currentRecords.length} Boleta(s) Encontrada(s)`
          ]),
          createElement('div', { style: 'text-align: right;' }, [
            createElement('span', { 
              style: 'color: var(--text-primary); font-weight: 600; font-size: 1.1rem; display: block;'
            }, [currentRecords[0].Nombres || 'Sin nombre']),
            createElement('span', { 
              style: 'color: var(--text-secondary); font-size: 0.9rem;'
            }, [`Periodo: ${latestPeriod}`])
          ])
        ])
      ]);
      
      resultsContainer.appendChild(successCard);
      
      // Render each boleta
      currentRecords.forEach((record, index) => {
        // Add separator if it's not the first one
        if (index > 0) {
          const separator = createElement('div', { 
            style: 'border-top: 2px dashed var(--border-color); margin: 2rem 0; position: relative;' 
          }, [
            createElement('span', { 
              style: 'position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #f3f4f6; padding: 0 1rem; color: var(--text-secondary); font-size: 0.875rem;'
            }, [`Boleta Adicional #${index + 1}`])
          ]);
          resultsContainer.appendChild(separator);
        }
        renderBoleta(record, resultsContainer);
      });
      
      showToast(`Se encontraron ${currentRecords.length} boleta(s)`, 'success');
    } else {
      // Show not found message
      resultsContainer.innerHTML = `
        <div class="result-card warning">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="background: #fef3c7; padding: 10px; border-radius: 50%; color: #b45309;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem;"></i></div>
            <div>
              <h4 style="margin: 0; color: #92400e;">No se encontró información</h4>
              <p style="margin: 5px 0 0 0; color: #b45309; font-size: 0.9rem;">
                El DNI ingresado no tiene registros disponibles.
              </p>
            </div>
          </div>
        </div>
      `;
      
      showToast('No se encontraron resultados', 'warning');
    }
  } catch (error) {
    hideLoading();
    console.error('Search error:', error);
    
    resultsContainer.innerHTML = `
      <div class="result-card error">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="background: #fee2e2; padding: 10px; border-radius: 50%; color: #dc2626;"><i class="fa-solid fa-circle-xmark" style="font-size: 1.5rem;"></i></div>
          <div>
            <h4 style="margin: 0; color: #991b1b;">Error en la búsqueda</h4>
            <p style="margin: 5px 0 0 0; color: #dc2626; font-size: 0.9rem;">
              ${error.message || 'Ocurrió un error inesperado'}
            </p>
          </div>
        </div>
      </div>
    `;
    
    showToast('Error al realizar la búsqueda', 'error');
  }
}
