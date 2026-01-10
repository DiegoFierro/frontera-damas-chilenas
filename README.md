# FRONTERA: Sistema de Damas Chilenas 🇨🇱

**FRONTERA** es un simulador táctico digital diseñado para ejecutar partidas bajo el reglamento del **Sistema de Damas Chilenas**. Este motor estratégico se enfoca en la precisión de movimientos, una interfaz optimizada para dispositivos móviles y una identidad visual institucional.

## 📋 Características Principales

* **Identidad Visual:** Interfaz técnica con los colores nacionales chilenos y simbología integrada.
* **Diseño Responsivo:** Tablero dinámico que ocupa el máximo espacio en pantalla móvil sin perder las referencias de coordenadas.
* **Registro de Operación:** Sistema de log que utiliza notación técnica en español para el seguimiento de la partida.
* **IA Estratégica:** Oponente automático (Pangi) programado para priorizar capturas masivas.

## 🕹️ Nomenclatura del Registro (Log)

El sistema documenta cada acción en tiempo real utilizando los siguientes términos:

* **Movimiento Simple (`a`):** Traslado de una pieza a una casilla adyacente vacía.
    * *Ejemplo:* `BLANCO: C2 a D3`
* **Acción de Captura (`captura`):** Eliminación de una unidad enemiga saltando sobre ella.
    * *Ejemplo:* `NEGRO: F7 captura D5`

## 📁 Documentación y Manual

El sistema incluye un botón de información **"i"** en el encabezado. Al ser accionado, abre el archivo `manual.pdf` en una nueva pestaña del navegador.

> **Nota:** Para que esta función sea operativa, el archivo `manual.pdf` debe estar alojado en la raíz del proyecto junto a los demás archivos fuente.

## 🛠️ Tecnologías

* **HTML5 / CSS3:** Maquetación técnica y Grid responsivo.
* **JavaScript:** Motor de lógica de juego y validación de reglas específicas chilenas.

## 🚀 Instalación

1.  Asegúrese de que los archivos `index.html`, `style.css`, `game.js` y `manual.pdf` se encuentren en la misma carpeta.
2.  Abra `index.html` en su navegador preferido.
3.  En dispositivos móviles, utilice el dispositivo en orientación vertical para una mejor experiencia táctil.
