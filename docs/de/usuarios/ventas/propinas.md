# Trinkgelderhistorie

Unter **Verkäufe → Trinkgelder** sehen Sie alle Bestellungen, bei denen Trinkgeld erhoben wurde, mit eigenen Kennzahlen und Filtern.

## So greifen Sie zu

Seitenleiste → **Verkäufe** → Registerkarte **Trinkgelder** (`/ventas/propinas`).

> Wenn Trinkgelder unter **Betrieb → Trinkgelder** nicht aktiviert sind, zeigt dieser Bildschirm einen leeren Zustand mit einer Schaltfläche zum Öffnen der Einstellungen.

---

## Kennzahlen des Zeitraums

Drei Karten oben, berechnet auf Basis des aktiven Datumsbereichs und der Filter:

| Kennzahl | Was sie zeigt |
|----------|-----------------|
| **Gesamte Trinkgelder** | Summe der im Zeitraum erhobenen Trinkgelder |
| **Durchschnitt pro Verkauf** | Durchschnittlicher Trinkgeldprozentsatz im Verhältnis zur Zwischensumme der Bestellungen mit Trinkgeld |
| **Bestellungen mit Trinkgeld** | Wie viele Bestellungen Trinkgeld erfasst haben |

---

## Filter

| Filter | Optionen |
|--------|----------|
| Suche | Bestellnummer |
| Datumsbereich | Heute · Gestern · Letzte Woche · 15 Tage · 30 Tage · 90 Tage oder benutzerdefiniert |
| Kellner | Filtert nach dem zugewiesenen Kellner |
| Kanal | POS · Tisch · Online |
| Zahlungsmethode | Wählen Sie eine Gruppe oder eine spezifische Methode |

Verwenden Sie **Filter löschen**, um zum Ausgangszustand zurückzukehren (letzte 30 Tage, ohne Einschränkungen).

---

## Tabelle der Bestellungen mit Trinkgeld

Jede Zeile zeigt:

- Bestell-**Datum**
- **Bestellung** — anklickbare Nummer, die das Detail unter `/ventas/{id}` öffnet
- **Kanal** — Badge mit POS, Tisch, Bar oder Online
- Verkaufs-**Zwischensumme**
- Erhobenes **Trinkgeld**
- **%** der Zwischensumme
- **Kellner** — Klick filtert die Tabelle nach diesem Kellner
- **Zahlungsmethode**

Sie können nach Datum, Bestellung, Zwischensumme, Trinkgeld oder Zahlungsmethode sortieren. Die Tabelle paginiert in Schritten von 25.

---

## Exportieren

Die Schaltfläche **Exportieren** sendet per E-Mail einen Bericht mit allen Bestellungen mit Trinkgeld für den Zeitraum und die aktiven Filter. Das System zeigt ein Modal, wenn der Versand verarbeitet wurde.

---

## Vorgefiltert aus anderen Bereichen

- Unter **Analysen → Verkäufe** öffnet die Karte „Trinkgelder des Zeitraums“ diesen Bildschirm mit dem bereits angewendeten Dashboard-Datumsbereich.
- Unter **Team → Mitglieder → Profil anzeigen** öffnen die Trinkgelder dieses Kellners den Verlauf vorgefiltert nach seinem Namen.

---

## Trinkgelder konfigurieren?

Die Einstellungen (aktivieren/deaktivieren, vorgeschlagene Prozentsätze, Vorauswahl) befinden sich unter **Betrieb → Trinkgelder**. Dieser Bildschirm ist schreibgeschützt: ein Verlauf für Analyse und Abstimmung.
