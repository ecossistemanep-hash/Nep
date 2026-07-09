import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import fs from 'fs';

// Automatically find all HTML files in the root directory
const htmlFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.html'))
    .reduce((entries, file) => {
        const name = file.replace('.html', '');
        entries[name] = resolve(__dirname, file);
        return entries;
    }, {});

export default defineConfig({
    server: {
        port: 3000,
        open: true
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: htmlFiles
        }
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'js/*',
                    dest: 'js'
                },
                {
                    src: 'css/*',
                    dest: 'css'
                },
                {
                    src: 'icons/*',
                    dest: 'icons'
                },
                {
                    src: 'NEP. IMAGEM.png',
                    dest: ''
                },
                {
                    src: 'manifest.json',
                    dest: ''
                },
                {
                    src: 'sw.js',
                    dest: ''
                }
            ]
        })
    ]
});
