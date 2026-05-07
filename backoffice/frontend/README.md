## Quipu BackOffice Web

- 퀴푸의 어드민 웹사이트 입니다.

## environment

- Language: JavaScript
- Package Manager: npm 10.2.4
- Library: React.js

## local

프로젝트 가져오기

```
git clone https://github.com/Quipu-Developers/backoffice-frontend.git
cd main-frontend
```

`.env` 파일 생성

```
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_FRONTEND_URL=http://localhost:3000
```

프로젝트 실행

```
npm install
npm run start
```

## how to use
이 웹 애플리케이션은 키보드 단축키를 사용하여 효율적으로 탐색할 수 있습니다. 주요 기능은 다음과 같습니다:

- 화살표 키 (위/아래): 목록에서 항목을 선택하여 탐색할 수 있습니다.
- Enter 키: 선택된 항목에 대한 세부 정보 모달을 엽니다.
- 화살표 키 (왼쪽/오른쪽): 현재 모달에서 다음 또는 이전 항목의 모달로 이동합니다.
- Esc 키: 현재 열린 모달을 닫습니다.
- 밑줄이 있는 항목 클릭: 해당 항목의 텍스트가 클립보드에 복사됩니다.
- P 키: 모달 내에서 전화번호가 표시된 항목의 전화번호가 클립보드에 복사됩니다.

