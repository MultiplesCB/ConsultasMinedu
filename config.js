/**
 * Configuration File
 * Update these values with your Supabase credentials
 */

const CONFIG = {
  // Supabase Configuration
  SUPABASE_URL: 'https://dbjskboatrsmnwkguydq.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRianNrYm9hdHJzbW53a2d1eWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTI2NTEsImV4cCI6MjA4NjU4ODY1MX0.oyNWL7o5b76sMl39JAqCVPwc_l1FF4340Dw0cKQuZ94',
  
  // Admin Configuration
  ADMIN_PASSWORD: 'admin123',
  
  // Application Settings
  BATCH_SIZE: 100,           // Records per batch for Supabase sync
  CACHE_TTL: 600000,         // Cache time-to-live (10 minutes)
  
  // Feature Flags
  ENABLE_EXCEL_EXPORT: true,
  ENABLE_SUPABASE_SYNC: true,
  
  // UI Settings
  RECORDS_PER_PAGE: 10,
  ANIMATION_DURATION: 300    // milliseconds
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
