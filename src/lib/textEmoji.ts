/**
 * textEmoji.ts
 *
 * Converte códigos de emoji personalizados (estilo Discord) em emojis reais.
 * Módulo puro: sem React, sem Supabase.
 *
 * Regra atual: `<:flag_nb:1501023624507953153>` (e variantes animadas `<a:...>`)
 * representam a bandeira do Brasil 🇧🇷. Nenhum outro código/emoji é alterado.
 */

/** Emoji da bandeira do Brasil. */
export const BRAZIL_FLAG = "🇧🇷";

/** Nomes de emoji personalizados que representam a bandeira do Brasil. */
const BRAZIL_EMOJI_NAMES = ["flag_nb"];

/** Regex de emoji personalizado: <:nome:id> ou <a:nome:id>. */
const CUSTOM_EMOJI_RE = /<a?:([a-zA-Z0-9_]+):(\d+)>/g;

/** Mapeia um código personalizado para o emoji real, ou `undefined` se desconhecido. */
export function customEmojiToUnicode(name: string): string | undefined {
  if (BRAZIL_EMOJI_NAMES.includes(name)) return BRAZIL_FLAG;
  return undefined;
}

/**
 * Substitui os códigos personalizados conhecidos pelo emoji correspondente.
 * Códigos desconhecidos permanecem exatamente como estavam.
 */
export function replaceCustomEmojis(text: string): string {
  if (!text || text.indexOf("<") === -1) return text;
  return text.replace(CUSTOM_EMOJI_RE, (full, name: string) => customEmojiToUnicode(name) ?? full);
}

/**
 * Remove os códigos personalizados conhecidos do texto e devolve o país
 * correspondente (quando houver). Usado na leitura de elencos por texto:
 * o código vale como nacionalidade e não deve entrar no nome do jogador.
 */
export function extractCustomEmojiCountry(text: string): { text: string; country?: string } {
  if (!text || text.indexOf("<") === -1) return { text };
  let country: string | undefined;
  const cleaned = text.replace(CUSTOM_EMOJI_RE, (full, name: string) => {
    if (BRAZIL_EMOJI_NAMES.includes(name)) {
      country = "Brasil";
      return " ";
    }
    return full;
  });
  return { text: cleaned.replace(/\s{2,}/g, " ").trim(), country };
}
