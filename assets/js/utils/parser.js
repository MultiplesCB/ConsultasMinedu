/**
 * Parser - LIS File Parsing Logic
 * JavaScript port of the Python parser from Lectura_Boletas
 */

/**
 * Parse LIS file content and extract payroll records
 * @param {string} content - Raw content of the .lis file
 * @returns {Array} - Array of parsed payroll records
 */
function parseLISContent(content) {
  const lines = content.split('\n');
  const data = [];
  
  let currentRecord = {};
  let justStartedRecord = false;
  
  // Regex patterns (ported from Python)
  const idPattern = /^(\d{10})\s+((?:(?!\s{2,}|\s+[+-]\d{3}).)+)/;
  
  // Financials
  const haberesPattern = /T HABERES\s*:\s*([\d,]+\.\d{2})/;
  const descuentosPattern = /T DESCUENTOS\s*:\s*([\d,]+\.\d{2})/;
  const liquidoPattern = /LIQUIDO\s*:\s*([\d,]+\.\d{2})/;
  const imponiblePattern = /M IMPONIBLE\s*:\s*([\d,]+\.\d{2})/;
  
  // Details pattern
  // Details pattern (Added (?<=[a-zA-Z]) to allow match after text like "EDUCACION+177")
  // Details pattern (Improved for merged codes like "-1535", allows single space before amount)
  // 1. ([+-]) -> Sign
  // 2. (\d{3,4}) -> Code
  // 3. \s+ -> Mandatory space after code
  // 4. ((?:(?![+-]\d{3}).)+?) -> Name (non-greedy, stops before next code)
  // 5. \s+ -> Space before amount (reduced from \s{2,} to \s+ to handle tight formatting)
  // 6. ([\d,]+\.\d{2}) -> Amount
  // Details pattern (Improved again: Removed start anchors to handle ANY merged case like "...VA8-1535" or "...00-1535")
  // 1. ([+-]) -> Sign
  // 2. (\d{3,4}) -> Code
  // 3. \s+ -> Mandatory space after code
  // 4. ((?:(?![+-]\d{3}).)+?) -> Name (non-greedy)
  // 5. \s+ -> Space before amount
  // 6. ([\d,]+\.\d{2}) -> Amount
  const detailPattern = /([+-])(\d{3,4})\s+((?:(?![+-]\d{3}).)+?)\s+([\d,]+\.\d{2})(?=\s|$)/g;
  
  // Continuation line pattern
  const continuationPattern = /^(\d{6})\s+(.*)/;
  
  // Metadata patterns
  const dniPattern = /DNI\s+(\d+)/;
  const ctaPattern = /BCO\.\s*NACION\s+(\d+)/;
  // Expanded regex to stop at large gaps, financial headers, or codes (with or without space)
  const cargoPattern = /(\d{4}-.+?)(?=\s{15,}|\s+(?:T\s+DESCUENTOS|T\s+HABERES|M\s+IMPONIBLE|LIQUIDO)|[+-]\d{3}|-(?=\d)|$)/;
  const situacionPattern = /(\d-[A-Z]+)/;
  const leyendaPattern = /^0000\s+(.+?)(?=\s{2,}|\s+[+-]\d|$)/; // Stop before 2 spaces or +/- code
  
  // Extract period
  let periodo = "Desconocido";
  const months = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];
  
  for (let i = 0; i < Math.min(200, lines.length); i++) {
    const line = lines[i];
    
    // Priority 1: "PERIODO: MM/YYYY"
    const periodoMatch = line.match(/PERIODO\s*:\s*(\d{2})\/(\d{4})/i);
    if (periodoMatch) {
      const monthIndex = parseInt(periodoMatch[1], 10) - 1;
      const year = periodoMatch[2];
      if (monthIndex >= 0 && monthIndex < 12) {
        periodo = `${months[monthIndex]} ${year}`;
      } else {
        periodo = `${periodoMatch[1]}/${year}`; // Fallback if month invalid
      }
      break;
    }
    
    // Fallback: Old logic (Date search)
    if (/PROC|FECHA/i.test(line)) {
      const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
         // Convert DD/MM/YYYY to Month Year
         const monthIndex = parseInt(dateMatch[2], 10) - 1;
         const year = dateMatch[3];
         if (monthIndex >= 0 && monthIndex < 12) {
            periodo = `${months[monthIndex]} ${year}`; // e.g. ENERO 2026
         } else {
            periodo = dateMatch[0]; // fallback to date if month invalid
         }
      }
    }
  }
  
  // Process each line
  for (const line of lines) {
    const lineStripped = line.trimEnd();
    
    // ID Line Detection
    const idMatch = lineStripped.match(idPattern);
    if (idMatch) {
      // Save previous record
      if (currentRecord.ID) {
        data.push(formatRecordForExport(currentRecord));
      }
      
      // Start new record
      currentRecord = {
        'Periodo': periodo,
        'ID': idMatch[1],
        'Codigo Modular': idMatch[1], // User requested alias
        'Nombres': idMatch[2].trim(),
        'Codigo Cargo': '', // New field for 6-digit code (e.g. 300004)
        'Codigo Servidor': '',
        'Tipo de Servidor': '',
        'M. Imponible': 0.0,
        'T. Haberes': 0.0,
        'T. Descuentos': 0.0,
        'Liquido': 0.0,
        'DNI': '',
        'Nro Cuenta': '',
        'Cargo': '',
        'Codigo Situacion': '',
        'Situacion': '',
        'Leyenda': ''
      };
      justStartedRecord = true;
      
      // Check for imponible on same line
      const impMatch = lineStripped.match(imponiblePattern);
      if (impMatch) {
        currentRecord['M. Imponible'] = impMatch[1].replace(/,/g, '');
      }
      
      // Extract details from this line
      const details = [...lineStripped.matchAll(detailPattern)];
      for (const [, sign, code, name, amount] of details) {
        const cleanName = name.trim().replace(/\s+/g, ' ');
        const prefix = sign === '+' ? 'ING' : 'DES';
        const colName = `${prefix}_${code} ${cleanName}`;
        currentRecord[colName] = amount.replace(/,/g, '');
      }
      
      continue;
    }
    
    // Check for name continuation and Code Cargo
    if (justStartedRecord) {
      // Regex to find 6-digit code at start of line (optionally followed by text)
      const contMatch = lineStripped.match(/^(\d{6})(?:\s+(.*))?/);
      if (contMatch) {
        // Capture Codigo Cargo (e.g., 300004)
        currentRecord['Codigo Cargo'] = contMatch[1];
        
        const fullExtra = contMatch[2] ? contMatch[2].trim() : '';
        if (fullExtra) {
          const parts = fullExtra.split(/\s{2,}|\s+(?=[+-]\d{3})/);
          const extraText = parts[0].trim();
          
          const isCode = /^[+-]\d/.test(extraText);
          
          if (extraText && !isCode) {
            if (extraText.length <= 4) {
              currentRecord['Nombres'] += extraText;
            } else {
              currentRecord['Nombres'] += ' ' + extraText;
            }
          }
        }
      }
      justStartedRecord = false;
    }
    
    if (currentRecord.ID) {
      // Extract financials
      if (line.includes('T HABERES')) {
        const m = lineStripped.match(haberesPattern);
        if (m) currentRecord['T. Haberes'] = m[1].replace(/,/g, '');
      }
      if (line.includes('T DESCUENTOS')) {
        const m = lineStripped.match(descuentosPattern);
        if (m) currentRecord['T. Descuentos'] = m[1].replace(/,/g, '');
      }
      if (line.includes('LIQUIDO')) {
        const m = lineStripped.match(liquidoPattern);
        if (m) currentRecord['Liquido'] = m[1].replace(/,/g, '');
      }
      
      // Extract metadata
      if (line.includes('DNI')) {
        const m = lineStripped.match(dniPattern);
        if (m) currentRecord['DNI'] = m[1];
      }
      if (line.includes('BCO. NACION')) {
        const m = lineStripped.match(ctaPattern);
        if (m) currentRecord['Nro Cuenta'] = m[1];
      }
      
      if (!currentRecord['Cargo']) {
        const mCargo = lineStripped.match(cargoPattern);
        if (mCargo && mCargo[1].includes('-')) {
          let cargoText = mCargo[1];
          // Safety cleanup for financial headers
          const stopWords = ['T DESCUENTOS', 'T HABERES', 'M IMPONIBLE', 'LIQUIDO'];
          for (const word of stopWords) {
            const idx = cargoText.indexOf(word);
            if (idx !== -1) {
              cargoText = cargoText.substring(0, idx);
            }
          }
          currentRecord['Cargo'] = cargoText.trim();
        }
      }
      
      // Nivel Magisterial Extraction (e.g. "0 G 0" -> "TITULO PEDAGOGICO")
      if (!currentRecord['Nivel Magisterial']) {
        const mNivel = lineStripped.match(/(?:^|\s)\d\s+([A-Z])\s+\d(?=\s)/);
        if (mNivel) {
          const code = mNivel[1];
          const NIVEL_MAP = {
            'G': 'TITULO PEDAGOGICO'
            // Add other codes here as they are discovered
          };
          currentRecord['Nivel Magisterial'] = NIVEL_MAP[code] || code;
        }
      }
      
      // Server Type Extraction
      if (!currentRecord['Tipo de Servidor']) {
        // Match generic "Digit Space Digit Space Digit" pattern (e.g. "1 3 8" or "12 0 9")
        // Updated: Code must start with 1-9 (avoids matching "0 1 3" in "0 1 3 8"), allows 1-2 chars context.
        const mServ = lineStripped.match(/(?:^|\s+)([1-9]\d?)\s+\d{1,2}\s+\d{1,2}(?=\s|$)/);
        if (mServ) {
          // EXCLUSION: Ignore lines that contain a slash ("/") to filter out "1 0 40 / 0"
          // We removed the matching against \d{4}- because some valid lines (e.g. for Code 15) DO contain it (e.g. "15 3 5 4024-COORD").
          if (!lineStripped.includes('/')) {
            const code = mServ[1];
            const TIPO_SERVIDOR = {
            '1': 'Docente Nombrado',
            '2': 'Docente Contratado',
            '3': 'Administrativo Nombrado',
            '4': 'Administrativo Contratado',
            '5': 'Administrativo de Serv. Nomb.',
            '6': 'Administrativo de Serv. Contrat.',
            '7': 'Auxiliar Educacion Contratado',
            '8': 'Auxiliar Educacion Nombrado',
            '9': 'Prof.Salud Nombrado',
            '11': 'Prof.Salud Contratado',
            '12': 'Palmas Magisteriales',
            '14': 'Func. Publico Ley30057',
            '15': 'Designacion/Confianza'
          };
          
          if (TIPO_SERVIDOR[code]) {
            currentRecord['Codigo Servidor'] = code;
            currentRecord['Tipo de Servidor'] = TIPO_SERVIDOR[code];
          }
        }
      }
    }
      
      // Situation Code Extraction
      if (!currentRecord['Situacion']) {
        // Match lines starting with "Code-Description" like "1-LIC.SIN GOCE"
        const mSit = lineStripped.match(/^(\d{1,2})-(.+)/);
        if (mSit) {
          const code = mSit[1];
          const rawDesc = mSit[2].trim();
          
          currentRecord['Codigo Situacion'] = code;
          
          // Map to official description
          const SITUACION_CODES = {
            '4': 'HABILITADO',
            '1': 'LICENCIA SIN GOCE',
            '2': 'LICENCIA CON GOCE',
            '5': 'BAJA',
            '6': 'LICENCIA POR MATERNIDAD',
            '8': 'ABANDONO DE CARGO',
            '9': 'SUSPENSION POR SANCION',
            '10': 'REC. PARA EFECTO DE PAG',
            '11': 'MEDIDA PREVENTIVA',
            '12': 'NULL',
            '18': 'SUSPENDIDO',
            '55': 'PAGO OCASIONAL'
          };
          
          currentRecord['Situacion'] = SITUACION_CODES[code] || rawDesc;
        }
      }
      
      if (!currentRecord['Leyenda']) {
        const mLey = lineStripped.match(leyendaPattern);
        if (mLey) {
          currentRecord['Leyenda'] = mLey[1].trim();
        }
      }
      
      // Extract income/discount details
      const details = [...lineStripped.matchAll(detailPattern)];
      for (const [, sign, code, name, amount] of details) {
        const cleanName = name.trim().replace(/\s+/g, ' ');
        const prefix = sign === '+' ? 'ING' : 'DES';
        const colName = `${prefix}_${code} ${cleanName}`;
        currentRecord[colName] = amount.replace(/,/g, '');
      }
    }
  }
  
  // Append last record
  if (currentRecord.ID) {
    data.push(formatRecordForExport(currentRecord));
  }
  
  // Filter out zero-income records
  const filtered = data.filter(record => {
    const haberes = parseFloat(record['T. Haberes']);
    return !isNaN(haberes) && haberes > 0;
  });
  
  return filtered;
}

/**
 * Helper to format record with specific column order for Excel
 */
function formatRecordForExport(record) {
  const ordered = {
    'ID': record.ID,
    'Apellidos y Nombres': record['Nombres'],
    'Periodo': record['Periodo'],
    'DNI': record['DNI'],
    'Nro Cuenta': record['Nro Cuenta'],
    'Cargo': record['Cargo'],
    'Codigo Cargo': record['Codigo Cargo'],
    'Codigo Servidor': record['Codigo Servidor'],
    'Tipo de Servidor': record['Tipo de Servidor'],
    'Nivel Magisterial': record['Nivel Magisterial'],
    'Codigo Situacion': record['Codigo Situacion'],
    'Situacion': record['Situacion'],
    'Leyenda': record['Leyenda']
  };

  if (record['M. Imponible']) ordered['M. Imponible'] = record['M. Imponible'];
  ordered['T. Haberes'] = record['T. Haberes'];
  ordered['T. Descuentos'] = record['T. Descuentos'];
  ordered['Liquido'] = record['Liquido'];

  Object.keys(record).forEach(key => {
    if (key.startsWith('ING_') || key.startsWith('DES_')) {
      ordered[key] = record[key];
    }
  });

  return ordered;
}

/**
 * Read file as Latin-1 encoded text
 * @param {File} file - File object
 * @returns {Promise<string>} - File content as string
 */
function readFileAsLatin1(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Decode as Latin-1 (ISO-8859-1)
      let text = '';
      for (let i = 0; i < uint8Array.length; i++) {
        text += String.fromCharCode(uint8Array[i]);
      }
      
      resolve(text);
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert parsed data to Excel format
 * @param {Array} data - Parsed records
 * @returns {Blob} - Excel file blob
 */
function convertToExcel(data) {
  if (!window.XLSX) {
    throw new Error('SheetJS library not loaded');
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Boletas');
  
  // Generate Excel file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
