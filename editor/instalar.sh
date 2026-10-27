#!/usr/bin/env bash
# Instala lo necesario para el editor: Python (kokoro-onnx, piper-tts, Pillow, NumPy), ffmpeg y las voces en español.
set -e
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "Falta ffmpeg (apt install ffmpeg / brew install ffmpeg)"; exit 1; }
pip install -q kokoro-onnx soundfile piper-tts pillow numpy
mkdir -p voces
for v in es_ES-davefx-medium es_ES-sharvard-medium; do
  [ -f "voces/$v.onnx" ] && continue
  curl -sL "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-$v.tar.bz2" | tar xj -C voces
  mv "voces/vits-piper-$v/$v.onnx" "voces/vits-piper-$v/$v.onnx.json" voces/
  rm -rf "voces/vits-piper-$v"
done
# Voz principal: Kokoro (neuronal, natural). Se convierte la tabla de voces al formato de kokoro-onnx.
if [ ! -f voces/kokoro/voices.npz ]; then
  curl -sL "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2" \
    | tar xj -C voces kokoro-multi-lang-v1_0/model.onnx kokoro-multi-lang-v1_0/voices.bin
  mv voces/kokoro-multi-lang-v1_0 voces/kokoro
  python3 -c "
import numpy as np, onnxruntime as ort
n = ort.InferenceSession('voces/kokoro/model.onnx').get_modelmeta().custom_metadata_map['speaker_names'].split(',')
v = np.fromfile('voces/kokoro/voices.bin', dtype=np.float32).reshape(len(n), 510, 1, 256)
np.savez('voces/kokoro/voices.npz', **{k: v[i] for i, k in enumerate(n)})"
  rm voces/kokoro/voices.bin
fi
echo "Editor listo. Uso: python3 editor/render.py editor/episodios/<carpeta>"
