from pathlib import Path

from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "output" / "playwright"
OUTPUT = ROOT / "output" / "pdf" / "instead-brand-book-2026.pdf"
PAGE_SIZE = (1152, 720)

PAGES = [
    "01-essencia.png",
    "02-logo-protecao.png",
    "03-paleta.png",
    "04-tipografia.png",
    "05-sistema-visual.png",
    "06-aplicacoes.png",
]


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = canvas.Canvas(str(OUTPUT), pagesize=PAGE_SIZE, pageCompression=1)
    document.setTitle("Instead - Kit de Marca 2026")
    document.setAuthor("Instead")
    document.setSubject("Sistema de identidade da marca Instead")

    width, height = PAGE_SIZE
    for filename in PAGES:
        image_path = SOURCE / filename
        if not image_path.exists():
            raise FileNotFoundError(image_path)
        document.drawImage(
            ImageReader(str(image_path)),
            0,
            0,
            width=width,
            height=height,
            preserveAspectRatio=True,
            anchor="c",
            mask="auto",
        )
        document.showPage()

    document.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
