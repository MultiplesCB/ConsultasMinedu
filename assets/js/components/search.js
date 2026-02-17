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
      // Group records by Periodo
      // records are already ordered descending by period from backend
      const recordsByPeriod = {};
      const periods = [];
      
      records.forEach(record => {
        const period = record.Periodo || 'Desconocido';
        if (!recordsByPeriod[period]) {
            recordsByPeriod[period] = [];
            periods.push(period); // Maintain order
        }
        recordsByPeriod[period].push(record);
      });

      let currentPeriod = periods[0];
      
      // Function to render results for a specific period
      const renderPeriodResults = (period) => {
          // Find or create container for boletas
          let boletaContainer = document.getElementById('boleta-list-container');
          if (!boletaContainer) {
              boletaContainer = createElement('div', { id: 'boleta-list-container' });
              resultsContainer.appendChild(boletaContainer);
          } else {
              boletaContainer.innerHTML = '';
          }
          
          const currentRecords = recordsByPeriod[period];
          
          // Render each boleta for the selected period
          currentRecords.forEach((record, index) => {
            if (index > 0) {
              const separator = createElement('div', { 
                style: 'border-top: 2px dashed var(--border-color); margin: 2rem 0; position: relative;' 
              }, [
                createElement('span', { 
                  style: 'position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #f3f4f6; padding: 0 1rem; color: var(--text-secondary); font-size: 0.875rem;'
                }, [`Boleta Adicional #${index + 1}`])
              ]);
              boletaContainer.appendChild(separator);
            }
            renderBoleta(record, boletaContainer);
          });
          
          // Scroll to top of results slightly if needed
          // resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      // Create Header/Selector Card
      const headerCard = createElement('div', { className: 'result-card success', style: 'margin-bottom: 1.5rem;' }, [
        createElement('div', { 
          style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;'
        }, [
          // Left: User Info
          createElement('div', { style: 'display: flex; align-items: center; gap: 1rem;' }, [
               createElement('div', { 
                   style: 'background: rgba(34, 197, 94, 0.1); padding: 10px; border-radius: 50%; color: var(--success);'
               }, [createElement('i', { className: 'fa-solid fa-user-check', style: 'font-size: 1.5rem;' })]),
               createElement('div', {}, [
                   createElement('h3', { style: 'margin: 0; font-size: 1.1rem; color: var(--text-primary);' }, [records[0]['Apellidos y Nombres'] || records[0].Nombres || 'Usuario Encontrado']),
                   createElement('p', { style: 'margin: 5px 0 0 0; font-size: 0.9rem; color: var(--text-secondary);' }, [
                       createElement('i', { className: 'fa-regular fa-calendar', style: 'margin-right: 0.5rem;' }),
                       `${periods.length} periodo(s) disponible(s)`
                   ])
               ])
          ]),

          // Right: Period Selector
          createElement('div', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
            createElement('label', { style: 'font-weight: 500; font-size: 0.9rem; color: var(--text-secondary);' }, ['Periodo:']),
            
            // Create Select Element manually
             (() => {
                const select = document.createElement('select');
                select.className = 'form-input'; 
                // Custom styles for select
                select.style.width = 'auto';
                select.style.minWidth = '160px';
                select.style.padding = '0.5rem 2rem 0.5rem 1rem';
                select.style.fontWeight = '600';
                select.style.color = 'var(--primary)';
                select.style.borderColor = 'var(--primary)';
                select.style.cursor = 'pointer';
                // Inline SVG arrow for consistent styling
                select.style.backgroundImage = 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232563eb%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")';
                select.style.backgroundRepeat = 'no-repeat';
                select.style.backgroundPosition = 'right 0.7rem top 50%';
                select.style.backgroundSize = '0.65rem auto';
                select.style.appearance = 'none';
                
                
                periods.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p;
                    option.textContent = p;
                    if (p === currentPeriod) option.selected = true;
                    select.appendChild(option);
                });

                select.addEventListener('change', (e) => {
                    renderPeriodResults(e.target.value);
                });
                return select;
            })()
          ])
        ])
      ]);
      
      resultsContainer.appendChild(headerCard);
      
      // Render Initial Results
      renderPeriodResults(currentPeriod);
      
      showToast(`Se encontraron datos`, 'success');
      
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
