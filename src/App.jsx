import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://the-vote-battle-of-ability.onrender.com', {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

export default function App() {
  const [step, setStep] = useState('NICKNAME');
  const [myName, setMyName] = useState('');
  const [roomList, setRoomList] = useState([]);
  const [roomState, setRoomState] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [timerDisplay, setTimerDisplay] = useState({ timeLeft: 0, timerType: '' });

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    socket.on('room_list', (list) => setRoomList(list));
    socket.on('update_state', (state) => { setRoomState(state); setStep('ROOM'); });
    socket.on('system_message', (msg) => alert(msg));
    socket.on('timer_update', (data) => setTimerDisplay(data));

    return () => {
      socket.off('room_list'); socket.off('update_state');
      socket.off('system_message'); socket.off('timer_update');
    };
  }, []);

  if (step === 'NICKNAME') {
    return (
      <div style={{ padding: '120px 20px', textAlign: 'center', backgroundColor: '#0d0d11', minHeight: '100vh', color: '#fff', fontFamily: '"Orbit", sans-serif' }}>
        <h1 style={{ fontSize: '32px', color: '#00ffff', textShadow: '0 0 15px rgba(0,255,255,0.6)', marginBottom: '40px' }}>🔮 DEATH VOTE</h1>
        <div style={{ background: '#161622', padding: '30px', borderRadius: '12px', border: '1px solid #00ffff', maxWidth: '360px', margin: '0 auto' }}>
          <input type="text" placeholder="예언자 이름" value={myName} onChange={e => setMyName(e.target.value)} style={{ padding: '14px', fontSize: '16px', borderRadius: '8px', border: '1px solid #333', width: '90%', textAlign: 'center', background: '#0a0a0f', color: '#fff' }} />
          <button onClick={() => { if(!myName.trim()) return alert('이름을 입력하세요.'); setStep('LOBBY'); socket.emit('get_room_list'); }} style={{ marginTop: '25px', width: '100%', padding: '14px', background: '#00ffff', color: '#000', border: 'none', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px', cursor: 'pointer' }}>로비 입장</button>
        </div>
      </div>
    );
  }

  if (step === 'LOBBY') {
    const playerOptions = Array.from({ length: 11 }, (_, i) => i + 5);
    return (
      <div style={{ padding: '40px 20px', backgroundColor: '#0d0d11', minHeight: '100vh', color: '#fff', fontFamily: '"Orbit", sans-serif', maxWidth: '650px', margin: '0 auto' }}>
        <h3 style={{ borderBottom: '2px solid #222', paddingBottom: '15px' }}>👁️ 예언자: <span style={{ color: '#00ffff' }}>{myName}</span></h3>
        <div style={{ background: '#14141f', padding: '25px', borderRadius: '12px', marginBottom: '35px', border: '1px solid #2d2d3f' }}>
          <h4>⚔️ 새로운 전장 개설</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="전장 코드" value={newCode} onChange={e => setNewCode(e.target.value)} style={{ padding: '12px', flex: 1, background: '#0a0a0f', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
            <select value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} style={{ padding: '12px', background: '#0a0a0f', color: '#fff', border: '1px solid #333', borderRadius: '6px' }}>
              {playerOptions.map(v => <option key={v} value={v}>{v}인용</option>)}
            </select>
          </div>
          <button onClick={() => { if(!newCode.trim()) return alert('코드를 입력하세요.'); socket.emit('create_room', { roomCode: newCode, maxPlayers, playerName: myName }); }} style={{ width: '100%', marginTop: '15px', padding: '12px', background: '#00ffff', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>전장 생성</button>
        </div>
        <h4>📜 전장 목록 ({roomList.length})</h4>
        {roomList.map(r => (
          <div key={r.roomCode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#14141f', padding: '16px 20px', borderRadius: '8px', margin: '12px 0', border: '1px solid #222' }}>
            <div><strong>{r.roomCode}</strong> <span style={{ fontSize: '11px', color: r.status === 'LOBBY' ? '#00ff00' : '#ff4444' }}>[{r.status}]</span></div>
            <div><span style={{ marginRight: '15px' }}>{r.currentPlayers} / {r.maxPlayers} 명</span>
            <button disabled={r.status !== 'LOBBY' || r.currentPlayers >= r.maxPlayers} onClick={() => socket.emit('enter_room', { roomCode: r.roomCode, playerName: myName })} style={{ padding: '8px 16px', background: '#fff', cursor: 'pointer' }}>진입</button></div>
          </div>
        ))}
      </div>
    );
  }
  const myID = socket.id;
  const myData = roomState?.players?.[myID];
  if (!myData) return <div style={{ color: '#00ffff', padding: '5px', fontFamily: '"Orbit", sans-serif', textAlign: 'center', marginTop: '100px' }}>🔮 성역 동기화 중...</div>;

  const { phase, round, selectedTarget, votes, players, hostId, status, maxPlayers: currentMaxPlayers } = roomState;
  const isHost = hostId === myID;

  if (status === 'LOBBY') {
    return (
      <div style={{ padding: '40px 20px', backgroundColor: '#0d0d11', minHeight: '100vh', color: '#fff', fontFamily: '"Orbit", sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h3>🏰 대기소: <span style={{ color: 'yellow' }}>{roomState.roomCode}</span> ({Object.keys(players).length}/{currentMaxPlayers}명)</h3>
        <div style={{ background: '#14141f', padding: '20px', borderRadius: '12px', margin: '25px 0', border: '1px solid #2d2d3f' }}>
          {Object.values(players).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a26' }}>
              <span style={{ color: p.id === hostId ? 'yellow' : '#fff' }}>{p.id === hostId ? '👑 ' : '👁️ '} {p.name}</span>
              <span style={{ color: p.isReady ? '#00ff00' : '#ff4444', fontWeight: 'bold' }}>{p.isReady ? 'READY' : 'WAITING'}</span>
            </div>
          ))}
        </div>
        {isHost ? (
          <button onClick={() => socket.emit('start_game')} style={{ width: '100%', padding: '16px', background: '#00ff00', color: '#000', border: 'none', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px', cursor: 'pointer' }}>⚡ 게임 시작</button>
        ) : (
          <button onClick={() => socket.emit('toggle_ready')} style={{ width: '100%', padding: '16px', background: myData?.isReady ? '#333' : '#ff9900', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px', cursor: 'pointer' }}>{myData?.isReady ? '준비 취소' : '준비 완료'}</button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#08080c', minHeight: '100vh', fontFamily: '"Orbit", sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto 15px auto', borderBottom: '1px solid #222', paddingBottom: '10px' }}>
        <span>🪐 코드: <strong style={{ color: 'yellow' }}>{roomState.roomCode}</strong></span>
        <span style={{ color: '#00ffff' }}>🔮 라운드 {round} [{phase}]</span>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', background: '#11111a', padding: '14px', borderRadius: '8px', textAlign: 'center', border: '1px solid #222', color: timerDisplay.timeLeft <= 5 ? '#ff4444' : '#00ffff', fontSize: '18px', fontWeight: 'bold' }}>
        ⏳ {timerDisplay.timerType === 'VOTING' ? '의심의 지목' : '신의 심판'} 종료까지: {timerDisplay.timeLeft}초
      </div>

      {phase === 'SHOWDOWN' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 25px auto', background: '#441111', padding: '20px', borderRadius: '12px', border: '2px solid #ff4444', textAlign: 'center' }}>
          <h2 style={{ color: '#ff4444', margin: '0 0 10px 0' }}>⚖️ 신의 사형대</h2>
          <p style={{ margin: '0 0 15px 0' }}>지목된 생존자 <strong style={{ color: '#fff' }}>[{players[selectedTarget]?.name}]</strong>은 권능을 입증해야 합니다.</p>
          {selectedTarget === myID && <button onClick={() => socket.emit('execute_die')} style={{ background: '#000', color: '#ff4444', border: '1px solid #ff4444', padding: '10px 30px', fontWeight: 'bold', cursor: 'pointer' }}>☠️ 즉사 수용</button>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {Object.values(players).map((p) => {
          const isTarget = selectedTarget === p.id;
          const isMe = p.id === myID;
          return (
            <div key={p.id} style={{ background: p.isDead ? '#111116' : isTarget ? '#221111' : '#14141f', border: isTarget ? '3px solid #ff4444' : isMe ? '2px solid #00ffff' : '1px solid #2d2d3f', padding: '20px', borderRadius: '12px', opacity: p.isDead ? 0.4 : 1 }}>
              <h3 style={{ margin: '0 0 15px 0', paddingBottom: '8px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.name} {isMe && <span style={{ color: '#00ffff', fontSize: '12px' }}>(나)</span>}</span>
                <span>{p.isDead ? '☠️ 사멸' : '❤️ 생존'}</span>
              </h3>

              {isMe && !p.isDead && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>🔮 소지한 권능 패</div>
                  {p.hand.map((card, idx) => (
                    <button key={idx} disabled={phase !== 'SHOWDOWN' || selectedTarget !== myID || card.type !== 'ABILITY'} onClick={() => socket.emit('prove_ability', idx)} style={{ display: 'block', width: '100%', textAlign: 'left', margin: '8px 0', padding: '10px', background: card.type === 'ABILITY' ? '#1b263b' : '#1a1a24', color: '#fff', border: card.type === 'ABILITY' ? '1px solid #00ffff' : '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 'bold', color: card.type === 'ABILITY' ? '#00ffff' : '#aaa' }}>{card.name}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{card.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {phase === 'VOTING' && !myData?.isDead && !p.isDead && (
                <div style={{ marginTop: '15px', borderTop: '1px solid #222', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.values(players).map((target) => (
                      <button key={target.id} disabled={target.isDead || target.id === p.id} onClick={() => socket.emit('cast_vote', target.id)} style={{ fontSize: '12px', padding: '6px 12px', background: votes[p.id] === target.id ? '#00ffff' : '#0a0a0f', color: votes[p.id] === target.id ? '#000' : '#aaa', border: '1px solid #222', borderRadius: '4px', cursor: 'pointer' }}>{target.name}</button>
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