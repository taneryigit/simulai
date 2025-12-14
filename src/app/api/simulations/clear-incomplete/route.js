import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";  // ✅ Correct import
import { verifyToken } from "@/lib/auth";
import sql from "mssql";

export async function POST(req) {
    try {
        const token = req.headers.get("authorization");
        if (!token) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const decoded = verifyToken(token.replace("Bearer ", ""));
        if (!decoded || !decoded.id) {
            return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
        }

        const userId = decoded.id;
        const pool = await getPool(); // ✅ Use getPool() to get a database connection

        await pool.request()
            .input("user_id", sql.Int, userId)
            .query("DELETE FROM dbo.keyzpage_complete WHERE user_id = @user_id");

        return NextResponse.json({ success: true, message: "clear-incomplete" });
    } catch {
        
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
