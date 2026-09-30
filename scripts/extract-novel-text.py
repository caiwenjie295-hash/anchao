"""从校订稿 PDF 提取正文，用于 A34-NARRATIVE-0001 的原文取材。

只依赖标准库：解析 ToUnicode CMap 把内嵌子集字体的 CID 还原为 Unicode，
再按页输出文本。抽取结果仅作取材中间件，最终以人工逐段核对为准。
"""
import re, sys, zlib, json

PDF = r'D:\暗潮开发\暗潮-跨电脑开发包-2026-09-24\暗潮\暗潮_0916_校订稿.pdf'

data = open(PDF, 'rb').read()

# ---- 收集所有间接对象 ----
objects = {}
for m in re.finditer(rb'(\d+)\s+(\d+)\s+obj\b(.*?)\bendobj', data, re.S):
    objects[int(m.group(1))] = m.group(3)


def stream_of(raw: bytes) -> bytes:
    m = re.search(rb'stream\r?\n(.*?)\r?\nendstream', raw, re.S)
    if not m:
        return b''
    body = m.group(1)
    if b'/FlateDecode' in raw:
        try:
            return zlib.decompress(body)
        except zlib.error:
            try:
                return zlib.decompressobj().decompress(body)
            except zlib.error:
                return b''
    return body


# ---- 解析 ToUnicode CMap：CID -> Unicode ----
def parse_cmap(text: str) -> dict:
    cmap = {}
    for block in re.findall(r'beginbfchar(.*?)endbfchar', text, re.S):
        for src, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            cid = int(src, 16)
            out = ''.join(chr(int(dst[i:i + 4], 16)) for i in range(0, len(dst), 4))
            cmap[cid] = out
    for block in re.findall(r'beginbfrange(.*?)endbfrange', text, re.S):
        for lo, hi, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            lo_i, hi_i, base = int(lo, 16), int(hi, 16), int(dst, 16)
            for k in range(lo_i, hi_i + 1):
                cmap[k] = chr(base + (k - lo_i))
    return cmap


# 字体资源名 -> cmap
font_cmaps = {}
for num, raw in objects.items():
    if b'/Type' in raw and b'/Font' in raw and b'/ToUnicode' in raw:
        m = re.search(rb'/ToUnicode\s+(\d+)\s+\d+\s+R', raw)
        base = re.search(rb'/BaseFont\s*/([A-Za-z0-9+\-]+)', raw)
        if m:
            cmap_text = stream_of(objects.get(int(m.group(1)), b'')).decode('latin-1', 'ignore')
            font_cmaps[num] = parse_cmap(cmap_text)

# 页面内容流：按 /Type /Page 收集其 Contents
page_streams = []
for num, raw in objects.items():
    if re.search(rb'/Type\s*/Page\b', raw):
        refs = re.findall(rb'/Contents\s+(\d+)\s+\d+\s+R', raw)
        for r in refs:
            page_streams.append(int(r))


def decode_content(content: bytes, fonts: dict) -> str:
    out = []
    current = None
    # 逐个文本显示操作符
    for m in re.finditer(rb'/(\w+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f\s]*)>\s*Tj|\[(.*?)\]\s*TJ|(ET)', content, re.S):
        if m.group(1):
            current = m.group(1).decode('latin-1')
        elif m.group(2) is not None:
            out.append(render_hex(m.group(2), current, fonts))
        elif m.group(3) is not None:
            for h in re.findall(rb'<([0-9A-Fa-f\s]*)>', m.group(3)):
                out.append(render_hex(h, current, fonts))
        elif m.group(4):
            out.append('\n')
    return ''.join(out)


def render_hex(hexstr: bytes, font: str | None, fonts: dict) -> str:
    hexstr = re.sub(rb'\s+', b'', hexstr)
    cmap = fonts.get(font, {})
    chars = []
    for i in range(0, len(hexstr) - 1, 4):  # 双字节 CID
        cid = int(hexstr[i:i + 4], 16)
        chars.append(cmap.get(cid, ''))
    return ''.join(chars)


# 资源名(/F1) -> cmap：扫描所有 /Font << /F1 N 0 R ... >> 字典
name_cmaps = {}
for num, raw in objects.items():
    for fm in re.finditer(rb'/([A-Za-z0-9]+)\s+(\d+)\s+\d+\s+R', raw):
        res_name = fm.group(1).decode('latin-1')
        target = int(fm.group(2))
        if target in font_cmaps and res_name.startswith('F'):
            name_cmaps[res_name] = font_cmaps[target]
    if b'/Font' in raw:
        for fm in re.finditer(rb'/([A-Za-z0-9]+)\s+(\d+)\s+\d+\s+R', raw):
            res_name = fm.group(1).decode('latin-1')
            target = int(fm.group(2))
            if target in font_cmaps and res_name.startswith('F'):
                name_cmaps[res_name] = font_cmaps[target]

results = []
for idx, obj_num in enumerate(page_streams, start=1):
    content = stream_of(objects.get(obj_num, b''))
    text = decode_content(content, name_cmaps)
    results.append({'page': idx, 'text': text})

if __name__ == '__main__':
    import io
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'extracted.txt'
    with io.open(out_path, 'w', encoding='utf-8') as fh:
        for page in results:
            fh.write(f"===== PAGE {page['page']} =====\n")
            fh.write(page['text'])
            fh.write('\n')
    sys.stderr.write(f'wrote {len(results)} pages to {out_path}\n')
