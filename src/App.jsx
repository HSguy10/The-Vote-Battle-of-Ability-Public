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

  useEffect(() => {
    socket.on('room_list', (list) => setRoomList(list));
    socket.on('update_state', (state) => {
      setRoomState(state);
      setStep('ROOM');
    });
    socket.on('system_message', (msg) => alert(msg));
    return () => {
      socket.off('room_list');
      socket.off('update_state');
      socket.off('system_message');
    };
  }, []);

  if (step === 'NICKNAME') {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', backgroundColor: '#111', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
        <h2>🔮 DEATH VOTE 서바이벌</h2>
        <input type="text" placeholder="🧙‍♂️ 참전할 닉네임 입력" value={myName} onChange={e => setMyName(e.target.value)} style={{ padding: '12px', fontSize: '16px', borderRadius: '6px', border: 'none', width: '260px', textAlign: 'center', background: '#222', color: '#fff' }} />
        <br/><button onClick={() => { if(!myName.trim()) return alert('닉네임을 적으세요.'); setStep('LOBBY'); socket.emit('get_room_list'); }} style={{ marginTop: '20px', padding: '12px 40px', background: 'cyan', color: 'black', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>로비 입장</button>
      </div>
    );
  }

  if (step === 'LOBBY') {
    const playerOptions = Array.from({ length: 11 }, (_, i) => i + 5);
    return (
      <div style={{ padding: '30px 20px', backgroundColor: '#111', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h3>👋 반갑네, {myName} 예언자</h3>
        <div style={{ background: '#222', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #333' }}>
          <h4>🛠️ 새로운 데스 매치 룸 개설</h4>
          <input type="text" placeholder="🔑 방 코드" value={newCode} onChange={e => setNewCode(e.target.value)} style={{ padding: '8px', width: '55%', marginRight: '10px', background: '#333', color: '#fff', border: '1px solid #555' }} />
          <select value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #555', marginRight: '10px' }}>
            {playerOptions.map(v => <option key={v} value={v}>{v}인용</option>)}
          </select>
          <button onClick={() => { if(!newCode.trim()) return alert('방 코드가 비어있습니다.'); socket.emit('create_room', { roomCode: newCode, maxPlayers, playerName: myName }); }} style={{ display: 'block', width: '100%', marginTop: '10px', padding: '10px', background: 'cyan', color: 'black', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>방 만들기</button>
        </div>
        <h4>🌍 활성화된 매칭 방 ({roomList.length}개)</h4>
        {roomList.length === 0 && <p style={{ color: '#aaa', fontSize: '13px' }}>현재 개설된 방이 없습니다.</p>}
        {roomList.map(r => (
          <div key={r.roomCode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '12px 20px', borderRadius: '6px', margin: '8px 0', border: '1px solid #444' }}>
            <div><strong>코드: {r.roomCode}</strong> <span style={{ fontSize: '12px', color: r.status === 'LOBBY' ? 'lime' : 'red' }}>[{r.status}]</span></div>
            <div><span style={{ marginRight: '15px' }}>{r.currentPlayers} / {r.maxPlayers} 명</span>
            <button disabled={r.status !== 'LOBBY' || r.currentPlayers >= r.maxPlayers} onClick={() => socket.emit('enter_room', { roomCode: r.roomCode, playerName: myName })} style={{ padding: '6px 12px', background: 'white', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>입장</button></div>
          </div>
        ))}
      </div>
    );
  }
  const myID = socket.id;
  const myData = roomState?.players?.[myID];
  if (!myData) return <div style={{ color: '#fff', padding: '20px', backgroundColor: '#111', minHeight: '100vh', textAlign: 'center' }}>방에 입장하는 중...</div>;

  const { phase, round, selectedTarget, votes, players, hostId, status, maxPlayers: currentMaxPlayers } = roomState;
  const isHost = hostId === myID;

  if (status === 'LOBBY') {
    return (
      <div style={{ padding: '30px 20px', backgroundColor: '#111', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
        <h3>🚪 대기방: <span style={{ color: 'yellow' }}>{roomState.roomCode}</span> ({Object.keys(players).length}/{currentMaxPlayers}명)</h3>
        <div style={{ background: '#222', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
          <h4>참가자 명단</h4>
          {Object.values(players).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #333' }}>
              <span>{p.name} {p.id === hostId && '👑 (방장)'}</span>
              <span style={{ color: p.isReady ? 'lime' : 'red', fontWeight: 'bold' }}>{p.isReady ? 'READY' : 'WAITING'}</span>
            </div>
          ))}
        </div>
        {isHost ? (
          <button onClick={() => socket.emit('start_game')} style={{ width: '100%', padding: '15px', background: 'lime', color: 'black', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', borderRadius: '6px' }}>🎮 게임 시작</button>
        ) : (
          <button onClick={() => socket.emit('toggle_ready')} style={{ width: '100%', padding: '15px', background: myData?.isReady ? '#555' : 'orange', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', borderRadius: '6px' }}>{myData?.isReady ? '준비 취소' : '준비 완료'}</button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#111', minHeight: '100vh', fontFamily: 'sans-serif', color: '#fff' }}>
      <h2 style={{ textAlign: 'center' }}>🔮 DEATH VOTE (코드: {roomState.roomCode})</h2>
      <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px' }}>라운드 {round} | 단계: {phase}</p>
      {phase === 'SHOWDOWN' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', background: '#411', padding: '15px', borderRadius: '8px', border: '1px solid red', textAlign: 'center' }}>
          🚨 심판의 대상 ➡️ <strong>{players[selectedTarget]?.name}</strong>
          {selectedTarget === myID && <button onClick={() => socket.emit('execute_die')} style={{ marginLeft: '20px', background: 'red', color: 'white', border: 'none', padding: '6px 12px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>☠️ 즉사 수용</button>}
        </div>
      )}
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
                    <button key={idx} disabled={phase !== 'SHOWDOWN' || selectedTarget !== myID || card.type !== 'ABILITY'} onClick={() => socket.emit('prove_ability', idx)} style={{ display: 'block', width: '100%', textAlign: 'left', margin: '5px 0', padding: '6px' }}>[{card.type}] {card.name} - <small>{card.desc}</small></button>
                  ))}
                </div>
              )}
              {phase === 'VOTING' && !myData?.isDead && (
                <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>지목 대상 선택:</span>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    {Object.values(players).map((target) => (
                      <button key={target.id} disabled={p.isDead || target.isDead || target.id === p.id} onClick={() => socket.emit('cast_vote', target.id)} style={{ fontSize: '11px', padding: '5px 10px', backgroundColor: votes[p.id] === target.id ? 'yellow' : '', color: votes[p.id] === target.id ? 'black' : '' }}>{target.name}</button>
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