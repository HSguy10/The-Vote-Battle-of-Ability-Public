import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// 내 실제 Render 라이브 서버 주소를 정확하게 기입하세요.
const socket = io('https://onrender.com', {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

export default function App() {
  const [roomState, setRoomState] = useState(null);
  const [myName, setMyName] = useState('');
  const [roomCode, setRoomCode] = useState(''); // 방 코드 상태 추가
  const [joined, setJoined] = useState(false);
  const [sysMsg, setSysMsg] = useState('');

  useEffect(() => {
    socket.on('update_state', (state) => {
      setRoomState(state);
    });
    socket.on('system_message', (msg) => {
      alert(msg);
      setJoined(false);
    });
    return () => {
      socket.off('update_state');
      socket.off('system_message');
    };
  }, []);

  const handleJoinRoom = () => {
    if (!myName.trim() || !roomCode.trim()) {
      alert('닉네임과 방 코드를 모두 입력해 주세요!');
      return;
    }
    // 서버로 닉네임과 방 번호를 객체 형태로 전송
    socket.emit('join_room', { roomCode, playerName: myName });
    setJoined(true);
  };

  // 1. 입장 전 로비 화면 (닉네임 + 방 코드 입력 패널)
  if (!joined) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', backgroundColor: '#111', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
        <h2>🔮 DEATH VOTE 비밀 매칭 룸</h2>
        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '30px' }}>방 코드가 일치하는 친구들끼리 자동으로 같은 대전방에 배정됩니다.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
          <input type="text" placeholder="🧙‍♂️ 내 닉네임 입력" value={myName} onChange={e => setMyName(e.target.value)} style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: '#fff' }} />
          <input type="text" placeholder="🔑 비밀 방 코드 (예: 7777)" value={roomCode} onChange={e => setRoomCode(e.target.value)} style={{ padding: '12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: '#fff' }} />
          
          <button onClick={handleJoinRoom} style={{ padding: '12px', fontSize: '16px', background: 'cyan', color: 'black', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '6px', marginTop: '10px' }}>게임 룸 입장 / 개설</button>
        </div>
      </div>
    );
  }

  // 서버 통신 로딩창
  if (!roomState) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', backgroundColor: '#111', minHeight: '100vh', color: 'cyan', fontFamily: 'sans-serif' }}>
        <h3>⏳ 비밀 방 동기화 네트워크 연결 중...</h3>
      </div>
    );
  }

  const myID = socket.id;
  const myData = roomState.players[myID];
  const { phase, round, selectedTarget, votes, players } = roomState;

  return (
    <div style={{ padding: '20px', backgroundColor: '#111', minHeight: '100vh', fontFamily: 'sans-serif', color: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '5px' }}>🔮 DEATH VOTE (비밀방: <span style={{ color: 'yellow' }}>{roomState.roomCode}</span>)</h2>
      <p style={{ textAlign: 'center', color: '#aaa', fontSize: '12px', margin: '0 0 20px 0' }}>현재 방 인원: {Object.keys(players).length} / 4명</p>

      {/* 실시간 게임 진행 레이아웃 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {Object.values(players).map((p) => {
          const isTarget = selectedTarget === p.id;
          const isMe = p.id === myID;
          return (
            <div key={p.id} style={{ background: p.isDead ? '#1d1d1d' : '#2c2c2c', border: isTarget ? '3px solid red' : isMe ? '2px solid cyan' : '1px solid #555', padding: '15px', borderRadius: '8px' }}>
              <h3>{p.name} {isMe && '(나)'} {p.isDead && '👻 (사망)'}</h3>

              {isMe && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>내 보유 패:</strong>
                  {p.hand.map((card, idx) => (
                    <button key={idx} disabled={phase !== 'SHOWDOWN' || selectedTarget !== myID || card.type !== 'ABILITY'} onClick={() => socket.emit('prove_ability', idx)} style={{ display: 'block', width: '100%', textAlign: 'left', margin: '5px 0', padding: '6px', cursor: (phase === 'SHOWDOWN' && selectedTarget === myID && card.type === 'ABILITY') ? 'pointer' : 'not-allowed' }}>
                      [{card.type}] {card.name} - <small>{card.desc}</small>
                    </button>
                  ))}
                  {phase === 'SHOWDOWN' && selectedTarget === myID && (
                    <button onClick={() => socket.emit('execute_die')} style={{ width: '100%', background: 'red', color: 'white', padding: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', borderRadius: '4px' }}>☠️ 능력 없음 (즉사 선택)</button>
                  )}
                </div>
              )}

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