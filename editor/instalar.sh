#!/usr/bin/env bash
# Instala lo necesario para el editor: Python (piper-tts, Pillow, NumPy), ffmpeg y la voz en español.
set -e
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "Falta ffmpeg (apt install ffmpeg / brew install ffmpeg)"; exit 1; }
pip install -q piper-tts pillow numpy
mkdir -p voces
for v in es_ES-davefx-medium es_ES-sharvard-medium; do
  [ -f "voces/$v.onnx" ] && continue
  curl -sL "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-$v.tar.bz2" | tar xj -C voces
  mv "voces/vits-piper-$v/$v.onnx" "voces/vits-piper-$v/$v.onnx.json" voces/
  rm -rf "voces/vits-piper-$v"
done
echo "Editor listo. Uso: python3 editor/render.py editor/episodios/<carpeta>"
