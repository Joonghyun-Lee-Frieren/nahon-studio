# 다른 게임 프로젝트에 전달할 지침

- 사이트: https://joonghyun-lee-frieren.github.io/nahon-studio/
- 업로드 저장소: https://github.com/Joonghyun-Lee-Frieren/nahon-studio
- 이 저장소의 `games/_template/game.json`을 복사해 `games/<게임ID>/game.json`을 작성하고, 같은 폴더에 배너·스크린샷을 넣어 주세요. 실제 게임명·소개·스토어 링크·YouTube URL(`videos`)을 채우고 `demo`는 `false`로 설정합니다.
- `content/games.json`에 `games/<게임ID>/game.json`을 추가한 뒤 PR을 올려 `main`에 병합하면 사이트에 반영됩니다. 이후 수정은 해당 게임 폴더만 변경하면 됩니다.
- 상세 주소: `https://joonghyun-lee-frieren.github.io/nahon-studio/game.html?id=<게임ID>` · [전체 작성 예시](ADDING_GAMES.md)
