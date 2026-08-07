# Produkt erstellen

## Was ist ein Produkt?

Ein Produkt ist das, was Ihre Gäste sehen und bestellen können: Name, Preis, Beschreibung und Kategorie. Es erscheint auf Ihrem Menü.

**Beispiele:** Pizza Margherita, Classic Burger, Natürliche Limonade.

---

## Wie die Produktzusammensetzung funktioniert

Jedes Produkt kann Lagerartikel in drei Weisen zugewiesen bekommen — Sie können eine oder mehrere kombinieren:

| Option | Wann verwenden |
|--------|----------------|
| **Nur direkte Lagerartikel** | Das Produkt ist einzigartig und teilt die Zubereitung nicht mit anderen Gerichten |
| **Nur Rezepte** | Die Zubereitung ist ein bereits erstelltes Rezept, das in mehreren Produkten verwendet wird |
| **Rezepte + zusätzliche Lagerartikel** | Gemeinsame Basis (Rezept) plus eigene Lagerartikel für dieses Gericht |

> **Mit Rezeptur** im Assistenten: WARO bucht beim Verkauf Inventar gemäß der Rezeptur ab.
>
> **Direktverkauf** (Wiederverkauf): Verkauf pro Stück (`und`); das System erstellt den Bestandsartikel und die Äquivalenz in gr oder ml.

**Wann zuerst ein Rezept erstellen?** Nur wenn diese Zubereitung in mehreren Produkten wiederverwendet wird. Wenn das Gericht einzigartig ist, fügen Sie Lagerartikel direkt zum Produkt hinzu. → [Rezepte-Leitfaden](./recetas.md)

---

## Wie man ein Produkt erstellt

Gehen Sie zu **Menü → Produkte → Neues Produkt**.

Der Assistent hat **4 Schritte** bei **Mit Rezeptur**, oder **3 Schritte** bei **Direktverkauf** (ohne Rezepturschritt).

### Produktsteuer

Wenn Ihr Unternehmen **gewerbliche Steuern** nutzt (Zeilen in Rechnungsstellung), **erbt** das Produkt die Steuer seiner **Menükategorie**. Sie können das belassen, **steuerbefreit** markieren oder **eine andere Zeile** wählen. Diese Überschreibung hat Vorrang vor der Kategoriezuordnung.

In Kolumbien mit spaltenbasierter Steuermatrix wählen Sie weiterhin Speise/Getränk, Spirituosen oder Befreit.

### Schritt 1 — Produkttyp

Wählen Sie, wie es zubereitet oder verkauft wird:

| Option | Bedeutung |
|--------|-----------|
| **Mit Rezeptur** | Küche · Lagerartikel und Basisrezepte; jeder Verkauf bucht Inventar ab |
| **Direktverkauf** | Wiederverkauf · Stück (`und`) mit Äquivalenz in gr oder ml |

### Schritt 2 — Allgemeine Informationen

| Feld | Was eintragen | Pflicht |
|------|---------------|:-------:|
| Produktname | Name für Gäste. Z. B. `Pizza Margherita` | Ja |
| Beschreibung | Kurze Beschreibung des Gerichts | Nein |
| Kategorie | Gruppe (Vorspeisen, Hauptgerichte, Getränke...) | Ja |
| Verkaufspreis | Preis in kolumbianischen Pesos | Ja |
| Zubereitungszeit | Minuten (nur **Mit Rezeptur**) | Nein |
| gr/ml-Äquivalenz | Gewicht oder Volumen pro verkauftem Stück (nur **Direktverkauf**) | Ja |
| Verfügbar | Ob aktiv im Menü | — |
| Für Lieferungen verfügbar | Ob in Online-Bestellungen (Lieferung/Abholung) | — |
| Tischbestellung (QR) | Ob im QR-Menü am Tisch | — |

> Wenn Sie **Verfügbar** deaktivieren, erscheint das Produkt auf keinem Menü bis zur erneuten Aktivierung.
>
> **Tischbestellung (QR)** ist unabhängig von Lieferungen.

### Schritt 3 — Rezeptur (nur Mit Rezeptur)

Hier definieren Sie die Zusammensetzung:

**Rezepte hinzufügen** — klicken Sie **+ Basisrezept hinzufügen** und suchen Sie ein vorhandenes Rezept.

**Direkte Lagerartikel hinzufügen** — fügen Sie Lagerartikel einzeln mit Menge hinzu.

**Wenn der Lagerartikel nicht existiert:** die Suche zeigt **+ Lagerartikel erstellen** (Seitenpanel ohne Formular zu verlassen).

→ [Mehr über eigene Lagerartikel](https://warocol.com/docs/usuarios/compras#artículos de bodega-propios)

Rezepte und Lagerartikel können beim Erstellen leer bleiben; Sie können später ergänzen, aber Kosten und Inventarabzug sind mit definierter Rezeptur genauer.

### Schritt 4 — Prüfung und Bestätigung

Prüfen Sie die Zusammenfassung: Name, Kategorie, Rezeptur oder Wiederverkaufsdaten und Status. Wenn alles stimmt, klicken Sie **Produkt erstellen**.

---

## Erscheint das Produkt sofort im Online-Menü?

Ja, wenn **Für Lieferungen verfügbar** markiert ist. Ohne diese Markierung existiert das Produkt im System, ist aber für Online-Gäste nicht sichtbar.

---

## Häufig gestellte Fragen

**Kann ich den Preis später ändern?**
Ja. Gehen Sie zu **Menü → Produkte**, öffnen Sie das Produkt und bearbeiten Sie es.

**Was passiert, wenn ich keine Rezepte oder Lagerartikel zuweise (Mit Rezeptur)?**
Das Produkt funktioniert für Verkäufe, aber WARO kann Kosten nicht berechnen und Lagerartikel nicht automatisch abziehen, bis die Rezeptur definiert ist.

**Kann ich mehrere Rezepte demselben Produkt zuweisen?**
Ja. Sie können mehrere Rezepte kombinieren und zusätzliche Lagerartikel hinzufügen.

**Wie füge ich Modifikatoren hinzu (Größen, Extras, Saucen)?**
Modifikatoren werden separat erstellt und einem oder mehreren Produkten zugewiesen. Siehe [Modifikatoren-Leitfaden](./modificadores.md).

**Wie füge ich ein Foto zum Produkt hinzu?**
Im Schritt Allgemeine Informationen oder in der Produktbearbeitung nach dem Erstellen.
