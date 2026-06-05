import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";

const DOC_BUCKET = "report-documents";

// Injected bridge script for the presenter (emits scroll and selection)
const presenterScript = `
<script>
  (function() {
    function getHybridSelector(node) {
      if (node.id) return '#' + node.id;
      const attributes = node.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.name.startsWith('data-')) {
          const selector = '[' + attr.name + '="' + attr.value + '"]';
          if (document.querySelectorAll(selector).length === 1) return selector;
        }
      }
      if (node.tagName.toLowerCase() === 'body') return 'body';
      let selector = '';
      let current = node;
      while (current && current.tagName.toLowerCase() !== 'body') {
        let index = 1;
        let sibling = current.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === current.tagName) index++;
          sibling = sibling.previousElementSibling;
        }
        const part = current.tagName.toLowerCase() + ':nth-of-type(' + index + ')';
        selector = selector ? part + ' > ' + selector : part;
        current = current.parentElement;
      }
      return 'body > ' + selector;
    }

    function getXPath(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        let ix = 0;
        let siblings = node.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === node) return getXPath(node.parentNode) + '/text()[' + (ix + 1) + ']';
          if (sibling.nodeType === Node.TEXT_NODE) ix++;
        }
      }
      if (node.id && node.id !== '') return 'id("' + node.id + '")';
      if (node === document.body) return node.tagName;
      if (node === document.documentElement) return 'HTML';
      let ix = 0;
      let siblings = node.parentNode.childNodes;
      for (let i = 0; i < siblings.length; i++) {
        let sibling = siblings[i];
        if (sibling === node) return getXPath(node.parentNode) + '/' + node.tagName + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.tagName === node.tagName) ix++;
      }
    }

    // Scroll
    document.addEventListener('scroll', function(e) {
      const target = e.target;
      if (target === document || target === window) {
        const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        const maxScroll = Math.max(1, scrollHeight - window.innerHeight);
        const percent = window.scrollY / maxScroll;
        window.parent.postMessage({ type: 'scroll', ratio: percent }, '*');
      } else {
        const selector = getHybridSelector(target);
        const maxScroll = Math.max(1, target.scrollHeight - target.clientHeight);
        const percent = target.scrollTop / maxScroll;
        window.parent.postMessage({ type: 'element-scroll', selector, ratio: percent }, '*');
      }
    }, true);

    // Mousemove
    let lastMouseMove = 0;
    document.addEventListener('mousemove', function(e) {
      const now = Date.now();
      if (now - lastMouseMove > 100) {
        lastMouseMove = now;
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target) {
          const rect = target.getBoundingClientRect();
          const percentX = (e.clientX - rect.left) / rect.width;
          const percentY = (e.clientY - rect.top) / rect.height;
          const selector = getHybridSelector(target);
          window.parent.postMessage({ type: 'cursor', selector, percentX, percentY }, '*');
        }
      }
    });

    // Click
    document.addEventListener('click', function(e) {
      const target = e.target;
      const selector = getHybridSelector(target);
      window.parent.postMessage({ type: 'click', selector }, '*');
    }, true);

    // Keydown
    document.addEventListener('keydown', function(e) {
      window.parent.postMessage({ type: 'keydown', key: e.key, code: e.code, keyCode: e.keyCode }, '*');
    }, true);

    // Selection
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        window.parent.postMessage({ type: 'selection-clear' }, '*');
        return;
      }
      try {
        const range = selection.getRangeAt(0);
        window.parent.postMessage({
          type: 'selection',
          startXPath: getXPath(range.startContainer),
          startOffset: range.startOffset,
          endXPath: getXPath(range.endContainer),
          endOffset: range.endOffset,
          text: selection.toString()
        }, '*');
      } catch (e) {}
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

    // Cursor element
    const cursor = document.createElement('div');
    cursor.style.position = 'absolute';
    cursor.style.width = '24px';
    cursor.style.height = '24px';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '999999';
    cursor.style.transition = 'transform 0.1s linear';
    cursor.style.display = 'none';
    cursor.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>';
    document.body.appendChild(cursor);

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'scroll') {
        const y = data.ratio * Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: y, behavior: 'auto' });
      } else if (data.type === 'element-scroll') {
        const el = document.querySelector(data.selector);
        if (el) {
          const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
          el.scrollTop = data.ratio * maxScroll;
        }
      } else if (data.type === 'cursor') {
        const el = document.querySelector(data.selector);
        if (el) {
          cursor.style.display = 'block';
          const rect = el.getBoundingClientRect();
          const x = rect.left + (data.percentX * rect.width) + window.scrollX;
          const y = rect.top + (data.percentY * rect.height) + window.scrollY;
          cursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
        }
      } else if (data.type === 'cursor-hide') {
        cursor.style.display = 'none';
      } else if (data.type === 'click') {
        const el = document.querySelector(data.selector);
        if (el) {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
      } else if (data.type === 'keydown') {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: data.key, code: data.code, keyCode: data.keyCode, bubbles: true }));
      } else if (data.type === 'selection') {
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
            const startText = Array.from(startNode.childNodes).find(n => n.nodeType === 3) || startNode;
            const endText = Array.from(endNode.childNodes).find(n => n.nodeType === 3) || endNode;
            const range = document.createRange();
            range.setStart(startText, Math.min(data.startOffset, startText.length || 0));
            range.setEnd(endText, Math.min(data.endOffset, endText.length || 0));
            currentMark = document.createElement('mark');
            currentMark.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
            range.surroundContents(currentMark);
          }
        } catch(e) {}
      } else if (data.type === 'selection-clear') {
        if (currentMark) {
          const parent = currentMark.parentNode;
          while(currentMark.firstChild) parent.insertBefore(currentMark.firstChild, currentMark);
          parent.removeChild(currentMark);
          currentMark = null;
        }
      }
    });
    
    document.body.style.overflow = 'hidden';
    const style = document.createElement('style');
    style.innerHTML = '::-webkit-scrollbar { display: none; }';
    document.head.appendChild(style);
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
