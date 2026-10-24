import { describe, it, expect } from "vitest";
import { parseUsfx } from "@/lib/bible/usfx";

// TEXTE DE TEST FICTIF : structure imitant USFX, uniquement pour vérifier l'analyseur.
const SAMPLE = `<?xml version="1.0" encoding="utf-8"?><usfx><languageCode>fra</languageCode>
<book id="OBA"><id id="OBA">En-tête</id><h>TITRE</h>
<p sfm="ip" style="ip">Introduction à retirer.</p>
<c id="1" />
<s style="s1">Titre de section à retirer</s>
<p sfm="r" style="r">Réf. à retirer</p>
<p style="p"><v id="1" bcv="OBA.1.1" />Premier <w s="H1">mot</w> de test
<x caller="a"><xo>1.1</xo><xt>Renvoi à retirer.</xt></x>&amp; suite.
<ve />
</p>
<q style="q1"><v id="2" bcv="OBA.1.2" />Ligne un
</q>
<q style="q1">ligne deux.
<ve />
</q>
<c id="2" />
<p style="p"><v id="1" />Autre <wj>chapitre</wj>.<ve /></p>
</book></usfx>`;

describe("analyseur USFX", () => {
  const [b] = parseUsfx(SAMPLE);
  it("lit le livre et les chapitres", () => { expect(b?.id).toBe("OBA"); expect(b?.chapters.map((c) => c.c)).toEqual([1, 2]); });
  it("ne garde que le texte des versets (ni intro, ni titres, ni renvois)", () => {
    const all = JSON.stringify(b);
    for (const bad of ["Introduction", "section", "Réf.", "Renvoi", "En-tête", "TITRE", "1.1"]) expect(all).not.toContain(bad);
  });
  it("assemble mots balisés, entités et poésie sur plusieurs lignes", () => {
    expect(b?.chapters[0]?.v[0]).toEqual([1, "Premier mot de test & suite."]);
    expect(b?.chapters[0]?.v[1]).toEqual([2, "Ligne un ligne deux."]);
    expect(b?.chapters[1]?.v[0]).toEqual([1, "Autre chapitre."]);
  });
});
