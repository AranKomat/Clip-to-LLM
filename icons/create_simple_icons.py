#!/usr/bin/env python3
"""Create simple solid color PNG icons as placeholders."""

import struct
import zlib

def create_simple_png(size, color_rgb):
    """Create a simple solid color PNG."""
    width = height = size

    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk (image header)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_chunk = create_chunk(b'IHDR', ihdr_data)

    # IDAT chunk (image data)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter type
        for x in range(width):
            raw_data += bytes(color_rgb)  # RGB

    compressed_data = zlib.compress(raw_data, 9)
    idat_chunk = create_chunk(b'IDAT', compressed_data)

    # IEND chunk (end of file)
    iend_chunk = create_chunk(b'IEND', b'')

    return png_signature + ihdr_chunk + idat_chunk + iend_chunk

def create_chunk(chunk_type, data):
    """Create a PNG chunk with CRC."""
    length = struct.pack('>I', len(data))
    crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
    return length + chunk_type + data + crc

# Blue color for the icon (matching the extension theme)
blue = (25, 118, 210)  # #1976d2

# Create icons
for size in [16, 48, 128]:
    png_data = create_simple_png(size, blue)
    with open(f'/home/user/Clip-to-LLM/icons/icon{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Created icon{size}.png ({len(png_data)} bytes)')

print('All placeholder icons created successfully!')
