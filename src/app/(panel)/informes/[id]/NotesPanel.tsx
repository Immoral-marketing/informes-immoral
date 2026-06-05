"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash, Edit2, History, AlertCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { 
  getNotes, 
  createNote, 
  updateNote, 
  deleteNote, 
  markOrphan,
  getNoteHistory
} from "./notes-actions";
import BrandLoader from "@/components/shared/BrandLoader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Note = {
  id: string;
  dom_selector: string;
  content: string;
  is_orphan: boolean;
  created_at: string;
  profiles: { full_name: string | null } | null;
  created_by: string;
};

type NotesPanelProps = {
  reportVersionId: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  isReadOnly?: boolean;
  currentUserId?: string;
};

export default function NotesPanel({ reportVersionId, iframeRef, isReadOnly = false, currentUserId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Note creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTarget, setNewNoteTarget] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  
  // Note edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // History state
  const [historyNodeId, setHistoryNodeId] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // Acceso a las notas actuales desde listeners sin cerrar sobre estado obsoleto
  const notesRef = useRef<Note[]>([]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  useEffect(() => {
    loadNotes();
  }, [reportVersionId]);

  // Marca como huérfanas las notas cuyos selectores no existen en el iframe
  function applyOrphans(missing: string[]) {
    if (missing.length === 0) return;
    const set = new Set(missing);
    const toFlip = notesRef.current.filter((n) => !n.is_orphan && set.has(n.dom_selector));
    if (toFlip.length === 0) return;
    toFlip.forEach((n) => { markOrphan(n.id).catch(() => {}); });
    const flipIds = new Set(toFlip.map((n) => n.id));
    setNotes((prev) => prev.map((n) => (flipIds.has(n.id) ? { ...n, is_orphan: true } : n)));
  }

  useEffect(() => {
    if (isReadOnly) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "annotate-target" && e.data.selector) {
        setNewNoteTarget(e.data.selector);
        setNewNoteContent("");
        setIsCreating(true);
      } else if (e.data?.type === "note-orphan" && e.data.selector) {
        applyOrphans([e.data.selector]);
      } else if (e.data?.type === "orphan-selectors" && Array.isArray(e.data.selectors)) {
        applyOrphans(e.data.selectors);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isReadOnly]);

  async function loadNotes() {
    try {
      setLoading(true);
      const data = await getNotes(reportVersionId);
      setNotes(data as Note[]);
      
      // Check orphans lazily if we have an iframe loaded
      if (iframeRef.current?.contentWindow) {
        checkOrphans(data as Note[]);
      }
    } catch (error: any) {
      toast.error("Error al cargar notas: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Comprobación perezosa de huérfanas: pide al iframe que verifique los selectores.
  // El iframe responde con un mensaje 'orphan-selectors' que captura el listener.
  function checkOrphans(notesToCheck: Note[]) {
    const selectors = notesToCheck.filter((n) => !n.is_orphan).map((n) => n.dom_selector);
    if (selectors.length === 0) return;
    // El iframe puede no haber cargado aún; reintentar con un pequeño retardo.
    const send = () => iframeRef.current?.contentWindow?.postMessage({ type: "check-selectors", selectors }, "*");
    send();
    setTimeout(send, 1200);
  }

  async function handleCreate() {
    if (!newNoteTarget || !newNoteContent.trim()) return;
    try {
      const note = await createNote(reportVersionId, newNoteTarget, newNoteContent);
      setNotes([...notes, { ...note, profiles: { full_name: "Tú" } } as Note]);
      setIsCreating(false);
      setNewNoteTarget(null);
      toast.success("Nota creada");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleUpdate(id: string) {
    if (!editContent.trim()) return;
    try {
      await updateNote(id, editContent);
      setNotes(notes.map(n => n.id === id ? { ...n, content: editContent } : n));
      setEditingId(null);
      toast.success("Nota actualizada");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNote(id);
      setNotes(notes.filter(n => n.id !== id));
      toast.success("Nota eliminada");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function handleHighlight(selector: string) {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "highlight-note", selector }, "*");
    }
  }

  async function viewHistory(id: string) {
    try {
      const logs = await getNoteHistory(id);
      setHistoryLogs(logs);
      setHistoryNodeId(id);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // Eliminado early return de loading para mantener el encabezado visible
  const normalNotes = notes.filter(n => !n.is_orphan);
  const orphanNotes = notes.filter(n => n.is_orphan);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white overflow-y-auto w-full">
      <div className="p-4 border-b border-white/10 sticky top-0 bg-[#1a1a1a] z-10 flex justify-between items-center">
        <h3 className="font-semibold text-lg">Notas de Orador</h3>
        <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-full">{notes.length}</span>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {!isReadOnly && notes.length === 0 && !isCreating && (
              <div className="text-center py-8 text-white/40">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay notas en esta versión.</p>
                <p className="text-xs mt-1">Activa el modo "Anotar" y haz clic en el informe para crear una.</p>
              </div>
            )}

        {isCreating && (
          <div className="bg-white/5 p-3 rounded-lg border border-primary/30 shadow-lg">
            <div className="text-xs text-primary mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Nueva nota
            </div>
            <Textarea
              autoFocus
              className="min-h-[80px] bg-black/40 border-white/10 text-sm mb-2"
              placeholder="Escribe tu nota aquí..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate}>Guardar</Button>
            </div>
          </div>
        )}

        {normalNotes.map(note => (
          <NoteCard 
            key={note.id} 
            note={note} 
            isReadOnly={isReadOnly}
            isEditing={editingId === note.id}
            editContent={editContent}
            onEditStart={() => { setEditingId(note.id); setEditContent(note.content); }}
            onEditChange={setEditContent}
            onUpdate={() => handleUpdate(note.id)}
            onEditCancel={() => setEditingId(null)}
            onDelete={() => handleDelete(note.id)}
            onClick={() => handleHighlight(note.dom_selector)}
            onViewHistory={() => viewHistory(note.id)}
            canEdit={currentUserId === note.created_by}
          />
        ))}

        {orphanNotes.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Notas huérfanas
            </h4>
            <div className="space-y-4">
              {orphanNotes.map(note => (
                <NoteCard 
                  key={note.id} 
                  note={note} 
                  isReadOnly={isReadOnly}
                  isEditing={editingId === note.id}
                  editContent={editContent}
                  onEditStart={() => { setEditingId(note.id); setEditContent(note.content); }}
                  onEditChange={setEditContent}
                  onUpdate={() => handleUpdate(note.id)}
                  onEditCancel={() => setEditingId(null)}
                  onDelete={() => handleDelete(note.id)}
                  onClick={() => {}}
                  onViewHistory={() => viewHistory(note.id)}
                  canEdit={currentUserId === note.created_by}
                />
              ))}
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* History Dialog */}
      <Dialog open={!!historyNodeId} onOpenChange={(open) => !open && setHistoryNodeId(null)}>
        <DialogContent className="bg-[#1a1a1a] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Historial de Nota</DialogTitle>
            <DialogDescription className="text-white/60">
              Registro de cambios de esta anotación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 mt-4">
            {historyLogs.map((log) => (
              <div key={log.id} className="text-sm border-l-2 border-white/10 pl-3 pb-4">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <span className="font-medium text-white/80">{log.profiles?.full_name || 'Usuario'}</span>
                  <span>•</span>
                  <span>{new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(log.performed_at))}</span>
                </div>
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mb-2 ${
                    log.action === 'created' ? 'bg-green-500/20 text-green-400' :
                    log.action === 'updated' ? 'bg-blue-500/20 text-blue-400' :
                    log.action === 'deleted' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/10 text-white/70'
                  }`}>
                    {log.action}
                  </span>
                  {log.previous_content && (
                    <div className="text-white/60 bg-black/40 p-2 rounded text-xs italic">
                      <div className="text-white/30 text-[10px] uppercase mb-1">Contenido anterior</div>
                      {log.previous_content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {historyLogs.length === 0 && (
              <div className="text-center text-white/40 py-4">No hay historial disponible.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({ 
  note, 
  isReadOnly, 
  isEditing, 
  editContent, 
  onEditStart, 
  onEditChange, 
  onUpdate, 
  onEditCancel, 
  onDelete,
  onClick,
  onViewHistory,
  canEdit
}: any) {
  return (
    <div 
      className="bg-white/5 rounded-lg border border-white/5 p-3 hover:border-white/20 transition-colors cursor-pointer group"
      onClick={(e) => {
        // Prevent click if clicking buttons or if editing
        if ((e.target as HTMLElement).closest('button') || isEditing) return;
        onClick();
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-[10px] text-white/40 flex items-center gap-2">
          <span className="font-medium text-white/60">{note.profiles?.full_name || 'Empleado'}</span>
          <span>•</span>
          <span>{new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(note.created_at))}</span>
        </div>
        
        {!isReadOnly && (
          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
            <button onClick={onViewHistory} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white" title="Historial">
              <History className="w-3 h-3" />
            </button>
            {canEdit && !isEditing && (
              <>
                <button onClick={onEditStart} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white" title="Editar">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={onDelete} className="p-1 hover:bg-red-500/20 rounded text-white/50 hover:text-red-400" title="Eliminar">
                  <Trash className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2">
          <Textarea
            autoFocus
            className="min-h-[60px] bg-black/40 border-white/10 text-sm mb-2"
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEditCancel}><X className="w-3 h-3" /></Button>
            <Button size="icon" className="h-6 w-6" onClick={onUpdate}><Check className="w-3 h-3" /></Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap text-white/90">{note.content}</p>
      )}
    </div>
  );
}
