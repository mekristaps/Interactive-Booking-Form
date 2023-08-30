import { defineConfig, splitVendorChunkPlugin } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import inject from "@rollup/plugin-inject";
import commonjs from 'vite-plugin-commonjs';
import { resolve } from 'path';

const root = resolve(__dirname, '.');
const publicDir = resolve(__dirname, './dist');

export default defineConfig({
  //root,
  //publicDir,
  plugins: [
    commonjs(/* options */),
    inject({   // => that should be first under plugins array
      $: 'jquery',
      jQuery: 'jquery',
    }),
    // viteStaticCopy({
    //   targets: [
    //     { src: 'src', dest: 'dist' },
    //   ]
    // }),
    //splitVendorChunkPlugin(),
  ],
  server: {
    watch: {
      usePolling: true,
    },
    
  },
})