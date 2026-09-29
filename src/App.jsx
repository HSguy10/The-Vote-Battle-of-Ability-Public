import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// ⚠️ 로컬 테스트 시에는 'http://localhost:4000' 주소를 사용하고, 배포 후에는 백엔드 주소로 교체합니다.
const socket = io('https://the-vote-battle-of-ability.onrender.com/', { // 💡 내 실제 Render 주소로 교체!
  transports: ['websocket', 'polling'],
  withCredentials: true
});

export default function App() {
  const [roomState, setRoomState] = useState(null);
  const [myName, setMyName] = useState('');
  const [joined, setJoined] = useState(false);

  // 실시간 서버 상태 받아쓰기 갱신
  useEffect(() => {
    socket.on('update_state', (state) => {
      setRoomState(state);
    });
    return () => socket.off('update_state');
  }, []);

  const handleJoin = () => {
    if (!myName.trim()) return;
    socket.emit('join_game', myName);
    setJoined(true);
  };

  if (!joined) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', backgroundColor: '#111', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
        <h2>🔮 DEATH VOTE 온라인 입장</h2>
        <input type="text" placeholder="닉네임 입력" value={myName} onChange={e => setMyName(e.target.value)} style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', border: 'none', marginRight: '10px' }} />
        <button onClick={handleJoin} style={{ padding: '10px 20px', fontSize: '16px', background: 'cyan', color: 'black', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>게임 참여</button>
      </div>
    );
  }

  if (!roomState) {
  return (
    <div style={{ padding: '100px 20px', textAlign: 'center', backgroundColor: '#111', minHeight: '100vh', color: 'cyan', fontFamily: 'sans-serif' }}>
      <h3 style={{ animation: 'blink 1.5s infinite' }}>⏳ 실시간 서버 연결 대기 중...</h3>
      <p style={{ color: '#aaa', fontSize: '13px' }}>Render 무료 서버가 잠에서 깨어나는 중일 수 있습니다. 최대 1분만 기다려 주세요.</p>
    </div>
  );
}

  const myID = socket.id;
  const myData = roomState.players[myID];
  const { phase, round, selectedTarget, votes, players } = roomState;

  return (
    <div style={{ padding: '20px', backgroundColor: '#111', minHeight: '100vh', fontFamily: 'sans-serif', color: '#fff' }}>
      <h2 style={{ textAlign: 'center' }}>🔮 DEATH VOTE (온라인 멀티플레이)</h2>
      <p style={{ textAlign: 'center', color: '#aaa' }}>내 고유 소켓 ID: {myID}</p>

      {/* 실시간 게임 진행 레이아웃 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {Object.values(players).map((p) => {
          const isTarget = selectedTarget === p.id;
          const isMe = p.id === myID;
          return (
            <div key={p.id} style={{ background: p.isDead ? '#1d1d1d' : '#2c2c2c', border: isTarget ? '3px solid red' : isMe ? '2px solid cyan' : '1px solid #555', padding: '15px', borderRadius: '8px' }}>
              <h3>{p.name} {isMe && '(나)'} {p.isDead && '👻 (사망)'}</h3>

              {/* 내 구역일 때만 카드 목록 오픈 및 조작 활성화 */}
              {isMe && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>내 보유 패:</strong>
                  {p.hand.map((card, idx) => (
                    <button key={idx} disabled={phase !== 'SHOWDOWN' || selectedTarget !== myID || card.type !== 'ABILITY'} onClick={() => socket.emit('prove_ability', idx)} style={{ display: 'block', width: '100%', textAlign: 'left', margin: '5px 0', padding: '6px' }}>
                      [{card.type}] {card.name} - <small>{card.desc}</small>
                    </button>
                  ))}
                  {phase === 'SHOWDOWN' && selectedTarget === myID && (
                    <button onClick={() => socket.emit('execute_die')} style={{ width: '100%', background: 'red', color: 'white', padding: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>☠️ 능력 없음 (즉사 선택)</button>
                  )}
                </div>
              )}

              {/* 투표 제어판 */}
              {phase === 'VOTING' && !myData?.isDead && (
                <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>지목 대상 선택:</span>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    {Object.values(players).map((target) => (
                      <button key={target.id} disabled={p.isDead || target.isDead || target.id === p.id} onClick={() => socket.emit('cast_vote', target.id)} style={{ fontSize: '11px', padding: '5px 10px', backgroundColor: votes[p.id] === target.id ? 'yellow' : '', color: votes[p.id] === target.id ? 'black' : '' }}>
                        {target.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}