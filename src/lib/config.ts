// Application configuration
export const config = {
  // API Configuration
  image: {
    baseUrl: process.env.IMAGE_API_BASE_URL!,
    modelName: process.env.IMAGE_MODEL_NAME!,
    apiKey: process.env.IMAGE_API_KEY!,
  },
  chat: {
    baseUrl: process.env.CHAT_API_BASE_URL!,
    modelName: process.env.CHAT_MODEL_NAME!,
    apiKey: process.env.CHAT_API_KEY!,
  },
  
  // Storage Configuration
  storage: {
    root: process.env.STORAGE_ROOT || './.uploads',
  },

  // Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  
  // Rate Limiting
  rateLimit: {
    global: {
      requests: 30,
      windowMs: 60 * 1000, // 1 minute
    },
    perUser: {
      requests: 10,
      windowMs: 60 * 1000, // 1 minute
    },
  },
  
  // Job Configuration
  jobs: {
    maxConcurrentPerUser: 2,
    timeoutMs: 60 * 1000, // 60 seconds
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  
  // Image Configuration
  images: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    sizes: {
      logo: '1600x1600',      // Logo设计：1600×1600px
      storefront: '2560x1440', // 店招设计：2560×1440px
      poster: '2880x960',     // 海报设计：2880×960px
      product: '1200x900', // Updated to meet API minimum requirement (921,600 pixels)
      productRefine: '1200x900', // 产品精修：1200×900px
      pictureWall: '2048x2816', // 5,767,168 pixels (降低配额消耗)
      signboard: '1024x1024', // High resolution for text quality
    },
    minSizes: {
      storefront: { width: 692, height: 390 },
      poster: { width: 720, height: 240 },
    },
  },

  // Signboard Configuration
  signboard: {
    outputSize: '4693x3520',
    // Natural appearance settings
    naturalness: {
      preserveOriginalColors: true,
      maintainMaterialTexture: true,
      avoidOverSaturation: true,
      keepWeatheringEffects: true,
    },
    // Font consistency settings
    fontConsistency: {
      enforceUniformSize: true,
      maintainCharacterAlignment: true,
      preventIndividualScaling: true,
      ensureEvenSpacing: true,
    },
  },

  // Application Metadata
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || '美工设计系统',
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || '外卖商家图片智能设计生成系统',
  },
};

// Validate configuration
export function validateConfig() {
  const required = [
    'IMAGE_API_BASE_URL',
    'IMAGE_MODEL_NAME',
    'IMAGE_API_KEY',
    'CHAT_API_BASE_URL',
    'CHAT_MODEL_NAME',
    'CHAT_API_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Initialize configuration
if (typeof window === 'undefined') {
  // Server-side only
  validateConfig();
}
