import { build } from 'vite';
import { writeFile } from 'node:fs/promises';

const result = await build({
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    minify: true,
    write: false,
    lib: { entry: 'src/main.tsx', name: 'Anchao', formats: ['iife'] },
    cssCodeSplit: false,
  },
});
const output = result[0].output;
const javascript = output.filter((item) => item.type === 'chunk').map((item) => item.code).join('\n');
const css = output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css')).map((item) => item.source).join('\n');
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>暗潮 · 第一幕</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head>
<body><div id="root"></div><script>${javascript.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
await writeFile('暗潮.html', html, 'utf8');
console.log('已生成：暗潮.html（双击打开，无需启动服务）');
