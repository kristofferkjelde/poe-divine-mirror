# Divine Mirror website

The showcase site for Divine Mirror. React 19, TypeScript and Vite, no other dependencies.

```sh
npm install
npm run dev      # local dev server
npm run build    # typecheck and build into dist/
```

The overlay mockups on the page (`src/components/*Panel.tsx`) are plain HTML and CSS styled like the app, so they stay sharp at any size. The hero animation is pure CSS.

## Deploy on Vercel

Import the repository and set **Root Directory** to `website`. Vercel detects Vite, so the defaults are right: build command `npm run build`, output directory `dist`.
