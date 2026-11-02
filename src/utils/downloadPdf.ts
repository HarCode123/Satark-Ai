import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to parse and convert any modern CSS color (including Tailwind v4 oklch) into RGB/hex
function createOklchConverter() {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }

  return function convertOklch(str: string): string {
    if (!str || typeof str !== 'string' || !str.includes('oklch')) {
      return str;
    }

    return str.replace(/oklch\([^)]*(?:\([^)]*\)[^)]*)*\)/gi, (match) => {
      if (ctx) {
        try {
          ctx.fillStyle = '#64748b';
          ctx.fillStyle = match;
          const computed = ctx.fillStyle;
          if (computed && !computed.includes('oklch')) {
            return computed;
          }
        } catch {
          // ignore error and fallback
        }
      }
      return '#64748b';
    });
  };
}

// Proxies window.getComputedStyle so html2canvas never receives oklch color strings
function wrapWindowComputedStyle(targetWindow: Window, convertFn: (v: string) => string): () => void {
  try {
    const originalGetComputedStyle = targetWindow.getComputedStyle.bind(targetWindow);

    targetWindow.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return (propName: string) => {
              const val = target.getPropertyValue(propName);
              return typeof val === 'string' && val.includes('oklch') ? convertFn(val) : val;
            };
          }
          // Do not pass receiver to Reflect.get on native CSSStyleDeclaration to avoid "Illegal invocation"
          const val = Reflect.get(target, prop);
          if (typeof val === 'function') {
            return val.bind(target);
          }
          if (typeof val === 'string' && val.includes('oklch')) {
            return convertFn(val);
          }
          return val;
        }
      });
    };

    return () => {
      targetWindow.getComputedStyle = originalGetComputedStyle;
    };
  } catch {
    return () => {};
  }
}

/**
 * Captures a dedicated printable prescription DOM element,
 * renders high-resolution canvas, formats as A4 portrait PDF,
 * handles multi-page flow if needed, and downloads automatically.
 */
export async function downloadPrescriptionPDF(
  element: HTMLElement,
  patientName: string,
  patientId: string,
  consultationDate?: string
): Promise<{ success: boolean; message: string }> {
  if (!element) {
    return {
      success: false,
      message: 'Unable to generate the PDF. Prescription printable element not found.',
    };
  }

  const convertOklch = createOklchConverter();
  let restoreMainWindowComputedStyle: (() => void) | null = null;

  try {
    // Intercept computed styles on main window during html2canvas pre-cloning
    if (typeof window !== 'undefined') {
      restoreMainWindowComputedStyle = wrapWindowComputedStyle(window, convertOklch);
    }

    // 1. Render canvas using html2canvas with scale: 2 for sharp text & vector crispness
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: element.scrollWidth || 800,
      height: element.scrollHeight || 1100,
      windowWidth: 850,
      onclone: (clonedDoc) => {
        // Intercept computed styles on cloned iframe window as well
        if (clonedDoc.defaultView) {
          wrapWindowComputedStyle(clonedDoc.defaultView, convertOklch);
        }

        // Ensure the target element is fully visible and rendered in the clone
        const clonedEl = clonedDoc.getElementById('printable-prescription-pdf');
        if (clonedEl) {
          clonedEl.style.position = 'relative';
          clonedEl.style.top = '0';
          clonedEl.style.left = '0';
          clonedEl.style.zIndex = '999999';
          clonedEl.style.display = 'block';
          clonedEl.style.visibility = 'visible';
          clonedEl.style.opacity = '1';
          clonedEl.style.width = '800px';
          clonedEl.style.backgroundColor = '#ffffff';
        }

        // Fix all style tags containing oklch
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach((style) => {
          if (style.textContent && style.textContent.includes('oklch')) {
            style.textContent = convertOklch(style.textContent);
          }
        });

        // Replace any inline oklch references in elements
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes('oklch')) {
            htmlEl.style.cssText = convertOklch(htmlEl.style.cssText);
          }
        });
      },
    });

    // 2. Initialize A4 Portrait PDF (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidthMm = 210; // A4 page width in mm
    const pdfHeightMm = 297; // A4 page height in mm

    // Convert mm to canvas pixels ratio
    const pxToMm = pdfWidthMm / canvas.width;
    const mmToPx = canvas.width / pdfWidthMm;
    const pageHeightPx = pdfHeightMm * mmToPx;
    const totalCanvasHeight = canvas.height;

    // Detect all keep-together elements inside the original element
    const keepTogetherElements = Array.from(element.querySelectorAll('[data-pdf-keep-together="true"]'));
    const elementRect = element.getBoundingClientRect();
    const scaleFactor = canvas.width / (element.scrollWidth || 800);

    const keepBlocks = keepTogetherElements.map((el) => {
      const rect = el.getBoundingClientRect();
      const topPx = (rect.top - elementRect.top) * scaleFactor;
      const bottomPx = (rect.bottom - elementRect.top) * scaleFactor;
      return { topPx, bottomPx, heightPx: bottomPx - topPx };
    });

    // Calculate smart page cut points in canvas pixels
    let currentY = 0;
    const pageSlices: { startY: number; endY: number }[] = [];

    while (currentY < totalCanvasHeight) {
      let targetEndY = currentY + pageHeightPx;

      if (targetEndY >= totalCanvasHeight - 10) {
        // Last page reaches the end
        pageSlices.push({ startY: currentY, endY: totalCanvasHeight });
        break;
      }

      // Check if targetEndY slices through any keep-together block
      const intersectingBlock = keepBlocks.find(
        (b) => b.topPx < targetEndY && b.bottomPx > targetEndY && b.topPx > currentY + 40
      );

      if (intersectingBlock) {
        // Shift cut point to the top of the block so it starts cleanly on the next page
        targetEndY = intersectingBlock.topPx;
      }

      // Safeguard against non-advancing cuts
      if (targetEndY <= currentY + 50) {
        targetEndY = currentY + pageHeightPx;
      }

      pageSlices.push({ startY: currentY, endY: targetEndY });
      currentY = targetEndY;
    }

    // Render each page slice onto jsPDF
    pageSlices.forEach((slice, index) => {
      if (index > 0) {
        pdf.addPage();
      }

      const sliceHeightPx = slice.endY - slice.startY;
      const sliceHeightMm = sliceHeightPx * pxToMm;

      // Create a dedicated page canvas slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        ctx.drawImage(
          canvas,
          0,
          slice.startY,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );

        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidthMm, sliceHeightMm, undefined, 'FAST');
      }
    });

    // 5. Construct standardized filename
    const cleanName = (patientName || 'Patient')
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cleanId = (patientId || 'PID')
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cleanDate = (consultationDate || new Date().toISOString().split('T')[0])
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, '_');

    const fileName = `${cleanId}_${cleanName}_${cleanDate}_Prescription.pdf`;

    // 6. Save/Trigger Browser Download
    pdf.save(fileName);

    return {
      success: true,
      message: `Prescription PDF downloaded successfully as "${fileName}".`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('PDF Generation Error:', errorMsg);
    return {
      success: false,
      message: `Failed to download PDF: ${errorMsg}`,
    };
  } finally {
    if (restoreMainWindowComputedStyle) {
      try {
        restoreMainWindowComputedStyle();
      } catch {
        // ignore
      }
    }
  }
}
