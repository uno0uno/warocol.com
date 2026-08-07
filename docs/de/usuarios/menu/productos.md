# Produkte

## Was ist ein Produkt?

Ein Produkt ist das, was Ihre Gäste sehen und bestellen können: Name, Preis, Beschreibung und Foto. Es erscheint auf Ihrem Menü.

**Beispiele:** Pizza Margherita, Classic Burger, Natürliche Limonade.

---

## Bevor Sie ein Produkt erstellen

Jedes Produkt kann mit einer Basisrezeptur verknüpft werden. Die Rezeptur sagt WARO, welche Lagerartikel das Produkt verbraucht — für Kostenberechnung und Inventarkontrolle.

Wenn Sie diese Kontrolle wollen, erstellen Sie zuerst die Rezeptur. Wenn Sie vorerst nur das Produkt registrieren müssen, können Sie es ohne Rezeptur anlegen und später ergänzen.

**Empfohlene Reihenfolge:** Rezeptur → Produkt.

---

## Wie man ein Produkt erstellt

Gehen Sie zu **Menü → Produkte → Neues Produkt**.

Das Formular hat 3 Schritte:

### Schritt 1 — Allgemeine Informationen

| Feld | Was eintragen | Pflicht |
|------|---------------|:-------:|
| Produktname | Name für Gäste. Z. B. `Pizza Margherita` | Ja |
| Beschreibung | Kurze Beschreibung des Gerichts | Nein |
| Kategorie | Gruppe (Vorspeisen, Hauptgerichte, Getränke...) | Ja |
| Verkaufspreis | Preis in kolumbianischen Pesos | Ja |
| Reale Kosten (System) | Von WARO aus Rezeptur und Lagerartikel-Einkäufen berechnet (nur lesen) | — |
| Meine Gerichtskosten | Betriebskosten für Margen und Berichte; das System ändert sie nicht | Nein |
| Zubereitungszeit | Minuten bis fertig | Nein |
| Verfügbar | Ob aktiv im Menü | — |
| Für Lieferungen verfügbar | Ob in Online-Bestellungen (Lieferung/Abholung) | — |
| Tischbestellung (QR) | Ob im QR-Menü am Tisch (nur wenn QR-Modul in Operationen aktiv) | — |

> Wenn Sie **Verfügbar** deaktivieren, erscheint das Produkt auf keinem Menü bis zur erneuten Aktivierung.
>
> **Tischbestellung (QR)** ist unabhängig von Lieferungen: ein Produkt kann im Tisch-QR sein ohne Lieferung, und umgekehrt.

### Schritt 2 — Rezeptur / Lagerartikel

Hier verknüpfen Sie das Produkt mit einer oder mehreren bereits erstellten Basisrezepturen.

- Klicken Sie **+ Basisrezept hinzufügen**
- Rezeptur suchen und auswählen
- Wenn das Produkt noch keine Rezeptur hat, kann dieser Schritt leer bleiben

### Schritt 3 — Prüfung und Bestätigung

Prüfen Sie die Zusammenfassung: Name, Kategorie und Status. Wenn alles stimmt, klicken Sie **Produkt erstellen**.

---

## Reale Kosten vs meine Gerichtskosten

WARO verwaltet zwei Kosten pro Produkt:

| Konzept | Wer legt es fest | Zweck |
|---------|------------------|-------|
| **Reale Kosten (System)** | WARO beim Speichern mit Rezeptur | Spiegelt Lagerartikel und Einkaufspreise; aktualisiert bei Änderungen |
| **Meine Gerichtskosten** | Sie, optional | Ihre Betriebsreferenz (Arbeit, Schwund, anderer Lieferant, etc.) |

In der Liste sehen Sie **Reale Marge** (Preis vs Systemkosten) und **Betriebsmarge** (Preis vs Ihre Kosten), wenn Sie „Meine Kosten“ gesetzt haben.

Bei großen Unterschieden wird die Zeile amber hervorgehoben, damit Sie Kostenwahrnehmung oder Rezeptur prüfen können.

---

## Erscheint das Produkt sofort im Online-Menü?

- **Lieferung / Online-Bestellungen:** ja, wenn **Für Lieferungen verfügbar** markiert ist.
- **QR am Tisch:** ja, wenn **Tischbestellung (QR)** markiert ist und das QR-Modul in **Operationen → Tische** aktiv ist.

Ohne beide Markierungen existiert das Produkt im System, ist aber auf diesen Kanälen nicht sichtbar.

---

## Häufig gestellte Fragen

**Kann ich den Preis später ändern?**
Ja. Gehen Sie zu **Menü → Produkte**, öffnen Sie das Produkt und bearbeiten Sie es.

**Was, wenn ich keine Rezeptur zuweise?**
Das Produkt funktioniert für Verkäufe, aber WARO kann Kosten nicht berechnen und Lagerartikel nicht automatisch abziehen.

**Kann dasselbe Produkt in mehreren Kategorien sein?**
Nein. Jedes Produkt gehört zu einer Kategorie. Für mehrere Orte: Varianten oder Modifikatoren.

**Wie füge ich ein Foto hinzu?**
In der Produktbearbeitung nach dem Erstellen.

**Warum erscheint ein Produkt nicht im QR-Menü am Tisch?**
Prüfen Sie **Tischbestellung (QR)** am Produkt und dass das Modul in **Operationen → Tische** aktiv ist. Siehe [Tische](../../operaciones/mesas#pedido-por-qr-en-mesa).
