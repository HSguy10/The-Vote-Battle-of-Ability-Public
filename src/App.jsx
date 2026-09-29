import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://the-vote-battle-of-ability.onrender.com', {
  transports: ['websocket', 'polling'], withCredentials: true
});

export default function App() {
  const [step, setStep] = useState('NICKNAME');
  const [myName, setMyName] = useState('');
  const [roomList, setRoomList] = useState([]);
  const [roomState, setRoomState] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [gameMode, setGameMode] = useState('CLASSIC');
  const [voteTime, setVoteTime] = useState(30);
  const [timerDisplay, setTimerDisplay] = useState({ timeLeft: 0, timerType: '' });

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet'; document.head.appendChild(link);
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
      <div style={{ padding: '100px 20px', textAlign: 'center', backgroundColor: '#0f0f16', minHeight: '100vh', color: '#fff', fontFamily: '"Orbit", sans-serif' }}>
        <h1>🔮 능력투표대전</h1>
        <div style={{ background: '#1a1a26', padding: '30px', borderRadius: '12px', maxWidth: '340px', margin: '30px auto', border: '1px solid #333' }}>
          <input type="text" placeholder="참가자 이름" value={myName} onChange={e => setMyName(e.target.value)} style={{ padding: '12px', width: '90%', borderRadius: '6px', textAlign: 'center', background: '#09090f', color: '#fff', border: '1px solid #444' }} />
          <button onClick={() => { if(!myName.trim()) return; setStep('LOBBY'); socket.emit('get_room_list'); }} style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#00ffaa', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '6px' }}>로비 진입</button>
        </div>
      </div>
    );
  }
  if (step === 'LOBBY') {
    const playerRange = Array.from({ length: 11 }, (_, i) => i + 5);
    return (
      <div style={{ padding: '30px 20px', backgroundColor: '#0f0f16', minHeight: '100vh', color: '#fff', fontFamily: '"Orbit", sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h3>👁️ 예언자: <span style={{ color: '#00ffaa' }}>{myName}</span></h3>
        <div style={{ background: '#1a1a26', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a3a', marginBottom: '25px' }}>
          <h4>⚙️ 전장 커스텀 생성</h4>
          <input type="text" placeholder="방 코드 고정" value={newCode} onChange={e => setNewCode(e.target.value)} style={{ padding: '10px', width: '93%', background: '#09090f', color: '#fff', border: '1px solid #444', borderRadius: '6px', marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <select value={gameMode} onChange={e => setGameMode(e.target.value)} style={{ padding: '10px', flex: 1, background: '#09090f', color: '#fff' }}>
              <option value="CLASSIC">클래식 모드</option><option value="CHAOS">대혼돈 모드</option><option value="DELUXE">디럭스 모드</option>
            </select>
            <select value={voteTime} onChange={e => setVoteTime(e.target.value)} style={{ padding: '10px', flex: 1, background: '#09090f', color: '#fff' }}>
              <option value="30">30초</option><option value="60">60초</option>
            </select>
            <select value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} style={{ padding: '10px', background: '#09090f', color: '#fff' }}>
              {playerRange.map(v => <option key={v} value={v}>{v}인용</option>)}
            </select>
          </div>
          <button onClick={() => { if(!newCode.trim()) return; socket.emit('create_room', { roomCode: newCode, maxPlayers, playerName: myName, gameMode, voteTime }); }} style={{ width: '100%', padding: '12px', background: '#00ffaa', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '6px' }}>전장 개설</button>
        </div>
        <h4>🌍 활성화된 전장 목록 ({roomList.length})</h4>
        {roomList.map(r => (
          <div key={r.roomCode} style={{ display: 'flex', justifyContent: 'space-between', background: '#1a1a26', padding: '12px 20px', borderRadius: '8px', margin: '10px 0', border: '1px solid #2a2a3a' }}>
            <div><strong>[{r.roomCode}]</strong> <span style={{fontSize:'12px', color:'#00ffaa'}}>{r.status}</span></div>
            <div><span>{r.currentPlayers} / {r.maxPlayers} 명</span><button disabled={r.status!=='LOBBY'} onClick={() => socket.emit('enter_room', { roomCode: r.roomCode, playerName: myName })} style={{ marginLeft: '15px', padding: '5px 12px' }}>입장</button></div>
          </div>
        ))}
      </div>
    );
  }

  const myID = socket.id;
  const myData = roomState?.players?.[myID];
  if (!myData) return <div style={{ color: '#00ffaa', padding: '20px', textAlign: 'center', marginTop: '100px', fontFamily: '"Orbit", sans-serif' }}>🪐 차원의 성역 이동 중...</div>;

  const { phase, round, selectedTargets, votes, players, hostId, status, maxPlayers: currentMaxPlayers, gameMode: currentMode } = roomState;
  const isHost = hostId === myID;
  const alivePlayers = Object.values(players).filter(p => !p.isDead);

  if (status === 'LOBBY') {
    return (
      <div style={{ padding: '40px 20px', backgroundColor: '#0f0f16', minHeight: '100vh', color: '#fff', fontFamily: '"Orbit", sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h3>🏰 대기실: <span style={{ color: 'yellow' }}>{roomState.roomCode}</span></h3>
        <div style={{ background: '#1a1a26', padding: '20px', borderRadius: '12px', margin: '20px 0', border: '1px solid #2a2a3a' }}>
  {Object.values(players).map(p => (
    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #222' }}>
      {/* 🤖 AI 봇일 경우 이름 옆에 이모지 접두사 고지 */}
      <span>{p.id === hostId ? '👑 ' : p.isAI ? '🤖 ' : '👁️ '} {p.name}</span>
      <span style={{ color: p.isReady ? '#00ff00' : '#ff4444', fontWeight: 'bold' }}>{p.isReady ? 'READY' : 'WAITING'}</span>
    </div>
  ))}
</div>
        {isHost ? (
          <button onClick={() => socket.emit('start_game')} style={{ width: '100%', padding: '15px', background: '#00ffaa', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>⚔️ 의식 개시 (게임 시작)</button>
        ) : (
          <button onClick={() => socket.emit('toggle_ready')} style={{ width: '100%', padding: '15px', background: myData?.isReady ? '#444' : '#ff9900', color: '#fff', border: 'none', borderRadius: '8px' }}>{myData?.isReady ? '준비 취소' : '준비 완료'}</button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0a0f', minHeight: '100vh', fontFamily: '"Orbit", sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto 15px auto', borderBottom: '1px solid #222', paddingBottom: '10px' }}>
        <span>🪐 전장: <strong style={{ color: 'yellow' }}>{roomState.roomCode}</strong></span>
        <span style={{ color: '#00ffaa' }}>🔮 라운드 {round} [{phase}]</span>
      </div>
      <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', background: '#14141f', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #222', color: '#00ffaa', fontWeight: 'bold' }}>
        ⏳ {phase} 타이머: {timerDisplay.timeLeft}초
      </div>

      {phase === 'JUDGEMENT' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 25px auto', background: '#3a1111', padding: '20px', borderRadius: '12px', border: '2px solid #ff4444', textAlign: 'center' }}>
          <h3 style={{ color: '#ff4444' }}>⚖️ 심판의 판정대</h3>
          <p>타겟: {selectedTargets.map(id => players[id]?.name).join(', ')}</p>
          {selectedTargets.includes(myID) && (
            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
              {myData.abilities.map((ab, idx) => (
                <button key={idx} onClick={() => socket.emit('submit_judgement', { actionType: 'PROVE', cardIndex: idx })} style={{ padding: '10px 20px', background: '#00ffaa', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px' }}>[{ab.type}] {ab.name} 증명</button>
              ))}
              <button onClick={() => socket.emit('submit_judgement', { actionType: 'DIE' })} style={{ padding: '10px 20px', background: 'red', color: 'white', border: 'none', borderRadius: '4px' }}>☠️ 포기 (즉사)</button>
            </div>
          )}
        </div>
      )}

      {phase === 'PREDICTION' && !myData.isDead && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 25px auto', background: '#112233', padding: '15px', borderRadius: '8px', border: '1px solid #00ffaa', textAlign: 'center' }}>
          <h4>🔮 다음 저격대상 예측 단계</h4>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {alivePlayers.map(p => (
              <button key={p.id} onClick={() => socket.emit('submit_prediction', p.id)} style={{ padding: '6px 12px', background: '#09090f', color: '#fff' }}>{currentMode === 'CHAOS' ? p.anonName : p.name}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {Object.values(players).map((p) => {
          const isMe = p.id === myID;
          const showAbility = currentMode === 'DELUXE' || (isMe && currentMode === 'NONE');
          return (
            <div key={p.id} style={{ background: p.isDead ? '#111' : '#1a1a26', padding: '15px', borderRadius: '12px', border: isMe ? '2px solid #00ffaa' : '1px solid #333', opacity: p.isDead ? 0.4 : 1 }}>
              <h4>{currentMode === 'CHAOS' && !isMe ? p.anonName : p.name} {p.isDead ? '☠️ 사멸' : '❤️ 생존'}</h4>
              {isMe && !p.isDead && (
                <div style={{ fontSize: '13px', background: '#09090f', padding: '10px', borderRadius: '6px', margin: '10px 0' }}>
                  <strong>🔒 고유 능력수치:</strong>
                  {p.abilities.map((ab, idx) => (
                    <div key={idx} style={{ marginTop: '5px', color: showAbility ? '#00ffaa' : '#aaa' }}>
                      {showAbility ? `[${ab.type}] ${ab.name}` : '❓ 능력 숨김 상태 (판정대 고지 필요)'}
                    </div>
                  ))}
                </div>
              )}
              {phase === 'VOTING' && ((phase === 'LAST_STAND' && p.isDead && isMe) || (phase !== 'LAST_STAND' && !p.isDead && isMe)) && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                    {alivePlayers.map(target => (
                      <button key={target.id} disabled={currentMode !== 'CHAOS' && target.id === p.id} onClick={() => socket.emit('cast_vote', target.id)} style={{ fontSize: '11px', padding: '4px 8px' }}>{currentMode === 'CHAOS' ? target.anonName : target.name}</button>
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