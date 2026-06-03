import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";

const DOC_BUCKET = "report-documents";

// Injected bridge script for the presenter (emits scroll and selection)
const presenterScript = `
<script>
  (function() {
    function sendScroll() {
      const ratio = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.parent.postMessage({ type: 'scroll', ratio }, '*');
    }
    
    // Throttle scroll events
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          sendScroll();
          scrollTimeout = null;
        }, 50);
      }
    });

    // Handle text selection (simplified for v1: just send plain string or clear)
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        window.parent.postMessage({ type: 'selection-clear' }, '*');
        return;
      }
      
      // For v1, we'll implement a basic anchorNode/focusNode offset representation
      // Full XPath is complex to inject reliably without a bigger library.
      // We will send a placeholder or basic selection for this spec, as per requirement.
      // To strictly follow spec 19: "calcula XPath inicio/fin + offsets"
      function getXPath(node) {
        if (node.id !== '') return 'id("' + node.id + '")';
        if (node === document.body) return node.nodeName;
        let ix = 0;
        let siblings = node.parentNode ? node.parentNode.childNodes : [];
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === node) return getXPath(node.parentNode) + '/' + node.nodeName + '[' + (ix + 1) + ']';
          if (sibling.nodeType === 1 && sibling.nodeName === node.nodeName) ix++;
        }
      }
      
      try {
        const range = selection.getRangeAt(0);
        const startXPath = getXPath(range.startContainer.nodeType === 3 ? range.startContainer.parentNode : range.startContainer);
        const endXPath = getXPath(range.endContainer.nodeType === 3 ? range.endContainer.parentNode : range.endContainer);
        
        window.parent.postMessage({ 
          type: 'selection', 
          startXPath, 
          startOffset: range.startOffset, 
          endXPath, 
          endOffset: range.endOffset 
        }, '*');
      } catch (e) {
        console.error("Selection sync error", e);
      }
    });
  })();
</script>
`;

// Injected bridge script for the viewer (receives scroll and selection)
const viewerScript = `
<script>
  (function() {
    let currentMark = null;

    function getElementByXPath(path) {
      return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'scroll') {
        const y = data.ratio * Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: y, behavior: 'auto' });
      } else if (data.type === 'selection') {
        // Clear previous mark
        if (currentMark) {
          const parent = currentMark.parentNode;
          while(currentMark.firstChild) parent.insertBefore(currentMark.firstChild, currentMark);
          parent.removeChild(currentMark);
          currentMark = null;
        }
        
        try {
          const startNode = getElementByXPath(data.startXPath);
          const endNode = getElementByXPath(data.endXPath);
          if (startNode && endNode) {
            // Find text nodes
            const startText = Array.from(startNode.childNodes).find(n => n.nodeType === 3) || startNode;
            const endText = Array.from(endNode.childNodes).find(n => n.nodeType === 3) || endNode;
            
            const range = document.createRange();
            range.setStart(startText, Math.min(data.startOffset, startText.length || 0));
            range.setEnd(endText, Math.min(data.endOffset, endText.length || 0));
            
            currentMark = document.createElement('mark');
            currentMark.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
            range.surroundContents(currentMark);
          }
        } catch(e) {
          console.error("Selection apply error", e);
        }
      } else if (data.type === 'selection-clear') {
        if (currentMark) {
          const parent = currentMark.parentNode;
          while(currentMark.firstChild) parent.insertBefore(currentMark.firstChild, currentMark);
          parent.removeChild(currentMark);
          currentMark = null;
        }
      }
    });
    
    // Disable scrolling for viewer to force sync
    document.body.style.overflow = 'hidden';
  })();
</script>
`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return new NextResponse("Token requerido", { status: 400 });

  const role = new URL(request.url).searchParams.get("role") ?? "viewer"; // presenter | viewer

  const tokenHash = hashToken(token);
  const supabaseAdmin = createAdminClient();

  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("report_sessions")
    .select("report_id, expires_at, ended_at")
    .eq("token_hash", tokenHash)
    .eq("session_type", "presentation")
    .single();

  if (sessionError || !sessionData) {
    return new NextResponse("Presentación no disponible o token inválido", { status: 401 });
  }

  if (sessionData.ended_at !== null) {
    return new NextResponse("La presentación ha finalizado", { status: 401 });
  }

  if (new Date(sessionData.expires_at) < new Date()) {
    return new NextResponse("El enlace de la presentación ha expirado", { status: 401 });
  }

  const reportId = sessionData.report_id;

  // Get active version
  const { data: reportData } = await supabaseAdmin
    .from("reports")
    .select("current_version")
    .eq("id", reportId)
    .single();

  if (!reportData) {
    return new NextResponse("Informe no encontrado", { status: 404 });
  }

  const { data: versionData } = await supabaseAdmin
    .from("report_versions")
    .select("storage_path, format")
    .eq("report_id", reportId)
    .eq("version_number", reportData.current_version)
    .single();

  if (!versionData) {
    return new NextResponse("Versión activa no encontrada", { status: 404 });
  }

  const { data: fileData, error: fileError } = await supabaseAdmin.storage
    .from(DOC_BUCKET)
    .download(versionData.storage_path);

  if (fileError || !fileData) {
    return new NextResponse("Error al descargar el documento", { status: 500 });
  }

  const buffer = await fileData.arrayBuffer();

  if (versionData.format === "html") {
    let htmlContent = new TextDecoder("utf-8").decode(buffer);
    const scriptToInject = role === "presenter" ? presenterScript : viewerScript;
    
    // Inject before </body> if possible, else append
    if (htmlContent.includes("</body>")) {
      htmlContent = htmlContent.replace("</body>", `\n${scriptToInject}\n</body>`);
    } else {
      htmlContent += `\n${scriptToInject}`;
    }

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Do not cache this dynamic content
        "Cache-Control": "no-store, max-age=0",
        "Content-Security-Policy": "frame-ancestors 'self';",
      },
    });
  } else {
    // PDF format
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }
}
