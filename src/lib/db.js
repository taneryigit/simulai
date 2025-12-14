import sql from "mssql";
import dotenv from "dotenv";

dotenv.config(); // ✅ Load .env variables

// Database configuration
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,  // ✅ FIXED: Use DB_HOST instead of DB_SERVER
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
    console.log("🔧 Database Config:", config);  // ✅ Debugging

    if (!poolPromise) {
      poolPromise = sql.connect(config)
        .then(pool => {
          console.log("✅ Database connection established");

          // Handle DB connection errors
          pool.on('error', (err) => {
            console.error("❌ Database Pool Error:", err);
            poolPromise = null; // Reset pool to retry on next request
          });

          return pool;
        })
        .catch(err => {
          console.error("❌ Database Connection Error:", err);
          poolPromise = null; // Reset pool to retry on next request
          throw err;
        });
    }
    return poolPromise;
  } catch (error) {
    console.error("❌ Database General Error:", error);
    throw error;
  }
}

/**
 * Execute SQL query with parameters
 * @param {Object} params - Object containing query and values
 * @param {string} params.query - SQL query string
 * @param {Array} params.values - Array of parameter values
 * @returns {Promise<Array>} - Query results
 */
export async function executeQuery({ query, values = [] }) {
  try {
    const pool = await getPool();
    const request = pool.request();

    // Add parameters to request
    if (values && values.length > 0) {
      values.forEach((value, index) => {
        request.input(`param${index}`, value);
      });
    }

    // Replace ? with @paramX in query
    let parameterizedQuery = query;
    if (values && values.length > 0) {
      values.forEach((_, index) => {
        parameterizedQuery = parameterizedQuery.replace('?', `@param${index}`);
      });
    }

    // Execute query
    console.log("🔍 Executing SQL:", parameterizedQuery);
    const result = await request.query(parameterizedQuery);
    return result.recordset;
  } catch (error) {
    console.error("❌ Query Execution Error:", error);
    throw error;
  }
}