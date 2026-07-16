import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import fs from 'fs';

// Páginas de manutenção/bootstrap com operações destrutivas ou de
// escalonamento de privilégio e SEM nenhuma checagem de autenticação —
// nunca devem ser publicadas no site em produção. Ficam disponíveis
// apenas localmente (rodar via `npm run dev` e abrir o arquivo direto).
const EXCLUDED_FROM_BUILD = [
    'setup-admin.html',
    'clean-system.html',
    'clean-v2.html',
    'reset-kanban.html',
    'recalcular-pontos.html',
    'seed-analytics.html',
    'debug-announcements.html',
    'import-users.html'
];

// Automatically find all HTML files in the root directory
const htmlFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.html') && !EXCLUDED_FROM_BUILD.includes(file))
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
