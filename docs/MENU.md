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

Staff change menus from the **Live Menu** tab of the management app
(tressa-production-webapp: manager, cashier and owner logins). Publishing
there stores the menu in the `guest_menus` table, and each page reads it from
`GET /api/menu/<space>`:

| Page | Reads |
|---|---|
| `/menu/soul` | `/api/menu/soul` |
| `/menu/unwind` | `/api/menu/unwind` |
| `/menu/sky` | `/api/menu/sky` |
| `/menu/aura`, `/menu` | `/api/menu/aura` |

The API is public (it holds only what guests see) and cached for 15 seconds
at the CDN. Open pages check it every 15 seconds and when the phone comes back
to the page, and keep the last copy on the phone so the menu opens straight
onto it. Until a space is published for the first time, its page shows the
built-in menu below.

### Built-in menus

Each file in `public/menu/data/` holds one space's built-in menu:

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
  (identical apart from the data file and the `/api/menu/<space>` they load)
- `styles.css`, `app.js`: the menu app
- `vendor/`: GSAP (with ScrollTrigger and Flip), Lenis and Fuse.js, served
  from our own domain so the menu doesn't depend on outside CDNs
- `data/`: built-in menu content per space
- `app/api/menu/[venue]/route.ts`: the published menu for each space

## Staff panel

The in-page staff panel (`#admin`) stays switched off on the website; staff
edit menus from the Live Menu tab instead.
