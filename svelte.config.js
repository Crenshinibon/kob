//import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    experimental: {
      remoteFunctions: true
    },
    adapter: adapter()
  },
  compilerOptions: {
    experimental: {
      async: true
    }
  }
};

export default config;
