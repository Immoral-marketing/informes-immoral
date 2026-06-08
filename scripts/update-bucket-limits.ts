import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.")
  process.exit(1)
}

const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log("Updating report-attachments bucket limits in Supabase Storage...")
  const { data: data1, error: error1 } = await supabaseAdmin.storage.updateBucket('report-attachments', {
    public: false,
    fileSizeLimit: 26214400, // 25MB
    allowedMimeTypes: [
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
  })

  if (error1) {
    console.error("Error updating report-attachments:", error1.message)
  } else {
    console.log("report-attachments updated successfully:", data1)
  }

  console.log("Updating report-documents bucket limits...")
  const { data: data2, error: error2 } = await supabaseAdmin.storage.updateBucket('report-documents', {
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ["application/pdf", "text/html"]
  })

  if (error2) {
    console.error("Error updating report-documents:", error2.message)
  } else {
    console.log("report-documents updated successfully:", data2)
  }
}

run().catch(console.error)
