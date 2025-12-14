// app/api/admin/reports/user/route.js 
import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get("searchTerm");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    
    console.log("=== USER SEARCH API DEBUG ===");
    console.log("Search term:", searchTerm);
    console.log("Start date:", startDate);
    console.log("End date:", endDate);
    
    // Validate search term
    if (!searchTerm) {
      console.log("ERROR: No search term provided");
      return new Response(
        JSON.stringify({ error: "Lütfen arama için isim yazınız" }),
        { status: 400 }
      );
    }
    
    // Retrieve the token from the Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.log("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "Token missing" }),
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("Decoded token - Admin ID:", decoded.id);
    } catch (err) {
      console.log("ERROR: Invalid token:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid token", details: err.message }),
        { status: 401 }
      );
    }
    
    const adminId = decoded.id;
    
    // Get database connection
    const pool = await getPool();
    
    // Get admin user company info
    console.log("Fetching admin user info for ID:", adminId);
    const userResult = await pool
      .request()
      .input("id", sql.Int, adminId)
      .query("SELECT companyid, admin, firstname, lastname FROM dbo.users WHERE id = @id");
    
    if (userResult.recordset.length === 0) {
      console.log("ERROR: Admin user not found");
      return new Response(
        JSON.stringify({ error: "Admin user not found" }),
        { status: 404 }
      );
    }
    
    const adminUser = userResult.recordset[0];
    const companyId = adminUser.companyid;
    
    console.log("Admin user info:", {
      id: adminId,
      name: `${adminUser.firstname} ${adminUser.lastname}`,
      companyId: companyId,
      isAdmin: adminUser.admin
    });
    
    // Check admin privileges
    if (!adminUser.admin) {
      console.log("ERROR: User is not admin");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin privileges required" }),
        { status: 403 }
      );
    }
    
    // DEBUGGING: First let's see what users exist in the company
    console.log("=== DEBUGGING: Checking all users in company", companyId, "===");
    const allUsersInCompany = await pool
      .request()
      .input("companyId", sql.Int, companyId)
      .query(`
        SELECT id, firstname, lastname, email, companyid
        FROM dbo.users 
        WHERE companyid = @companyId
        ORDER BY firstname, lastname
      `);
    
    console.log("All users in company:", allUsersInCompany.recordset);
    
    // IMPROVED USER SEARCH with better debugging
    const searchPattern = `%${searchTerm.trim()}%`;
    console.log("Search pattern:", searchPattern);
    
    const request = pool.request()
      .input("companyId", sql.Int, companyId)
      .input("searchTerm", sql.NVarChar, searchPattern);
    
    // Improved search query - using SQL Server syntax
    const searchQuery = `
      SELECT TOP 1
        id, firstname, lastname, email, bolum, takim, birim, companyname, last_login, companyid
      FROM 
        dbo.users
      WHERE 
        companyid = @companyId AND
        (
          firstname LIKE @searchTerm OR
          lastname LIKE @searchTerm OR
          email LIKE @searchTerm OR
          (firstname + ' ' + lastname) LIKE @searchTerm OR
          UPPER(firstname) LIKE UPPER(@searchTerm) OR
          UPPER(lastname) LIKE UPPER(@searchTerm) OR
          UPPER(email) LIKE UPPER(@searchTerm) OR
          UPPER(firstname + ' ' + lastname) LIKE UPPER(@searchTerm)
        )
      ORDER BY 
        CASE 
          WHEN firstname = @searchTerm OR lastname = @searchTerm THEN 1
          WHEN firstname LIKE @searchTerm OR lastname LIKE @searchTerm THEN 2
          ELSE 3
        END
    `;
    
    console.log("Executing search query:");
    console.log("SQL:", searchQuery);
    console.log("Parameters:", { companyId, searchTerm: searchPattern });
    
    const targetUserResult = await request.query(searchQuery);
    
    console.log("Search results:", targetUserResult.recordset);
    console.log("Number of results:", targetUserResult.recordset.length);
    
    if (targetUserResult.recordset.length === 0) {
      console.log("=== NO USER FOUND - TRYING FALLBACK SEARCHES ===");
      
      // Fallback 1: Exact match without wildcards
      console.log("Trying exact match...");
      const exactMatchResult = await pool
        .request()
        .input("companyId", sql.Int, companyId)
        .input("searchTermExact", sql.NVarChar, searchTerm.trim())
        .query(`
          SELECT TOP 1 id, firstname, lastname, email, bolum, takim, birim, companyname, last_login, companyid
          FROM dbo.users
          WHERE companyid = @companyId AND
          (
            firstname = @searchTermExact OR
            lastname = @searchTermExact OR
            email = @searchTermExact
          )
        `);
      
      console.log("Exact match results:", exactMatchResult.recordset);
      
      if (exactMatchResult.recordset.length > 0) {
        console.log("Found user with exact match!");
        const targetUser = exactMatchResult.recordset[0];
        return await getUserReport(pool, targetUser, { startDate, endDate });
      }
      
      // Fallback 2: Case insensitive search
      console.log("Trying case insensitive search...");
      const caseInsensitiveResult = await pool
        .request()
        .input("companyId", sql.Int, companyId)
        .input("searchTermUpper", sql.NVarChar, `%${searchTerm.trim().toUpperCase()}%`)
        .query(`
          SELECT TOP 1 id, firstname, lastname, email, bolum, takim, birim, companyname, last_login, companyid
          FROM dbo.users
          WHERE companyid = @companyId AND
          (
            UPPER(firstname) LIKE @searchTermUpper OR
            UPPER(lastname) LIKE @searchTermUpper OR
            UPPER(email) LIKE @searchTermUpper
          )
        `);
      
      console.log("Case insensitive results:", caseInsensitiveResult.recordset);
      
      if (caseInsensitiveResult.recordset.length > 0) {
        console.log("Found user with case insensitive search!");
        const targetUser = caseInsensitiveResult.recordset[0];
        return await getUserReport(pool, targetUser, { startDate, endDate });
      }
      
      // Fallback 3: Show similar users for debugging
      console.log("=== SHOWING SIMILAR USERS FOR DEBUGGING ===");
      const similarUsers = await pool
        .request()
        .input("companyId", sql.Int, companyId)
        .query(`
          SELECT TOP 5 id, firstname, lastname, email
          FROM dbo.users
          WHERE companyid = @companyId
          ORDER BY firstname
        `);
      
      console.log("Similar users in company:", similarUsers.recordset);
      
      return new Response(
        JSON.stringify({ 
          error: "Kullanıcı bulunamadı",
          debug: {
            searchTerm: searchTerm,
            companyId: companyId,
            availableUsers: similarUsers.recordset,
            searchPattern: searchPattern
          }
        }),
        { status: 404 }
      );
    }
    
    const targetUser = targetUserResult.recordset[0];
    console.log(`✅ Found user: ${targetUser.firstname} ${targetUser.lastname} (ID: ${targetUser.id})`);
    
    // Get reports for the target user
    return await getUserReport(pool, targetUser, { startDate, endDate });
    
  } catch (error) {
    console.error("=== SINGLE USER REPORT API ERROR ===");
    console.error("Error details:", error);
    console.error("Stack trace:", error.stack);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500 }
    );
  }
}

// Function to get comprehensive report for a single user - UPDATED TO USE CENTRALIZED SIMULATIONS TABLE
async function getUserReport(pool, userInfo, filters) {
  try {
    const { startDate, endDate } = filters;
    const userId = userInfo.id;
    
    console.log(`=== GENERATING REPORT FOR USER ===`);
    console.log(`User: ${userInfo.firstname} ${userInfo.lastname} (ID: ${userId})`);
    
    // Create request object
    const request = pool.request()
      .input("userId", sql.Int, userId);
    
    // Base date condition
    let dateCondition = "1=1";
    
    // Add date filters if provided
    if (startDate && endDate) {
      dateCondition = "(created_at BETWEEN @startDate AND @endDate)";
      request.input("startDate", sql.DateTime, new Date(startDate));
      request.input("endDate", sql.DateTime, new Date(endDate + ' 23:59:59')); // Include the full end date
    } else if (startDate) {
      dateCondition = "created_at >= @startDate";
      request.input("startDate", sql.DateTime, new Date(startDate));
    } else if (endDate) {
      dateCondition = "created_at <= @endDate";
      request.input("endDate", sql.DateTime, new Date(endDate + ' 23:59:59')); // Include the full end date
    }
    
    console.log("Date condition:", dateCondition);
    
    // Prepare the user report data object
    const userReportData = {
      userInfo: userInfo,
      performanceSummary: {},
      simulationProgress: [],
      skillAnalysis: { skills: [] },
      growthTrend: { timeline: [] },
      completionRateData: [] // Ensure this exists for the frontend
    };
    
    // 1. SIMPLIFIED: Check if user has any score data first
    const userScoreCheckResult = await request.query(`
      SELECT TOP 1 1 AS hasData
      FROM dbo.keyzpage_score
      WHERE user_id = @userId
    `);
    
    const hasScoreData = userScoreCheckResult.recordset.length > 0;
    console.log(`User has score data: ${hasScoreData}`);
    
    // If no score data, return basic user info with empty data
    if (!hasScoreData) {
      console.log("No score data found - returning empty report");
      userReportData.performanceSummary = {
        completedSimulations: 0,
        averageScore: 0,
        highestScore: 0,
        totalAttempts: 0,
        scoreDistribution: []
      };
      
      userReportData.completionRateData = [
        { name: 'Tamamlanan', value: 0, color: '#28a745' },
        { name: 'Başlanmamış', value: 0, color: '#dc3545' }
      ];
      
      return new Response(
        JSON.stringify(userReportData),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // 2. Get performance summary - FIXED: Count distinct thread_id for total attempts
    const performanceSummaryResult = await request.query(`
      SELECT
        COUNT(DISTINCT simulasyon_name) AS completedSimulations,
        AVG(CAST(toplam_puan AS FLOAT)) AS averageScore,
        MAX(toplam_puan) AS highestScore,
        COUNT(DISTINCT thread_id) AS totalAttempts
      FROM 
        dbo.keyzpage_score
      WHERE 
        user_id = @userId AND
        ${dateCondition}
    `);
    
    userReportData.performanceSummary = performanceSummaryResult.recordset[0] || {
      completedSimulations: 0,
      averageScore: 0,
      highestScore: 0,
      totalAttempts: 0
    };
    
    console.log("Performance summary:", userReportData.performanceSummary);
    
    // ✅ UPDATED: Use centralized simulations table to get show names
    console.log("Getting simulation show names from centralized simulations table...");
    
    // Get unique simulation names first
    const uniqueSimulationsResult = await request.query(`
      SELECT DISTINCT simulasyon_name 
      FROM dbo.keyzpage_score 
      WHERE user_id = @userId AND ${dateCondition}
    `);
    
    const simulationNames = uniqueSimulationsResult.recordset.map(row => row.simulasyon_name);
    console.log("Found simulation names:", simulationNames);
    
    // ✅ Get simulation show names from centralized simulations table
    let simulationNameMap = {};
    
    if (simulationNames.length > 0) {
      // Build IN clause for the query
      const simulationNamesInClause = simulationNames.map(name => `'${name.replace(/'/g, "''")}'`).join(',');
      
      const simulationShowNamesResult = await pool.request()
        .query(`
          SELECT simulasyon_name, simulasyon_showname 
          FROM [dbo].[simulations] 
          WHERE simulasyon_name IN (${simulationNamesInClause})
        `);
      
      // Create mapping from results
      simulationShowNamesResult.recordset.forEach(row => {
        simulationNameMap[row.simulasyon_name] = row.simulasyon_showname || row.simulasyon_name;
      });
      
      console.log("Simulation name mapping:", simulationNameMap);
      
      // Add fallback for any simulation names not found in the centralized table
      simulationNames.forEach(simName => {
        if (!simulationNameMap[simName]) {
          simulationNameMap[simName] = simName; // fallback to original name
          console.log(`Fallback used for simulation: ${simName}`);
        }
      });
    }
    
    // Get score distribution by simulation - SIMPLE VERSION
    const scoreDistributionResult = await request.query(`
      WITH LatestScores AS (
        SELECT 
          simulasyon_name,
          toplam_puan AS score,
          ROW_NUMBER() OVER(PARTITION BY simulasyon_name ORDER BY created_at DESC) as rn
        FROM 
          dbo.keyzpage_score
        WHERE 
          user_id = @userId AND
          ${dateCondition}
      )
      SELECT 
        simulasyon_name,
        score
      FROM 
        LatestScores
      WHERE 
        rn = 1
      ORDER BY 
        score DESC
    `);
    
    // Map the simulation names to show names
    userReportData.performanceSummary.scoreDistribution = scoreDistributionResult.recordset.map(row => ({
      simulationName: simulationNameMap[row.simulasyon_name] || row.simulasyon_name,
      score: row.score
    }));
    
    // 3. Get simulation progress - USE THE SAME MAPPING
    const completedSimulationsResult = await request.query(`
      SELECT 
        simulasyon_name,
        MAX(created_at) AS completionDate,
        MAX(toplam_puan) AS score,
        COUNT(DISTINCT thread_id) AS attempts,
        'Tamamlandı' AS status
      FROM 
        dbo.keyzpage_score
      WHERE 
        user_id = @userId AND
        ${dateCondition}
      GROUP BY 
        simulasyon_name
      ORDER BY
        MAX(created_at) DESC
    `);
    
    // Map the simulation names to show names for progress too
    userReportData.simulationProgress = completedSimulationsResult.recordset.map(row => ({
      simulationName: simulationNameMap[row.simulasyon_name] || row.simulasyon_name, // show name
      simulasyon_name: row.simulasyon_name, // ✅ raw key needed for the filter!
      completionDate: row.completionDate,
      score: row.score,
      attempts: row.attempts,
      status: row.status
    }));
    
    
    // Calculate completion status for pie chart
    const completed = userReportData.simulationProgress.length;
    
    // For simplicity, just use what we know the user has completed
    userReportData.completionRateData = [
      { name: 'Tamamlanan', value: completed, color: '#28a745' },
      { name: 'Başlanmamış', value: 0, color: '#dc3545' } // We won't count "not started" since we don't know what's assigned
    ];
    
    // 4. Get skill analysis - SIMPLIFIED
    const skillAnalysisResult = await request.query(`
      SELECT 
        AVG(CASE WHEN puan1 IS NOT NULL THEN CAST(puan1 as FLOAT) ELSE 0 END) AS skill1,
        AVG(CASE WHEN puan2 IS NOT NULL THEN CAST(puan2 as FLOAT) ELSE 0 END) AS skill2,
        AVG(CASE WHEN puan3 IS NOT NULL THEN CAST(puan3 as FLOAT) ELSE 0 END) AS skill3,
        AVG(CASE WHEN puan4 IS NOT NULL THEN CAST(puan4 as FLOAT) ELSE 0 END) AS skill4,
        AVG(CASE WHEN puan5 IS NOT NULL THEN CAST(puan5 as FLOAT) ELSE 0 END) AS skill5
      FROM 
        dbo.keyzpage_score
      WHERE 
        user_id = @userId AND
        ${dateCondition}
    `);
    
    if (skillAnalysisResult.recordset.length > 0) {
      const skillData = skillAnalysisResult.recordset[0];
      
      // Use fixed averages for simplicity (this would be replaced by actual averages in production)
      const avgSkill1 = 70;
      const avgSkill2 = 65;
      const avgSkill3 = 75;
      const avgSkill4 = 60;
      const avgSkill5 = 80;
      
      // Map skill data to radar chart format
      userReportData.skillAnalysis.skills = [
        { skill: 'Satış Becerileri', score: roundNumber(skillData.skill1), average: avgSkill1 },
        { skill: 'Müşteri İlişkileri', score: roundNumber(skillData.skill2), average: avgSkill2 },
        { skill: 'Ürün Bilgisi', score: roundNumber(skillData.skill3), average: avgSkill3 },
        { skill: 'Müzakere', score: roundNumber(skillData.skill4), average: avgSkill4 },
        { skill: 'İletişim', score: roundNumber(skillData.skill5), average: avgSkill5 }
      ];
      
      // Add analysis note
      const avgUserScore = (roundNumber(skillData.skill1) + roundNumber(skillData.skill2) + 
                           roundNumber(skillData.skill3) + roundNumber(skillData.skill4) + 
                           roundNumber(skillData.skill5)) / 5;
      const avgGlobalScore = (avgSkill1 + avgSkill2 + avgSkill3 + avgSkill4 + avgSkill5) / 5;
      
      if (avgUserScore > avgGlobalScore) {
        userReportData.skillAnalysis.notes = `Kullanıcı, ortalama beceri seviyelerinde genel ortalamadan daha yüksek performans göstermektedir. Özellikle ${getBestSkill(userReportData.skillAnalysis.skills)} alanında güçlüdür.`;
      } else {
        userReportData.skillAnalysis.notes = `Kullanıcı, ortalama beceri seviyelerinde geliştirilebilir alanlara sahiptir. Özellikle ${getWeakestSkill(userReportData.skillAnalysis.skills)} alanında iyileştirme yapılabilir.`;
      }
    }
    
// 5. Get growth trend timeline grouped by simulation
const growthTrendBySimulation = await request.query(`
  SELECT 
    simulasyon_name,
    FORMAT(created_at, 'yyyy-MM-dd') AS date,
    AVG(CAST(toplam_puan AS FLOAT)) AS score
  FROM dbo.keyzpage_score
  WHERE user_id = @userId AND ${dateCondition}
  GROUP BY simulasyon_name, FORMAT(created_at, 'yyyy-MM-dd')
  ORDER BY simulasyon_name, date ASC
`);

userReportData.growthTrend.timeline = growthTrendBySimulation.recordset;
    
    // Calculate growth metrics if we have data
    if (userReportData.growthTrend.timeline.length >= 2) {
      const firstEntry = userReportData.growthTrend.timeline[0];
      const lastEntry = userReportData.growthTrend.timeline[userReportData.growthTrend.timeline.length - 1];
      
      userReportData.growthTrend.firstScore = roundNumber(firstEntry.score);
      userReportData.growthTrend.lastScore = roundNumber(lastEntry.score);
      
      // Calculate growth rate
      if (firstEntry.score > 0) {
        userReportData.growthTrend.growthRate = ((lastEntry.score - firstEntry.score) / firstEntry.score) * 100;
      } else {
        userReportData.growthTrend.growthRate = 0;
      }
      
      // Calculate days between first and last entry
      const firstDate = new Date(firstEntry.date);
      const lastDate = new Date(lastEntry.date);
      const diffTime = Math.abs(lastDate - firstDate);
      userReportData.growthTrend.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Add summary based on growth rate
      if (userReportData.growthTrend.growthRate > 20) {
        userReportData.growthTrend.summary = "Kullanıcı, zaman içinde önemli bir gelişim göstermiştir. Simülasyonlarda tutarlı bir ilerleme kaydedilmiştir.";
      } else if (userReportData.growthTrend.growthRate > 0) {
        userReportData.growthTrend.summary = "Kullanıcı, zaman içinde orta düzeyde bir gelişim göstermiştir. Gelişim potansiyeli bulunmaktadır.";
      } else {
        userReportData.growthTrend.summary = "Kullanıcı, zaman içinde önemli bir gelişim göstermemiştir. Ek eğitim desteği sağlanması önerilebilir.";
      }
    }
    
    console.log("✅ Report generated successfully");
    console.log("Final totalAttempts:", userReportData.performanceSummary.totalAttempts);
    
    // Return the user report data
    return new Response(
      JSON.stringify(userReportData),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== ERROR GENERATING USER REPORT ===");
    console.error("Error details:", error);
    console.error("Stack trace:", error.stack);
    return new Response(
      JSON.stringify({ error: "Report generation error", details: error.message }),
      { status: 500 }
    );
  }
}

// Helper function to get the best skill
function getBestSkill(skills) {
  if (!skills || skills.length === 0) return 'Belirlenmemiş';
  const sortedSkills = [...skills].sort((a, b) => b.score - a.score);
  return sortedSkills[0].skill;
}

// Helper function to get the weakest skill
function getWeakestSkill(skills) {
  if (!skills || skills.length === 0) return 'Belirlenmemiş';
  const sortedSkills = [...skills].sort((a, b) => a.score - b.score);
  return sortedSkills[0].skill;
}

// Helper function to round numbers for better display
function roundNumber(num) {
  if (num === null || num === undefined) return 0;
  return Math.round(num * 10) / 10;
}