import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DOC_BUCKET = "report-documents";

const annotateScript = `
<script>
  (function() {
    function getHybridSelector(node) {
      if (node.id) return '#' + node.id;
      
      const attributes = node.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.name.startsWith('data-')) {
          const selector = '[' + attr.name + '="' + attr.value + '"]';
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }
      }
      
      if (node.tagName.toLowerCase() === 'body') return 'body';
      let selector = '';
      let current = node;
      
      while (current && current.tagName.toLowerCase() !== 'body') {
        let index = 1;
        let sibling = current.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === current.tagName) {
            index++;
          }
          sibling = sibling.previousElementSibling;
        }
        const part = current.tagName.toLowerCase() + ':nth-of-type(' + index + ')';
        selector = selector ? part + ' > ' + selector : part;
        current = current.parentElement;
      }
      return 'body > ' + selector;
    }

    document.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const selector = getHybridSelector(e.target);
      window.parent.postMessage({ type: 'annotate-click', selector: selector }, '*');
    }, true);

    window.addEventListener('message', function(e) {
      if (e.data.type === 'highlight-note') {
        document.querySelectorAll('.immoral-note-highlight').forEach(el => el.classList.remove('immoral-note-highlight'));
        const el = document.querySelector(e.data.selector);
        if (el) {
          el.classList.add('immoral-note-highlight');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      if (e.data.type === 'get-valid-selectors') {
        const valid = [];
        e.data.selectors.forEach(sel => {
          try {
            if (document.querySelector(sel)) valid.push(sel);
          } catch(err) {}
        });
        window.parent.postMessage({ type: 'valid-selectors', selectors: valid }, '*');
      }

      if (e.data.type === 'show-all-indicators') {
        document.querySelectorAll('.immoral-note-badge').forEach(el => el.remove());
        
        // Agrupar notas
        const counts = {};
        const firstInitials = {};
        const firstIds = {};
        
        e.data.notes.forEach(function(note) {
          if (!counts[note.selector]) {
            counts[note.selector] = 0;
            firstInitials[note.selector] = note.initials || '?';
            firstIds[note.selector] = note.id;
          }
          counts[note.selector]++;
        });
        
        Object.keys(counts).forEach(function(sel) {
          try {
            var el = document.querySelector(sel);
            if (el) {
              var badge = document.createElement('span');
              badge.className = 'immoral-note-badge';
              
              if (counts[sel] > 1) {
                badge.textContent = firstInitials[sel] + '+';
                badge.classList.add('immoral-note-multiple');
              } else {
                badge.textContent = firstInitials[sel];
                badge.classList.add('immoral-note-single');
              }
              
              badge.addEventListener('click', function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
                window.parent.postMessage({ type: 'open-note', id: firstIds[sel] }, '*');
              });

              let target = el;
              if (['img', 'input', 'br', 'hr', 'col', 'meta', 'link'].includes(el.tagName.toLowerCase())) {
                target = el.parentElement || document.body;
              }
              
              const currentPos = window.getComputedStyle(target).position;
              if (currentPos === 'static') {
                target.style.position = 'relative';
              }
              
              target.appendChild(badge);
            }
          } catch(err) {}
        });
      }
    });

    const style = document.createElement('style');
    style.innerHTML = [
      '.immoral-note-highlight { outline: 3px solid #FF7A00 !important; outline-offset: 2px; }',
      '.immoral-note-badge { position: absolute !important; top: -14px !important; right: -14px !important; background: #FF7A00 !important; color: #fff !important; z-index: 999999 !important; pointer-events: auto !important; cursor: pointer !important; font-family: sans-serif !important; box-shadow: 0 4px 6px rgba(0,0,0,0.3) !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: transform 0.15s ease !important; }',
      '.immoral-note-badge:hover { transform: scale(1.15) !important; }',
      '.immoral-note-single { width: 28px !important; height: 28px !important; border-radius: 50% !important; font-size: 11px !important; font-weight: bold !important; }',
      '.immoral-note-multiple { min-width: 32px !important; height: 28px !important; padding: 0 4px !important; border-radius: 14px !important; font-size: 11px !important; font-weight: bold !important; }'
    ].join(' ');
    document.head.appendChild(style);

    document.body.style.cursor = 'crosshair';
  })();
</script>
`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return new NextResponse("ID requerido", { status: 400 });

  const url = new URL(request.url);
  const versionParam = url.searchParams.get("version");
  const mode = url.searchParams.get("mode");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  // Validate user is creator or admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("created_by, current_version")
    .eq("id", id)
    .single();

  if (!report || !profile) {
    return new NextResponse("Informe no encontrado", { status: 404 });
  }

  if (profile.role !== "admin" && report.created_by !== user.id) {
    return new NextResponse("No autorizado", { status: 403 });
  }

  const versionNumber = versionParam ? parseInt(versionParam, 10) : report.current_version;

  const { data: versionData } = await supabaseAdmin
    .from("report_versions")
    .select("storage_path, format")
    .eq("report_id", id)
    .eq("version_number", versionNumber)
    .single();

  if (!versionData) {
    return new NextResponse("Versión no encontrada", { status: 404 });
  }

  // La anotación solo aplica a HTML
  if (mode === "annotate" && versionData.format !== "html") {
    return new NextResponse("La anotación solo está disponible para informes HTML", { status: 400 });
  }

  const { data: fileData, error: fileError } = await supabaseAdmin.storage
    .from(DOC_BUCKET)
    .download(versionData.storage_path);

  if (fileError || !fileData) {
    return new NextResponse("Error al descargar el documento", { status: 500 });
  }

  const buffer = await fileData.arrayBuffer();

  // PDF: servir tal cual; el iframe lo renderiza nativamente
  if (versionData.format !== "html") {
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, max-age=0",
        "Content-Security-Policy": "frame-ancestors 'self';",
      },
    });
  }

  let htmlContent = new TextDecoder("utf-8").decode(buffer);

  // Inyectar el script de anotación SOLO en modo annotate (nunca en preview normal ni en cliente)
  if (mode === "annotate") {
    if (htmlContent.includes("</body>")) {
      htmlContent = htmlContent.replace("</body>", `\n${annotateScript}\n</body>`);
    } else {
      htmlContent += `\n${annotateScript}`;
    }
  }

  return new NextResponse(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Content-Security-Policy": "frame-ancestors 'self';",
    },
  });
}
