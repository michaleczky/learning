# Gyakorló feladatlapok

Statikus HTML + JS oldal iskolai gyakorló feladatlapokhoz. A feladatlapok JSON fájlok a `data/` mappában, az oldal ezeket tölti be és teszi kitölthetővé. Nincs build lépés, nincs függőség.

## Futtatás helyben

A böngésző `file://` alól nem engedi a JSON-ok betöltését, ezért kell egy helyi szerver:

```bash
python3 -m http.server 8000
```

Utána nyisd meg: http://localhost:8000

## Közzététel GitHub Pages-en

1. Töltsd fel a repót GitHubra.
2. A repó beállításaiban (Settings → Pages) válaszd a `main` ágat és a `/ (root)` mappát.
3. Az oldal a `https://<felhasználó>.github.io/<repó>/` címen lesz elérhető.

A `.nojekyll` fájl azért van, hogy GitHub Pages ne futtassa a Jekyll feldolgozót.

## Ranglista (Firebase Firestore)

A javítás teljes egészében a böngészőben történik (a `data/*.json` fájlok tartalmazzák a helyes válaszokat is), nincs saját szerver vagy backend kód. A kitöltők nevét, a dátumot és a pontszámot egy Firestore adatbázis tárolja, amit a kliens közvetlenül ír/olvas; a védelmet a `firestore.rules` biztonsági szabályok adják, amiket Google szerverei kényszerítenek ki – nincs mit üzemeltetni.

### Első beállítás

1. Hozz létre egy ingyenes Firebase-fiókot és projektet a [console.firebase.google.com](https://console.firebase.google.com) oldalon.
2. A projektben kapcsold be a **Firestore Database**-t (Build → Firestore Database → Create database), natív módban, bármelyik régióban.
3. Adj hozzá egy webalkalmazást a projekthez (Project settings → General → Your apps → Add app → Web), és másold ki a kapott `firebaseConfig` objektumot.
4. Illeszd be az értékeket a `firebase-config.js` fájlba (ezek nem titkos kulcsok, nyugodtan commitolhatók – lásd a fájl tetején lévő megjegyzést).
5. Töltsd fel a biztonsági szabályokat és az indexet:
   - Vagy a Firebase CLI-vel: `firebase login`, majd `firebase use --add` (válaszd ki a projektet), majd `firebase deploy --only firestore`.
   - Vagy kézzel a console-on: Firestore Database → Rules fülre másold be a `firestore.rules` tartalmát; az indexet (`firestore.indexes.json`) pedig az első lekérdezéskor a konzol hibaüzenetében kapott linkre kattintva hozhatod létre.
6. Helyi teszteléshez indíts szervert (lásd fent), tölts ki egy feladatlapot, és ellenőrizd, hogy a Ranglista gomb működik-e.

### Hogyan működik

- A feladatlap tetején lévő névmezőbe beírt nevet a böngésző megjegyzi (`localStorage`), és minden **Ellenőrzés** után elküldi a Firestore-nak az automatikusan javítható feladatok pontszámát (a nyitott, önértékelt feladatok nem számítanak bele).
- A **Ranglista** gomb az adott feladatlaphoz tartozó legjobb 20 beküldést mutatja, pontszám szerint csökkenő sorrendben.
- Ha a `firebase-config.js` nincs kitöltve, a feladatlapok kitöltése és javítása ugyanúgy működik, csak a ranglista jelzi, hogy nincs beállítva.
- A `firestore.rules` csak a várt alakú, ésszerű értékű beküldéseket engedi be, és tiltja a módosítást/törlést; nem akadályozza meg, hogy valaki más nevében küldjön be pontszámot – ez egy osztálytermi gyakorlófelülethez elegendő védelem, de nem helyettesíti a bejelentkezést.

## Új feladatlap hozzáadása

1. Hozz létre egy új JSON fájlt a `data/` mappában (lásd a formátumot lent).
2. Vedd fel a fájlnevet a `data/index.json` listájába.

## Feladatlap formátum

```json
{
  "id": "egyedi-azonosito",
  "title": "Feladatlap címe",
  "subject": "Tantárgy",
  "grade": 8,
  "description": "Rövid leírás (opcionális).",
  "tasks": [ ... ]
}
```

Az `id` az URL-ben is megjelenik (`#/egyedi-azonosito`), és a mentett válaszok kulcsa is, ezért legyen egyedi és ne változzon.

### Feladattípusok

Minden feladatnak van `title`, `instruction`, opcionális `hint`, `type` és `items` mezője. A `text`, `instruction`, `hint` és `solution` mezőkben a `*csillagok közé*` tett szöveg dőlt lesz.

**`choice`** – néhány lehetőség közül egyet kell választani (rádiógombok).

```json
{
  "type": "choice",
  "options": ["alárendelő", "mellérendelő"],
  "items": [{ "text": "piros alma", "answer": "alárendelő" }]
}
```

**`select`** – ugyanaz, mint a `choice`, de lenyíló listával. Sok lehetőség esetén ez a kényelmesebb.

**`text`** – szabad szöveges válasz, amit az oldal automatikusan ellenőriz. Az `answer` lehet egy szöveg vagy több elfogadható válasz listája. Az összehasonlítás nem érzékeny a kis- és nagybetűre, a szélső szóközökre és a záró írásjelekre.

```json
{
  "type": "text",
  "items": [{ "text": "kapcsolatos: kenyeret ___ vajat", "answer": ["és", "meg", "s"] }]
}
```

**`open`** – nyitott feladat, amit az oldal nem tud automatikusan javítani. Ellenőrzéskor megjelenik a `solution` mintamegoldás, és a tanuló maga jelöli be, hogy sikerült-e.

```json
{
  "type": "open",
  "items": [{ "text": "Alkoss minőségjelzős szószerkezetet!", "solution": "Például: *régi ház*." }]
}
```

## Működés

- **Ellenőrzés**: kijavítja az automatikusan javítható feladatokat, a nyitottaknál mutatja a mintamegoldást.
- **Megoldások**: minden megoldást megmutat.
- **Újrakezdés**: törli az adott feladatlap válaszait.
- A válaszok a böngésző `localStorage`-ában maradnak meg, feladatlaponként.
