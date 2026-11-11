# Digital menu (/menu)

The table-QR menu is a static app in `public/menu`, served by two rewrites in
`next.config.js`. It doesn't touch the rest of the site (no shared CSS, layout or JS).

## Addresses

| Address | Menu file | Who it's for |
|---|---|---|
| `/menu/soul` | `public/menu/data/soul.js` | Soul, family dining (24 tables) |
| `/menu/unwind` | `public/menu/data/unwind.js` | Unwind, the bar (20 tables) |
| `/menu/sky` | `public/menu/data/sky.js` | The Sky, rooftop (22 tables) |
| `/menu/aura` | `public/menu/data/all.js` | Aura suites (12 rooms, full menu) |
| `/menu` | `public/menu/data/all.js` | General link, full menu |

Add `?table=12` (or `?table=204` for a room) to mark the table on the guest's
order-for-the-server screen. QR codes should point at these exact addresses.

## Changing a menu

Each file in `public/menu/data/` holds one space's menu:

- `window.TRESSA_MENU`: sections, categories and items (name `n`, price `p`,
  veg `v`, description `d`, spice `s`, tags `t`, photo `img`).
- `window.TRESSA_LIVE`: banners, Today's Specials, Only at Tressa,
  Recommended and sold-out items for that space.

Item ids are the slugs of item names (for example `nalli-nihari`); banners and
lists refer to items by id. Photos go in `public/menu/photos/` and are linked
with `img: "/menu/photos/<file>.webp"`.

The pages load the data file with a `?v=` version in the URL. After editing a
data file, change that `v` value in the matching `index.html` so phones fetch
the new menu straight away.

## Files

- `index.html`, `soul/`, `unwind/`, `sky/`, `aura/`: one page per address
  (identical apart from the data file they load)
- `styles.css`, `app.js`: the menu app
- `vendor/`: GSAP (with ScrollTrigger and Flip), Lenis and Fuse.js, served
  from our own domain so the menu doesn't depend on outside CDNs
- `data/`: menu content per space

## Not yet connected

The staff admin panel (`#admin`) is switched off on the website until it has
a staff login and database tables behind it. Until then, menu changes are
made in the data files.
