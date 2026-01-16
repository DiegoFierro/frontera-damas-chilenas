# Frontera - Damas Chilenas

Juego de mesa "Frontera" (variación de Damas Chilenas) implementado en HTML/CSS/JS.

## Cambios principales en esta versión
- Refactor del motor y la UI en `game.js`: módulo `Game`, render incremental, y delegación de eventos.
- Optimización del DOM: el tablero se genera una vez y no se rehace en cada render.
- Mejoras de accesibilidad (roles ARIA, live regions) y pequeñas correcciones CSS.

## Instalación
1. Clona o descarga el repositorio.
2. Asegúrate de tener los archivos: `index.html`, `style.css`, `game.js`, `manual.pdf`.
3. Abre `index.html` en un navegador moderno.

## Notas para desarrolladores
- El módulo `Game` expone `Game.init()` y `Game.setupGame(color)`.
- Para pruebas unitarias, inspecciona `Game._debug()` desde la consola.

---
