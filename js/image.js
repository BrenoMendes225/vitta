/* Imagens: compressão no aparelho antes de enviar/guardar. */

/** Lê o arquivo e devolve um canvas redimensionado. */
async function drawToCanvas(file, maxSide) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      el.src = url;
    });
    const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file, maxSide = 1200, quality = 0.74) {
  const { canvas, width, height } = await drawToCanvas(file, maxSide);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return { blob: blob || file, width, height };
}

/** Miniatura em dataURL, para listas (evita carregar blobs grandes). */
export async function thumbnail(file, maxSide = 360, quality = 0.6) {
  const { canvas } = await drawToCanvas(file, maxSide);
  return canvas.toDataURL('image/jpeg', quality);
}
