import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.min.mjs";

const reader = document.querySelector(".fontaine-pdf-reader");

if (reader) {
  const spread = reader.querySelector(".fontaine-pdf-spread");
  const status = reader.querySelector(".fontaine-pdf-status");
  const previousButton = reader.querySelector(".fontaine-pdf-previous");
  const nextButton = reader.querySelector(".fontaine-pdf-next");
  const pdfUrl = new URL(reader.dataset.pdfSrc, document.baseURI).href;

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.min.mjs";

  let pdf;
  let firstPage = 1;
  let renderVersion = 0;

  const pagesPerSpread = () =>
    window.matchMedia("(max-width: 700px)").matches ? 1 : 2;

  const renderSpread = async () => {
    const version = ++renderVersion;
    const count = pagesPerSpread();
    const lastPage = Math.min(firstPage + count - 1, pdf.numPages);
    const styles = window.getComputedStyle(spread);
    const horizontalPadding =
      parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const availableWidth = spread.clientWidth - horizontalPadding;
    const gap = parseFloat(styles.columnGap) || 0;
    const pageWidth = (availableWidth - gap * (count - 1)) / count;
    const maxPageHeight = Math.min(window.innerHeight * 0.78, 1000);

    spread.replaceChildren();
    status.textContent = `Pages ${firstPage}–${lastPage} sur ${pdf.numPages}`;
    previousButton.disabled = firstPage === 1;
    nextButton.disabled = lastPage === pdf.numPages;

    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      if (version !== renderVersion) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        pageWidth / baseViewport.width,
        maxPageHeight / baseViewport.height
      );
      const viewport = page.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Impossible de créer le canvas du lecteur PDF.");
      }

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.setAttribute("aria-label", `Page ${pageNumber}`);
      spread.append(canvas);

      await page.render({
        canvasContext: context,
        transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
        viewport
      }).promise;
      if (version !== renderVersion) return;
    }
  };

  previousButton.addEventListener("click", () => {
    firstPage = Math.max(1, firstPage - pagesPerSpread());
    renderSpread().catch(showError);
  });

  nextButton.addEventListener("click", () => {
    firstPage = Math.min(
      pdf.numPages,
      firstPage + pagesPerSpread()
    );
    renderSpread().catch(showError);
  });

  let resizeTimeout;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      renderSpread().catch(showError);
    }, 150);
  });

  function showError(error) {
    console.error("Erreur lors du chargement du lecteur PDF.", error);
    status.textContent =
      "Le lecteur PDF n’a pas pu charger le livret. Utilisez le lien ci-dessous pour l’ouvrir.";
    previousButton.disabled = true;
    nextButton.disabled = true;
    spread.replaceChildren();
  }

  pdfjsLib.getDocument({ url: pdfUrl }).promise
    .then((document) => {
      pdf = document;
      return renderSpread();
    })
    .catch(showError);
}
