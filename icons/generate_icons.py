#!/usr/bin/env python3
"""Generate simple PNG icons for the Chrome extension."""

from PIL import Image, ImageDraw

def create_icon(size):
    # Create image with blue background
    img = Image.new('RGB', (size, size), color='#1976d2')
    draw = ImageDraw.Draw(img)

    # Scale factor
    scale = size / 128

    # Draw white clipboard rectangle
    padding = int(32 * scale)
    top = int(24 * scale)
    width = int(64 * scale)
    height = int(80 * scale)

    draw.rounded_rectangle(
        [(padding, top), (padding + width, top + height)],
        radius=int(8 * scale),
        fill='white'
    )

    # Draw clipboard clip at top
    clip_x = int(44 * scale)
    clip_y = int(16 * scale)
    clip_w = int(40 * scale)
    clip_h = int(16 * scale)

    draw.rounded_rectangle(
        [(clip_x, clip_y), (clip_x + clip_w, clip_y + clip_h)],
        radius=int(4 * scale),
        fill='#90caf9'
    )

    # Draw arrow (simplified as a triangle)
    arrow_y = int(64 * scale)
    arrow_x1 = int(52 * scale)
    arrow_x2 = int(76 * scale)
    arrow_size = int(12 * scale)

    draw.polygon(
        [(arrow_x2, arrow_y),
         (arrow_x2 - arrow_size, arrow_y - arrow_size),
         (arrow_x2 - arrow_size, arrow_y + arrow_size)],
        fill='#1976d2'
    )

    return img

# Generate icons
for size in [16, 48, 128]:
    icon = create_icon(size)
    icon.save(f'/home/user/Clip-to-LLM/icons/icon{size}.png')
    print(f'Generated icon{size}.png')

print('All icons generated successfully!')
