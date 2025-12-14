// src/app/api/simulations/history/route.js
import { NextResponse } from 'next/server';
import sql from 'mssql';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const courseId = searchParams.get('course_id');
    const simulasyonName = searchParams.get('simulasyon_name');

    if (!userId || !courseId || !simulasyonName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    await sql.connect(config);

    // Get conversation history from both tables, ordered by creation time (oldest first)
    const query = `
      SELECT 
        user_response,
        ai_response,
        created_at
      FROM (
        SELECT 
          user_response,
          ai_response,
          created_at
        FROM keyzpage_score
        WHERE user_id = @userId 
          AND course_id = @courseId 
          AND simulasyon_name = @simulasyonName
          AND user_response IS NOT NULL 
          AND ai_response IS NOT NULL
        
        UNION ALL
        
        SELECT 
          user_response,
          ai_response,
          created_at
        FROM keyzpage_complete
        WHERE user_id = @userId 
          AND course_id = @courseId 
          AND simulasyon_name = @simulasyonName
          AND user_response IS NOT NULL 
          AND ai_response IS NOT NULL
      ) AS combined_history
      ORDER BY created_at ASC
    `;

    const result = await sql.query`
      ${query.replace('@userId', userId).replace('@courseId', courseId).replace('@simulasyonName', simulasyonName)}
    `;

    return NextResponse.json({
      success: true,
      history: result.recordset || []
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch conversation history' 
      },
      { status: 500 }
    );
  } finally {
    try {
      await sql.close();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
  }
}