import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DOC_BUCKET = "report-documents";

const annotateScript = `
<script>
  (function() {
    let currentMark = null;

    function getXPath(node) {
      if (node.id !== '') return 'id("' + node.id + '")';
      if (node === document.body) return '//BODY';
      let ix = 0;
      let siblings = node.parentNode ? node.parentNode.childNodes : [];
      for (let i = 0; i < siblings.length; i++) {
        let sibling = siblings[i];
        if (sibling === node) return getXPath(node.parentNode) + '/' + node.nodeName + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.nodeName === node.nodeName) ix++;
      }
    }

    function getElementByXPath(path) {
      return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    // Intercept clicks to select an element
    document.body.addEventListener('click', (e) => {
      // Prevent default actions if clicking a link etc. while annotating
      e.preventDefault();
      e.stopPropagation();

      const target = e.target;
      // Try to get a stable selector: ID first, then data attributes, fallback to XPath
      let selector = '';
      if (target.id) {
        selector = '#' + target.id;
      } else if (target.hasAttribute('data-id')) {
        selector = '[data-id="' + target.getAttribute('data-id') + '"]';
      } else {
        selector = getXPath(target);
      }

      window.parent.postMessage({ type: 'annotate-target', selector }, '*');
      
      // Temporary highlight for visual feedback
      const originalOutline = target.style.outline;
      target.style.outline = '2px solid #FF7A00';
      target.style.outlineOffset = '2px';
      setTimeout(() => {
        target.style.outline = originalOutline;
      }, 500);
    }, true);

    // Listen for highlight commands from parent
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;

      function resolve(selector) {
        try {
          if (selector.startsWith('id(') || selector.startsWith('BODY')) return getElementByXPath(selector);
          return document.querySelector(selector);
        } catch(e) { return null; }
      }

      if (data.type === 'highlight-note' && data.selector) {
        // Clear previous mark
        if (currentMark) {
          currentMark.style.outline = currentMark.dataset.originalOutline || '';
          currentMark = null;
        }

        const targetNode = resolve(data.selector);
        if (targetNode) {
          targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
          currentMark = targetNode;
          currentMark.dataset.originalOutline = currentMark.style.outline;
          currentMark.style.outline = '3px solid rgba(255, 122, 0, 0.8)';
          currentMark.style.outlineOffset = '2px';

          // Resaltar la burbuja si existe
          const bubble = document.querySelector('.immoral-annotation-pin[data-note-id="'+data.id+'"]');
          if (bubble) bubble.style.boxShadow = '0 0 0 4px rgba(255, 122, 0, 0.4)';

          setTimeout(() => {
            if (currentMark === targetNode) {
              currentMark.style.outline = currentMark.dataset.originalOutline || '';
              currentMark = null;
            }
            if (bubble) bubble.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
          }, 3000);
        } else {
          window.parent.postMessage({ type: 'note-orphan', selector: data.selector }, '*');
        }
      } else if (data.type === 'render-notes' && Array.isArray(data.notes)) {
        // Limpiar burbujas existentes
        document.querySelectorAll('.immoral-annotation-pin').forEach(el => el.remove());
        const missing = [];
        
        data.notes.forEach((note) => {
          const node = resolve(note.selector);
          if (!node) {
            missing.push(note.selector);
          } else {
            const bubble = document.createElement('div');
            bubble.className = 'immoral-annotation-pin';
            bubble.textContent = note.initials || '?';
            bubble.dataset.noteId = note.id;
            
            bubble.style.position = 'absolute';
            bubble.style.background = '#FF7A00';
            bubble.style.color = '#fff';
            bubble.style.borderRadius = '50%';
            bubble.style.width = '28px';
            bubble.style.height = '28px';
            bubble.style.display = 'flex';
            bubble.style.alignItems = 'center';
            bubble.style.justifyContent = 'center';
            bubble.style.fontSize = '11px';
            bubble.style.fontWeight = 'bold';
            bubble.style.fontFamily = 'sans-serif';
            bubble.style.cursor = 'pointer';
            bubble.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            bubble.style.zIndex = '999999';
            bubble.style.transition = 'transform 0.15s ease';
            
            bubble.addEventListener('mouseenter', () => bubble.style.transform = 'scale(1.15)');
            bubble.addEventListener('mouseleave', () => bubble.style.transform = 'scale(1)');
            bubble.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              window.parent.postMessage({ type: 'open-note', id: note.id }, '*');
            });
            
            bubble._updatePos = () => {
              const rect = node.getBoundingClientRect();
              bubble.style.top = (rect.top + window.scrollY - 14) + 'px';
              bubble.style.left = (rect.right + window.scrollX - 14) + 'px';
            };
            bubble._updatePos();
            
            document.body.appendChild(bubble);
          }
        });
        if (missing.length > 0) {
          window.parent.postMessage({ type: 'orphan-selectors', selectors: missing }, '*');
        }
      }
    });

    // Actualización global en scroll/resize/reflow
    function updateAllBubbles() {
      document.querySelectorAll('.immoral-annotation-pin').forEach(el => {
        if (typeof el._updatePos === 'function') el._updatePos();
      });
    }
    window.addEventListener('scroll', updateAllBubbles, true);
    window.addEventListener('resize', updateAllBubbles);
    
    // ResizeObserver atrapa reflows producidos por lazy loading de imágenes
    const ro = new ResizeObserver(() => updateAllBubbles());
    ro.observe(document.body);

    // Add visual cue that we are in annotation mode
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
