// Decodifica un archivo de texto subido desde el navegador, con fallback de encoding.
// Ver Decisión 9 en DECISIONS.md: los .md exportados desde el Proyecto de Claude/Drive a
// veces vienen en un charset distinto a UTF-8 (mojibake tipo "Ã­" en vez de "í"). Un UTF-8
// real siempre decodifica sin error; un archivo que en realidad es Windows-1252 casi
// siempre produce una secuencia de bytes inválida en UTF-8 (los acentos ocupan un solo
// byte fuera de rango) — eso dispara el fallback correcto sin necesitar detección de
// charset más sofisticada.
export function decodeTextFile(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}
