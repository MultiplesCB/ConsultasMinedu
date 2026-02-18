/**
 * Supabase Client - Database Operations
 */

let supabaseClient = null;

/**
 * Initialize Supabase client
 * @returns {Object|null} - Supabase client or null if not configured
 */
function initSupabase() {
  if (window.supabaseClient) {
    return window.supabaseClient;
  }
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Please update config.js with your credentials.');
    return null;
  }
  
  try {
    // Check if we already initialized (if window.supabase is the client)
    if (window.supabase && window.supabase.auth) {
        return window.supabase;
    }

    // Access the library
    // If window.supabase is not the client, it must be the library (or undefined)
    const supabaseLib = window.supabase;
    
    if (!supabaseLib || !supabaseLib.createClient) {
        console.warn('Supabase library not loaded via CDN');
        return null;
    }

    const { createClient } = supabaseLib;
    
    window.supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    
    // Overwrite global to be the client, as expected by other scripts
    window.supabase = window.supabaseClient; 
    

    return window.supabase;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    return null;
  }
}

/**
 * Get the initialized client
 */
function getSupabaseClient() {
    return window.supabaseClient || initSupabase();
}

/**
 * Search for a boleta record by DNI
 * @param {string} dni - DNI to search for
 * @returns {Promise<Object|null>} - Record data or null if not found
 */
async function searchRecordByDNI(dni) {
  const client = getSupabaseClient();
  
  if (!client) {
    showToast('Supabase no está configurado. Configure las credenciales en config.js', 'warning', 5000);
    return null;
  }
  
  try {
    const { data, error } = await client
      .from('boletas')
      .select('json_data')
      .eq('dni', dni)
      .order('periodo', { ascending: false });
    
    if (error) {
      console.error('Supabase query error:', error);
      showToast(`Error al buscar en la base de datos: ${error.message}`, 'error');
      return null;
    }
    
    if (data && data.length > 0) {
      // Map back to just the JSON content
      return data.map(item => item.json_data);
    }
    
    return [];
  } catch (error) {
    console.error('Error searching record:', error);
    showToast(`Error inesperado: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Sync data to Supabase in batches
 * @param {Array} records - Array of payroll records
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<number>} - Number of successfully synced records
 */
async function syncDataToSupabase(records, onProgress = null) {
  const client = getSupabaseClient();
  
  if (!client) {
    showToast('Supabase no está configurado', 'error');
    return 0;
  }
  
  // Deduplicate by (Periodo, DNI, Codigo Cargo)
  const seen = new Set();
  const uniqueRecords = records.filter(record => {
    // Use Code Cargo as differentiator. If missing, fallback to just Period-DNI (legacy behavior)
    const cargoCode = record['Codigo Cargo'] || 'Unknown';
    const key = `${record.Periodo}-${record.DNI}-${cargoCode}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  
  const total = uniqueRecords.length;
  const batchSize = CONFIG.BATCH_SIZE || 100;
  let successCount = 0;
  
  // Process in batches
  for (let i = 0; i < total; i += batchSize) {
    const batch = uniqueRecords.slice(i, i + batchSize);
    
    // Prepare payload
    const payload = batch.map(rec => ({
      periodo: rec.Periodo || '',
      dni: rec.DNI || '',
      nombres: rec['Apellidos y Nombres'] || rec.Nombres || '', // Handle renamed field
      cargo: rec.Cargo || '',
      situacion: rec.Situacion || '',
      total_haberes: parseFloatSafe(rec['T. Haberes']),
      total_descuentos: parseFloatSafe(rec['T. Descuentos']),
      liquido: parseFloatSafe(rec.Liquido),
      
      // New columns
      codigo_modular: rec['Codigo Modular'] || '',
      codigo_cargo: rec['Codigo Cargo'] || '',
      codigo_servidor: rec['Codigo Servidor'] || '',
      tipo_servidor: rec['Tipo de Servidor'] || '',
      nivel_magisterial: rec['Nivel Magisterial'] || '',
      codigo_situacion: rec['Codigo Situacion'] || '',
      leyenda: rec['Leyenda'] || '',
      ugel: rec.ugel || 'CORONEL PORTILLO',
      
      json_data: rec
    }));
    
    try {
      const { error } = await client
        .from('boletas')
        .upsert(payload, { 
          onConflict: 'periodo,dni,codigo_cargo',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
        showToast(`Error en lote ${Math.floor(i / batchSize) + 1}: ${error.message}`, 'error');
      } else {
        successCount += batch.length;
      }
      
      // Report progress
      if (onProgress) {
        onProgress(Math.min(successCount, total), total);
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < total) {
        await sleep(100);
      }
    } catch (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error);
      showToast(`Error inesperado en lote ${Math.floor(i / batchSize) + 1}`, 'error');
    }
  }
  
  return successCount;
}

/**
 * Get total records count from Supabase
 * @returns {Promise<number>} - Total count
 */
async function getTotalRecordsCount() {
  const client = getSupabaseClient();
  
  if (!client) {
    return 0;
  }
  
  try {
    const { count, error } = await client
      .from('boletas')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error getting count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error getting count:', error);
    return 0;
  }
}
