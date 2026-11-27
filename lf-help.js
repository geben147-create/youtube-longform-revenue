/* Long-form help: delegated UI and local-only Korean narration. No network. */
(() => {
  'use strict';
  if (window.LFHelp) return;

  // title, compact hint, definition, formula/rule, importance, and two illustrative scenarios
  const entries = Object.freeze({
    views: ['누적 조회수', '자료 수집 시점까지 쌓인 공개 조회수예요.', '영상에 표시된 공개 누적 조회수입니다. 최근 기간에 새로 발생한 조회수나 고유 시청자 수가 아닙니다.', '자료 수집 시점에 확인한 공개 조회수를 사용합니다. 미확인은 0과 다릅니다.', '오래 게시된 영상이 유리할 수 있어, 반응 속도나 반복 성과는 일평균 또는 D30과 함께 보세요.', '2년 전 영상 30만 회와 3일 전 영상 5만 회를 비교하면 누적 조회는 첫 영상이 높지만, 게시 후 일평균은 두 번째가 높습니다.', '같은 영상이 두 기록에서 8만 회와 9만 회라면 관측 시각과 출처를 확인합니다. 신뢰할 수 있는 같은 기준이라면 두 관측 사이 1만 회 증가입니다.'],
    duration: ['영상 길이', '분·초로 표시한 재생 시간이에요.', '영상 본편의 전체 재생 시간입니다. 평균 시청 시간은 아닙니다.', '원본 길이(초)를 분과 초 또는 시·분·초로 표시합니다.', '제작 형식과 작업량을 가늠할 단서지만 실제 작업시간이나 완주율로 해석하면 안 됩니다.', '12분 해설과 40분 다큐의 조회가 비슷하면 형식과 편집 부담을 따로 비교합니다.', '길이 18분인 영상에서 평균 시청 시간이 6분이라면, 18분은 지표의 분모이지 시청자의 평균이 아닙니다.'],
    age: ['게시 후 경과일', '게시일부터 기준일까지 며칠이 지났는지 보여줘요.', '게시일부터 기준일까지의 일수입니다. 목록의 게시 기간과 일평균 계산에 쓰는 값으로, 형식 시작 이후 경과일과는 다릅니다.', '목록 경과일 = 게시일을 1일째로 센 날짜 차이. 형식 시작 경과일 = 기준일 − 확인된 시작일.', '누적 조회는 관측 기회가 긴 영상에 유리하므로 경과일을 함께 보세요.', '오늘 공개한 영상은 목록에서 1일째로 계산되어 일평균에서 0으로 나누지 않습니다.', '채널을 3년 전에 열었어도 이 형식의 첫 영상이 20일 전이면 신규 형식 경과일은 20일입니다.'],
    vph: ['게시 후 일평균', '누적 조회수를 게시 후 일수로 나눈 값이에요.', '게시일부터 기준일까지의 일평균 조회수입니다. 최근 24시간 실측이나 시간당 조회수(VPH)는 아닙니다.', '공개 누적 조회수 ÷ 게시 후 경과일(게시 당일 포함, 최소 1일).', '오래된 영상과 새 영상의 누적 크기 차이를 보완하지만 현재 상승세를 보장하지 않습니다.', '게시 후 10일째 5만 회라면 하루 평균 5,000회입니다.', '100일째 10만 회라도 어제 3만 회가 몰렸다면 일평균 1,000회로는 최근 급등을 알 수 없습니다.'],
    estimatedRevenue: ['광고수익 추정', '공개 조회수와 가정 단가로 계산한 광고 추정액이에요.', '영상의 누적 조회수와 가정 단가에서 계산한 광고수익 시나리오입니다. 기본 카드 값은 실정산, 월수익, 협찬, 순이익과 다릅니다.', '기본 카드: 공개 누적 조회수 ÷ 1,000 × 가정 단가 1,000원 / 2,000원 / 4,000원. 상세 모형은 사용한 조회 기준·범위·기간을 따로 확인하세요.', '추정 단가가 달라지면 같은 조회에서도 금액이 바뀝니다. 사업 판단에 쓰기 전에 출처와 실제 비용을 확인하세요.', '공개 누적 100만 회라면 기본 가정에서 100만 원·200만 원·400만 원으로 나뉩니다.', '50만 회 영상이 누적 추정 100만 원으로 보여도 수익화 승인이 없으면 해당 기간 실제 광고 배분은 0원일 수 있습니다.'],
    rpm: ['조회 1,000회당 수익 · RPM', '창작자 수익을 조회 1,000회 기준으로 바꾼 값이에요.', 'RPM은 지정한 조회 기준과 수익 범위에서 창작자 수익을 조회 1,000회당으로 환산한 값입니다. 광고주가 광고 노출당 지불하는 CPM과 다릅니다.', '같은 기간·범위의 수익 ÷ 해당 조회수 × 1,000. 기본 카드의 단가는 관측 RPM이 아니라 가정값입니다.', '공개·참여·수익 대상 조회나 광고·전체 수익을 섞으면 단가 비교가 왜곡됩니다.', '같은 기간 광고수익 60만 원과 공개 조회 30만 회가 검증됐다면 공개 조회 기준 광고 RPM은 2,000원입니다.', '광고만 60만 원인 달에 멤버십 포함 플랫폼 수익이 90만 원이라도, 광고 RPM 비교에는 90만 원을 사용하지 않습니다.'],
    cpm: ['광고 1,000회 노출당 비용 · CPM', '광고주가 광고 노출 1,000회당 지불하는 비용이에요.', '광고주의 비용 지표입니다. 영상 조회 1,000회당 창작자 수익인 RPM과 다릅니다.', '광고 지출 ÷ 광고 노출수 × 1,000. 영상 조회가 아니라 광고 노출을 분모로 씁니다.', '광고가 붙지 않는 조회나 한 영상 재생 중 여러 광고가 표시되는 경우가 있어 CPM으로 창작자 수익을 바로 환산하면 안 됩니다.', '광고주가 20만 원을 써서 광고 4만 회 노출을 얻으면 CPM은 5,000원입니다.', 'CPM이 5,000원이라고 해서 공개 조회 10만 회에서 창작자가 50만 원을 버는 것은 아닙니다.'],
    grade: ['근거 등급 · A/B/C/U', '금액과 자료를 뒷받침하는 근거의 강도예요.', 'A는 검증된 정산 또는 일치 범위 실측, B는 일치 범위 비교군 근거, C는 제한적인 가정으로 보세요. U는 근거 미확인이며 낮은 성과를 뜻하지 않습니다.', '금액의 종류, 기간, 조회 기준, 검증 여부와 출처를 확인해 분류합니다. 같은 화면의 금액 종류를 함께 확인하세요.', '높은 추정액보다 비교 가능한 검증 근거가 의사결정에 더 유용할 수 있습니다. A도 향후 수익을 보장하지 않습니다.', '정산 자료에서 범위·기간·조회 기준을 확인한 광고수익은 A 근거가 될 수 있습니다.', '다른 시장의 공개 소문 단가만 있다면 액수가 높아도 확정 금액으로 비교하지 않습니다.'],
    profitScore: ['사업 적합도', '여섯 항목의 근거로 계산한 참고 점수예요.', '월 수익, 반복 성과, 직접 작업시간, 비교 채널의 재현, 사업 확장, 형식 시작 시점을 합친 100점 척도입니다. 수익 금액이나 성공 확률이 아닙니다.', '각 0~1 요소에 순서대로 25·25·20·15·10·5점을 곱해 더합니다. 필수 요소가 하나라도 비면 점수는 미산정입니다.', '높은 조회수 한 편이 작업 부담과 재현 가능성의 부족을 가리지 않게 합니다.', '다른 근거가 충분해도 비교 채널 기준을 충족하지 못하면 높은 점수로 확정하지 않습니다.', '월 수익이 높은 후보라도 작업시간이 길고 반복 성과가 낮으면 여러 편에서 재현되는 후보보다 점수가 낮을 수 있습니다.'],
    missingData: ['미확인 · 미산정 · 대기', '자료가 없는 상태를 숫자 0으로 해석하지 마세요.', '미확인은 출처나 값이 확인되지 않음, 미산정은 산식에 필요한 근거 부족, 대기는 관측 시점 미도달을 뜻합니다. 확인된 0과 구분합니다.', '결측은 유효 표본에서 제외합니다. 상세 지표 정렬에서는 높낮이 양쪽에서 미확인 값을 뒤에 둡니다.', '누락을 0으로 채우면 평균과 달성률이 낮아지고, 반대로 데이터가 없다는 사실이 가려집니다.', '조회가 확인된 8편 중 6편이 목표를 넘고 2편이 미확인이면, 수집 10편 중 유효 8편에서 6/8인 75%입니다.', '게시 18일째인 영상의 D30은 대기입니다. 확인된 D30 0회와 같은 성적으로 정렬하지 않습니다.'],
    resultCount: ['결과와 전체 영상 수', '선택 수는 조건에 맞는 건수, 전체 수는 목록에 담긴 건수예요.', '목록의 선택 수는 현재 조건을 통과한 영상 수, 전체는 페이지가 보유한 영상 수입니다. 분석 모듈의 채널 건수나 채널의 전체 업로드 수와 단위가 다릅니다.', '조건을 적용한 결과를 세고, 페이지 번호 범위를 별도로 표시합니다. 채널 대표 보기에서는 대표만 표시될 수 있습니다.', '현재 화면에 보이는 카드 수만으로 결과 크기나 YouTube 전체 규모를 판단하지 마세요.', '전체 3,000편 중 필터로 123편이 선택되면, 페이지에 100편만 보여도 결과는 123편입니다.', '조건에 맞는 영상이 40편이라도 채널당 1개를 표시하면 같은 채널의 다른 영상은 대표 목록에서 빠질 수 있습니다.'],
    trend: ['채널 조회수 추세', '최근·직전 업로드 표본의 누적 조회수를 비교해요.', '최근 기간과 바로 앞의 같은 길이 기간에 게시된 영상의 공개 누적 조회수 분포를 비교합니다. 같은 D30 비교나 각 기간 발생 조회수 집계는 아닙니다.', '최근 중앙값 ÷ 직전 중앙값을 보되 양쪽 유효 표본, 목표 달성, 대표작 쏠림과 수집 범위를 함께 봅니다.', '평균이나 최고작 하나보다 일관된 변화인지 가늠하는 데 도움이 됩니다.', '직전 2만 회, 최근 4만 회이고 양쪽 표본이 충분하면 중앙값은 2배지만, 수집 상태와 게시 후 경과 차이를 확인합니다.', '최근 최고 100만 회가 한 편뿐이고 나머지가 3만 회 안팎이면 전체 추세가 급등했다고 단정하지 않습니다.'],
    graph: ['채널 막대그래프', '중앙값 두 개는 조회수, 달성률은 0~100% 척도예요.', '막대는 같은 채널의 최근·직전 중앙값과 최근 목표 달성률을 간단히 보여줍니다. 막대 길이만 보고 서로 다른 채널이나 단위를 직접 비교할 수 없습니다.', '중앙값 막대 = 각 중앙값 ÷ 두 중앙값 중 큰 값(최소 분모 1). 달성률 막대 = 목표 달성 편수 ÷ 최근 유효 편수.', '조회수의 크기는 좌우 문자 수치로 읽고, 달성률 막대는 별도로 읽으세요. 미확인은 짧은 막대로 보일 수 있으니 표기를 확인하세요.', '최근 6만, 직전 3만 회면 조회수 막대 길이는 100%와 50%로 보입니다.', '목표를 8편 중 4편이 달성하면 막대가 50%입니다. 중앙값 막대와 길이가 같아도 조회수 3만 회라는 뜻은 아닙니다.'],
    sort: ['정렬 기준', '필터는 대상을 줄이고, 정렬은 그 대상의 순서를 바꿔요.', '정렬은 목록이나 채널 분석 결과에서 무엇을 먼저 볼지 고르는 기능입니다. 썸네일 연동 중에는 채널 순서, 상세 모드에서는 선택한 지표나 프리셋이 기본 순서보다 우선할 수 있습니다.', '고른 기준에 따라 높은 순/낮은 순 등으로 비교합니다. 상세 정렬에서 미확인은 어느 방향에서도 마지막에 둡니다.', '조회, 최신, 일평균, 수익은 다른 질문에 답합니다. 금액 순을 쓸 때는 같은 수익 범위와 기간인지 확인하세요.', '예전 대표작을 찾으려면 조회 높은 순, 새로 올라온 형식을 찾으려면 게시 최신 순을 씁니다.', '영상 A가 10일 만에 5만 회, B가 100일 만에 10만 회라면 조회 높은 순에서는 B, 게시 후 일평균 순에서는 A가 먼저입니다.'],
    revenueSort: ['수익 정렬', '어떤 종류의 금액을 어떤 방향으로 비교할지 정해요.', '광고수익, 실제 총수익, 순이익은 서로 다른 금액입니다. 같은 값이라도 실정산과 추정의 근거는 다릅니다.', '선택한 수익 범위와 모형의 값을 비교합니다. 미확인 금액은 높거나 낮은 순 모두 뒤에 둡니다.', '금액의 순위는 선택한 비교 조건을 따릅니다. 서로 다른 기간이나 수익 범위의 숫자를 그대로 비교하지 마세요.', '광고 추정 200만 원인 영상과 실제 순이익 80만 원인 사례를 평가할 때 광고와 순이익을 따로 정렬합니다.', '현금 이익이 0원인 후보와 제작비 미확인 후보가 있으면, 낮은 순에서도 실제 0원 후보가 먼저입니다.'],
    filters: ['검색 · 필터', '검색어·기간·조회·금액 조건에 맞는 항목만 골라요.', '필터는 원자료를 수정하지 않고 현재 보기에 나타낼 대상을 좁힙니다. 게시 기간은 업로드 날짜, 조회 범위는 누적 조회 기준입니다.', '적용한 조건을 모두 만족해야 표시합니다. 금액 조건에는 해당 화면에 설정된 추정 단가 또는 선택 금액이 쓰입니다.', '결과가 없다고 영상이 존재하지 않는다는 뜻은 아닙니다. 범위와 미확인 자료를 살펴보세요.', '최근 90일과 5만 회 이상을 함께 고르면 두 조건을 모두 만족한 영상만 남습니다.', '과거의 영상이 지난달에 급등했어도 최근 게시 필터 범위 밖이면 목록에 나오지 않습니다.'],
    median: ['중앙값', '값을 작은 순으로 놓았을 때 가운데 값이에요.', '극단적으로 잘된 영상 한 편보다 보통 성과를 잘 보여주는 지표입니다. 채널 추세는 업로드 기간 표본, 사업 화면의 동일 D30 중앙값은 영상마다 게시 후 30일 기준입니다.', '오름차순 가운데 값. 표본 수가 짝수면 가운데 두 값의 평균입니다.', '최고 조회나 평균과 나란히 보면 대박 한 편이 전체 인상을 바꾸는지 알 수 있습니다.', '조회가 1만, 2만, 3만, 100만 회라면 중앙값은 2만 5천 회입니다.', 'D30 중앙값 2만 회인 형식과 3만 회인 형식은 표본과 조회 기준이 같을 때 비교하는 것이 좋습니다.'],
    p25: ['하위 25% 경계 · P25', '낮은 쪽 25% 부근의 경계예요.', 'P25는 값이 낮은 쪽부터 25% 지점에 해당하는 경계입니다. 최저값이나 하위 25% 영상의 평균이 아닙니다.', '정렬한 n개 값에서 0부터 센 위치 (n−1) × 0.25. 정수가 아니면 인접한 두 값 사이를 보간합니다.', '보통보다 성과가 낮은 영상들이 어느 정도 조회를 받았는지 가늠할 수 있습니다.', '10·20·30·40·50만 회면 P25는 20만 회입니다.', '두 채널의 중앙값이 모두 5만 회인데 P25가 1만 회와 4만 회라면, 후자의 낮은 성과 편도 상대적으로 조회가 높았습니다.'],
    hitRate: ['목표 달성률 · 반복 성과', '목표를 넘긴 편수 ÷ 조회가 확인된 편수예요.', '유효 표본 중 설정한 목표 조회수 이상을 기록한 영상의 비율입니다. 추세 화면과 동일 D30 화면은 표본 기준이 다릅니다.', '목표 이상인 유효 영상 수 ÷ 전체 유효 영상 수 × 100. 확인된 0은 포함하고 미확인은 제외합니다.', '높은 최고치보다 목표를 다시 달성할 가능성을 가늠하기 좋습니다. 적은 표본은 더 조심해 보세요.', '목표 1만 회에 유효 12편 중 9편이 달성했다면 75%입니다.', '1편 중 1편도 100%지만, 15편 중 13편과 같은 수준의 근거는 아닙니다.'],
    ratio: ['직전 대비 중앙값 배율', '최근 중앙값을 직전 중앙값으로 나눈 값이에요.', '직전 기간과 비교해 최근 업로드 영상의 보통 누적 조회가 몇 배인지 나타냅니다.', '최근 중앙값 ÷ 직전 중앙값. 직전 값이 0이거나 확인되지 않으면 배율을 표시하지 않습니다.', '두 기간의 대표적인 성과 변화에 유용하지만 작은 분모와 부분 수집에 민감합니다.', '직전 5만, 최근 7만 5천 회는 1.5배입니다.', '직전 중앙값이 0이고 최근이 1천 회라면 거대한 배율이 아니라 미산정입니다. 가까운 원자료를 먼저 봅니다.'],
    coverage: ['표본 수와 수집 범위', '조회 확인 편수와 수집 기간이 충분한지 확인하세요.', '유효 표본은 조회가 확인된 영상, 수집 표본은 조건 기간에 확보한 영상입니다. 수집 범위 표시는 필요한 기간이 자료에 포함됐는지를 알려줍니다.', '유효 편수 / 수집 편수를 표시합니다. 양 기간의 최소 표본 조건과 날짜 수집 범위를 별도로 확인합니다.', '표본이 적거나 수집 기간이 잘리면 상승·하락을 성급하게 판정할 수 있습니다.', '2편만 수집한 채널에서 둘 모두 잘됐어도 최소 표본이 5편이면 흐름을 확정하지 않습니다.', '최근 90일의 후반 35일만 확보했다면, 확보한 영상의 조회가 높아도 완전한 기간과 직접 비교하기 어렵습니다.'],
    d7: ['쇼츠 D7 조회', '쇼츠 게시 후 7일 시점에 확인한 누적 조회예요.', '쇼츠 초반 반응을 같은 시점에서 비교하기 위한 7일 누적 관측값입니다. 롱폼 D30이나 현재 누적과 혼합하지 않습니다.', '검증된 7일 관측 기록(조회수, 관측 시각, 출처)만 사용합니다.', '바이럴 초반 반응을 가늠하지만 롱폼 수익이나 이후 구독 전환을 의미하지 않습니다.', '쇼츠가 게시 후 7일 4만 회, 현재 20만 회라면 D7은 4만 회입니다.', '현재 8만 회라도 7일 관측 기록을 찾지 못했다면 D7은 미확인입니다.'],
    d30: ['롱폼 D30 조회', '롱폼 게시 후 30일 시점에 확인한 누적 조회예요.', '경과일이 다른 영상의 공정한 비교를 위해 게시 후 30일 누적 조회를 사용합니다. 최근 30일 동안 발생한 조회수와는 다릅니다.', '검증된 30일 관측 기록(조회수, 관측 시각, 출처)만 사용합니다. 시점 미도달은 대기입니다.', '영상마다 동일한 경과 시간을 비교해야 오래된 영상의 누적 유리함을 줄일 수 있습니다.', '콘텐츠 A가 현재 누적 100만 회지만 D30에 3만 회였다면 D30 비교에는 3만 회만 씁니다.', '영상 B가 게시된 지 18일이라면 현재 조회가 높아도 D30을 채우지 않고 기다립니다.'],
    minutes: ['직접 작업시간', '직접 투입한 작업 시간을 분 단위로 봐요.', '조사·대본·검수·편집 등 제작자가 직접 일한 시간입니다. 자동 렌더링을 기다린 시간과 직접 작업은 구분합니다.', '유효한 작업 기록의 분 단위를 비교하고, 여러 편의 대표 시간은 중앙값으로 봅니다.', '조회와 수익이 같아도 직접 작업시간이 길수록 반복 제작 여력이 줄 수 있습니다.', '영상별 직접 작업이 50·70·150분이면 중앙값은 70분입니다.', '자동 렌더가 90분, 제작자가 검수와 수정에 20분을 썼다면 직접 작업은 20분으로 기록합니다.'],
    profit: ['현금 이익 · 순이익', '수익에서 비용을 빼고, 노동비 포함 여부를 확인해요.', '같은 기간의 플랫폼 수익과 외부 기여액, 실제 변동비와 고정비로 계산한 금액입니다. 노동비를 반영한 이익은 현금 이익과 별도 표시됩니다.', '현금 이익 = 플랫폼 수익 + 외부 기여액 − 변동비 − 고정비. 이미 포함되지 않은 노동비는 노동비 반영 이익에서 추가로 뺍니다.', '매출이 있어도 제작비가 크면 손실입니다. 미확인 비용을 0으로 놓고 성공 사례처럼 해석하지 마세요.', '동일 기간 플랫폼 100만 원, 외부 기여 20만 원, 비용 70만 원이면 현금 이익은 50만 원입니다.', '노동비 60만 원이 비용에 포함되지 않았다면 같은 사례의 노동비 반영 이익은 −10만 원입니다.'],
    hourly: ['시간당 이익', '같은 기간의 현금 이익을 직접 작업시간으로 나눠요.', '직접 작업 한 시간에 남은 현금 이익입니다. 노동비를 포함한 시간당 이익과는 구분합니다.', '현금 이익 ÷ 직접 작업시간(분) × 60. 직접 작업시간이 0이거나 미확인이면 산정하지 않습니다.', '총액만 보면 시간이 많이 드는 후보가 과대평가될 수 있습니다.', '현금 이익 12만 원에 120분을 썼다면 시간당 6만 원입니다.', '이익 20만 원에 8시간을 쓴 작업은 시간당 2만 5천 원이므로, 이익 12만 원을 2시간에 만든 작업보다 효율이 낮습니다.'],
    monthly: ['완료월 최저 · 평균', '마감이 끝난 달의 수익 흐름을 비교해요.', '완료된 월별로 비교 가능한 근거에서 최저와 평균을 봅니다. 진행 중인 달과 미확인 월은 확인된 0원과 다릅니다.', '가장 최근의 완료월 3개월 모두 같은 수익 범위로 확인돼야 합니다. 최저는 세 달 중 가장 작은 금액, 평균은 합계 ÷ 3입니다.', '평균만 보면 히트작이 있는 달 때문에 꾸준히 버는 것처럼 보일 수 있습니다.', '확인된 세 달이 0원, 150만 원, 450만 원이면 평균은 200만 원이어도 최저는 0원입니다.', '이번 달 중간에 100만 원이 집계됐어도 지난 완료월 평균에 섞어 비교하지 않습니다.'],
    concentration: ['최고작 비중', '같은 표본의 조회에서 1위가 차지하는 비율이에요.', '동일 D30 표본에서 최고 조회 영상 한 편이 총 조회에 기여한 비중입니다. 그래프의 최고 ÷ 중앙값과는 다른 지표입니다.', '표본 최고 조회수 ÷ 유효 표본 조회수 합계 × 100. 설정한 한도를 넘으면 쏠림을 표시합니다.', '점수나 평균이 높아도 한 편의 성공이 대부분을 설명하는지 확인할 수 있습니다.', '최고작 10만 회와 나머지 합계 10만 회라면, 최고작 비중은 50%입니다.', '총 20만 회에 최고작이 3만 회면 15%입니다. 여러 편에서 성과가 나온 경우와 비슷할 수 있으니 중앙값과 달성률도 확인합니다.'],
    longform: ['롱폼 목록 기준', '이 목록에서는 3분 초과 비라이브 영상만 봐요.', '이 페이지가 조사 대상으로 모은 3분 초과의 비라이브 영상입니다. YouTube 전체 분류나 전체 보유 영상 목록과 동일하지 않습니다.', '영상 길이가 180초를 초과하고 라이브 표시가 없으며, 식별자와 게시일이 있는 수집 기록을 포함합니다.', '쇼츠와 라이브 실적을 섞지 않고 비교할 수 있지만, 채널의 전체 활동을 설명하지는 않습니다.', '2분 50초 영상은 목록의 시간 기준을 통과하지 않습니다.', '15분짜리 영상이라도 라이브로 표시된 기록이면 제외됩니다.']
  });
  const aliases = Object.freeze(Object.assign(Object.create(null), {
    view:'views', totalViews:'views', published:'age', date:'age', start:'age', daily:'vph', viewsPerDay:'vph',
    revenue:'estimatedRevenue', ad:'estimatedRevenue', revenueRange:'estimatedRevenue', models:'estimatedRevenue',
    estimatedPay:'estimatedRevenue', confidence:'grade', evidence:'grade', score:'profitScore',
    businessScore:'profitScore', unknown:'missingData', results:'resultCount', counts:'resultCount',
    channelTrend:'trend', hist:'trend', chart:'graph', channelGraph:'graph', sorting:'sort',
    growthSort:'sort', channelSort:'sort', filter:'filters', q25:'p25', hit:'hitRate', repeat:'hitRate',
    growth:'ratio', sample:'coverage', sampleCount:'coverage', repeatSample:'coverage', D7:'d7', D30:'d30',
    time:'minutes', netProfit:'profit', pilotCash:'profit', pilotLabor:'profit', hourlyProfit:'hourly',
    monthlyMin:'monthly', monthlyAvg:'monthly', peakShare:'concentration'
  }));
  const fallback = ['도움말', '이 항목의 도움말이 아직 준비되지 않았어요.', '이 항목의 설명이 아직 준비되지 않았습니다.'];
  const getEntry = key => Object.prototype.hasOwnProperty.call(entries, key) ? entries[key] : entries[aliases[key]] || fallback;
  const escapeMap = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => escapeMap[char]);
  const ids = { tip: 'lf-help-tooltip', panel: 'lf-help-popover', title: 'lf-help-title' };
  const triggerSelector = 'button[data-lf-help], [role="button"][data-lf-help]';

  function label(key, text) {
    const titleText = getEntry(key)[0];
    const name = text ?? titleText;
    return '<button type="button" class="lf-help-label" data-lf-help="' + escape(key) +
      '" aria-haspopup="dialog" aria-expanded="false" aria-controls="' + ids.panel +
      '"><span>' + escape(name) + '</span><span class="lf-help-mark" aria-hidden="true">?</span><span class="lf-help-sr">' + (name === '' ? escape(titleText) : '') + ' 도움말</span></button>';
  }

  const styles =
    '.lf-help-label{display:inline-flex;align-items:center;gap:.26em;max-width:100%;min-height:1.5em;margin:0;padding:0 .18em;border:0;border-radius:.25em;background:transparent;color:inherit;font:inherit;font-weight:inherit;line-height:inherit;vertical-align:baseline;text-align:start;cursor:help;overflow-wrap:anywhere}' +
    '.lf-help-label:hover,.lf-help-label[aria-expanded="true"]{text-decoration:underline;text-underline-offset:.15em}.lf-help-label:focus-visible,.lf-help-panel button:focus-visible,.lf-help-panel select:focus-visible{outline:2px solid #3376e9;outline-offset:2px}' +
    '.lf-help-mark{display:inline-grid;flex:none;place-items:center;box-sizing:border-box;width:1.1em;height:1.1em;border:1px solid currentColor;border-radius:50%;font-size:.82em;font-weight:700;line-height:1;opacity:.82}.lf-help-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0}' +
    '.lf-help-layer{position:fixed;inset:auto;box-sizing:border-box;margin:0;border-radius:9px;text-align:left;white-space:normal;overflow-wrap:anywhere;z-index:2147483000}.lf-help-layer[hidden]{display:none!important}.lf-help-tip{max-width:min(17rem,calc(100vw - 16px));padding:5px 8px;border:1px solid #40516b;background:#1e293b;color:#fff;box-shadow:0 4px 14px #0f172a38;font:500 12px/1.45 system-ui,sans-serif}' +
    '.lf-help-panel{width:min(25rem,calc(100vw - 16px));max-height:calc(100dvh - 16px);overflow:auto;overscroll-behavior:contain;padding:11px 13px;border:1px solid #64748b;background:#fff;color:#17243a;box-shadow:0 10px 32px #0f172a40;font:400 13px/1.48 system-ui,sans-serif}.lf-help-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.lf-help-panel h2{margin:0;color:inherit;font:700 15px/1.4 system-ui,sans-serif}.lf-help-panel dl,.lf-help-panel ol,.lf-help-panel p{margin:0}.lf-help-panel dt{margin-top:7px;font-weight:700}.lf-help-panel dd{margin:1px 0 0}.lf-help-panel ol{padding-inline-start:1.25em}.lf-help-panel li+li{margin-top:3px}' +
    '.lf-help-panel .lf-help-audio{margin-top:10px;padding-top:8px;border-top:1px solid #adbbce}.lf-help-audio-row{display:flex;align-items:center;flex-wrap:wrap;gap:5px}.lf-help-panel button,.lf-help-panel select{box-sizing:border-box;min-height:27px;margin:0;padding:2px 6px;border:1px solid #76869f;border-radius:5px;background:#f4f7fc;color:#17243a;cursor:pointer;font:inherit}.lf-help-panel button:disabled,.lf-help-panel select:disabled{opacity:.62;cursor:default}.lf-help-speed{white-space:nowrap}.lf-help-panel .lf-help-status{margin-top:5px;font-size:11px;color:#40516b}' +
    '@media (prefers-color-scheme:dark){.lf-help-panel{background:#182335;color:#f1f5fc}.lf-help-panel .lf-help-status{color:#cbd5e1}.lf-help-panel button,.lf-help-panel select{background:#25344b;color:#f1f5fc}}';

  let mounted = false;
  function mount() {
    if (mounted) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
      return;
    }
    mounted = true;
    const make = (tag, attrs, text) => {
      const el = document.createElement(tag);
      for (const [attribute, value] of Object.entries(attrs || {})) el.setAttribute(attribute, value);
      if (text != null) el.textContent = text;
      return el;
    };
    const style = make('style', {}, styles);
    (document.head || document.body).append(style);
    const tooltip = make('div', { id: ids.tip, class:'lf-help-layer lf-help-tip', role:'tooltip', hidden:'' });
    const panel = make('section', { id: ids.panel, class:'lf-help-layer lf-help-panel', role:'dialog', 'aria-labelledby':ids.title, hidden:'' });
    const title = make('h2', { id: ids.title });
    const button = (text, action) => make('button', { type:'button', 'data-lf-help-action':action }, text);
    const closeButton = button('닫기', 'close');
    const head = make('header', { class:'lf-help-head' });
    const descriptions = make('dl');
    const audio = make('div', { class:'lf-help-audio' });
    const audioRow = make('div', { class:'lf-help-audio-row' });
    const shortButton = button('짧게 듣기', 'short');
    const longButton = button('자세히 듣기', 'long');
    const stopButton = button('중지', 'stop');
    const rateLabel = make('label', { class:'lf-help-speed' }, '속도 ');
    const rates = make('select', { 'aria-label':'한국어 음성 읽기 속도 (다음 재생부터 적용)' });
    for (const speed of [0.75, 1, 1.25, 1.5]) rates.append(make('option', { value:speed }, speed + '배'));
    rates.value = '1';
    const status = make('p', { role:'status', 'aria-live':'polite', 'aria-atomic':'true', class:'lf-help-status' });
    head.append(title, closeButton);
    rateLabel.append(rates);
    audioRow.append(shortButton, longButton, stopButton, rateLabel);
    audio.append(audioRow, status);
    panel.append(head, descriptions, audio);
    document.body.append(tooltip, panel);

    let anchor = null, entry = null, tipAnchor = null, hovered = null, keyboard = null, overTip = false, ignored = null;
    let openTimer = 0, closeTimer = 0, frame = 0, pendingVoices = 0, restore = false;
    let synth = null;
    try { synth = window.speechSynthesis; } catch { /* blocked by this browser */ }
    const canSpeak = Boolean(synth && typeof synth.getVoices === 'function' && typeof synth.speak === 'function' &&
      typeof synth.cancel === 'function' && typeof window.SpeechSynthesisUtterance === 'function');
    const noVoice = '이 기기의 로컬 한국어 음성을 찾지 못했어요. 위 설명을 읽거나, 기기 설정에서 한국어 음성을 설치·활성화한 뒤 새로고침해 보세요. 온라인 음성은 사용하지 않아요.';
    const noApi = '이 브라우저에서 음성 읽기 기능을 사용할 수 없어요. 위 설명은 글로 읽을 수 있어요.';
    let active = null, spoken = false, voiceFailed = false;

    function pickVoice() {
      if (!canSpeak) return null;
      try {
        const voices = Array.from(synth.getVoices() || []).filter(v => v && v.localService === true && /^ko(?:[-_]|$)/i.test(v.lang || ''));
        return voices.find(v => /^ko[-_]kr$/i.test(v.lang) && v.default) || voices.find(v => /^ko[-_]kr$/i.test(v.lang)) || voices.find(v => v.default) || voices[0] || null;
      } catch { return null; }
    }
    function refreshSpeech() {
      const voice = pickVoice();
      shortButton.disabled = longButton.disabled = rates.disabled = !voice;
      stopButton.disabled = !active;
      if (!active) status.textContent = !canSpeak ? noApi : !voice ? noVoice : voiceFailed ?
        '로컬 한국어 음성을 재생하지 못했어요. 다시 시도하거나 위 설명을 글로 읽을 수 있어요.' : spoken ?
        '이 탭에서 로컬 한국어 음성 재생을 확인했어요.' : '로컬 한국어 음성을 찾았어요. 실제 재생 여부는 듣기 버튼을 눌러 확인할 수 있어요.';
      schedulePosition();
      return voice;
    }
    function cancelSpeech(message) {
      if (active) {
        const current = active;
        active = null;
        clearTimeout(current.timeout);
        current.utterance.onstart = current.utterance.onend = current.utterance.onerror = null;
        try { synth.cancel(); } catch { /* cancellation is best effort */ }
      }
      stopButton.disabled = true;
      if (message) status.textContent = message;
    }
    function speak(mode) {
      const voice = pickVoice();
      if (!voice || !entry) { cancelSpeech(); refreshSpeech(); return; }
      if (!active && (synth.speaking || synth.pending)) {
        status.textContent = '브라우저에서 이미 다른 음성이 재생 중이거나 대기 중이에요. 끝난 뒤 다시 시도하세요.';
        return;
      }
      cancelSpeech();
      voiceFailed = false;
      const short = [entry[0], entry[1]];
      const detail = [entry[0], entry[2], '산식 또는 기준. ' + entry[3], '중요한 이유. ' + entry[4], '첫 번째 예시. ' + entry[5], '두 번째 예시. ' + entry[6]];
      const text = (mode === 'long' && entry !== fallback ? detail : short).join('。 ');
      let utterance;
      try {
        utterance = new window.SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang.replace(/_/g, '-');
        utterance.rate = Number(rates.value) || 1;
      } catch { voiceFailed = true; refreshSpeech(); return; }
      const current = { utterance, timeout:0, started:false };
      active = current;
      stopButton.disabled = false;
      status.textContent = '로컬 한국어 음성을 시작하는 중이에요.';
      current.timeout = setTimeout(() => {
        if (active !== current) return;
        cancelSpeech();
        voiceFailed = true;
        refreshSpeech();
      }, 5500);
      utterance.onstart = () => {
        if (active !== current) return;
        clearTimeout(current.timeout);
        current.started = true;
        status.textContent = '로컬 한국어로 읽는 중이에요.';
      };
      utterance.onend = () => {
        if (active !== current) return;
        clearTimeout(current.timeout);
        active = null;
        if (current.started) spoken = true;
        else voiceFailed = true;
        refreshSpeech();
      };
      utterance.onerror = () => {
        if (active !== current) return;
        clearTimeout(current.timeout);
        active = null;
        voiceFailed = true;
        refreshSpeech();
      };
      try { synth.speak(utterance); } catch { cancelSpeech(); voiceFailed = true; refreshSpeech(); }
    }
    if (canSpeak && typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', () => { if (anchor) refreshSpeech(); });
    }

    const closest = (target, selector) => target?.closest?.(selector) || null;
    const inside = (el, node) => Boolean(node && typeof node.nodeType === 'number' && el?.contains(node));
    const host = t => closest(t, 'dialog[open]') || document.body;
    function show(layer, target) {
      const parent = host(target);
      if (layer.parentElement !== parent) parent.append(layer);
      layer.hidden = false;
      if (typeof layer.showPopover === 'function') {
        layer.setAttribute('popover', 'manual');
        try { layer.showPopover(); } catch { layer.removeAttribute('popover'); }
      }
    }
    function hide(layer) {
      if (layer.hasAttribute('popover')) {
        try { layer.hidePopover(); } catch { /* element may have been removed during render */ }
        layer.removeAttribute('popover');
      }
      layer.hidden = true;
    }
    function position(layer, trigger, gap) {
      const box = trigger.getBoundingClientRect();
      const vv = window.visualViewport;
      const width = vv?.width || document.documentElement.clientWidth || window.innerWidth;
      const height = vv?.height || window.innerHeight;
      const x = vv?.offsetLeft || 0, y = vv?.offsetTop || 0, edge = 8;
      if (!box.width || !box.height || box.bottom < y || box.top > y + height || box.right < x || box.left > x + width) return false;
      const maxWidth = Math.max(1, width - edge * 2);
      layer.style.maxWidth = layer === tooltip ? Math.min(maxWidth, 272) + 'px' : maxWidth + 'px';
      layer.style.maxHeight = Math.max(1, height - edge * 2) + 'px';
      const below = y + height - box.bottom - gap - edge;
      const above = box.top - y - gap - edge;
      const natural = layer.offsetHeight;
      let top;
      if (below >= natural) top = box.bottom + gap;
      else if (above >= natural) top = box.top - gap - natural;
      else if (layer === panel && Math.max(above, below) >= 150) {
        layer.style.maxHeight = Math.max(above, below) + 'px';
        top = below >= above ? box.bottom + gap : box.top - gap - layer.offsetHeight;
      } else top = below >= above ? box.bottom + gap : box.top - gap - natural;
      layer.style.left = Math.max(x + edge, Math.min(box.left, x + width - layer.offsetWidth - edge)) + 'px';
      layer.style.top = Math.max(y + edge, Math.min(top, y + height - layer.offsetHeight - edge)) + 'px';
      return true;
    }
    function reposition() {
      frame = 0;
      if (anchor && (!anchor.isConnected || !position(panel, anchor, 7))) closePanel(false);
      if (tipAnchor && (!tipAnchor.isConnected || !position(tooltip, tipAnchor, 4))) hideTip();
    }
    function schedulePosition() { if ((anchor || tipAnchor) && !frame) frame = window.requestAnimationFrame(reposition); }
    const described = element => (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    function hideTip() {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      overTip = false;
      if (tipAnchor) {
        const other = described(tipAnchor).filter(id => id !== ids.tip);
        if (other.length) tipAnchor.setAttribute('aria-describedby', other.join(' '));
        else tipAnchor.removeAttribute('aria-describedby');
      }
      tipAnchor = null;
      hide(tooltip);
    }
    function showTip(trigger, delay) {
      if (anchor || trigger === ignored || trigger === tipAnchor) return;
      hideTip();
      openTimer = setTimeout(() => {
        if (anchor || trigger === ignored || !trigger.isConnected || (hovered !== trigger && keyboard !== trigger)) return;
        tipAnchor = trigger;
        tooltip.textContent = getEntry(trigger.getAttribute('data-lf-help'))[1];
        show(tooltip, trigger);
        if (!position(tooltip, trigger, 4)) { hideTip(); return; }
        trigger.setAttribute('aria-describedby', [...new Set([...described(trigger), ids.tip])].join(' '));
      }, delay);
    }
    function scheduleHideTip() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => { if (!overTip && tipAnchor && keyboard !== tipAnchor && hovered !== tipAnchor) hideTip(); }, 180);
    }
    function closePanel(refocus) {
      if (!anchor) return;
      const old = anchor;
      anchor = null;
      entry = null;
      clearTimeout(pendingVoices);
      old.setAttribute('aria-expanded', 'false');
      cancelSpeech();
      restore = !!refocus;
      hide(panel);
      if (refocus && old.isConnected) { ignored = old; old.focus({ preventScroll:true }); }
      restore = false;
    }
    function fillContent(content) {
      title.textContent = content[0];
      descriptions.replaceChildren();
      for (const [caption, index] of [['정의',2], ['산식 / 기준',3], ['왜 중요하나요?',4]]) {
        if (content[index]) descriptions.append(make('dt', {}, caption), make('dd', {}, content[index]));
      }
      if (content[5] && content[6]) {
        const list = make('ol');
        list.append(make('li', {}, content[5]), make('li', {}, content[6]));
        const dd = make('dd');
        dd.append(list);
        descriptions.append(make('dt', {}, '예시'), dd);
      }
    }
    function openPanel(trigger) {
      hideTip();
      if (anchor === trigger) { closePanel(true); return; }
      closePanel(false);
      anchor = trigger;
      ignored = null;
      entry = getEntry(trigger.getAttribute('data-lf-help'));
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', ids.panel);
      trigger.setAttribute('aria-expanded', 'true');
      fillContent(entry);
      show(panel, trigger);
      refreshSpeech();
      pendingVoices = setTimeout(() => { if (anchor && !active) { refreshSpeech(); schedulePosition(); } }, 800);
      if (!position(panel, trigger, 7)) { closePanel(false); return; }
      closeButton.focus({ preventScroll:true });
    }

    document.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch') return;
      if (inside(tooltip, event.target)) { overTip = true; clearTimeout(closeTimer); return; }
      const trigger = closest(event.target, triggerSelector);
      if (!trigger || inside(trigger, event.relatedTarget)) return;
      hovered = trigger;
      clearTimeout(closeTimer);
      showTip(trigger, 150);
    });
    document.addEventListener('pointerout', event => {
      if (event.pointerType === 'touch') return;
      if (inside(tooltip, event.target)) {
        if (!inside(tooltip, event.relatedTarget)) { overTip = false; scheduleHideTip(); }
        return;
      }
      const trigger = closest(event.target, triggerSelector);
      if (!trigger || inside(trigger, event.relatedTarget)) return;
      if (hovered === trigger) hovered = null;
      if (ignored === trigger && keyboard !== trigger) ignored = null;
      if (!tipAnchor && keyboard !== trigger) clearTimeout(openTimer);
      scheduleHideTip();
    });
    document.addEventListener('focusin', event => {
      if (anchor && !restore && !inside(panel, event.target) && anchor !== closest(event.target, triggerSelector)) closePanel(false);
      const trigger = closest(event.target, triggerSelector);
      if (trigger) { keyboard = trigger; showTip(trigger, 0); }
    });
    document.addEventListener('focusout', event => {
      const trigger = closest(event.target, triggerSelector);
      if (!trigger || inside(trigger, event.relatedTarget)) return;
      if (keyboard === trigger) keyboard = null;
      if (ignored === trigger && hovered !== trigger) ignored = null;
      if (!tipAnchor && hovered !== trigger) clearTimeout(openTimer);
      scheduleHideTip();
    });
    document.addEventListener('click', event => {
      const action = closest(event.target, '[data-lf-help-action]');
      if (action && inside(panel, action)) {
        switch (action.getAttribute('data-lf-help-action')) {
          case 'close': closePanel(true); break;
          case 'stop': cancelSpeech('음성 읽기를 중지했어요.'); break;
          case 'short': speak('short'); break;
          case 'long': speak('long'); break;
        }
        schedulePosition();
        return;
      }
      const trigger = closest(event.target, triggerSelector);
      if (trigger) { event.preventDefault(); openPanel(trigger); }
      else if (!inside(panel, event.target)) { closePanel(false); hideTip(); }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && (anchor || tipAnchor)) {
        event.preventDefault();
        event.stopPropagation();
        if (anchor) closePanel(true);
        else { ignored = tipAnchor; hideTip(); }
        return;
      }
      const trigger = closest(event.target, '[role="button"][data-lf-help]');
      if (trigger && trigger.tagName !== 'BUTTON' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); if (!event.repeat) openPanel(trigger);
      }
    }, true);
    document.addEventListener('close', event => {
      if (event.target?.tagName !== 'DIALOG') return;
      if (anchor && inside(event.target, anchor)) closePanel(false);
      if (tipAnchor && inside(event.target, tipAnchor)) hideTip();
    }, true);
    document.addEventListener('scroll', schedulePosition, true);
    window.addEventListener('resize', schedulePosition);
    window.visualViewport?.addEventListener('resize', schedulePosition);
    window.visualViewport?.addEventListener('scroll', schedulePosition);
    window.addEventListener('pagehide', () => { closePanel(false); hideTip(); });
    if (typeof window.MutationObserver === 'function') new window.MutationObserver(() => {
      if (anchor && (!anchor.isConnected || !panel.isConnected)) closePanel(false);
      if (tipAnchor && (!tipAnchor.isConnected || !tooltip.isConnected)) hideTip();
    }).observe(document.body, { childList:true, subtree:true });
  }

  window.LFHelp = Object.freeze({ mount, label });
})();
