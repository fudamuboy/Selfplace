import sys
from PIL import Image

def analyze_image(path):
    try:
        img = Image.open(path)
        print(f"Size: {img.size}")
        print(f"Format: {img.format}")
        print(f"Mode: {img.mode}")
        
        # Get background color from corners
        corners = [
            img.getpixel((0, 0)),
            img.getpixel((img.width - 1, 0)),
            img.getpixel((0, img.height - 1)),
            img.getpixel((img.width - 1, img.height - 1))
        ]
        print(f"Corners: {corners}")
    except Exception as e:
        print(f"Error: {e}")

analyze_image("/Users/slim/.gemini/antigravity-ide/brain/5e194ffb-937a-4316-87ad-18a787fca454/media__1779529478185.jpg")
