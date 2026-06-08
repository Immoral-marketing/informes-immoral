import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateSessionToken } from "@/lib/tokens/generate"
import { getSignedAttachmentUrl } from "@/app/(panel)/informes/actions"

const ATT_BUCKET = "report-attachments"
const ATT_MAX_SIZE = 25 * 1024 * 1024 // 25MB
const ATT_ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/zip",
  "application/x-zip-compressed",
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params

  // 1. Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // 2. Validate authorization (user is creator or admin)
  const supabaseAdmin = createAdminClient()
  const { data: r } = await supabaseAdmin
    .from("reports")
    .select("created_by, space_id")
    .eq("id", reportId)
    .single()

  const report = r as { created_by: string; space_id: string } | null
  if (!report) {
    return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 })
  }

  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const profile = p as { role: string } | null
  if (report.created_by !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  // 3. Parse FormData
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "El archivo es obligatorio" }, { status: 400 })
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase()
    let mimeType = file.type
    if (!mimeType || mimeType === "application/octet-stream") {
      if (fileExt === "pdf") mimeType = "application/pdf"
      else if (fileExt === "doc") mimeType = "application/msword"
      else if (fileExt === "docx")
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      else if (fileExt === "xls") mimeType = "application/vnd.ms-excel"
      else if (fileExt === "xlsx")
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      else if (fileExt === "ppt") mimeType = "application/vnd.ms-powerpoint"
      else if (fileExt === "pptx")
        mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      else if (fileExt === "png") mimeType = "image/png"
      else if (fileExt === "jpg" || fileExt === "jpeg") mimeType = "image/jpeg"
      else if (fileExt === "zip") mimeType = "application/zip"
    }

    if (!ATT_ALLOWED_MIME.includes(mimeType)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 })
    }
    if (file.size > ATT_MAX_SIZE) {
      return NextResponse.json({ error: "El archivo no puede superar 25 MB" }, { status: 400 })
    }

    // 4. Upload to Storage
    const path = `${Date.now()}-${generateSessionToken().slice(
      0,
      8
    )}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const bytes = await file.arrayBuffer()
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from(ATT_BUCKET)
      .upload(path, bytes, { contentType: mimeType })

    if (uploadError) {
      return NextResponse.json({ error: "Error al subir el adjunto al storage" }, { status: 500 })
    }

    // 5. Insert into Database
    const { data: attData, error: dbError } = await supabaseAdmin
      .from("report_attachments")
      .insert({
        report_id: reportId,
        filename: file.name,
        mime_type: mimeType,
        storage_path: path,
        size_bytes: file.size,
        created_by: user.id,
      })
      .select("id, filename, mime_type, storage_path, size_bytes, created_at")
      .single()

    if (dbError || !attData) {
      // Clean up uploaded file on DB failure
      await supabaseAdmin.storage.from(ATT_BUCKET).remove([path])
      return NextResponse.json({ error: "Error al registrar el adjunto en base de datos" }, { status: 500 })
    }

    // Get signed URL for response
    const signed_url = await getSignedAttachmentUrl(path)

    return NextResponse.json({
      success: true,
      attachment: {
        ...attData,
        signed_url,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}
