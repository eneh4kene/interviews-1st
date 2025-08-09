import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: [
        'react',
        'react-dom',
        '@radix-ui/react-label',
        '@radix-ui/react-slot',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'lucide-react'
    ],
    noExternal: ['@interview-me/types'],
    banner: {
        js: '"use client";',
    },
    esbuildOptions(options) {
        options.banner = {
            js: '"use client";',
        };
    },
}); 