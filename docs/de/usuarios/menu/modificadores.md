# Modifikatoren

## Was ist ein Modifikator?

Ein Modifikator ist eine Zusatzoption, die der Gast beim Bestellen eines Produkts wählen kann. Optionen werden in einer **Modifikatorgruppe** zusammengefasst.

**Beispiele:**
- Gruppe „Größe“ → Optionen: Klein, Mittel, Groß
- Gruppe „Sauce“ → Optionen: BBQ, Rosa, Scharf
- Gruppe „Ohne...“ → Optionen: Ohne Zwiebel, Ohne Tomate, Ohne Salat
- Gruppe „Extras“ → Optionen: Extra Käse (+2.000 $), Speck (+3.000 $)

Jede Gruppe wird einem oder mehreren Produkten zugewiesen. Beim Bestellen sieht der Gast die Gruppenoptionen zur Personalisierung.

---

## Schlüsselkonzepte vor dem Start

**Gruppe:** Name der Optionskategorie (z. B. „Größe“).

**Modifikatoren:** jede Option in der Gruppe (z. B. „Klein“, „Mittel“, „Groß“). Jede kann einen Zusatzpreis haben oder gratis sein.

**Pflicht vs. optional:** bei Pflichtgruppe muss der Gast mindestens eine Option wählen. Bei optional kann er sie ignorieren.

**Mindest- und Höchstauswahl:** wie viele Optionen der Gast wählen kann/muss.
- Min 0, Max 1 → eine Option oder keine
- Min 1, Max 1 → genau eine Option
- Min 0, Max 3 → bis zu 3 Optionen (z. B. Extras)

---

## Wie man eine Modifikatorgruppe erstellt

Gehen Sie zu **Menü → Modifikatoren → Neue Gruppe**.

Das Formular hat 3 Schritte:

### Schritt 1 — Gruppeninformationen

| Feld | Was eintragen | Pflicht |
|------|---------------|:-------:|
| Produkte | Produkte, für die diese Gruppe gilt | Ja |
| Gruppenname | Was der Gast sieht. Z. B. `Größe`, `Extras`, `Sauce` | Ja |
| Mindestauswahl | Mindestanzahl zu wählender Optionen | Ja |
| Höchstauswahl | Höchstanzahl wählbarer Optionen | Ja |
| Anzeigereihenfolge | Bei mehreren Gruppen: welche zuerst (kleinere Zahl = zuerst) | Nein |
| Obligatorisch | Gast muss vor Bestellung wählen | — |

> **Tipp:** Für Größen mit Pflichtwahl: Min 1, Max 1 und als obligatorisch markieren.

### Schritt 2 — Gruppenoptionen (Modifikatoren)

Hier fügen Sie jede verfügbare Option hinzu. Pro Option:

| Feld | Was eintragen |
|------|---------------|
| **Typ** | Wie Inventar beim Verkauf abgebucht wird (siehe Tabelle) |
| Name | Optionname. Z. B. `Groß`, `BBQ`, `Extra Käse` |
| Zusatzpreis | Aufschlag auf Basispreis. Bei gratis: 0. |
| Max / Reihenfolge | Max. Menge pro Zeile und Anzeigeordnung |

Klicken Sie **+ Modifikator hinzufügen** für weitere Optionen.

#### Optionstypen (Zusammensetzung und Inventar)

| Typ auf dem Bildschirm | Wann verwenden | Konfiguration | Inventar beim Verkauf |
|------------------------|----------------|---------------|----------------------|
| **Lagerartikel** | Katalogartikel ohne verknüpftes Menüprodukt (Rohstoff, Zutat, Service) | Lagerartikel + Menge + Einheit; auch **Optionen per Kategorie** | Dieser Artikel × Modifikatormenge × Produktmenge |
| **Wiederverkauf** | Wiederverkaufsprodukt (1:1 mit Lagerartikel) | Wiederverkaufsprodukt + Menge + Einheit | Verknüpfter Lagerartikel des Produkts |
| **Basisrezept** | Mehrere Rohstoffe laut definierter Zubereitung | Basisrezept + Multiplikator (Menge × Rezept) | **Alle** Lagerartikel des Rezepts, skaliert |
| **Menüprodukt** | Option nutzt Zusammensetzung eines anderen Menüprodukts (Gericht mit Rezept, kein Wiederverkauf) | Menüprodukt + Multiplikator | Rezept/Zusammensetzung dieses Produkts (wie eine Portion) |
| **Nur Preis** | Extra ohne Lagerimpact (z. B. Verpackung, Service, „ohne Eis“) | Nur Name und Preis | **Kein** Inventarbewegung; nur Gesamtsumme |

> **Wiederverkauf vs Lagerartikel:** beide buchen über einen **Lagerartikel** ab. Bei Wiederverkauf wählen Sie das **Menüprodukt** und WARO löst den verknüpften Artikel (1 und). Bei Lagerartikel direkt aus dem Katalog.

Wenn ein Lagerartikel nicht erscheint, nutzen Sie **+ Lagerartikel erstellen** im Seitenpanel (Name, Maßtyp und Kategorie Pflicht).

→ [Mehr über eigene Lagerartikel](/docs/usuarios/abastecimiento#catálogo-de-bodega)

### Schritt 3 — Prüfung

Prüfen Sie die Zusammenfassung und klicken Sie **Gruppe erstellen**.

---

## Wann erhöht der Modifikator den Preis?

Bei Option mit Zusatzpreis wird der Betrag automatisch zum Produktpreis beim Bezahlen addiert (POS, Tische und Online-Bestellungen).

---

## Inventar und Kosten beim Verkauf

- Der **Verkaufspreis** des Modifikators wird immer in der Bestellung gespeichert.
- **Lagerabzug** hängt vom **Typ** ab: Lagerartikel, Wiederverkauf, Basisrezept oder Menüprodukt buchen gemäß Zusammensetzung ab; **Nur Preis** bucht nichts ab.
- Bei Bearbeitung und **Entfernen** eines Modifikators gibt WARO die abgezogenen Zutaten zurück.
- Food-Cost-/Buchungskosten nutzen die aufgeschlüsselten Zutaten pro Modifikator.

---

## Häufig gestellte Fragen

**Kann ich eine Gruppe mehreren Produkten zuweisen?**
Ja. Beim Erstellen alle benötigten Produkte auswählen.

**Kann ich Optionen nach dem Erstellen bearbeiten?**
Ja. **Menü → Modifikatoren**, Gruppe öffnen und bearbeiten.

**Was, wenn ich in Schritt 2 keine Optionen hinzufüge?**
Die Gruppe ist leer. Optionen später in der Bearbeitung hinzufügen.

**Kann der Gast ohne Pflichtmodifikator bestellen?**
Nein. Bei Pflichtgruppe bleibt der Warenkorb-Button deaktiviert bis zur Auswahl.

**Kann ich Typen in einer Gruppe mischen?**
Ja. Z. B. Größen mit **Nur Preis**, Extras mit **Lagerartikel** oder **Wiederverkauf**, Combo mit **Basisrezept**.

**Wählt der Gast den Optionstyp?**
Nein. Nur Sie konfigurieren den Typ; an der Kasse sieht der Gast Name und Preis.
