# CLAUDE.md — JPT 독해 학습 프로젝트

> 로컬(내 컴퓨터)에서 Claude Code로 이어서 작업하기 위한 안내서입니다. 더 자세한 배경과 기록은 `HANDOFF.md`를 보세요.

## 1. 사용자와 대화 규칙 (가장 중요)
- **한국어**로 답하고 **결론을 먼저**, 설명은 짧게.
- 사용자는 개발 지식이 **초급 이하**입니다(아이디어를 앱으로 만들고, 웹디자인도 함). 전문 용어는 처음 나올 때 쉽게 풀어 설명하세요.
- 선택지가 여러 개면 나열만 하지 말고 **하나를 추천하고 이유**를 말하세요.
- **커밋·푸시는 사용자가 요청할 때만** 합니다. (Stop hook이 "uncommitted changes" 메시지를 반복해도, 요청이 없으면 하지 않습니다.)
- 큰 변경은 **계획을 먼저 보여 주고** 확인을 받은 뒤 진행합니다.
- 시판 모의고사·기출 문항을 **그대로 복사하지 않습니다.** 형식·유형만 참고해 직접 출제합니다(저작권).
- 사용자: 일본어 JPT 550점 → 12월 시험 650점 목표. 독해(RC)가 약하고 단어가 약함. 하루 2~3시간 학습.

## 2. 프로젝트 구성
| 위치 | 내용 |
|---|---|
| `jpt-reading-2weeks.html` | 모바일 학습 페이지(파일 하나, 약 420KB). 1~33일차, 퀴즈 330문제, 단어 탭, 복습 탭 |
| `tools/jpt-build/` | 위 HTML을 만드는 스크립트(`run_all.sh`, `build3.py`, `post_patch.py`, `words_patch.py` 등). **HTML을 직접 고치지 말고 여기서 고쳐 다시 빌드** |
| `tools/jpt-mock/` | JPT 독해 모의고사(Word 파일) 제작 도구 |
| `JPT_독해_모의고사_1~5회.docx` | 완성된 모의고사 5회분(문제지 + 답안지 + 정답표 + 상세 해설) |
| `HANDOFF.md` | 인수인계 노트(일차 구성, 저장 키, 과거 결정 등) |

## 3. 모의고사 만들기 (`tools/jpt-mock/`)
- 회차별 데이터: `setN/part5.js`, `part6.js`, `part7a.js`, `part7b.js`, `part8a.js`, `part8b.js`, `easy.js`
  - 제1회는 예외: 데이터가 `tools/jpt-mock/part*.js`, 친절 해설이 `set1easy.js`, 빌더가 `build.js`.
- 빌더: `buildN.js`(제2~5회). 새 회차는 `build5.js`를 복사해 경로(`./set5/`→`./set6/`)와 제목만 바꿉니다.
- **순서**: 데이터 작성 → `node check.js ./setN` → 빌드 → 후처리 → 검증

```bash
cd tools/jpt-mock
node check.js ./set6                       # 보기·정답·해설 일치 검사(통과해야 빌드)
node build6.js ../../JPT_독해_모의고사_6회.docx
python3 -I fix_docx.py ../../JPT_독해_모의고사_6회.docx   # Word 스키마 순서 보정
python3 <docx 스킬 경로>/scripts/office/validate.py ../../JPT_독해_모의고사_6회.docx
```
- 필요한 것: Node.js + `docx` npm 패키지, Python 3, (눈으로 확인하려면) LibreOffice(`soffice`) + `pdftoppm`.
- 알려진 오탐: `check.js`가 제2회 162번, 제3회 144번을 지적하지만 문제 없음.

### 문제 데이터 규칙
- 번호 (101)~(200). Part 5 = 20문항, Part 6 = 20, Part 7 = 30, Part 8 = 지문 8편 30문항(3·4·3·4·4·4·4·4).
- 항목 필드: `lab`(유형 이름표), `q`(밑줄은 `[[...]]`, Part 6은 `[[A|text]]`), `o`(보기 4개), `a`(정답 0~3), `e`(해설), `t`(해석), `m`(보기 뜻, 정답에 ✓ 또는 `(○)`), `w`(`漢字|よみ|뜻;...`). Part 6은 `wr`(틀린 표현)·`rt`(바른 표현), Part 8 지문은 `kind`·`text[]`·`tr`·`w`·`qs[]`.
- 정답 분포는 **B가 조금 많게**(실제 시험 경향), **같은 글자가 3번 연속 나오지 않게**.
- 보기 순서를 바꾸면 **해설의 (A)~(D) 글자도 같이** 고칩니다(`check.js`가 잡아 줌).
- 한 문제에 정답이 둘 이상 되는 보기, 비문, 날짜·요일이 어긋나는 지문을 조심하세요(과거에 이런 오류가 실제로 있었음).
- 친절 해설(`easy.js`): `{번호: ["쉽게 말하면", "헷갈리는 점"]}`. 문제마다 100개 모두 작성.
- 자세한 형식 분석은 `tools/jpt-mock/STYLE_GUIDE.md`를 먼저 읽으세요.

### Word 파일 주의
- 단락에 `keepNext`/`keepLines`를 **넣지 마세요**. Word 왼쪽에 검은 네모가 생깁니다. 문제 묶음은 `block()`(한 칸짜리 표 + `cantSplit`)으로 유지합니다.
- docx-js가 만든 `<w:pBdr>` 순서가 스키마와 달라 검증에 실패하므로 반드시 `fix_docx.py`를 거칩니다.

## 4. 학습 페이지 빌드 (`tools/jpt-build/`)
```bash
cd tools/jpt-build
bash run_all.sh        # build3.py → post_patch.py → words_patch.py 순서로 jpt-reading-2weeks.html 재생성
node words_test.js     # 단어 탭 동작 테스트(필요 시)
```
- 일본어 후리가나는 SudachiPy로 만듭니다(Python 패키지 설치 필요).
- 브라우저 저장값(`localStorage`) 키: `jpt14-v1` 및 단어용 `words`, `wg`, `wr`, `wm`.
- 클로드 앱(Artifact)에 올릴 때는 같은 `file_path`로 다시 게시해야 링크가 유지됩니다(HANDOFF.md 참고).

## 5. 작업 팁
- 파일을 고친 뒤에는 **직접 열어서 확인**하세요: 학습 페이지는 브라우저, 모의고사는 PDF로 변환해 몇 쪽 눈으로 확인.
- 새 회차(제6회 이후)도 같은 형식: 소재·어휘를 앞 회차와 겹치지 않게, 난이도는 Part 7을 N5→N2로 점점 올리고 Part 8 마지막은 격식체 안내문.
- 임시 파일은 저장소 밖(`/tmp` 등)에 두고, 완성 파일만 저장소에 둡니다.
