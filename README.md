# 🇨🇱 FRONTERA: Sistema de Damas Chilenas

**FRONTERA** es un simulador táctico digital de alta precisión basado en el reglamento oficial de las **Damas Chilenas**. Diseñado bajo un enfoque de interfaz técnica de control, el sistema ofrece una experiencia optimizada para dispositivos móviles, integrando una inteligencia artificial competitiva y un registro detallado de operaciones.

---

## 📋 Características Principales

* **Identidad Visual Institucional:** Interfaz diseñada con los colores nacionales y simbología técnica de baja interacción para evitar errores de ejecución en pantalla táctil.
* **Diseño Responsivo (Mobile-First):** El tablero se ajusta dinámicamente al ancho del dispositivo, garantizando que el área de juego sea el foco principal.
* **Registro de Operación:** Panel de log en tiempo real que documenta cada movimiento con notación técnica.
* **IA Estratégica (Pangi):** Oponente automático programado para aplicar presión táctica y priorizar capturas masivas.

---

## 🕹️ Reglamento Técnico Implementado

El motor lógico ha sido programado para respetar las mecánicas distintivas de la variante chilena:

1.  **Movimiento de Peones:** Desplazamiento estrictamente **ortogonal** (hacia adelante, izquierda y derecha). Los peones no se desplazan en diagonal.
2.  **Captura Universal:** Todas las piezas (peones y soberanas) capturan en las **8 direcciones** (4 ortogonales y 4 diagonales).
3.  **Vuelo de la Soberana:** Al ser coronada, la pieza puede desplazarse cualquier distancia. Tras una captura, el operador puede elegir **cualquier casilla de aterrizaje vacía** en la línea posterior a la víctima.
4.  **Ley de Cantidad:** El sistema exige la ejecución de la ruta que capture el mayor número de piezas enemigas simultáneamente.



---

## 📊 Nomenclatura del Registro (Log)

Cada movimiento genera una entrada técnica en el panel inferior utilizando los siguientes códigos:

| Término | Acción | Ejemplo de Registro |
| :--- | :--- | :--- |
| **`a`** | Movimiento de avance o reposicionamiento simple. | `BLANCO: C2 a D3` |
| **`captura`** | Eliminación de una unidad enemiga tras un salto. | `NEGRO: F7 captura D5` |

---

## 📁 Documentación y Manual Externo

El sistema integra un botón de información **"i"** en la cabecera del sistema. 

* **Funcionalidad:** Abre el archivo `manual.pdf` en una pestaña independiente.
* **Requisito:** El archivo PDF debe estar alojado en la raíz del servidor/directorio junto al archivo `index.html`.

---

## 🛠️ Especificaciones Técnicas

* **Lenguajes:** HTML5 (Estructura), CSS3 (Grid y Flexbox), JavaScript Vanilla (Motor Lógico).
* **Seguridad de Interfaz:** Gráficos aislados con `pointer-events: none` para evitar reinicios accidentales del DOM durante la partida.
* **Coordenadas:** Sistema de referencia estándar A-H (horizontal) y 1-8 (vertical).

---

## 🚀 Guía de Instalación

1.  Descargue o clone el repositorio con los archivos: `index.html`, `style.css`, `game.js` y `manual.pdf`.
2.  Ubique todos los componentes en una misma carpeta raíz.
3.  Ejecute `index.html` en cualquier navegador moderno.
4.  **Recomendación móvil:** En iOS/Android, utilice la opción "Añadir a pantalla de inicio" para operar el sistema en modo pantalla completa sin barras de navegación.
