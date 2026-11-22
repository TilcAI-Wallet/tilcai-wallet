# Guía de marca TilcAI Wallet (V5.0)

Resumen operativo de la guía oficial `Tilcai_Wallet_Guia_de_Marca_oficial.pdf` (14 páginas) para agentes de IA y desarrolladores. Si este documento y el PDF discrepan, manda el PDF.

Lema: **Tus activos. Tu control.**

## Esencia

Propósito: hacer que gestionar activos digitales sea simple, comprensible y directo.

Tres rasgos:

1. **Clara y directa.** Mostrar saldo, acciones y estado de operación sin ruido.
2. **Tecnológica y cercana.** Un símbolo reconocible y una interfaz accesible.
3. **Control consciente.** Comunicar montos, comisiones y confirmaciones con precisión.

## Logo

- Se mantiene el archivo maestro original. **No redibujar el gato ni modificar las letras Bargain.**
- Dos piezas: logotipo horizontal (web, presentaciones, comunicación) e isotipo (app, avatar, favicon).
- El verde menta y el marfil complementan el sistema; **no sustituyen los dos colores del logo** (negro y morado).
- Activos en el repo: `apps/web/public/img/logo/tilcai-logo.svg`, `apps/web/public/wallet-icon.png`, `apps/web/public/wallet-icon-192.png`, `apps/web/src/app/apple-icon.png`.

### Versiones y fondos

| Versión | Uso |
|---|---|
| Principal | Morado sobre negro |
| Inversa | Negro sobre morado |
| Marfil | Logo maestro sobre placa negra |
| Menta | Logo maestro sobre placa negra |

En fondos complementarios (marfil, menta) usar el logo maestro sobre una placa oscura.

### Área de protección y tamaño

- Espacio libre mínimo: `x` en los cuatro lados, con `x` = diámetro del punto de la «i».
- Tamaño mínimo de la firma: **160 px / 30 mm**.
- Tamaño mínimo del isotipo: **24 px / 8 mm**.
- Si «Wallet» pierde legibilidad, usar el isotipo. Validar en el soporte real.

### Malos usos

No deformar (estirar o comprimir), no rotar, no ocultar partes, no bajar el contraste. Evitar sombras, degradados, contornos, cambios tipográficos y recoloraciones arbitrarias.

## Color

Cinco colores. Negro y morado definen la marca; marfil, menta y gris amplían el sistema. Usar los HEX en sRGB para digital.

| Rol | Nombre | HEX | RGB | Uso |
|---|---|---|---|---|
| Principal | Negro | `#0B0B0D` | 11 / 11 / 13 | Base de marca, fondo y texto |
| Principal | Morado | `#C8A6FF` | 200 / 166 / 255 | Identidad, acción y selección |
| Apoyo | Marfil | `#F8F6EE` | 248 / 246 / 238 | Lectura, fondos claros |
| Apoyo | Verde menta | `#A7F3D0` | 167 / 243 / 208 | Estado positivo: éxito y recepción |
| Apoyo | Gris neutro | `#E5E4EB` | 229 / 228 / 235 | Soporte de UI: bordes y superficies |

Distribución orientativa en modo oscuro: 45 % / 30 % / 12 % / 5 % / 8 % (el PDF no rotula qué color corresponde a cada porcentaje; es una guía visual, no una regla estricta).

Reglas:

- En fondos claros usar texto negro. El gris es funcional.
- Texto negro sobre morado, marfil, menta o gris.
- **No comunicar estados solo con color:** el menta de éxito va acompañado de texto o icono.

## Tipografía

**Bargain Regular**, archivo OTF original sin modificar glifos (`apps/web/src/fonts/bargain.otf`). Es la única tipografía de la marca, también en UI.

| Nivel | Tamaño |
|---|---|
| Display | 32-48 px |
| Títulos | 20-28 px |
| UI | 14-16 px |
| Detalle | 12-14 px |

- No simular negrita ni deformar la fuente.
- Validar legibilidad de cifras y formularios en el producto.
- Verificar la licencia de uso para web y app antes de publicar.

## Lenguaje visual

1. **Jerarquía.** Saldo dominante, detalle en marfil, acción principal en morado.
2. **Forma.** Esquinas redondeadas, iconos simples, áreas táctiles amplias.
3. **Composición.** Retícula de 8 px y separaciones consistentes. Fondos negro o marfil.
4. **Voz y estados.** Mensajes precisos («Enviar activos», «Transacción confirmada», «Revisar detalles»). Menta para éxito, siempre con texto o icono.

## Producto (wallet)

Modo oscuro y variante clara.

- **Saldo y activos:** marfil para lectura; Bargain en el saldo y títulos de marca.
- **Acciones rápidas:** morado en enviar, recibir, intercambiar y escanear.
- **Estado de operación:** menta para ingresos o confirmaciones, junto a texto o iconos.
- **Control:** revisar red, destino, monto y comisión antes de confirmar.

Los mockups del PDF son conceptuales, con montos ficticios y funciones por validar.

## Comunicación

Tres composiciones editoriales para web y redes, una idea principal por pieza. Publicaciones de 1080 x 1080 px; adaptar recortes y márgenes. Importes y funciones son ilustrativos.

## Soportes físicos

- **Eventos:** roll-up con base metálica y credencial con cinta.
- **Textil:** gorra negra y bolsa de algodón con firma morada.
- **Papelería:** libreta de cubierta mate con acentos de la paleta.
- **Stickers:** cinco (negro, morado, marfil, menta y «Wallet»), en 4 x 4 cm y 5 x 5 cm. Conservar dibujo y proporciones; sangrado y línea de corte van aparte según la imprenta, sin borde de troquel en el arte visible.

Para artes finales usar el SVG maestro y Bargain.

## Lista de verificación

1. **Logo maestro:** mantener el SVG original y sus variantes aprobadas; no sustituir dibujo ni wordmark.
2. **Digital:** usar los HEX sRGB; validar tamaños, contraste y estados en ambos modos.
3. **Impresión:** acordar perfil CMYK, sangrado, corte y prueba de color con el proveedor.
4. **Tipografía:** Bargain Regular, con licencia verificada para web/app. Aplicaciones y medidas son orientativas.

## Reglas para agentes de IA

- Nunca regenerar ni «mejorar» el logo; referenciar el SVG existente.
- Usar solo los cinco colores de la tabla; no inventar tonos ni degradados.
- Toda UI usa Bargain; no introducir otra fuente.
- Cada estado de éxito o error lleva texto o icono además del color.
- Antes de confirmar una operación, la UI muestra red, destino, monto y comisión.
