import sql from "mssql";

// Database configuration
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false, // Set to true for Azure
    trustServerCertificate: true,
  },
  pool: {
    max: 50, // Increased from 10 to 50 to handle more concurrent users
    min: 5,  // Keep at least 5 connections open to reduce latency
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  },
};

// Global connection pool
let poolPromise;

export async function getPool() {
  try {
    if (!poolPromise) {
      poolPromise = sql.connect(config)
        .then(pool => {
         
          
          // Add error handling for connection
          pool.on('error', () => {
           
            poolPromise = null; // Reset pool to retry on next request
          });

          return pool;
        })
        .catch(err => {
    
          poolPromise = null; // Reset pool to retry on next request
          throw err;
        });
    }
    return poolPromise;
  } catch  {
   
    throw error;
  }
}