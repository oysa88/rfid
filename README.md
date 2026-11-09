# MakeCode Package for the Joy-IT SBC-RFID-RC522 RFID module (MFRC522).

This library provides a Microsoft Makecode package for the Joy-IT SBC-RFID-RC522 RFID module.
See https://joy-it.net/products/SBC-RFID-RC522 for more details.

## Connection

The display needs to be connected with six pins to the Micro:bit:

| RFID module   | Micro:bit     |
| ------------- |:-------------:|
| VCC           | 3V            |
| GND           | GND           |
| MISO          | P15           |
| MOSI          | P14           |
| SCK           | P13           |
| NSS           | P16           |

## Initialize display

The RFID module needs to be initialized before it is ready to use. All necessary commands will be transfered via SPI here.

```typescript
// Initialize RIFD module
MFRC522.Init()
```

## Read ID from card
This function reads the cards unique ID and returns it.

```typescript
// Read unique ID
MFRC522.getID()
```

## Read data from card
Data stored on the card can be retrieved with this function.

```typescript
// Read data
MFRC522.read()
```

## Write data to card
Write data, formatted as string, to the card.

```typescript
// Write data
MFRC522.write("1234")
```

## Turn off antenna
After use, the antenn can be turned off.

```typescript
// Turn antenna off
MFRC522.AntennaOff()
```

## Supported targets

* for PXT/microbit

## License

MIT


> Åpne denne siden på [https://oysa88.github.io/rfid/](https://oysa88.github.io/rfid/)

## Bruk som utvidelse

Dette kodeområdet kan bli lagt til som en **utvidelse** i MakeCode.

* åpne [https://makecode.microbit.org/](https://makecode.microbit.org/)
* klikk på **Nytt prosjekt**
* klikk på **Utvidelser** i menyen under tannhjulet
* søk etter **https://github.com/oysa88/rfid** og importér

## Rediger dette prosjektet

For å redigere dette kodeområdet i MakeCode.

* åpne [https://makecode.microbit.org/](https://makecode.microbit.org/)
* klikk på **Importer** og så på **Importér URL**
* lim inn **https://github.com/oysa88/rfid** og klikk på importér

#### Metadata (brukes for søk, visualisering)

* for PXT/microbit
<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
