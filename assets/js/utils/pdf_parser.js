/**
 * PDF Parser - Logic to extract and parse data from Boleta PDFs
 */

/**
 * Handle PDF File Selection
 * @param {File} file - The uploaded PDF file
 * @returns {Promise<Object>} - Parsed boleta record
 */
async function processBoletaPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Assume boleta is on the first page
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    // Extract items with position
    const items = textContent.items.map(item => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5], // 0 is bottom
      hasText: item.str.trim().length > 0
    })).filter(i => i.hasText);

    // Parse using coordinates
    return parsePDFDataWithCoords(items, viewport.width);

  } catch (error) {
    console.error('PDF Processing Error:', error);
    throw new Error('No se pudo leer el archivo PDF. Asegúrese de que sea una boleta válida.');
  }
}

/**
 * Handle Image File (OCR) - [NEW]
 * @param {File} file - The uploaded Image file
 * @returns {Promise<Object>} - Parsed boleta record
 */
async function processBoletaImage(file) {
  try {
    // 1. Get Image Dimensions (for coordinate inversion)
    const imgBitmap = await createImageBitmap(file);
    const width = imgBitmap.width;
    const height = imgBitmap.height;

    // 2. Perform OCR (Tesseract.js)
    // Tesseract v5 syntax
    const worker = await Tesseract.createWorker('spa');
    const ret = await worker.recognize(file);
    await worker.terminate();

    // 3. Transform to compatible items
    // Tesseract gives bbox: {x0, y0, x1, y1} from Top-Left
    // PDF parser expects x, y (from Bottom-Left)
    const items = ret.data.words.map(w => ({
      text: w.text,
      x: w.bbox.x0,
      y: height - w.bbox.y0, // Invert Y
      hasText: w.text.trim().length > 0
    })).filter(i => i.hasText);

    // 4. Parse using same logic
    return parsePDFDataWithCoords(items, width);

  } catch (error) {
    console.error('OCR Processing Error:', error);
    throw new Error('No se pudo escanear la imagen. Intente con una foto más clara o use el PDF original.');
  }
}

/**
 * Parse data using X,Y coordinates to distinguish columns
 */
function parsePDFDataWithCoords(items, pageWidth) {
  const record = {
    'Periodo': 'Desconocido',
    'ID': '',
    'Codigo Modular': '',
    'Apellidos y Nombres': '',
    'Situation': '',
    'Codigo Cargo': '',
    'Cargo': '',
    'Nivel Magisterial': '',
    'DNI': '',
    'Nro Cuenta': '',
    'Leyenda': '',
    'Ingresos': [], // Kept for debug
    'Descuentos': [], // Kept for debug
    'M. Imponible': 0.0,
    'T. Haberes': 0.0,
    'T. Descuentos': 0.0,
    'Liquido': 0.0
  };

  let splitX = pageWidth / 2; // Approx 300 for A4 (595 width)

  // 1. Extract Header Info & Totals (Global Search)
  // We join all text for easier Regex matching of labeled fields
  const fullText = items.map(i => i.text).join(' ');
  
  // Period
  const periodMatch = fullText.match(/PERIODO\s*:\s*(\d{2}\/\d{4})/);
  if (periodMatch) {
    const [month, year] = periodMatch[1].split('/');
    const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    record['Periodo'] = `${months[parseInt(month)-1]} ${year}`;
  }

  // DNI
  const dniMatch = fullText.match(/D\.?N\.?I\.?\s*[:.]?\s*(\d{8})/);
  if (dniMatch) record['DNI'] = dniMatch[1];
  
  // Codigo Modular
  const cmMatch = fullText.match(/COD\.?\s*MOD\.?\s*[:.]?\s*(\d{10})/);
  if (cmMatch) record['Codigo Modular'] = cmMatch[1];

  // Specific Fields
  const fields = [
      { key: 'Cargo', regex: /CARGO\s*[:.]?\s*(.+?)(?=\s{2,}|$)/ },
      { key: 'Codigo Cargo', regex: /COD\.\s*CARGO\s*[:.]?\s*(\d+)/ },
      { key: 'Situacion', regex: /SITUACION\s*[:.]?\s*(.+?)(?=\s{2,}|$)/ },
      { key: 'Nivel Magisterial', regex: /NIVEL\s*MAG\.?\s*[:.]?\s*(.+?)(?=\s{2,}|$)/ },
      { key: 'Nro Cuenta', regex: /NRO\.\s*CTA\.?\s*[:.]?\s*(\d+[-\d]*)/ },
      { key: 'Leyenda', regex: /LEYENDA\s*PERMANENTE\s*[:.]?\s*(.+?)(?=\s{2,}|$)/ },
      { key: 'Tipo de Servidor', regex: /TIPO\s*SERVIDOR\s*[:.]?\s*(.+?)(?=\s{2,}|$)/ },
  ];
  fields.forEach(f => {
      const match = fullText.match(f.regex);
      if (match) record[f.key] = match[1].trim();
  });

  // Apellidos y Nombres - Heuristic: Look for "APELLIDOS Y NOMBRES" line Y-coord
  const nameLabel = items.find(i => i.text.includes('APELLIDOS Y NOMBRES'));
  if (nameLabel) {
      // Look for text below this label (lower Y) within a small range
      // Or on the same line but to the right? Usually below.
      const labelY = nameLabel.y;
      // Find items just below (e.g. 10-20 units below)
      const nameParts = items.filter(i => i.y < labelY && i.y > labelY - 30 && i.x < splitX);
      if (nameParts.length > 0) {
          record['Apellidos y Nombres'] = nameParts.map(i => i.text).join(' ').trim();
      }
  }

  // Totals
  // Update Regex to catch "TOTAL INGRESOS" as T. Haberes
  const tHaberesMatch = fullText.match(/(?:T\s*\.?\s*HABERES|TOTAL\s*INGRESOS)\s*[:.]?\s*S?\/?\s*([\d,]+\.\d{2})/i);
  if (tHaberesMatch) {
      record['T. Haberes'] = parseFloat(tHaberesMatch[1].replace(/,/g, ''));
  }
  
  const tDescMatch = fullText.match(/(?:T\s*\.?\s*DESCUENTOS|TOTAL\s*DESCUENTOS)\s*[:.]?\s*S?\/?\s*([\d,]+\.\d{2})/i);
  if (tDescMatch) {
      record['T. Descuentos'] = parseFloat(tDescMatch[1].replace(/,/g, ''));
  }
  
  const liquidoMatch = fullText.match(/(?:LIQUIDO|TOTAL\s*L[IÍ]QUIDO)\s*[:.]?\s*S?\/?\s*([\d,]+\.\d{2})/i);
  if (liquidoMatch) {
      record['Liquido'] = parseFloat(liquidoMatch[1].replace(/,/g, ''));
  }

  const mImpMatch = fullText.match(/M\s*\.?\s*IMPONIBLE\s*[:.]?\s*S?\/?\s*([\d,]+\.\d{2})/i);
  if (mImpMatch) {
      record['M. Imponible'] = parseFloat(mImpMatch[1].replace(/,/g, ''));
  }


  // 1. Dynamic Split Point Strategy
  // Find "INGRESOS" and "DESCUENTOS" headers to determine the split line more accurately
  const ingresosHeader = items.find(i => /INGRESOS/i.test(i.text));
  const descuentosHeader = items.find(i => /DESCUENTOS/i.test(i.text) && !/TOTAL/i.test(i.text)); // Avoid "TOTAL DESCUENTOS"
  
  if (descuentosHeader) {
      // Use the Descuentos header X position as the boundary (minus a small buffer)
      // Usually Descuentos header is at start of the column.
      splitX = descuentosHeader.x - 20;
  }
  
  // 3. Extract Details (Ingresos vs Descuentos)
  // ... (Boundaries logic remains same)
  // Find Y boundaries
  const headerBottomY = nameLabel ? nameLabel.y - 50 : 500; 
  const totalLabel = items.find(i => i.text.match(/TOTAL\s*INGRESOS|LIQUIDO|TOTAL\s*DESCUENTOS|T\.\s*HABERES/i));
  const footerTopY = totalLabel ? totalLabel.y + 10 : 100;

  // Filter items in the body section
  const bodyItems = items.filter(i => i.y < headerBottomY && i.y > footerTopY);

  // Split into Left (Ingresos) and Right (Descuentos)
  const leftItems = bodyItems.filter(i => i.x < splitX);
  const rightItems = bodyItems.filter(i => i.x >= splitX);

  // Parse Columns
  const extractEntries = (colItems, prefix) => {
      const lines = groupItemsByLine(colItems);
      lines.forEach(line => {
          // Robust Regex:
          // 1. Optional currency symbol S/ or S/.
          // 2. Capture the amount: digits, optional commas, dot, 2 digits.
          // 3. Allow for trailing spaces or small noise (though we target the end $)
          // 4. Using [\d,\.]+ to be more permissive, then validating with parseFloat
          
          // Match the LAST number in the line that looks like an amount
          const match = line.match(/(?:S\/\.?\s*)?([\d,]+\.\d{2})(?=\s*$|\s+[A-Z])/); // Added lookahead for end or text
          // Fallback: look for any pattern like "123.45" at end of string
          const simpleMatch = line.match(/([\d,]+\.\d{2})\s*$/);
          
          const amountMatch = match || simpleMatch;
          
          if (amountMatch) {
              const amountStr = amountMatch[1];
              const amountVal = parseFloat(amountStr.replace(/,/g, ''));
              
              // Concept is everything before the match
              let concept = line.substring(0, line.lastIndexOf(amountStr)).trim();
              
              // Cleanup concept leading chars if any (currency or code junk)
              concept = concept.replace(/S\/\.?\s*$/, '').trim();
              concept = concept.replace(/^S\/\.?\s*/, ''); 
              
              if (concept.length > 2 && amountVal >= 0) { // Allow 0 amounts? usually no, but maybe
                  if (amountVal > 0) {
                      let key = `${prefix}_${concept}`;
                      // Check for duplicate keys (rare but possible)
                      if (record[key]) {
                           // If exists, try to append a counter or sum it?
                           // Usually unique names. Let's just append random ID or counter
                           key += `_${Math.floor(Math.random() * 1000)}`;
                      }
                      record[key] = amountStr; 
                  }
              }
          }
      });
  };

  extractEntries(leftItems, 'ING');
  extractEntries(rightItems, 'DES');

  // 3. Recalculate/Verify Totals
  // Sometimes global regex misses. We sum the items to be sure.
  const sumItems = (prefix) => {
      return Object.entries(record)
          .filter(([k, v]) => k.startsWith(prefix))
          .reduce((sum, [k, v]) => sum + parseFloat(v.replace(/,/g, '')), 0);
  };

  const calcIngresos = sumItems('ING_');
  const calcDescuentos = sumItems('DES_');

  // Fallback if global extraction failed OR if calculated is very different (optional logic, but let's trust calculated if header is 0)
  if (!record['T. Haberes'] || record['T. Haberes'] === 0) {
      record['T. Haberes'] = calcIngresos;
  }
  
  if (!record['T. Descuentos'] || record['T. Descuentos'] === 0) {
      record['T. Descuentos'] = calcDescuentos;
  }
  
  // If Liquido missing, calc it
  if (!record['Liquido']) {
      record['Liquido'] = record['T. Haberes'] - record['T. Descuentos'];
  }

  return record;
}

/**
 * Group text items into lines based on Y-coordinate
 */
function groupItemsByLine(items) {
  const lines = [];
  let currentLine = [];
  let currentY = null;

  items.forEach(item => {
    // if (!item.hasText) return; // already filtered

    if (currentY === null || Math.abs(item.y - currentY) > 5) {
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' ')); 
      }
      currentLine = [item.text];
      currentY = item.y;
    } else {
      currentLine.push(item.text);
    }
  });
  if (currentLine.length > 0) lines.push(currentLine.join(' '));
  return lines;
}
