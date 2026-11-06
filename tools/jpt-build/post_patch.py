"""Manual patches applied after build3.py (reset marker, number readings, text-size controls).
Usage: python3 -I post_patch.py out.html"""
import sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()

def rep(old, new, must=True):
    global s
    n = s.count(old)
    if n == 0 and not must: return
    assert n == 1, (old[:60], n)
    s = s.replace(old, new)

# a) the reset button keeps the data version so old wrong answers are not wiped again
s = s.replace('state = {done:{}, wrong:{}};', 'state = {done:{}, wrong:{}, ver:3};')

# b) readings the tokenizer gets wrong for counters
for a, b in [
    ('<ruby>二十<rt>にじゅう</rt></ruby><ruby>分<rt>ふん</rt></ruby>', '<ruby>二十分<rt>にじゅっぷん</rt></ruby>'),
    ('<ruby>三十<rt>さんじゅう</rt></ruby><ruby>分<rt>ふん</rt></ruby>', '<ruby>三十分<rt>さんじゅっぷん</rt></ruby>'),
    ('<ruby>五十<rt>ごじゅう</rt></ruby><ruby>分<rt>ふん</rt></ruby>', '<ruby>五十分<rt>ごじゅっぷん</rt></ruby>'),
    ('<ruby>十分<rt>じゅうぶん</rt></ruby><ruby>後<rt>あと</rt></ruby>', '<ruby>十分<rt>じゅっぷん</rt></ruby><ruby>後<rt>ご</rt></ruby>'),
    ('<ruby>二十<rt>にじゅう</rt></ruby><ruby>歳<rt>さい</rt></ruby>', '<ruby>二十歳<rt>はたち</rt></ruby>'),
    ('<ruby>三十<rt>さんじゅう</rt></ruby><ruby>歳<rt>さい</rt></ruby>', '<ruby>三十歳<rt>さんじゅっさい</rt></ruby>'),
]:
    s = s.replace(a, b)

# c) Japanese text size controls
if '--fs' not in s:
    rep('*{box-sizing:border-box}', ':root{--fs:1}\n*{box-sizing:border-box}')
    rep('.pat{font:700 20px/1.4 var(--f-display)', '.pat{font:700 calc(20px * var(--fs))/1.4 var(--f-display)')
    rep('font-family:var(--f-jp);font-size:15px;line-height:1.7;overflow-wrap:anywhere}\n.ex b', 'font-family:var(--f-jp);font-size:calc(15px * var(--fs));line-height:1.7;overflow-wrap:anywhere}\n.ex b')
    rep('font-family:var(--f-jp);font-size:14.5px;line-height:1.8}\n.qt', 'font-family:var(--f-jp);font-size:calc(14.5px * var(--fs));line-height:1.8}\n.qt')
    rep('.qt{margin:0 0 10px;font-family:var(--f-jp);font-size:16px;', '.qt{margin:0 0 10px;font-family:var(--f-jp);font-size:calc(16px * var(--fs));')
    rep('background:var(--bg);font-family:var(--f-jp);font-size:15px;line-height:1.5}', 'background:var(--bg);font-family:var(--f-jp);font-size:calc(15px * var(--fs));line-height:1.5}')
    rep('.xt li{font-size:13.5px;', '.xt li{font-size:calc(13.5px * var(--fs));')
    rep('.inst{margin:0 0 8px;font-family:var(--f-jp);font-size:12.5px;', '.inst{margin:0 0 8px;font-family:var(--f-jp);font-size:calc(12.5px * var(--fs));')
    rep('.tip{margin:8px 0 0;font-size:13px;', '.tip{margin:8px 0 0;font-size:calc(13px * var(--fs));')
    rep('.opt:active{background:var(--accent-soft)}', """.tog[disabled]{opacity:.4;cursor:default}
.ctrl{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}
.fsbox{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted)}
.fsbox .tog{min-width:44px;min-height:40px;font-weight:700}
.fslabel{min-width:3.4em;text-align:center;font-variant-numeric:tabular-nums;color:var(--fg);font-weight:700}
.fsfloat{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:20;display:flex;gap:6px;padding:6px;border-radius:99px;background:var(--surface);border:1px solid var(--line);box-shadow:0 2px 10px rgba(0,0,0,.18)}
.fsfloat button{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--bg);font-weight:700;font-size:14px}
.fsfloat button[disabled]{opacity:.35}
.opt:active{background:var(--accent-soft)}""")
    rep('padding-block:0 48px;', 'padding-block:0 84px;')
    rep('<div style="margin-top:12px"><button type="button" class="tog" id="furibtn" aria-pressed="true">후리가나 보기</button></div>',
        '<div class="ctrl"><button type="button" class="tog" id="furibtn" aria-pressed="true">후리가나 보기</button>'
        '<div class="fsbox" role="group" aria-label="일본어 글자 크기"><span>일본어 크기</span>'
        '<button type="button" class="tog fsdown" aria-label="일본어 글자 작게">가−</button><span class="fslabel" aria-live="polite">100%</span>'
        '<button type="button" class="tog fsup" aria-label="일본어 글자 크게">가+</button></div></div>')
    rep('<div class="wrap">', '<div class="fsfloat" role="group" aria-label="일본어 글자 크기"><button type="button" class="fsdown" aria-label="일본어 글자 작게">가−</button><button type="button" class="fsup" aria-label="일본어 글자 크게">가+</button></div>\n<div class="wrap">')
    rep('applyFuri();\ncur = fromHash();', """var FS_LV = [0.85, 1, 1.15, 1.3, 1.5, 1.7];
function applyFs(){
  var i = (typeof state.fs === "number" && state.fs >= 0 && state.fs < FS_LV.length) ? state.fs : 1;
  document.documentElement.style.setProperty("--fs", FS_LV[i]);
  document.querySelectorAll(".fslabel").forEach(function(e){ e.textContent = Math.round(FS_LV[i] * 100) + "%"; });
  document.querySelectorAll(".fsdown").forEach(function(b){ b.disabled = (i === 0); });
  document.querySelectorAll(".fsup").forEach(function(b){ b.disabled = (i === FS_LV.length - 1); });
}
function stepFs(d){
  var i = (typeof state.fs === "number") ? state.fs : 1;
  state.fs = Math.max(0, Math.min(FS_LV.length - 1, i + d)); save(); applyFs();
}
document.addEventListener("click", function(e){
  var b = e.target.closest(".fsdown,.fsup"); if(!b) return;
  stepFs(b.classList.contains("fsup") ? 1 : -1);
});
applyFuri();
applyFs();
cur = fromHash();""")
    rep('save(); applyFuri(); resetArmed = false;', 'save(); applyFuri(); applyFs(); resetArmed = false;')
open(p, 'w', encoding='utf8').write(s)
print('post patch ok')
