# 롱폼 수익·자료 사용 근거 (2026-11-27 KST)

## 단가와 정확도

- 기존 롱폼 공개 누적 조회 기반 1,000/2,000/4,000 KRW, M1~M5, 기존 V2 재현성 100점은 변경하지 않았다. `lf-metrics.test.cjs`는 2,828,415 공개 조회가 각각 2,828,415 / 5,656,830 / 11,313,660인 기존 산식을 확인한다. 하/중/상은 가정이며 통계적 신뢰구간 또는 보장 수익이 아니다.
- M1은 같은 기간·채널·수익 범위·조회 분모의 실측 RPM, M2는 같은 범위의 비교 표본 RPM 중앙값, M3는 vidIQ 공개 모형을 참고한 분야 USD 단가·국가계수·FX 시나리오, M4는 내부 롱폼 분야별 N3 가정, M5는 별도 고정 단가 가정이다. M3~M5는 실제 정산을 재현하는 식이 아니다. 기본 3단가의 하·중·상은 vidIQ 가정 범위와 다르다. 같은 기간의 실정산 대조 없이는 정확도를 평가하지 않는다.
- AIR의 해당 자료는 쇼츠, 참여조회 기반 제품군 및 국가 RPM이다. 이 롱폼 UI에서 적용하지 않는다. 0.5 비율 및 환율은 이전 프로젝트의 가정이지 AIR 공식 분모 변환이 아니다. YouTube 공개 조회수, 적격 참여 조회수, 광고 조회수 및 플랫폼 총수익을 구별한다.
- 블링(Vling)의 공개 `money-info` 6개 동일 채널 프로필에서 ‘최근 30일 롱폼 조회수 수익’ 범위를 관측했다. 공개 페이지의 RPM 설명은 $2~$4.5이며 제휴·협찬·총수익 빈칸은 0이 아니다. 두 일본 채널은 해당 공개 경로 미확인. 녹스인플루언서 프로필은 별도 출처이며 같은 창·같은 분모의 실제 금액으로 검증할 수 없어서 숫자를 넣지 않았다. 추정 사이트의 비공개 공식이나 실제 해당 국가 시청자 비중은 가정하지 않았다. 비교 화면의 기존 시나리오에 블링/녹스 값을 합산하지 않는다.

https://vidiq.com/youtube-money-calculator/

https://air.io/en/monetization/what-rpm-can-you-expect-from-shorts-in-2026

https://support.google.com/youtube/answer/9314357

https://support.google.com/youtube/blog/433409976?hl=en-419

https://vling.net/channel/UC3VL7eziAD94S6_qwdStoMA/money-info

https://kr.noxinfluencer.com/youtube/channel/UC3VL7eziAD94S6_qwdStoMA

## Google 승인 및 보관

Google Cloud 프로젝트 ID와 해당 사용 사례의 승인서가 제공되지 않아 계정별 API OAuth 범위·감사 승인 여부는 미확인이다. 새 OAuth 연결, 인증된 Analytics 수집, API 데이터에 대한 추가 파생 지표 운영, 장기 API 데이터 보관을 추가하지 않았다. 아래 YouTube API Services Developer Policies III.L의 기본 제약 및 승인 절차를 따르며, 특정 사용 사례에 대한 감사와 YouTube의 명시 승인으로 허용된 경우에만 해당 예외를 적용한다. 조회 정의가 바뀌면 원래 분모와 관측일을 동일한 기준으로 덮어쓰지 않는다. 새 조사 후보는 공개 원본 메타데이터를 이 날짜에 관측한 편집 표본이며 실시간 API/권한을 뜻하지 않는다.

https://developers.google.com/youtube/terms/developer-policies

https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits

https://support.google.com/youtube/answer/1311392

## 사업 확장 검토

전자책·리포트·구독·교육·템플릿·프로그램·제휴·캐릭터 IP·SNS 월관리 각각에 계약/반복 거래/공수/비용이 필요하다. 공개 동영상만으로 매출·전환율·마진·운영권을 판정하지 않는다. AI 자료의 원본, 모델·데이터의 상업적 사용과 재배포 조건, 타인 영상 또는 인물 사용, 유료 제휴 고지, 대량 반복 콘텐츠 및 재사용 수익화 정책은 각각 검토한다. 투자교육/일반 정보와 종목 추천·개인화 자문·운용은 국가별 등록·광고 규정 적용이 다를 수 있으며, 사업별 실제 서비스 구조를 검토해야 한다.

https://www.fsc.go.kr/eng/

https://www.fsa.go.jp/en/

https://www.sec.gov/investment

https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews
