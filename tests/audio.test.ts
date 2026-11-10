import { describe, it, expect } from "vitest";
import { audioTitle } from "@/lib/audio/titles";
import { buildTrackIndex, trackUrl, norm } from "@/lib/audio/archive";
import { pickVoice } from "@/lib/audio/voice";
import { PROTESTANT_CANON } from "@/lib/bible/canon";

describe("titres des enregistrements", () => {
  it("1189 chapitres, tous nommés, tous différents", () => {
    const t = PROTESTANT_CANON.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => audioTitle(b.id, i + 1)));
    expect(t).toHaveLength(1189); expect(t.every((x) => typeof x === "string" && x.length > 0)).toBe(true); expect(new Set(t).size).toBe(1189);
  });
  it("exemples relevés sur la liste publiée", () => {
    expect(audioTitle("GEN", 1)).toBe("Genèse 1"); expect(audioTitle("SNG", 8)).toBe("Cantique des Cantiques 8");
    expect(audioTitle("1CO", 13)).toBe("1 Corinthiens 13"); expect(audioTitle("REV", 22)).toBe("Apocalypse 22"); expect(audioTitle("EZK", 48)).toBe("Ezéchiel 48");
  });
  it("les livres d'un seul chapitre n'ont pas de numéro", () => {
    expect([audioTitle("OBA", 1), audioTitle("PHM", 1), audioTitle("2JN", 1), audioTitle("3JN", 1), audioTitle("JUD", 1)]).toEqual(["Abdias", "Philémon", "2 Jean", "3 Jean", "Jude"]);
  });
  it("refuse un chapitre hors limites ou un livre inconnu", () => { expect(audioTitle("JHN", 22)).toBe(null); expect(audioTitle("XXX", 1)).toBe(null); expect(audioTitle("JHN", 0)).toBe(null); });
});

describe("index des pistes", () => {
  const files = [
    { name: "Genèse 1.mp3", title: "Genèse 1", format: "VBR MP3" }, { name: "orig/Genèse 1 (original).mp3", title: "Genèse 1", format: "MP3" },
    { name: "Exode 1.mp3", title: "Exode  1", format: "128Kbps MP3" }, { name: "cover.jpg", title: "Genèse 1", format: "JPEG" },
    { name: "html.zip", format: "ZIP" }, { name: "Jude.mp3", format: "VBR MP3" },
  ];
  const idx = buildTrackIndex(files);
  it("préfère le format le plus léger et ignore images et archives", () => { expect(idx[norm("Genèse 1")]).toBe("Genèse 1.mp3"); expect(Object.keys(idx)).toHaveLength(3); });
  it("normalise espaces et casse ; sans titre, utilise le nom du fichier", () => { expect(idx[norm("exode 1")]).toBe("Exode 1.mp3"); expect(idx[norm("Jude")]).toBe("Jude.mp3"); });
  it("adresse de téléchargement encodée", () => { expect(trackUrl("LSG_201807", "Genèse 1.mp3")).toBe("https://archive.org/download/LSG_201807/Gen%C3%A8se%201.mp3"); });
  it("résultat identique quel que soit l'ordre des fichiers", () => { expect(buildTrackIndex([...files].reverse())).toEqual(idx); });
});

describe("voix de synthèse", () => {
  const v = (name: string, lang: string, localService: boolean) => ({ name, lang, localService });
  const voices = [v("Anna", "en-US", true), v("Thomas", "fr-FR", false), v("Amelie", "fr-CA", true), v("Hortense", "fr-FR", true)];
  it("aucune voix française : null", () => { expect(pickVoice([v("Anna", "en-US", true)], true)).toBe(null); });
  it("en ligne : fr-FR locale en premier", () => { expect(pickVoice(voices, true)?.name).toBe("Hortense"); });
  it("hors connexion : une voix locale est préférée à une voix en ligne", () => { expect(pickVoice([v("Thomas", "fr-FR", false), v("Amelie", "fr-CA", true)], false)?.name).toBe("Amelie"); });
  it("accepte les variantes de code (fr_FR, fr)", () => { expect(pickVoice([v("X", "fr_FR", true)], true)?.name).toBe("X"); expect(pickVoice([v("Y", "fr", true)], true)?.name).toBe("Y"); });
});
