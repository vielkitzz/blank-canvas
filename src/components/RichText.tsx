import { replaceCustomEmojis } from "@/lib/textEmoji";

interface RichTextProps {
  children?: string | null;
  className?: string;
  fallback?: string;
}

/**
 * Renderiza um texto convertendo códigos de emoji personalizados
 * (ex.: `<:flag_nb:...>`) no emoji correspondente.
 */
export default function RichText({ children, className, fallback = "" }: RichTextProps) {
  const value = children ? replaceCustomEmojis(children) : fallback;
  return <span className={className}>{value}</span>;
}
