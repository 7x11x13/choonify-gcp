#!/usr/bin/env python3

import base64
import mimetypes

default_file = "default.png"
default_name = "public/default-image"

img_type, _ = mimetypes.guess_type(default_file)
if img_type is None:
    raise ValueError("Could not get mime type of default image")

print("Image type:", img_type)

with open(default_file, "rb") as f:
    image_str = base64.b64encode(f.read()).decode()

with open("packages/frontend/src/types/default-image.ts", "w") as f:
    f.write(f'export const defaultImageB64: string =\n  "{image_str}";\n')
    f.write(f'export const defaultImageType: string = "{img_type}";\n')
