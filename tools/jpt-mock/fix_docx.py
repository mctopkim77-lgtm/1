"""docx-js writes <w:pBdr> children as top,bottom,left,right; the schema wants top,left,bottom,right.
Usage: python3 -I fix_docx.py file.docx   (rewrites the file in place)"""
import re, sys, zipfile, shutil
p = sys.argv[1]
zin = zipfile.ZipFile(p)
items = [(i, zin.read(i.filename)) for i in zin.infolist() if not i.filename.endswith('/')]
zin.close()
pat = re.compile(r'(<w:pBdr>)(<w:top [^>]*/>)(<w:bottom [^>]*/>)(<w:left [^>]*/>)(<w:right [^>]*/>)(</w:pBdr>)')
out = zipfile.ZipFile(p + '.tmp', 'w', zipfile.ZIP_DEFLATED)
n = 0
for info, data in items:
    if info.filename == 'word/document.xml':
        s = data.decode('utf8')
        s, n = pat.subn(r'\1\2\4\3\5\6', s)
        data = s.encode('utf8')
    out.writestr(info.filename, data)
out.close()
shutil.move(p + '.tmp', p)
print('reordered pBdr:', n)
