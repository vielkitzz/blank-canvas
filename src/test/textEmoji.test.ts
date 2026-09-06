import { describe, expect, it } from "vitest";
import { extractCustomEmojiCountry, replaceCustomEmojis } from "@/lib/textEmoji";
import { parseSquadText } from "@/lib/squadTextParser";

const CODE = "<:flag_nb:1501023624507953153>";

describe("replaceCustomEmojis", () => {
  it("converte o código personalizado na bandeira do Brasil", () => {
    expect(replaceCustomEmojis(`${CODE} Neymar`)).toBe("🇧🇷 Neymar");
  });

  it("não altera outros emojis nem outros códigos", () => {
    expect(replaceCustomEmojis("⚽ 🇦🇷 texto")).toBe("⚽ 🇦🇷 texto");
    expect(replaceCustomEmojis("<:outro:123>")).toBe("<:outro:123>");
  });

  it("suporta emojis animados e várias ocorrências", () => {
    expect(replaceCustomEmojis(`<a:flag_nb:1> e ${CODE}`)).toBe("🇧🇷 e 🇧🇷");
  });
});

describe("extractCustomEmojiCountry", () => {
  it("remove o código e devolve Brasil", () => {
    expect(extractCustomEmojiCountry(`${CODE} Marcos, GOL`)).toEqual({ text: "Marcos, GOL", country: "Brasil" });
  });
});

describe("parseSquadText com código de bandeira", () => {
  it("entende Brasil e mantém o nome limpo", () => {
    const r = parseSquadText(`${CODE} Ronaldo, ATA, 27\n${CODE} Cafu, LD, 30`);
    expect(r.mode).toBe("roster");
    expect(r.players).toHaveLength(2);
    expect(r.players[0].name).toBe("Ronaldo");
    expect(r.players[0].nationality).toBe("Brasil");
    expect(r.players[1].position).toBe("LD");
  });
});
