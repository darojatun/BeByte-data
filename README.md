# BeByte-data — Config & Menu Builder untuk BeByte versi d-abi

Tool web statis (tanpa backend) untuk menyusun `js/data.js` milik
[coatalter/bebyte](https://github.com/coatalter/bebyte) /
[darojatun/d-abi](https://github.com/darojatun/d-abi) — format config masih kompatibel untuk keduanya.

## Cara pakai

```bash
# di folder ini
python3 -m http.server 8899
# buka http://localhost:8899
```

1. Isi **CONFIG TOKO** (nama, event, QRIS statis hasil scan, webhook Discord, dst).
2. Klik **＋ Tambah Item** — setiap klik muncul form item baru.
   - Centang **PUNYA VARIAN** untuk menambah sub-form varian (+ varian bisa ditambah/hapus).
   - Centang **CUSTOM QTY** untuk menu gaya cilok (pembeli input jumlah).
3. Klik **⬇ Download data.js** → timpa ke `d-abi/js/data.js`.
4. Mau revisi? Klik **⬆ Upload data.js** → pilih file lama → form terisi otomatis.

Draft otomatis tersimpan di `localStorage` browser.

## Format output

`data.js` yang dihasilkan kompatibel 1:1 dengan `d-abi`:

```js
export const CONFIG = { STORE_NAME, EVENT_NAME, ... };
export const MENU = [ { id, name, price, category, img, active, variants, ... } ];
```

> Jangan commit `WEBHOOK_URL` asli ke repo publik — pakai webhook sendiri.
