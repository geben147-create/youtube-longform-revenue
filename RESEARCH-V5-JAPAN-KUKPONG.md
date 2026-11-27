# 일본 국뽕 벤치마킹 연구 · 2026-11-27

확인·추정·미확보를 분리했다. **실제 공개 수익이 확인된 채널은 0곳**이며, 외부 추정(블링)은 실제 정산이 아니다.

## 수집 현황

- 채널 145 (일본 95 / 한국 50), 영상 표본 1475
- 자막 확보 113/120 (94.2%), 훅 분석 113편
- 비출연 여부 프레임 확인 40채널, 외부 추정 수익 13채널
- 중국 SNS 허브 고유 8498 (Bilibili 4044, 샤오홍슈 4284, 더우인 170) · 중복 969 제거
- 영상 파일 확보·OpenCV 분석 0, Google Sheets 저장 0 (사유는 아래)

## 일본 주제별 표본 (누적 조회 중앙값 순, 편향 표본)

| 주제 | 영상 | 채널 | 중앙값 | 비출연 비중 |
|---|---:|---:|---:|---:|
| 질서·안전·사회시스템 | 9 | 9 | 301,240 | 22% |
| 한일 비교 | 54 | 19 | 159,169 | 46% |
| 스포츠 | 23 | 15 | 155,181 | 65% |
| 감동·인물 이야기 | 107 | 41 | 38,629 | 27% |
| 외국인 반응·충격 | 641 | 77 | 35,829 | 34% |
| 관광·교통 | 89 | 45 | 26,674 | 29% |
| 음식 | 82 | 39 | 26,053 | 28% |
| 기술·제조 | 73 | 30 | 20,014 | 30% |
| 경제·기업 | 29 | 22 | 13,817 | 28% |
| 역사·옛 생활 | 37 | 14 | 1,626 | 27% |

표본이 작은 주제(질서·안전 9편 등)는 우연일 수 있어 **우선 후보가 아니라 추가 조사 후보**로 본다.

## 비출연형으로 확인된 일본 채널 · 구독자 대비 높은 순

| 채널 | 방식 | 구독자 | 중앙값 | 구독자 대비 | 재편집·재업로드 위험 표시 |
|---|---|---:|---:|---:|---|
| [海外の反応ニッポン堂](https://www.youtube.com/channel/UCjVhjCDvt4gtM5N6SiwohvQ) | 자료 조합 | 17 | 7,757 | X456.2 | 있음 · very high reupload risk (TV show rebroadcast) |
| [アジア情勢](https://www.youtube.com/channel/UC_SoF9dtwP-4tk-huJIU4DQ) | 자료 조합 | 98 | 6,079 | X62 | 있음 · high reupload risk of 3rd-party vlogs |
| [脱帽ジャパン](https://www.youtube.com/channel/UCP1VPIGns0_lNGUEKtcHIuQ) | 자료 조합 | 423 | 24,000 | X56.7 | 있음 · news-derived commentary; limited sample (only 1 video in inp |
| [【海外の反応】おまんら世界を語るぜよ](https://www.youtube.com/channel/UCFFitekhbPZ_KOxNqFXRWkw) | 나레이션 | 214 | 9,239 | X43.1 | 있음 · high reupload risk: short-form clips |
| [鳥肌ジャパン](https://www.youtube.com/channel/UC_9BtUe9B9Ptq_-8VNW13CQ) | 자료 조합 | 2,750 | 80,000 | X29 | 있음 · high recut/reaction-reupload risk (3rd-party reaction footag |
| [福ちゃんねる【海外の反応】](https://www.youtube.com/channel/UC9vRtlY_P_5gZEXcFg6cEQA) | 자료 조합 | 3,330 | 84,536 | X25.3 | 있음 · high reupload risk: 3rd-party short-form clips |
| [核心のジャパン](https://www.youtube.com/channel/UCDUChrf7NhJ9Y1IjMyRUWSw) | AI 생성(추정) | 2,490 | 57,500 | X23 | 있음 · sources are community posts; "無断転載ご遠慮" note; news-recut risk |
| [カピバラ速報](https://www.youtube.com/channel/UC48s4kYC00CUc1RLrehokcg) | 자료 조합 | 474 | 9,568 | X20.1 | 있음 · high reupload risk: short-form clips |
| [ゆっくり海外から見た日本](https://www.youtube.com/channel/UCFy2I-HG1WTpLUX0WgJ_Dow) | 나레이션 | 5,220 | 86,500 | X16.5 | 있음 · 5ch/X matome recut; low originality; politics/religion-sensi |
| [世界の輝きJAPAN【海外の反応】](https://www.youtube.com/channel/UCYYZGj8sMz82W9vtTKNWVrA) | AI 생성(추정) | 7,920 | 113,051 | X14.2 | 있음 · fiction presented as 海外の反応; template/mass-production risk |
| [ほっとJAPAN【海外の反応】](https://www.youtube.com/channel/UC_NU-ZSLS1G64IU4gJGPk1Q) | 나레이션 | 10,200 | 120,000 | X11.7 | 있음 · high reupload risk: clips of third-party vlogs; About says i |
| [ラッコのトレンドまとめ](https://www.youtube.com/channel/UC0M1e6CCKXo6zfSWWr5thsw) | 자료 조합 | 1,440 | 15,000 | X10.4 | 있음 · high reupload/news recut risk |
| [翻訳者が読み解く海外・韓国の反応](https://www.youtube.com/channel/UCUqWgDZw-cDqE4HlDqSeLFg) | 나레이션 | 1,430 | 14,500 | X10.1 | 있음 · translation of community posts + match footage; news/sports  |
| [【海外の反応】世界は日本をどう思う](https://www.youtube.com/channel/UCCq4BHH1ajZAld1kWic-VeA) | 자료 조합 | 4,790 | 43,500 | X9 | 있음 · high reupload risk (clips of 3rd-party creators) |
| [匠の国ニッポン](https://www.youtube.com/channel/UCZiF6xD8rPm9pB-CZjBqcuA) | AI 생성(추정) | 1,740 | 14,664 | X8.4 | 있음 · news-derived facts; accuracy risk; no creator face |

_구독자가 극단적으로 적은 채널은 우연·재업로드 가능성이 있어 단독 근거로 쓰지 않는다._

## 외부 추정 수익 상위 (블링, 최근 30일 롱폼, 실제 아님)

| 채널 | 제작 방식 | 30일 롱폼 추정(원) |
|---|---|---:|
| [じゃぱん応援隊](https://www.youtube.com/channel/UC67XaHuGbx2RzMhyhtXcfZA) | 나레이션 | 128,687,124 |
| [경제상담소](https://www.youtube.com/channel/UCmTSPV37cO8PKo1Vg8KGIuw) | AI 생성(추정) | 43,528,089 |
| [ジュジュワールドJUJUWORLD](https://www.youtube.com/channel/UC5p_nshDQNGjh2B3h-FP33g) | 출연형 | 42,901,534 |
| [ずんだ探検隊](https://www.youtube.com/channel/UCF27uipT8xmfaIALkQ14hKA) | 나레이션 | 30,152,620 |
| [マイティー・ポー【中国人アル】](https://www.youtube.com/channel/UCWbStUoGvEfS94S4UE4VEzw) | 출연형 | 29,402,367 |
| [이슈한바퀴](https://www.youtube.com/channel/UCO56pNN228bw3xRCpqu5-cQ) | 자료 조합 | 16,695,134 |
| [カチョックTV・ティナちゃんねる](https://www.youtube.com/channel/UCikqNb1b0qMIPs-cOvMv7dA) | 출연형 | 12,517,653 |
| [たのしみTV](https://www.youtube.com/channel/UCWk7Bl4_zi4QBKUJssQaz0Q) | 미확인 | 11,930,090 |
| [한류왕](https://www.youtube.com/channel/UCQp7MNu01qjTZ0vDZvlwfgw) | 미확인 | 10,473,954 |
| [日本びっくり速報【海外の反応】](https://www.youtube.com/channel/UCLc7GqdzeZEo7bVv-pKhDgQ) | 자료 조합 | 9,347,231 |

## 전략 A/B/C 비교

### A. 일본에서 이미 고수익이 확인된 일본 국뽕 주제
- 재현 가능성: 표본 기준 중간(수익 실측 없음)
- 수익 근거: vendor 추정 13채널, 실측 0
- 비출연 제작: 높음(비출연형 확인 채널 다수) · 보유 자료: 일본 해외반응·벚꽃 채널 보유 자료와 SNS 허브
- 차별화: 중간 · 비용: 미산정(작업 테스트 필요) · 장기: 중간
- 위험: 재편집·재업로드·초상/음원 권리, YPP 재사용 심사 · 신뢰도 medium_low

### B. 한국에서 고수익인 해외반응 주제의 일본 현지화
- 재현 가능성: 낮음~중간(한국 성과를 일본 시청 성과로 보장하지 못함)
- 수익 근거: 한국 표본 조회수만, 일본 현지화 성과 자료 없음
- 비출연 제작: 높음 · 보유 자료: 한국 해외반응 훅 113편 분석
- 차별화: 높음 · 비용: 번역·현지 검수 필요, 미산정 · 장기: 중간
- 위험: 번역 오류, 원 영상 권리, 문화 차이 · 신뢰도 low

### C. 중국인의 한국·일본 반응 및 일본 현지 자료 결합
- 재현 가능성: 낮음(자막·권리·수익 근거 부족)
- 수익 근거: 플랫폼 조회·좋아요만, 실제 수익 자료 없음
- 비출연 제작: 높음 · 보유 자료: 높음(약 8천 건이지만 대부분 검색 후보)
- 차별화: 높음 · 비용: 번역·권리 확인 비용 큼 · 장기: 불확실
- 위험: 플랫폼 이용약관·재업로드·권리 불명, 자막 확보율 낮음 · 신뢰도 low

## 추천 (수익 근거순이 아니라 근거가 있는 범위의 우선순위)

1. **비출연 확인 일본 해외반응·국뽕 채널의 반복 성과 형식**을 우선 벤치마킹한다. 실제 수익 증빙이 없으므로 먼저 소량 제작 테스트로 D30 조회·제작 시간·비용을 기록한다. 표의 비출연 채널 대부분이 타인 영상·뉴스·SNS 재편집 위험 표시를 받았으므로, 클립 재사용 비중이 낮은 형식(통계·지도·자체 해설·허용된 자료)을 우선한다.
2. 주제는 위 표에서 중앙값이 높고 채널 수가 충분한 항목(한일 비교, 스포츠, 감동 이야기, 외국인 반응)부터 시험한다. 표본 편향 때문에 확정 순위가 아니다.
3. 한국 해외반응의 일본 현지화(B)와 중국 SNS 자료 결합(C)은 수익·권리·자막 근거가 약해 **보류하고 소규모 검증**만 권한다.

## 미완료와 재시도

- 영상 파일 확보·OpenCV 컷/편집 분석: 다운로드 권한이 확인된 영상이 없어 실행하지 않음 → 재시도 권한 확인된 파일 또는 사용자 제공 파일
- Google Sheets 실제 저장: 저장 대상 Google 계정 미지정 → 재시도 계정 선택 후 12개 시트 생성
- 실제 공개 수익: 확인 가능한 공개 증빙 없음 → 재시도 창작자 공개 자료·정산 증빙
- 비출연형 확인 일부: 확인 40채널 외 미검증 → 재시도 프레임·설명 확인 확대
- 썸네일 시각 분석: 이미지 내용 분류 미실행 (URL만 저장) → 재시도 허용된 캡처 또는 수동 검토

## 데이터

- `lf-v5-lab.json` (공개 메타데이터, 자막 전문 없음)
- `lf-v5-sheets.zip` (12개 시트용 CSV)
- 훅 원문은 짧은 발췌만 저장하고 번역은 어시스턴트 번역으로 표시했다. 자동 자막 오류가 있다.
