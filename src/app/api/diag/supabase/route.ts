import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  try {
    const urlPresent = !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    // 1) Try listing storage buckets (requires service role)
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()

    // 2) Try a lightweight DB query (head count)
    const { error: dbError, count } = await supabaseAdmin
      .from("price_submissions")
      .select("id", { count: "exact", head: true })

    return NextResponse.json({
      env: {
        supabaseUrlPresent: urlPresent,
        serviceRolePresent: hasServiceKey,
      },
      storage: {
        ok: !bucketsError,
        error: bucketsError?.message ?? null,
        bucketNames: buckets?.map(b => b.name) ?? [],
      },
      database: {
        ok: !dbError,
        error: dbError?.message ?? null,
        approxRows: count ?? null,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    )
  }
}



