# Schichten

**Schichten** sind wiederverwendbare Zeitplanvorlagen (Name + Start- und Endzeit), die Sie bei einem Kassenabschluss **Nach Vorlage** in Finanzen verwenden. Sie ersetzen keine Personalplanung oder Zeiterfassung: sie definieren nur das Zeitfenster, das der Kassenabschluss abgleicht.

## Zugang

Seitenmenü → **Betrieb → Schichten**.

Oben sehen Sie, wie viele Schichten aktiv und inaktiv sind. Die Liste zeigt Name, Zeitplan und Status.

> **Berechtigungen:** Schichten konfigurieren erfordert Zugang zum Modul **Betrieb**. Einen Abschluss mit dieser Vorlage erfassen Sie unter **Finanzen → Kassenabschluss** (Modul **Finanzen**). Siehe [Kassenabschluss](../finanzas#arqueo-de-caja).

---

## Schicht erstellen

Klicken Sie **+ Neue Schicht**. Füllen Sie aus:

| Feld | Beschreibung |
|------|--------------|
| **Name** | Sichtbare Kennung (z. B. Vormittag, Nachmittag, Nacht). Pflichtfeld, bis 80 Zeichen. |
| **Start** | Schichtbeginn (24-Stunden-Format). |
| **Ende** | Schichtende. |
| **Über Mitternacht** | Aktivieren, wenn die Schicht am nächsten Tag endet (z. B. 22:00 – 06:00). |

Bestätigen mit **Schicht erstellen**. Die Schicht ist sofort **aktiv** und erscheint im Dropdown für Abschlüsse nach Vorlage.

---

## Schicht bearbeiten

Klicken Sie das Stift-Symbol neben der Schicht. Name, Zeiten und **Über Mitternacht** können geändert werden. Speichern mit **Änderungen speichern**.

**Bereits erfasste** Abschlüsse behalten die Namensbezeichnung zum Zeitpunkt des Schließens; Änderung der Vorlage schreibt die Historie nicht um.

---

## Deaktivieren und reaktivieren

- **Deaktivieren** — die Schicht erscheint nicht mehr bei neuem Abschluss, bleibt aber in der Liste als inaktiv sichtbar. Vergangene Abschlüsse mit dieser Vorlage werden nicht geändert.
- **Reaktivieren** — wieder verfügbar unter Finanzen → Kassenabschluss → **Nach Vorlage**.

Schichten werden in der Oberfläche nicht gelöscht; Deaktivieren ist die Art, eine nicht mehr genutzte Vorlage zu entfernen.

---

## Bezug zum Kassenabschluss

| Aktion | Wo |
|--------|-----|
| Vorlagen definieren (Vormittag, Nachmittag…) | **Betrieb → Schichten** |
| Kasse mit Vorlage schließen | **Finanzen → Kassenabschluss → Nach Vorlage** |
| Schließen mit manuellen Zeiten ohne Vorlage | **Finanzen → Kassenabschluss → Benutzerdefinierter Zeitraum** |
| Ganzen Kalendertag schließen | **Finanzen → Kassenabschluss → Ganzer Tag** |

Beim Abschluss nach Vorlage wählen Sie **Schicht** und **Tag**; Zeiten werden aus der Vorlage übernommen. Mehrere Abschlüsse am selben Tag sind möglich, wenn die Fenster **nicht überlappen** (z. B. Vormittag und Nachmittag). Siehe *Mehrere Abschlüsse am selben Tag* in [Kassenabschluss](../finanzas#arqueo-de-caja).

---

## Häufig gestellte Fragen — Schichten

**Steuern Schichten, wer im POS kassieren kann?**
Nein. Sie definieren nur Zeitfenster für den Kassenabschluss.

**Kann ich zwei Vorlagen mit gleichem Zeitplan haben?**
Ja, wenn die Namen unterschiedlich sind (z. B. „Vormittag Saal“ und „Vormittag Terrasse“). Beim Abschluss wählen Sie die zutreffende.

**Schicht deaktiviert und erscheint nicht mehr beim Abschluss. Was tun?**
Reaktivieren über das Kreis-Pfeil-Symbol in der Liste oder neue Vorlage erstellen.

**Nachtschicht über zwei Tage?**
**Über Mitternacht** beim Erstellen oder Bearbeiten aktivieren (z. B. 22:00 – 06:00).
