# ⌨️ TypeGenius — 타자 연습

한글과 영어로 **진짜 글**(시·소설·노래·논픽션)을 타이핑하며 연습하는 웹 앱입니다.
타격감 있는 사운드·이펙트, 실시간 지표, 오답 반복 연습, 프로필별 통계와 랭킹을
모두 담았습니다. **백엔드 없이 브라우저만으로** 완전하게 동작합니다.

![stack](https://img.shields.io/badge/React-19-61dafb) ![stack](https://img.shields.io/badge/Vite-6-646cff) ![stack](https://img.shields.io/badge/TypeScript-5-3178c6)

## 빠른 시작

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 열면 바로 사용할 수 있습니다.

빌드 / 미리보기:

```bash
npm run build     # dist/ 생성
npm run preview   # 빌드 결과 실행 (http://localhost:4173)
```

## 원격 배포 (Deployment)

백엔드가 없는 정적 SPA라 어떤 정적 호스트에도 올릴 수 있습니다.

### 1) 자체 서버에서 바로 서빙 (의존성 0)

`server.mjs` 는 의존성 없는 Node 정적 서버로, `dist/` 를 `0.0.0.0` 에 서빙하고
SPA 폴백·캐시 헤더·올바른 MIME 를 처리합니다.

```bash
npm run build
PORT=8080 HOST=0.0.0.0 node server.mjs   # 또는: npm start
```

리버스 프록시(Nginx/Caddy)나 터널(cloudflared/ngrok) 뒤에 두면 외부에서 접속됩니다.
빠른 공개 URL 예시:

```bash
cloudflared tunnel --url http://localhost:8080   # https://<random>.trycloudflare.com
```

### 2) systemd 로 상시 구동 (서버 + 터널 자동 재시작)

리포에 `deploy/` 의 유닛 예시가 있습니다.

```bash
sudo cp deploy/typegenius.service deploy/typegenius-tunnel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now typegenius typegenius-tunnel
# 현재 공개 URL 확인:
sudo journalctl -u typegenius-tunnel -o cat | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
```

### 3) Docker

```bash
docker build -t typegenius .
docker run -p 8080:8080 typegenius   # http://localhost:8080
```

### 4) 정적 호스트 (Netlify / Vercel / GitHub Pages)

- **Netlify / Vercel**: 리포 연결만 하면 `netlify.toml` / `vercel.json` 설정으로
  자동 빌드·배포됩니다. (빌드: `npm run build`, 퍼블리시: `dist`)
- **GitHub Pages**: `.github/workflows/deploy.yml` 포함. `Settings → Pages →
  Source: GitHub Actions` 로 켜면 됩니다. 하위 경로(`/type-genius/`)로 빌드되도록
  `BASE_PATH` 가 설정되어 있습니다. (비공개 리포는 Pro 필요, 게시 사이트는 공개)

> PWA: 매니페스트 + 서비스 워커가 포함되어, 첫 방문 이후 **오프라인**으로 동작하고
> 모바일에 **설치**할 수 있습니다. (`BASE_URL` 기반이라 루트/하위경로 모두 동작)

## 주요 기능

- **언어별 연습 공간**: 한국어 / English 를 분리하고, **복합(mixed) 모드**로 두
  언어를 번갈아 연습합니다.
- **실제 글로 연습**: 진달래꽃·서시·소나기·아리랑부터 Frost·Austen·Dickinson 까지
  56편 이상의 작품을 시·소설·노래·논픽션 장르로 수록했습니다. (개인 용도)
- **오답 반복 연습**: 한 번 끝낸 뒤, 틀린 단어만 모아 집중 드릴로 다시 연습합니다.
- **정확한 지표**:
  - 영어는 **WPM**, 한국어는 **타수(CPM, 자모 단위)** 로 측정합니다. (값 = 4타)
  - 정확도, 일관성, Raw 속도, 최고 콤보, 오타 수, 시간, 분량, 속도 추이 그래프.
- **랭킹 & 통계**: 프로필별 최고 기록 리더보드(공간별), 레벨·XP, 성장 그래프,
  최근 기록, 누적 통계.
- **타격감**: Web Audio 로 합성한 키 사운드(톡/클릭/소프트), 정타 파티클, 오타 진동,
  콤보 이펙트, 완주 시 컨페티.
- **모던하고 단순한 UX**: 다크 테마, 군더더기 없는 인터페이스, 키보드 친화적.

## 사용법

1. 홈에서 **한국어 / English / 복합** 중 공간을 고릅니다.
   `바로 시작`(랜덤) 또는 `글 고르기`(도서관)로 진입합니다.
2. 화면에 보이는 글을 그대로 입력합니다. 맞으면 글자가 밝아지고 콤보가 쌓이며,
   틀리면 빨갛게 표시되고 화면이 흔들립니다.
3. 완주하면 결과 화면에서 지표를 확인하고:
   - `다시 도전` · `다음 글` · `오답 연습`(틀린 단어 집중) 중 선택,
   - `랭킹`에서 순위 확인.
4. 상단 **통계** 탭에서 설정(사운드/이펙트/글자 크기)과 프로필을 관리합니다.

> 단축키: 연습 중 `Tab` = 다시 시작.

## 기술 노트

- **로컬 우선(local-first)**: 모든 데이터는 브라우저 `localStorage` 에 저장됩니다.
  서버가 없으므로 설치 즉시 end-to-end 로 동작합니다.
- **한글 처리**: IME 조합을 위해 입력 `<textarea>` 는 비제어(uncontrolled)로 두고,
  `composition` 이벤트로 조합 상태를 추적합니다. 타수는 유니코드 음절을 자모로
  분해해 두벌식 키 입력 수로 계산합니다. (`src/lib/hangul.ts`)
- **의존성 최소화**: 차트는 직접 만든 SVG, 사운드는 Web Audio 합성, 라우팅은 가벼운
  컨텍스트로 구현해 외부 라이브러리를 거의 쓰지 않습니다.

자세한 작업 원칙과 구조는 [`CLAUDE.md`](./CLAUDE.md) 를 참고하세요.

## 콘텐츠 추가

`src/data/texts/fallback.ts` 에 `Passage` 객체를 추가하거나
`src/data/texts/generated.json` 을 편집하면 됩니다. 필드:
`id, language('ko'|'en'), genre('poem'|'novel'|'song'|'nonfiction'), title, author, difficulty, text`.
