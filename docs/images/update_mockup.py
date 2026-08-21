import os
from PIL import Image, ImageDraw, ImageFont

artifact_dir = r"C:\Laragon\www\blackhand\docs\images"
os.makedirs(artifact_dir, exist_ok=True)

try:
    font_large = ImageFont.truetype("arial.ttf", 36)
    font_title = ImageFont.truetype("arial.ttf", 26)
    font_body = ImageFont.truetype("arial.ttf", 16)
    font_small = ImageFont.truetype("arial.ttf", 13)
    font_bold = ImageFont.truetype("arialbd.ttf", 18)
    font_hero = ImageFont.truetype("georgia.ttf", 52)
except:
    font_large = font_title = font_body = font_small = font_bold = font_hero = ImageFont.load_default()

def create_artistic_landing_mockup():
    img = Image.new("RGBA", (1200, 750), "#030712")
    draw = ImageDraw.Draw(img)

    # Simulate /arte.jpeg background image with artistic painting textures & dark vibe
    bg_art = Image.new("RGBA", (1200, 750), (15, 20, 30))
    bg_draw = ImageDraw.Draw(bg_art)
    # Artistic shapes simulating painting backdrop
    bg_draw.polygon([(0, 0), (1200, 0), (1200, 450), (0, 600)], fill=(25, 30, 45))
    bg_draw.ellipse([200, -100, 1000, 600], fill=(45, 25, 60))
    bg_draw.ellipse([600, 200, 1200, 800], fill=(20, 45, 65))
    
    img = Image.alpha_composite(img, bg_art)

    # Dark Vignette / Gradient Overlay
    vignette = Image.new("RGBA", (1200, 750), (0, 0, 0, 0))
    v_draw = ImageDraw.Draw(vignette)
    v_draw.rectangle([0, 0, 1200, 750], fill=(3, 7, 18, 120)) # Darken overall
    # Bottom gradient overlay for dark touch
    for y in range(400, 750):
        alpha = int(120 + ((y - 400) / 350) * 125)
        v_draw.line([(0, y), (1200, y)], fill=(3, 7, 18, min(alpha, 245)))
    
    img = Image.alpha_composite(img, vignette)
    draw = ImageDraw.Draw(img)

    # Floating Minimalist Glassmorphic Navbar
    draw.rounded_rectangle([40, 25, 1160, 80], radius=16, fill=(15, 23, 42, 170), outline=(255, 255, 255, 30), width=1)
    draw.text((70, 42), "✋ BLACKHAND", font=font_bold, fill=(255, 255, 255))
    draw.text((450, 44), "Home    Gallery    Works    About", font=font_body, fill=(226, 232, 240))
    draw.line([450, 66, 492, 66], fill=(139, 92, 246), width=3) # Active tab
    
    # Theme & Sign In button
    draw.rounded_rectangle([1010, 38, 1130, 68], radius=10, fill=(139, 92, 246), outline=None)
    draw.text((1035, 45), "Sign In", font=font_small, fill=(255, 255, 255))

    # Artistic Overlay Text at Bottom Center (Preserving full-bleed /arte.jpeg view)
    draw.text((600, 460), "BLACKHAND", font=font_hero, fill=(255, 255, 255), anchor="mm")
    draw.text((600, 515), "Artistic Portfolio & Creative Gallery", font=font_title, fill=(203, 213, 225), anchor="mm")
    draw.text((600, 555), "Menampilkan estetika seni visual dalam balutan antarmuka gelap yang elegan", font=font_body, fill=(148, 163, 184), anchor="mm")

    # Subtle Action Floating Pill
    draw.rounded_rectangle([450, 600, 600, 645], radius=22, fill=(124, 58, 237, 220), outline=(255, 255, 255, 40), width=1)
    draw.text((525, 622), "Jelajahi Galeri ↓", font=font_small, fill=(255, 255, 255), anchor="mm")

    draw.rounded_rectangle([615, 600, 750, 645], radius=22, fill=(15, 23, 42, 180), outline=(255, 255, 255, 30), width=1)
    draw.text((682, 622), "Masuk Akun", font=font_small, fill=(226, 232, 240), anchor="mm")

    path = os.path.join(artifact_dir, "landing_page_mockup.png")
    img.save(path)
    
    # Also save to system artifact folder
    sys_path = r"C:\Users\user\.gemini\antigravity\brain\216e8c89-c95c-46bb-bc44-b83630d26a33\landing_page_mockup.png"
    img.save(sys_path)
    print("Saved artistic landing mockup to both paths")

create_artistic_landing_mockup()
