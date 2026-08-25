#!/bin/bash
# Compila o whitepaper.tex em PDF
# Requer: tectonic (https://tectonic-typesetting.github.io/)
# Instalação: cargo install tectonic

set -e

echo "Compilando whitepaper.tex..."

if command -v tectonic &> /dev/null; then
    tectonic whitepaper.tex
    echo "✓ whitepaper.pdf gerado com sucesso!"
elif command -v pdflatex &> /dev/null; then
    pdflatex whitepaper.tex
    pdflatex whitepaper.tex  # segunda passada para TOC
    echo "✓ whitepaper.pdf gerado com sucesso!"
else
    echo "✗ Nenhum compilador LaTeX encontrado."
    echo ""
    echo "Instale tectonic:"
    echo "  cargo install tectonic"
    echo ""
    echo "Ou instale texlive:"
    echo "  sudo pacman -S texlive-core  # Arch/CachyOS"
    echo "  sudo apt install texlive-latex-base  # Debian/Ubuntu"
    echo "  brew install --cask mactex  # macOS"
    exit 1
fi

# Copia para public/ se existir
if [ -d "public" ]; then
    cp whitepaper.pdf public/whitepaper.pdf
    echo "✓ Copiado para public/whitepaper.pdf"
fi

# Catálogo SKU (masterSkuList.json → PDF)
if [[ -f scripts/generate-master-sku-pdf.mjs ]]; then
    echo ""
    echo "Gerando master-sku-list.pdf..."
    node scripts/generate-master-sku-pdf.mjs || echo "⚠ master-sku-list.pdf falhou (ver tectonic/pdflatex)"
fi
