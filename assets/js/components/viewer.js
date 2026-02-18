/**
 * Viewer Component - Data Visualization Logic
 */

/**
 * Render boleta (payroll slip) from record data
 * @param {Object} record - Payroll record
 * @param {HTMLElement} container - Container element
 * @param {boolean} fullDetails - Whether to show full details (PDF view)
 */
function renderBoleta(record, container, fullDetails = false) {
  const wrapper = createElement('div', { className: 'results-layout' });

  // Official Boleta Card
  const boletaCard = createElement('div', { className: 'official-boleta' });

  // 1. Header
  const header = createElement('div', { className: 'official-header' });
  
  // Left: Logo
  const headerLeft = createElement('div', { className: 'header-left' });
  
  // Center: Title
  const headerCenter = createElement('div', { className: 'header-center' }, [
    createElement('h1', {}, ['BOLETA DE PAGO'])
  ]);

  // Right: Period/Info
  const headerRight = createElement('div', { className: 'header-right' });
  headerRight.appendChild(createElement('div', {}, [`UGEL ${record.ugel || 'CORONEL PORTILLO'}`]));
  headerRight.appendChild(createElement('div', { className: 'periodo-highlight' }, [record.Periodo || '']));
  
  header.appendChild(headerLeft);
  header.appendChild(headerCenter);
  header.appendChild(headerRight);
  boletaCard.appendChild(header);

  // 2. Personal Data Strip
  const strip1 = createElement('div', { className: 'data-strip' });
  strip1.appendChild(createElement('span', {}, ['DATOS PERSONALES']));
  strip1.appendChild(createElement('span', {}, ['TIPO DE PLANILLA: ACTIVO']));
  boletaCard.appendChild(strip1);

  // 3. Personal Data Grid
  const grid = createElement('div', { className: 'data-grid' });
  
  // Helper to create grid fields safely
  const addField = (label, value, colSpan = 1) => {
    const div = createElement('div', { className: 'data-field' });
    if (colSpan > 1) {
      div.style.gridColumn = `span ${colSpan}`;
    }
    div.appendChild(createElement('span', { className: 'field-label' }, [label]));
    div.appendChild(createElement('span', { className: 'field-value', title: value }, [value || '']));
    grid.appendChild(div);
  };

  if (fullDetails) {
    // Detailed View (PDF Evaluation) - Mimic Original Layout (Image 2)
    // Row 1
    addField('APELLIDOS Y NOMBRES', record['Apellidos y Nombres'] || '', 2);
    addField('D.N.I', record.DNI, 1);
    
    // Row 2
    addField('CÓDIGO MODULAR', record['Codigo Modular'] || record.ID, 1);
    addField('CÓDIGO CARGO', record['Codigo Cargo'] || '', 1);
    addField('SITUACIÓN', record.Situacion || '', 1);

    // Row 3
    addField('TIPO SERVIDOR', record['Tipo de Servidor'] || '', 1);
    addField('NIVEL MAGISTERIAL', record['Nivel Magisterial'] || '', 1);
    addField('NRO. CUENTA', record['Nro Cuenta'] || '', 1);

    // Row 4
    addField('CARGO', record.Cargo, 3);
    
    // Row 5
    addField('LEYENDA PERMANENTE', record.Leyenda || '', 3);

  } else {
    // Simplified View (DNI Search/LIS)
    addField('APELLIDOS Y NOMBRES', record['Apellidos y Nombres'] || '', 2); 
    addField('D.N.I', record.DNI);
    addField('CÓDIGO MODULAR', record['Codigo Modular'] || record.ID);
    addField('CÓDIGO CARGO', record['Codigo Cargo']);
    addField('SITUACIÓN', record.Situacion);
    addField('TIPO SERVIDOR', record['Tipo de Servidor']);
    addField('NIVEL MAGISTERIAL', record['Nivel Magisterial']);
    addField('NRO. CUENTA', record['Nro Cuenta']);
    addField('CARGO', record.Cargo, 2); 
    addField('LEYENDA PERMANENTE', record.Leyenda || '', 2); 
  }

  boletaCard.appendChild(grid);

  // 4. Details (Ingresos / Descuentos)
  const detailsContainer = createElement('div', { className: 'details-container' });

  // Left Col: Ingresos
  const colIngresos = createElement('div', { className: 'details-column' });
  const headerIng = createElement('div', { className: 'column-header' });
  headerIng.appendChild(createElement('span', {}, ['INGRESOS']));
  headerIng.appendChild(createElement('span', {}, ['MONTO']));
  colIngresos.appendChild(headerIng);

  const listIngresos = createElement('div', { className: 'details-list' });
  const incomeKeys = Object.keys(record).filter(key => key.startsWith('ING_') && parseFloatSafe(record[key]) > 0);
  incomeKeys.forEach(key => {
    const name = key.replace('ING_', '').replace(/^\d+\s*/, '').toUpperCase();
    const row = createElement('div', { className: 'detail-item' });
    row.appendChild(createElement('span', { className: 'detail-concept' }, [name]));
    row.appendChild(createElement('span', { className: 'detail-amount' }, [formatCurrency(record[key]).replace('S/ ', '')]));
    listIngresos.appendChild(row);
  });
  colIngresos.appendChild(listIngresos);

  // Totals Ingresos Row (Internal to col)
  const totalIngRow = createElement('div', { className: 'footer-total-item strip-color', style: 'border: none; border-top: 1px solid #d1d5db; background: #f9fafb;' });
  totalIngRow.appendChild(createElement('span', {}, ['TOTAL INGRESOS']));
  totalIngRow.appendChild(createElement('span', {}, [formatCurrency(record['T. Haberes'])]));
  colIngresos.appendChild(totalIngRow);

  detailsContainer.appendChild(colIngresos);

  // Right Col: Descuentos
  const colDescuentos = createElement('div', { className: 'details-column' });
  const headerDesc = createElement('div', { className: 'column-header' });
  headerDesc.appendChild(createElement('span', {}, ['DESCUENTOS']));
  headerDesc.appendChild(createElement('span', {}, ['MONTO']));
  colDescuentos.appendChild(headerDesc);

  const listDescuentos = createElement('div', { className: 'details-list' });
  const deductionKeys = Object.keys(record).filter(key => key.startsWith('DES_') && parseFloatSafe(record[key]) > 0);
  deductionKeys.forEach(key => {
    const name = key.replace('DES_', '').replace(/^\d+\s*/, '').toUpperCase();
    const row = createElement('div', { className: 'detail-item' });
    
    // Check for target discount (1535 COOPMULT) - Robust check
    if (key.includes('1535') || 
        key.toUpperCase().includes('COOPMULT') || 
        name.includes('COOPMULT') ||
        name.includes('COOP. MULT')) {
        
        // Simplified style: just blue text as requested
        row.style.setProperty('color', '#2563eb', 'important'); // Blue text
        row.style.fontWeight = '600'; // Semi-bold for readability (optional, but good for colored text)
    }

    row.appendChild(createElement('span', { className: 'detail-concept' }, [name]));
    row.appendChild(createElement('span', { className: 'detail-amount' }, [formatCurrency(record[key]).replace('S/ ', '')]));
    listDescuentos.appendChild(row);
  });
  colDescuentos.appendChild(listDescuentos);

   // Totals Descuentos Row (Internal to col)
   const totalDescRow = createElement('div', { className: 'footer-total-item strip-color', style: 'border: none; border-top: 1px solid #d1d5db; background: #f9fafb;' });
   totalDescRow.appendChild(createElement('span', {}, ['TOTAL DESCUENTOS']));
   totalDescRow.appendChild(createElement('span', {}, [formatCurrency(record['T. Descuentos'])]));
   colDescuentos.appendChild(totalDescRow);

  detailsContainer.appendChild(colDescuentos);
  boletaCard.appendChild(detailsContainer);

  // 5. Footer Line (Liquido)
  const footerTotals = createElement('div', { className: 'footer-totals' });
  
  const liqItem = createElement('div', { className: 'footer-total-item' });
  liqItem.appendChild(createElement('span', {}, ['TOTAL LÍQUIDO']));
  liqItem.appendChild(createElement('span', {}, [formatCurrency(record.Liquido)]));
  
  const afectoItem = createElement('div', { className: 'footer-total-item main-liquido' });
  afectoItem.appendChild(createElement('span', {}, ['AFECTO A CARGAS SOCIALES']));
  afectoItem.appendChild(createElement('span', {}, [formatCurrency(record['M. Imponible'])]));

  footerTotals.appendChild(liqItem);
  footerTotals.appendChild(afectoItem);
  boletaCard.appendChild(footerTotals);

  // 6. Footer Message & QR (Removed request)
  // const footerMsg = ... (deleted)
  
  wrapper.appendChild(boletaCard);

  // Right Side: Credit Evaluation (unchanged logic)
  if (typeof calculateCreditCapacity === 'function') {
    const creditEval = calculateCreditCapacity(record);
    if (creditEval) {
       // Render credit card (same logic as before, just appending to wrapper)
       const creditCard = renderCreditCard(record, creditEval);
       wrapper.appendChild(creditCard);
    }
  }

  container.appendChild(wrapper);
}

// Helper to keep renderBoleta clean
function renderCreditCard(record, creditEval) {
    const balanceColor = creditEval.saldoDisponible > 0 ? '#10b981' : '#ef4444';
    const formatted = creditEval.getFormatted();
    
    return createElement('div', { className: 'credit-card' }, [
      createElement('div', { className: 'credit-header' }, [
        createElement('h2', {}, ['EVALUACIÓN CREDITICIA']),
        createElement('p', {}, ['Ley de Reforma Magisterial - Tope 50%'])
      ]),
      createElement('div', { className: 'credit-body' }, [
        createElement('table', { className: 'credit-table' }, [
          createElement('tbody', {}, [
            createCreditRow('Total Haberes', formatCurrency(record['T. Haberes'])),
            createCreditRow('Ingresos No Afectos', formatted.protectedIncome, true),
            createCreditRow('Base de Cálculo', formatted.baseCalculo, false, 'total-row'),
            createCreditRow('Descuentos de Ley', formatted.legalDiscounts, true),
            createCreditRow('Neto para Descuento', formatted.netoLey, false, 'total-row'),
            createCreditRow('CAPACIDAD MÁXIMA (50%)', formatted.maxCapacity50, false, 'highlight-row'),
            createCreditRow('Descuentos Vigentes', formatted.otherDiscounts, true),
            createCreditRow('SALDO DISPONIBLE', formatted.saldoDisponible, false, `final-row ${creditEval.saldoDisponible > 0 ? 'success' : 'danger'}`)
          ])
        ]),
        createElement('div', { className: 'credit-note' }, ['*Cálculo referencial basado en normas del sector educación.'])
      ])
    ]);
}

function renderCreditPlaceholder(container) {
  const placeholder = createElement('div', { 
    style: 'padding: 2rem; text-align: center; color: var(--text-secondary); background: white; border-radius: var(--border-radius); box-shadow: var(--shadow-md); height: fit-content;'
  }, [
    createElement('p', {}, ['Información de crédito no disponible.'])
  ]);
  container.appendChild(placeholder);
}

/**
 * Helper to create credit table row
 */
function createCreditRow(label, amount, isNegative = false, rowClass = '', rowBgColor = '', rowTextColor = '') {
  const row = createElement('tr', { className: rowClass });
  if (rowBgColor) row.style.backgroundColor = rowBgColor;
  if (rowTextColor) row.style.color = rowTextColor;
  
  const labelCell = createElement('td', {}, [label]);
  if (isNegative) labelCell.style.color = 'var(--error)';
  if (rowTextColor) labelCell.style.color = rowTextColor;
  
  const amountCell = createElement('td', {}, [amount]);
  if (isNegative) amountCell.style.color = 'var(--error)';
  if (rowTextColor) amountCell.style.color = rowTextColor;
  
  row.appendChild(labelCell);
  row.appendChild(amountCell);
  return row;
}

/**
 * Create info item element
 * @param {string} label - Label text
 * @param {string} value - Value text
 * @returns {HTMLElement}
 */
function createInfoItem(label, value) {
  return createElement('div', { className: 'info-item' }, [
    createElement('span', { className: 'info-label' }, [label]),
    createElement('span', { className: 'info-value' }, [value])
  ]);
}

/**
 * Create detail row element
 * @param {string} name - Detail name
 * @param {string|number} amount - Amount
 * @returns {HTMLElement}
 */
function createDetailRow(name, amount) {
  return createElement('div', { className: 'detail-row' }, [
    createElement('span', { className: 'detail-name' }, [name]),
    createElement('span', { className: 'detail-amount' }, [formatCurrency(amount)])
  ]);
}

/**
 * Render data table preview
 * @param {Array} data - Array of records
 * @param {HTMLElement} container - Container element
 * @param {number} maxRows - Maximum rows to display
 */
function renderDataTable(data, container, maxRows = 10) {
  if (!data || data.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay datos para mostrar</p>';
    return;
  }
  
  const preview = data.slice(0, maxRows);
  const columns = ['Periodo', 'DNI', 'Apellidos y Nombres', 'Cargo', 'T. Haberes', 'T. Descuentos', 'Liquido'];
  
  const table = createElement('table', { className: 'data-table' });
  
  // Header
  const thead = createElement('thead');
  const headerRow = createElement('tr');
  columns.forEach(col => {
    headerRow.appendChild(createElement('th', {}, [col]));
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Body
  const tbody = createElement('tbody');
  preview.forEach(record => {
    const row = createElement('tr');
    columns.forEach(col => {
      const value = col.includes('Haberes') || col.includes('Descuentos') || col.includes('Liquido')
        ? formatCurrency(record[col])
        : (record[col] || 'N/A');
      row.appendChild(createElement('td', {}, [value]));
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  
  container.appendChild(table);
  
  if (data.length > maxRows) {
    const moreInfo = createElement('p', { 
      style: 'text-align: center; color: var(--text-secondary); margin-top: var(--spacing-md); font-size: 0.875rem;'
    }, [`Mostrando ${maxRows} de ${data.length} registros`]);
    container.appendChild(moreInfo);
  }
}

/**
 * Render Split View: PDF Embed + Credit Eval
 * @param {File} file - PDF File
 * @param {Object} record - Parsed record
 * @param {HTMLElement} container - Container
 */
async function renderSplitPdfView(file, record, container) {
  container.innerHTML = '';
  
  const layout = createElement('div', { 
    className: 'split-view-container'
  });

  // Left: Document Viewer
  const docUrl = URL.createObjectURL(file);
  const docViewer = createElement('div', { className: 'doc-viewer-frame' }); // Container for canvas/img
  
  // Apply styles to ensure it scrolls if needed
  docViewer.style.overflowY = 'auto';
  docViewer.style.display = 'flex';
  docViewer.style.flexDirection = 'column';
  docViewer.style.alignItems = 'center';
  docViewer.style.gap = '10px';
  docViewer.style.backgroundColor = '#525659'; // Generic PDF viewer background

  if (file.type.startsWith('image/')) {
      const img = createElement('img', {
          src: docUrl,
          style: 'max-width: 100%; height: auto; display: block;'
      });
      docViewer.appendChild(img);
  } else {
      // PDF Rendering with PDF.js
      try {
          docViewer.innerHTML = '<div style="color: white; padding: 20px;">Cargando vista previa...</div>';
          
          // Load PDF
          const loadingTask = pdfjsLib.getDocument(docUrl);
          const pdf = await loadingTask.promise;
          
          docViewer.innerHTML = ''; // Clear loading message

          // Render all pages (usually just 1 for boletas, but good to be safe)
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const page = await pdf.getPage(pageNum);
              
              // Calculate scale to fit container width
              // We'll estimate a reasonable width based on window or container, 
              // but purely canvas-based, we usually define a scale. 
              // Let's aim for a scale that makes text readable. 1.5 is usually good for mobile.
              // Or better: use viewport width.
              const viewportWait = page.getViewport({ scale: 1.5 });
              
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewportWait.height;
              canvas.width = viewportWait.width;
              
              // Responsive style for canvas
              canvas.style.maxWidth = '100%';
              canvas.style.height = 'auto';
              canvas.style.marginBottom = '10px';
              canvas.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';

              docViewer.appendChild(canvas);

              const renderContext = {
                  canvasContext: context,
                  viewport: viewportWait
              };
              await page.render(renderContext).promise;
          }

      } catch (error) {
          console.error("Error rendering PDF:", error);
          docViewer.innerHTML = `<div style="color: #ffaaaa; padding: 20px;">
              <p>No se pudo visualizar el PDF aquí.</p>
              <a href="${docUrl}" target="_blank" class="btn btn-secondary" style="margin-top:10px;">Abrir PDF Externamente</a>
          </div>`;
      }
  }
  
  // Right: Credit Card
  const creditWrapper = createElement('div', { className: 'credit-wrapper' });
  
  if (typeof calculateCreditCapacity === 'function') {
    const creditEval = calculateCreditCapacity(record);
    if (creditEval) {
       const creditCard = renderCreditCard(record, creditEval);
       creditWrapper.appendChild(creditCard);
    } else {
        creditWrapper.innerHTML = '<p>No se pudo calcular la evaluación crediticia.</p>';
    }
  }

  layout.appendChild(docViewer);
  layout.appendChild(creditWrapper);
  container.appendChild(layout);
}
