"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Verifica que el usuario es creador del informe dueño de la versión, o admin.
// Necesario porque las server actions usan admin client (bypass RLS).
async function managesVersion(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  reportVersionId: string
): Promise<boolean> {
  const { data: rv } = await supabaseAdmin
    .from("report_versions").select("report_id").eq("id", reportVersionId).single();
  const versionRow = rv as { report_id: string } | null;
  if (!versionRow) return false;
  const { data: rep } = await supabaseAdmin
    .from("reports").select("created_by").eq("id", versionRow.report_id).single();
  if ((rep as { created_by: string } | null)?.created_by === userId) return true;
  const { data: prof } = await supabaseAdmin
    .from("profiles").select("role").eq("id", userId).single();
  return (prof as { role: string } | null)?.role === "admin";
}

export async function getNotes(reportVersionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient();

  if (!(await managesVersion(supabaseAdmin, user.id, reportVersionId))) {
    throw new Error("Sin permiso para leer notas de este informe");
  }

  const { data: notes, error } = await supabaseAdmin
    .from("report_notes")
    .select("*, profiles!report_notes_created_by_fkey(full_name)")
    .eq("report_version_id", reportVersionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return notes;
}

export async function createNote(reportVersionId: string, domSelector: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient();

  if (!(await managesVersion(supabaseAdmin, user.id, reportVersionId))) {
    throw new Error("Sin permiso para anotar este informe");
  }

  const { data: note, error: insertError } = await supabaseAdmin
    .from("report_notes")
    .insert({
      report_version_id: reportVersionId,
      dom_selector: domSelector,
      content,
      created_by: user.id
    })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);

  await supabaseAdmin
    .from("report_note_logs")
    .insert({
      note_id: note.id,
      action: "created",
      performed_by: user.id
    });

  revalidatePath(`/informes/[id]`, "layout");
  return note;
}

export async function updateNote(noteId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient();

  const { data: oldNote, error: fetchError } = await supabase
    .from("report_notes")
    .select("content, created_by")
    .eq("id", noteId)
    .single();

  if (fetchError || !oldNote) throw new Error("Nota no encontrada");
  if (oldNote.created_by !== user.id) throw new Error("Solo el autor puede actualizar la nota");

  const { data: note, error: updateError } = await supabaseAdmin
    .from("report_notes")
    .update({ content })
    .eq("id", noteId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  await supabaseAdmin
    .from("report_note_logs")
    .insert({
      note_id: note.id,
      action: "updated",
      previous_content: oldNote.content,
      performed_by: user.id
    });

  revalidatePath(`/informes/[id]`, "layout");
  return note;
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient();

  const { data: oldNote, error: fetchError } = await supabase
    .from("report_notes")
    .select("created_by")
    .eq("id", noteId)
    .single();

  if (fetchError || !oldNote) throw new Error("Nota no encontrada");
  if (oldNote.created_by !== user.id) throw new Error("Solo el autor puede eliminar la nota");

  const { error: updateError } = await supabaseAdmin
    .from("report_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", noteId);

  if (updateError) throw new Error(updateError.message);

  await supabaseAdmin
    .from("report_note_logs")
    .insert({
      note_id: noteId,
      action: "deleted",
      performed_by: user.id
    });

  revalidatePath(`/informes/[id]`, "layout");
  return true;
}

export async function markOrphan(noteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient();

  const { data: noteRow } = await supabaseAdmin
    .from("report_notes").select("report_version_id").eq("id", noteId).single();
  const nr = noteRow as { report_version_id: string } | null;
  if (!nr || !(await managesVersion(supabaseAdmin, user.id, nr.report_version_id))) {
    throw new Error("Sin permiso");
  }

  const { error } = await supabaseAdmin
    .from("report_notes")
    .update({ is_orphan: true })
    .eq("id", noteId);

  if (error) throw new Error(error.message);
  revalidatePath(`/informes/[id]`, "layout");
  return true;
}

export async function getNoteHistory(noteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient();

  const { data: noteRow } = await supabaseAdmin
    .from("report_notes").select("report_version_id").eq("id", noteId).single();
  const nr = noteRow as { report_version_id: string } | null;
  if (!nr || !(await managesVersion(supabaseAdmin, user.id, nr.report_version_id))) {
    throw new Error("Sin permiso");
  }

  const { data: logs, error } = await supabaseAdmin
    .from("report_note_logs")
    .select("*, profiles!report_note_logs_performed_by_fkey(full_name)")
    .eq("note_id", noteId)
    .order("performed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return logs;
}

export async function copyNotesFromPreviousVersion(reportId: string, fromVersionId: string, toVersionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient();

  if (!(await managesVersion(supabaseAdmin, user.id, toVersionId))) {
    throw new Error("Sin permiso para copiar notas a este informe");
  }

  const { data: oldNotes, error: fetchError } = await supabaseAdmin
    .from("report_notes")
    .select("*")
    .eq("report_version_id", fromVersionId)
    .is("deleted_at", null);

  if (fetchError) throw new Error(fetchError.message);
  if (!oldNotes || oldNotes.length === 0) return 0;

  let count = 0;
  for (const old of oldNotes) {
    const { data: newNote, error: insertError } = await supabaseAdmin
      .from("report_notes")
      .insert({
        report_version_id: toVersionId,
        dom_selector: old.dom_selector,
        content: old.content,
        created_by: user.id,
        copied_from_note_id: old.id,
        is_orphan: false // will be checked lazily
      })
      .select()
      .single();

    if (insertError) continue;

    await supabaseAdmin
      .from("report_note_logs")
      .insert({
        note_id: newNote.id,
        action: "copied",
        performed_by: user.id
      });
    
    count++;
  }

  revalidatePath(`/informes/[id]`, "layout");
  return count;
}
