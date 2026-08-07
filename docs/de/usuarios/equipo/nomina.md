# Gehaltsabrechnung und Sozialleistungen

Unter **Team → Gehaltsabrechnung** verwalten Sie die **kolumbianischen gesetzlichen Sozialleistungen** (Prima, Cesantías, Urlaubsgeld, Arbeitskleidung, Überstunden) und **PILA**-Zahlungen (Sozialversicherung).

> **Unterschied zu Gehälter:** Die Registerkarte **Gehälter** verwaltet die monatlichen **Grundgehalts**zahlungen. Die Gehaltsabrechnung ist ergänzend — sie verwaltet **gesetzliche Leistungen** und **Sozialversicherung**, die in unterschiedlichen Frequenzen gezahlt werden (halbjährlich, jährlich, monatlich je nach Konzept). Siehe [Gehaltszahlung erfassen](./registrar-pago).

## So greifen Sie zu

Seitenleiste → **Team → Gehaltsabrechnung**.

---

## Filter

| Filter | Optionen |
|--------|----------|
| Jahr | Letzte 5 Jahre |
| Monat | Bestimmter Monat des ausgewählten Jahres |
| Suche | Nach Mitarbeitername |

---

## Leistungstabelle

Eine Zeile pro Mitarbeiter, eine Spalte pro Konzept:

| Spalte | Was sie darstellt |
|---------|----------------|
| **Prämie S1** | Dienstleistungsprämie des ersten Halbjahres (Zahlung im Juni) |
| **Prämie S2** | Dienstleistungsprämie des zweiten Halbjahres (Zahlung im Dezember) |
| **Abfindung** | Jährlicher Beitrag zur Abfindung des Mitarbeiters |
| **Zinsen Abfindung** | Zinsen auf die Abfindung (12 % jährlich) |
| **Urlaubsgeld** | Zahlung für genommenen Urlaub |
| **Arbeitskleidung** | Drei Zahlungen pro Jahr (April, August, Dezember) für Mitarbeiter mit Gehalt ≤ 2 SMMLV |
| **Überstunden** | Überstundenzahlungen des Zeitraums |

Jede Zelle zeigt:

- **Grünes Badge mit Betrag** — die Leistung wurde in diesem Zeitraum bereits gezahlt
- **„Ausstehend“** — die Zahlung wurde noch nicht erfasst

### Vertragsarten

- **Angestellter** — gilt für alle Leistungen
- **Tagelöhner** — gilt für Leistungen außer Arbeitskleidung
- **Auftragnehmer** — von dieser Ansicht ausgeschlossen (wird über Honorare verwaltet)

---

## Leistungen erfassen

Sie können mehrere Zellen gleichzeitig auswählen:

- **Klick auf eine Zelle** — wählt diese einzelne Zahlung aus
- **Klick auf eine Zeile** — wählt alle Leistungen dieses Mitarbeiters aus
- **Klick auf eine Spalte** — wählt dieses Konzept für alle Mitarbeiter aus
- **Gemischte Massenauswahl** — kombiniert einzelne Zellen

Bei aktiver Auswahl erscheint oben eine **Aktionsleiste** mit dem zu erfassenden Gesamtbetrag und einer Schaltfläche zum Öffnen des seitlichen Zahlungspanels.

### Seitliches Zahlungspanel

| Feld | Beschreibung |
|-------|-------------|
| Betrag | Standardmäßig von WARO berechnet; Sie können ihn anpassen |
| Zahlungsdatum | Datum, an dem die Auszahlung erfolgte |
| Zahlungsmethode | Überweisung, Bargeld, Scheck usw. |
| Referenz | Belegnummer (optional) |
| Notizen | Zusätzliche Anmerkung (optional) |

Nach Bestätigung werden alle ausgewählten Leistungen als bezahlt erfasst und das Badge wird grün.

---

## PILA (Planilla Integrada de Liquidación de Aportes)

Der Bereich **PILA** ist am unteren Bildschirmrand getrennt. Es handelt sich um die monatliche Sozialversicherungszahlung (Gesundheit, Rente, Arbeitsrisiken, parafiskale Abgaben), die sowohl den **Arbeitnehmerbeitrag** als auch den **Arbeitgeberbeitrag** abdeckt.

### Ausstehende Zeiträume

Listet Monate mit ausstehender Sozialversicherungszahlung auf. Jede Zeile zeigt:

- Monat und Jahr
- Zu zahlender Gesamtbetrag (Arbeitnehmer- + Arbeitgeberbeitrag)
- Anzahl der einbezogenen Mitarbeiter

### PILA-Zahlung erfassen

1. Tippen Sie auf die Schaltfläche **PILA erfassen** in der Zeile.
2. Geben Sie Datum und Zahlungsmethode ein.
3. Fügen Sie den PILA-Beleg bei, falls vorhanden.
4. Bestätigen Sie.

### PILA-Verlauf

Unter den Ausstehenden erscheint die Liste der bereits gezahlten PILA mit Datum, Betrag und Methode.

---

## Häufig gestellte Fragen

**Berechnet WARO die Beträge jeder Leistung automatisch?**
Ja, in den meisten Fällen. Die Plattform verwendet das konfigurierte Grundgehalt des Mitarbeiters und die kolumbianischen gesetzlichen Prozentsätze zur Berechnung von Prima, Cesantías, Zinsen, Urlaubsgeld und Arbeitskleidung. Sie können den Betrag vor der Erfassung der Zahlung jederzeit manuell anpassen.

**Was ist der Unterschied zu Gehaltszahlung erfassen?**
„Zahlung erfassen“ unter **Gehälter** ist die Auszahlung des laufenden Monatsgehalts. **Gehaltsabrechnung** ist für gesetzliche Leistungen und Sozialversicherung, die andere Frequenzen und Regeln haben.

**Was ist, wenn ich einen Auftragnehmer habe?**
Auftragnehmer sind von dieser Ansicht ausgeschlossen, da sie keine Sozialleistungen verursachen. Ihre Zahlungen werden als **Ausgaben** (Finanzen → Ausgaben) oder nach einem Stundenlohnschema verwaltet, je nach Fall.

**Kann ich Leistungen für mehrere Mitarbeiter gleichzeitig zahlen?**
Ja. Wählen Sie die Spalte (z. B. „Prämie S1“) und alle Zellen dieses Konzepts werden ausgewählt; das Zahlungspanel konsolidiert den Gesamtbetrag.

**Woher weiß ich, ob ein PILA-Monat bereits gezahlt wurde?**
Wenn er in der **Historie**-Liste und nicht unter **ausstehend** steht, wurde er bereits erfasst. Um den Beleg anzuzeigen, öffnen Sie die Zahlungsdetails.
