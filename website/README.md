# Divine Mirror website

The showcase site for Divine Mirror. React 19, TypeScript and Vite, no other dependencies.

```sh
npm install
npm run dev      # local dev server
npm run build    # typecheck and build into dist/
```

The windows on the page are screenshots of the real app at 2x, one set per theme (Ember, Mana and Iron), in `public/screens/`. The theme picker swaps them all and remembers the pick in the browser. The item art in the hero inventory, in `public/items/`, is the game's own art from the same RePoE export the app uses. The hero animation is pure CSS.

## Deploy on Vercel

The site lives at [www.poe-divine-mirror.com](https://www.poe-divine-mirror.com/). Import the repository and set **Root Directory** to `website`. Vercel detects Vite, so the defaults are right: build command `npm run build`, output directory `dist`.
