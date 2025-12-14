//bu sayfa app/api/admin/manage/route.js
import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    // Retrieve the token from the Authorization header ("Bearer <token>")
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token missing" }),
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid token", details: err.message }),
        { status: 401 }
      );
    }
    const userId = decoded.id;

    const pool = await getPool();
    // Fetch user info from the users table
    const userResult = await pool
      .request()
      .input("id", sql.Int, userId)
      .query("SELECT firstname, lastname, companyid FROM dbo.users WHERE id = @id");
    const user = userResult.recordset[0];
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404 }
      );
    }

    // Default company logo path
    let companyLogo = "/images/course_logo/logo_ke2.png";
    if (user.companyid) {
      const companyResult = await pool
        .request()
        .input("company_id", sql.Int, user.companyid)
        .query("SELECT company_logo FROM dbo.companyinfo WHERE companyid = @company_id");
      const company = companyResult.recordset[0];
      if (company && company.company_logo) {
        companyLogo = company.company_logo;
      }
    }

    // Prepare company logo HTML (as a string)
    const companyLogoHtml = `<div class="top-row"><img src="${companyLogo}" alt="Şirket Logosu"></div>`;

    // Prepare greeting based on the current time
    const currentHour = new Date().getHours();
    const greeting =
      currentHour < 12
        ? "Günaydın, Sayın "
        : currentHour < 18
        ? "Tünaydın, Sayın "
        : "İyi Akşamlar, Sayın ";

    return new Response(
      JSON.stringify({
        firstname: user.firstname,
        lastname: user.lastname,
        greeting,
        companyLogoHtml,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Manage API error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500 }
    );
  }
}
