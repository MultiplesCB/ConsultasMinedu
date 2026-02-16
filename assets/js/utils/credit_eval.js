/**
 * Credit Evaluation Module
 * Calculates credit capacity based on 50% rule
 * Ported from credit_eval.py
 */

/**
 * Calculate credit capacity
 * @param {Object} record - Payroll record
 * @returns {Object|null} - Evaluation results or null if failed
 */
function calculateCreditCapacity(record) {
  try {
    const tHaberes = parseFloatSafe(record['T. Haberes']);
    const tDescuentos = parseFloatSafe(record['T. Descuentos']);
    
    // 1. Identify Protected Income
    let protectedIncome = 0.0;
    const protectedItems = [];
    
    // Keywords for protected income
    // Normalize text for better matching
    
    Object.entries(record).forEach(([key, value]) => {
      // Check if it's an Income item
      const isIncome = key.includes('(+)') || key.startsWith('ING_');
      
      if (isIncome) {
        const val = parseFloatSafe(value);
        
        if (val > 0) {
          const lowerKey = key.toLowerCase();
          // Added more keywords for PDF robustness
          if (key.includes('023') || 
              lowerKey.includes('escolarid') || 
              lowerKey.includes('aguinaldo') || 
              lowerKey.includes('luto') ||
              lowerKey.includes('sepelio') ||
              lowerKey.includes('vacaciones')) {
            
            protectedIncome += val;
            const cleanName = key.replace(' (+)', '').replace('ING_', '').replace(/^\d+\s*/, '');
            protectedItems.push({ name: cleanName, amount: val });
          }
        }
      }
    });
    
    // 2. Identify Legal Discounts
    let legalDiscounts = 0.0;
    const legalItems = [];
    
    // Expanded keywords for PDF extraction compatibility
    const legalKeywords = [
        'snp', 'afp', 'quintaca', 'quinta', 'judicial', 'dl20530', 'ipssvid', 'dl. 20530', 
        'derrama', 'sutep', 'subcafe', 'cafae' // Added common ones just in case
    ];
    // Strict codes for LIS
    const legalCodes = ['0002', '0113', '0121', '0004', '0001'];
    
    Object.entries(record).forEach(([key, value]) => {
      // Check if it's an Discount item
      const isDiscount = key.includes('(-)') || key.startsWith('DES_');
      
      if (isDiscount) {
        const val = parseFloatSafe(value);
        
        if (val > 0) {
          const lowerKey = key.toLowerCase();
          let isLegal = false;
          
          // Check codes
          for (const code of legalCodes) {
            if (lowerKey.includes(code)) {
              isLegal = true;
              break;
            }
          }
          
          // Check keywords
          if (!isLegal) {
            for (const kw of legalKeywords) {
              // Improved matching: check word boundaries or specific substrings
              if (lowerKey.includes(kw)) {
                
                // Exception: "Prestamo Judicial" is NOT a legal discount? 
                // Wait, "Judicial" usually *is* a legal discount (retention).
                // "Prestamo" is usually personal.
                // Let's assume Judicial is always legal per user request (Descuentos de Ley).
                
                isLegal = true;
                break;
              }
            }
          }
          
          if (isLegal) {
            legalDiscounts += val;
            const cleanName = key.replace(' (-)', '').replace('DES_', '').replace(/^\d+\s*/, '');
            legalItems.push({ name: cleanName, amount: val });
          }
        }
      }
    });
    
    // 3. Calculation
    const baseCalculo = tHaberes - protectedIncome;
    const netoLey = baseCalculo - legalDiscounts;
    
    const maxDescuentoLey = netoLey / 2.0;
    
    let otherDiscounts = tDescuentos - legalDiscounts;
    if (otherDiscounts < 0) otherDiscounts = 0;
    
    const saldoDisponible = maxDescuentoLey - otherDiscounts;
    
    return {
      protectedIncome,
      protectedItems,
      legalDiscounts,
      legalItems,
      baseCalculo,
      netoLey,
      maxCapacity50: maxDescuentoLey,
      otherDiscounts,
      saldoDisponible,
      
        // Helper to get formatted values
      getFormatted: function() {
        return {
          protectedIncome: formatCurrency(this.protectedIncome),
          legalDiscounts: formatCurrency(this.legalDiscounts),
          baseCalculo: formatCurrency(this.baseCalculo),
          netoLey: formatCurrency(this.netoLey),
          maxCapacity50: formatCurrency(this.maxCapacity50),
          otherDiscounts: formatCurrency(this.otherDiscounts),
          saldoDisponible: formatCurrency(this.saldoDisponible)
        };
      }
    };
    
  } catch (error) {
    console.error('Error calculating credit capacity:', error);
    return null;
  }
}
