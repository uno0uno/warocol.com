# Tische

Die Tischverwaltung ermöglicht es, den Gastraum Ihres Restaurants direkt vom POS zu organisieren. Wenn sie aktiv ist, zeigt der Point of Sale den Raumplan und jeder Tisch hat seine eigene Bestellsession.

## Zugang

Seitenmenü → **Betrieb → Tische**. Von hier können Sie:

- Das Tischmodul für den POS aktivieren oder deaktivieren
- **Bestellung per QR am Tisch** aktivieren und den QR-Link jedes Tisches verwalten
- Die Liste konfigurierter Tische mit aktuellem Status und, falls zutreffend, zugewiesenem Kellner sehen
- Tische erstellen, bearbeiten, deaktivieren und reaktivieren

> Die Modulbezeichnung ist konfigurierbar. Manche Betriebe nennen sie „Kabinen“ (Salons), „Zimmer“ (Hotels), „Bahnen“ (Events) usw. Die Einstellung erfolgt unter **Betrieb → Anpassen**. Diese Anleitung verwendet „Tisch“ als generischen Begriff.

---

## Tischmodul aktivieren

Oben auf der Seite sehen Sie den Schalter **Tischverwaltung**.

- **Aktiviert** — der POS zeigt beim Öffnen den Raumplan und jeder Tisch hat seine eigene Bestellsession.
- **Deaktiviert** — der POS arbeitet nur im Thekenmodus.

> Die Änderung wird im POS sofort sichtbar. Wenn eine Kasse offen ist, laden Sie die POS-Registerkarte neu, um die Änderung zu sehen.

---

## Tische konfigurieren

### Tisch erstellen

Klicken Sie auf **+ Neuer Tisch**. Geben Sie ein:

| Feld | Beschreibung |
|------|--------------|
| Name | Tischkennung (z. B. „Tisch 1“, „Terrasse A“) |
| Kapazität | Anzahl Personen (optional) |

### Tisch bearbeiten

Klicken Sie auf das Bearbeiten-Symbol neben dem Tisch. Name und Kapazität können geändert werden.

### Tisch deaktivieren

Klicken Sie auf das Deaktivieren-Symbol. WARO fragt vor dem Fortfahren zur Bestätigung.

Sie können keinen Tisch mit offener Session deaktivieren. Schließen Sie zuerst die Bestellung im POS.

### Deaktivierten Tisch reaktivieren

Deaktivierte Tische werden nicht gelöscht: sie bleiben in einer separaten Liste. Zum Reaktivieren:

1. Filtern Sie die Liste nach **Deaktiviert** (oder erweitern Sie „Inaktive Tische“).
2. Tippen Sie auf das Reaktivieren-Symbol des Tisches.
3. Bestätigen — der Tisch erscheint sofort wieder im Raumplan.

---

## Tischstatus

| Status | Bedeutung |
|--------|-----------|
| **Frei** | Keine aktive Bestellung, verfügbar |
| **Besetzt** | Bestellung läuft |
| **Rechnung angefordert** | Der Gast möchte die Rechnung |

---

## Kellner-Spalte (optional)

Wenn **Kellnerzuweisung** aktiv ist (unter **Betrieb → Trinkgelder**), zeigt eine zusätzliche Spalte den effektiven Kellner der aktuellen Session jedes Tisches. So sehen Sie vor dem Bezahlen, wer jeden Tisch betreut.

---

## Bestellung per QR am Tisch

Ermöglicht Gästen, per Smartphone einen Code am Tisch zu scannen und zu bestellen. Die Bestellung **geht nicht in den POS oder die Küche**, bis das Personal sie unter **Versand → Tischbestellungen (QR)** **akzeptiert**.

### Anforderungen

1. **Tischverwaltung** aktiv (oberer Schalter auf dieser Seite).
2. **Bestellung per QR am Tisch** aktiv (zweiter Schalter im Modulblock).
3. Jeder Tisch mit **aktiviertem** QR und generiertem Link.
4. Produkte mit **Tischbestellung (QR)** unter **Menü → Produkte** markiert (unabhängig von Lieferungen).

### QR-Modul aktivieren

Im gleichen Modulblock unter **Tischverwaltung** sehen Sie **Bestellung per QR am Tisch**.

- **Aktiviert** — QR pro Tisch möglich; Gäste können Bestellungen zur Bestätigung senden.
- **Deaktiviert** — keine QR-Steuerelemente in der Liste oder im Tischpanel.

### QR pro Tisch

Mit aktivem QR-Modul hat jeder Tisch Steuerelemente für:

| Aktion | Zweck |
|--------|-------|
| QR auf diesem Tisch aktivieren | Erzeugt den öffentlichen Link des Tisches |
| **Link kopieren** | In WhatsApp oder wo Sie das Menü teilen einfügen |
| **PNG herunterladen** | QR-Code-Bild zum Drucken am Tisch |
| **Link neu generieren** | Macht den alten QR ungültig und erstellt einen neuen (erneut drucken, wenn Codes bereits verteilt wurden) |

Der Link hat die Form `https://warocol.com/{ihr-geschäft}/mesa/{code}` und **bleibt stabil**, bis Sie **Link neu generieren** verwenden.

Auf dem Desktop gibt es auch eine **QR**-Spalte in der Tischliste mit Schnellzugriff zum Kopieren und Herunterladen.

### Was der Gast tut

1. Scannt den QR oder öffnet den Link.
2. Sieht das Menü (nur QR-fähige Produkte).
3. Stellt die Bestellung zusammen, wählt Zahlungsmethode und sendet.
4. Sieht eine Bestätigung: das Restaurant prüft die Bestellung vor der Zubereitung.

### Was das Personal danach tut

Ausstehende Bestellungen erscheinen unter **Versand → Tischbestellungen (QR)** als Liste (eine Zeile pro Bestellung). Klicken Sie die Bestellung für Details und drücken **Bestellung annehmen** oder **Ablehnen**. Bei Annahme werden Artikel zum Tab dieses Tisches im **POS** hinzugefügt und, wenn Küchentickets aktiv sind, an die Küche gesendet. Siehe [Versand](../despacho#pedidos-en-mesa-qr).

Die Benachrichtigungsglocke öffnet die Bestell**details**, wenn verfügbar; sonst die nach diesem Tisch gefilterte Liste.

---

## Häufig gestellte Fragen

**Wo werden Tischbestellungen aufgenommen?**
Im **POS**. Mit aktivem Modul sehen Sie den Raumplan; klicken Sie einen Tisch, um seine Session zu öffnen.

**Kann ich Tische konfiguriert haben, ohne das Modul zu aktivieren?**
Ja. Tische bleiben gespeichert, auch wenn das Modul deaktiviert ist. Bei Reaktivierung erscheinen alle Tische im Raumplan.

**Was passiert, wenn ich das Modul mit besetzten Tischen deaktiviere?**
Der Schalter ändert die POS-Ansicht, offene Sessions werden nicht geschlossen. Wir empfehlen, alle Bestellungen vor Deaktivierung zu schließen.

**Ist ein deaktivierter Tisch für immer verloren?**
Nein. Er bleibt in der Liste inaktiver Tische und kann jederzeit reaktiviert werden.

**Wie unterscheidet sich das von Lieferungs-QR?**
Bei **Lieferungen** bestellt der Gast über den Online-Kanal (Lieferung, Abholung oder im Lokal) und die Bestellung folgt Status wie Ausstehend → Bestätigt → In Zubereitung. Bei **Tisch-QR** sitzt der Gast an einem konkreten Tisch, das Menü gilt nur für diesen Tisch und die Bestellung bleibt **bis zur Bestätigung durch Personal** unter **Versand → Tischbestellungen (QR)** ausstehend.

**Ändert sich die URL, wenn ich Betrieb → Tische erneut öffne?**
Nein. Der Link bleibt stabil, solange Sie **Link neu generieren** für diesen Tisch nicht verwenden.

**Was sieht der Gast nach dem Senden der Bestellung?**
Einen Erfolgscreen, dass das Restaurant die Bestellung bestätigt. Artikel **erscheinen nicht** im POS und werden nicht zubereitet, bis jemand sie im Versand **akzeptiert**.

**Ein Produkt erscheint nicht im QR-Menü?**
Prüfen Sie **Tischbestellung (QR)** unter **Menü → Produkte** und dass QR-Modul und QR dieses Tisches aktiv sind.
