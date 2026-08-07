# Aktivitätsprotokoll der Operationen

Das **Aktivitätsprotokoll** ist die POS-Audit-Spur: wer was getan hat, auf welchem Kanal (Tisch, Bar oder Theke), wann und — falls zutreffend — mit welchem Grund. Eigentümer, Administratoren und Supervisoren nutzen es, um Produktentfernungen, Tab- oder Warenkorb-Leerungen und Teilstorno von Zahlungen zu prüfen.

## Zugang

Seitenmenü → **Betrieb → Aktivitätsprotokoll**.

Sie sehen eine paginierte Ereignisliste. Oben können Sie nach Datum, Kanal, Aktionstyp filtern und nach Produktname suchen. Klicken Sie eine Zeile für technische Ereignisdetails (nützlich für Support).

> **Berechtigungen:** nur Benutzer mit Zugang zum Modul **Betrieb** können das Aktivitätsprotokoll öffnen (typisch Eigentümer, Administrator und Supervisor). Kassenpersonal ohne dieses Modul sieht den Tab nicht und kann die Historie nicht einsehen.

---

## Was das Protokoll erfasst (POS)

Jede Zeile ist ein automatisches Ereignis, wenn das Team den POS nutzt, nachdem die Funktion für Ihren Betrieb aktiv ist.

| Aktion im Protokoll | Bedeutung |
|--------------------|-----------|
| **Produkt zum Tab hinzugefügt** | Artikel wurde zum Tab eines Tisches oder der Bar hinzugefügt |
| **Produkt vom Tab entfernt** | Artikel wurde vom Tab (Tisch/Bar) entfernt |
| **Menge geändert** | Menge eines Artikels im Tab wurde geändert |
| **Tab geleert** | Tab einer Tisch- oder Bar-Session wurde geleert |
| **Warenkorbzeile entfernt** | Produkt wurde vom Theken- oder Bar-Warenkorb entfernt |
| **Warenkorb geleert** | Der gesamte Warenkorb wurde geleert |
| **Zahlung storniert** | Eine bereits erfasste Teilzahlung beim Checkout wurde storniert |

Bei jedem Ereignis sehen Sie u. a.:

- **Wann** — Datum und Uhrzeit
- **Benutzer** — wer die Aktion im System ausführte
- **Kanal** — Tisch, Bar oder Theke
- **Zusammenfassung** — Produkt und Menge oder Daten der stornierten Zahlung
- **Tisch** — Tischname falls zutreffend
- **Grund** — im POS erfasster Text (siehe Richtlinien unten)
- **Bestellung** — Link zur Verkauf, falls vorhanden

---

## Was es nicht erfasst

| Situation | Warum es nicht erscheint |
|-----------|--------------------------|
| Produkte im Warenkorb **vor dem Senden zum Tab** oder vor Server-Synchronisation | Nur Aktionen, die den Server erreichen, werden auditiert |
| Aktionen **vor dem Deployment** des Protokolls für Ihren Betrieb | Erfassung beginnt bei Aktivierung in Produktion; kein Rückfüllen der Vergangenheit |
| Storno eines **vollständigen Verkaufs** unter Verkäufe → Bestellungen | Anderer Ablauf; nicht dasselbe wie Teilstorno beim Checkout |
| Preisänderungen, Rabatte oder Menükonfiguration | Außerhalb des POS-MVP |

Wenn die Liste direkt nach Aktivierung leer ist, ist das normal: Ereignisse erscheinen, wenn das Team die Version mit Protokoll nutzt.

---

## Filtern

| Filter | Zweck |
|--------|-------|
| **Datumsbereich** | Begrenzt den Zeitraum (Kalender mit Kurzbefehlen wie Heute, Letzte Woche usw.) |
| **Kanal** | Nur Tisch, nur Bar, nur Theke oder alle |
| **Aktion** | Ein bestimmter Typ (z. B. nur „Zahlung storniert“ oder „Produkt vom Tab entfernt“) |
| **Produkt suchen** | Freitext in der Zusammenfassung (Produktname im Payload) |

**Zurücksetzen** entfernt alle Filter. Die Liste aktualisiert sich bei Filteränderung oder mit dem Aktualisieren-Button im Panel.

---

## Grund-Richtlinien

### Produkt bereits an die Küche gesendet (Tisch oder Bar)

Wenn **Küchentickets** aktiv sind und das Produkt **bereits in der Küche** ist (nicht mehr „neu“), erfordert Entfernen vom Tab einen **Pflichtgrund** vor Bestätigung. Dieser Text wird in der **Grund**-Spalte gespeichert; die Küche sieht die stornierte Zeile weiterhin im KDS.

Wenn das Produkt **noch nicht an die Küche** gesendet wurde, kann es ohne Grund entfernt werden.

### Storno einer Teilzahlung

Beim **Checkout**, beim Entfernen einer erfassten Zahlung (Papierkorb-Symbol bei Teilzahlung), können Sie optional einen Grund eingeben. Bleibt er leer, speichert das System **„Kein Grund“** im Protokoll.

> Bei **Bargeld** erinnert der POS, das Geld physisch zurückzugeben, bevor Sie bestätigen. Siehe [Teilzahlung](../pos#cobro-parcial-split) in der POS-Anleitung.

---

## Ereignisdetail

Klicken Sie eine Zeile (oder Karte auf dem Handy) für das Detail. Dort sehen Sie den vollständigen **Grund**, den **Bestellungs**-Link falls vorhanden und den **Payload** im technischen Format (JSON) — nützlich für Support.

---

## Bezug zu anderen Ansichten

| Sie brauchen… | Gehen Sie zu… |
|---------------|---------------|
| Tische, Tickets oder Trinkgelder konfigurieren | [Betrieb](../operaciones) |
| Zahlung oder Produkt im POS entfernen | [Verkauf im POS verarbeiten](../pos) |
| Verkaufshistorie und Storno vollständiger Bestellung | [Verkäufe](../ventas) |
| Verworfene DIAN-Rechnungsnummern | [Abrechnung — Protokoll verbrauchter Nummern](../facturacion#bitácora-de-números-quemados) (separates Protokoll) |

---

## Häufig gestellte Fragen — Aktivitätsprotokoll

**Ersetzt das Protokoll Kameras oder Kassenabschluss?**
Nein. Es ist ein Log sensibler POS-Aktionen, kein Video und kein Kassenschluss.

**Kann der Kassierer den Grund des Managers sehen?**
Nur wenn die Rolle Zugang zu **Betrieb** hat. Die meisten Kassierer sehen das Protokoll nicht.

**Kann ich nach Excel exportieren?**
Im MVP kein Export aus der Ansicht; nutzen Sie Filter und Pagination für Zeiträume.

**Warum sehe ich keine Ereignisse von gestern, obwohl wir WARO schon nutzten?**
Die Erfassung begann mit der Version, die das Protokoll enthält; frühere Historie wird nicht rekonstruiert.

**Wird Entfernen eines Produkts aus dem Theken-Warenkorb immer erfasst?**
Ja, wenn der Warenkorb mit dem Server synchronisiert ist. Nur lokale Änderungen vor Speicherung erzeugen kein Ereignis.
