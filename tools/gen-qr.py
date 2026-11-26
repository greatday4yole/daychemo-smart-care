# -*- coding: utf-8 -*-
"""生成演示入口二维码（医护端 / 患者端 / 床头端）"""
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer

BASE = "https://greatday4yole.github.io/daychemo-smart-care/"
TARGETS = [
    ("qr-web", "医护端 / 角色选择", BASE),
    ("qr-patient", "患者端 H5", BASE + "#/patient"),
    ("qr-bedside", "床头端", BASE + "#/bedside"),
]

for name, label, url in TARGETS:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(image_factory=StyledPilImage, module_drawer=RoundedModuleDrawer(), fill_color="#0e8f92", back_color="white")
    img.save(f"docs/images/{name}.png")
    print(f"{name}.png  {label}  {url}")
