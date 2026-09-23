# emoji-mood-wrapped

Tu año de chats, en emojis. Un `.txt` exportado de WhatsApp entra, un Wrapped
sale — y nada viaja a ningún servidor: todo el parseo y las estadísticas corren
en el navegador.

## Scripts

```bash
npm install
npm run dev        # Next.js en modo desarrollo
npm run build      # build de producción
npm run lint       # ESLint
npm test           # tsc --noEmit && vitest run
```

## El motor

Todo el parseo y las estadísticas viven en `lib/`, como funciones puras de
TypeScript: sin React, sin DOM, sin servidor. Las otras piezas del producto
importan desde `lib/index.ts` y nada más profundo.

```ts
import { buildWrappedStats } from '@/lib'

const result = buildWrappedStats(await file.text(), 'Ana')

if (!result.ok) {
  // result.error.code: 'EMPTY_FILE' | 'UNRECOGNIZED_FORMAT' | 'TOO_FEW_MESSAGES'
  // result.error.title y result.error.message ya vienen en castellano
  return showError(result.error)
}

renderWrapped(result.value) // WrappedStats
```

Si necesitás el detalle completo (texto de los mensajes, comparaciones entre
participantes), usá `analyzeExport` en lugar de `buildWrappedStats`: devuelve un
`ChatAnalysis`, que es la foto interna y rica. `WrappedStats` es la proyección
angosta que se puede compartir.

| Módulo | Qué hace |
| --- | --- |
| `lib/normalize.ts` | Saca BOM, marcas bidi y espacios no separables; unifica CRLF |
| `lib/header.ts` | Reconoce la línea de cabecera (Android sin corchetes, iOS con) |
| `lib/detect-format.ts` | Plataforma, reloj, segundos y orden DD/MM vs MM/DD |
| `lib/parser.ts` | `.txt` → `ParseResult` (mensajes, participantes, rango, warnings) |
| `lib/media.ts` | Multimedia en los dos modos de export, clasificada por tipo |
| `lib/emoji.ts` | Conteo por grafema: 👨‍👩‍👧 y 🏳️‍🌈 valen 1 |
| `lib/laughs.ts` | Risas con desglose: jaja · JAJA · jsjs · xd · lol · haha · 😂 |
| `lib/words.ts` | Tokenización con stopwords en español e inglés |
| `lib/stats.ts` | `ParseResult` → `ChatAnalysis` |
| `lib/wrapped-stats.ts` | `ChatAnalysis` → `WrappedStats` |

### Qué formatos soporta

Español e inglés, Android e iOS, reloj de 12h y 24h, con y sin segundos, año de
2 o 4 dígitos, export con y sin archivos multimedia. Portugués y otros idiomas
quedan fuera de V1.

El orden día/mes se decide escaneando **todo** el archivo en busca de un valor
mayor a 12. Si no hay ninguno, se aplica el orden por defecto (`DMY`) y el
resultado trae un warning `AMBIGUOUS_DATE_ORDER` para que la UI lo muestre.

## El contrato `WrappedStats`

Es lo que renderizan las cards y, en V2, exactamente el JSON que se le manda al
LLM. Dos reglas lo mantienen seguro para compartir, y un test las verifica:

1. **Solo agregados.** Nunca el cuerpo de un mensaje. El mensaje más largo
   aparece como largo y timestamp, no como texto.
2. **Un nombre, un solo lugar.** `participant` es el único campo que puede tener
   un nombre humano. Las comparaciones contra el resto del chat se expresan como
   proporciones y rankings, nunca nombrando a nadie más.

`schemaVersion` sube ante cualquier cambio incompatible; los consumidores pueden
switchear sobre él. La definición completa, campo por campo, está en
`lib/types.ts`.

## Memoria del proyecto

`chiron-memory/` guarda las decisiones, convenciones y trampas de este
repositorio. Leelo antes de tocar el parser: varias de las cosas que parecen
arbitrarias ahí están explicadas.
