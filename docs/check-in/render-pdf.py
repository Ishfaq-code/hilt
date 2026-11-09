"""Package the locally rendered PlantUML PNGs for the instructor check-in."""
from pathlib import Path

from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

directory = Path(__file__).resolve().parent
output = directory / "hilt-check-in-diagrams.pdf"
page_width, page_height = landscape(A3)
document = canvas.Canvas(str(output), pagesize=(page_width, page_height))
document.setTitle("Hilt - Team 2 instructor check-in diagrams")
document.setAuthor("Hilt Team 2")
diagrams = [
    ("erd.png", "Implemented schema - current source models"),
    ("gantt.png", "Delivery forecast - future dates are estimates"),
    ("planned-erd.png", "Appendix - proposed PRD relationships, not implemented"),
]
for number, (filename, caption) in enumerate(diagrams, 1):
    image = ImageReader(str(directory / filename))
    width, height = image.getSize()
    scale = min((page_width - 48) / width, (page_height - 72) / height)
    draw_width, draw_height = width * scale, height * scale
    document.drawImage(image, (page_width - draw_width) / 2, (page_height - draw_height) / 2,
                       width=draw_width, height=draw_height, mask="auto")
    document.setFont("Helvetica", 10)
    document.drawString(24, 18, f"Hilt | Team 2 | 9 November 2026 | {caption}")
    document.drawRightString(page_width - 24, 18, f"{number} / {len(diagrams)}")
    document.showPage()
document.save()
print(output)
