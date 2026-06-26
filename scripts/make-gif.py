from PIL import Image
import os

gif_dir = '/mnt/c/Users/kevin/Desktop/polyglot-main/screenshots/ai-tutor'
out_path = '/mnt/c/Users/kevin/Desktop/polyglot-main/screenshots/ai-tutor-demo.gif'

# Select frames for the GIF (order matters for demo flow)
frames_info = [
    ('11-settings-test.png', 3000),   # Settings + Test Connection
    ('02-mode-selector.png', 2500),    # Mode selector overview
    ('03-conversation.png', 3000),     # Conversation mode
    ('04-reading.png', 3000),          # Guided Reading
    ('05-grammar.png', 2500),          # Grammar
    ('06-vocabulary.png', 2500),       # Word Explorer
    ('07-stories.png', 2500),          # Stories
    ('08-roleplay.png', 2500),         # Role Play
    ('09-pronunciation.png', 2500),    # Pronunciation
    ('10-freeform.png', 2500),         # Free Chat
]

images = []
durations = []

for fname, duration in frames_info:
    fpath = os.path.join(gif_dir, fname)
    if os.path.exists(fpath):
        img = Image.open(fpath)
        # Resize to consistent width (375px) for smooth GIF
        ratio = 375 / img.width
        new_size = (375, int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)
        images.append(img)
        durations.append(duration)
        print(f"Added: {fname} ({new_size[0]}x{new_size[1]})")
    else:
        print(f"Missing: {fname}")

if images:
    # Save as animated GIF
    images[0].save(
        out_path,
        save_all=True,
        append_images=images[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )
    size_kb = os.path.getsize(out_path) / 1024
    print(f"\nGIF saved: {out_path} ({size_kb:.0f} KB, {len(images)} frames)")
else:
    print("No images found!")
