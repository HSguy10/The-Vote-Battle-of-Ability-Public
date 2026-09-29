import { INVALID_MOVE } from 'boardgame.io/core';

const CARD_POOL = [
  { id: 'a1', name: '시공간 간섭', type: 'ABILITY', desc: '능력 증명 완료 후 상대 반격' },
  { id: 'a2', name: '인과율 역전', type: 'ABILITY', desc: '능력 증명 완료 후 투표 무효화' },
  { id: 'i1', name: '일반 단검', type: 'ITEM', desc: '능력 증명 불가 아이템' },
  { id: 'i2', name: '가짜 부적', type: 'ITEM', desc: '능력 증명 불가 아이템' },
];

export const DeathVoteGame = {
  name: 'death-vote',

  // 4인 플레이어 데이터 생성
  setup: () => {
    const players = {};
    for (let i = 0; i < 4; i++) {
      players[String(i)] = {
        id: String(i),
        name: `참가자 ${String.fromCharCode(65 + i)}`,
        isDead: false,
        hand: [CARD_POOL[Math.floor(Math.random() * 4)], CARD_POOL[Math.floor(Math.random() * 4)]]
      };
    }
    return {
      round: 1,
      selectedTarget: null,
      votes: {},
      players
    };
  },

  moves: {
    // 투표 액션
    castVote: ({ G, ctx, playerID }, targetID) => {
      const pID = String(playerID);
      const tID = String(targetID);

      const aliveList = Object.values(G.players).filter(p => !p.isDead);
      const isOneOnOne = aliveList.length === 2;

      // 1:1 상황 조건 체크
      if (isOneOnOne) {
        if (!G.players[pID].isDead) return INVALID_MOVE; // 생존자는 투표 잠금
      } else {
        if (G.players[pID].isDead) return INVALID_MOVE; // 평소엔 사망자 투표 잠금
        if (tID === pID || G.players[tID].isDead) return INVALID_MOVE; // 본인 및 사망자 지목 차단
      }

      // 투표 값 기록
      G.votes[pID] = tID;

      // 목표 투표 수 도달 시 정산
      const requiredVotes = isOneOnOne 
        ? Object.values(G.players).filter(p => p.isDead).length 
        : aliveList.length;

      if (Object.keys(G.votes).length === requiredVotes) {
        const voteCounts = {};
        Object.values(G.votes).forEach(t => { voteCounts[t] = (voteCounts[t] || 0) + 1; });

        let maxVotes = 0;
        let winnerId = null;
        Object.entries(voteCounts).forEach(([id, count]) => {
          if (count > maxVotes) { maxVotes = count; winnerId = id; }
        });

        if (winnerId) {
          G.selectedTarget = String(winnerId);
          ctx.events.setPhase('showdown'); // 심판 단계로 점프
        } else {
          G.votes = {}; // 동률 시 재투표
        }
      }
    },

    // 능력 검증 액션
    proveAbility: ({ G, ctx, playerID }, cardIndex) => {
      const pID = String(playerID);
      if (String(G.selectedTarget) !== pID) return INVALID_MOVE;
      
      const card = G.players[pID].hand[cardIndex];
      if (card.type !== 'ABILITY') return INVALID_MOVE;

      G.players[pID].hand.splice(cardIndex, 1);
      resetRound(G, ctx);
    },

    // 즉사 수용 액션
    executeDie: ({ G, ctx, playerID }) => {
      const pID = String(playerID);
      if (String(G.selectedTarget) !== pID) return INVALID_MOVE;
      
      G.players[pID].isDead = true;
      G.players[pID].hand = [];
      
      resetRound(G, ctx);
    }
  },

  phases: {
    voting: {
      start: true,
      next: 'showdown',
      // ✨ 버그 원천 차단: 모든 플레이어가 투표할 때까지 행동 횟수 제한을 무제한으로 풉니다.
      turn: {
        activePlayers: { 
          all: 'voting',
          noLimit: true // 한 번 클릭했어도 다른 사람을 위해 권한이 지워지지 않음
        }
      }
    },
    showdown: {
      next: 'voting',
      turn: {
        activePlayers: {
          value: (G) => ({
            [String(G.selectedTarget)]: 'showdown' // 오직 타겟에게만 심판대 권한 부여
          })
        }
      }
    }
  },

  endIf: ({ G }) => {
    const alivePlayers = Object.values(G.players).filter(p => !p.isDead);
    if (alivePlayers.length <= 1) {
      return { winner: alivePlayers.length === 1 ? alivePlayers[0].name : '없음' };
    }
  }
};

function resetRound(G, ctx) {
  G.selectedTarget = null;
  G.votes = {};
  G.round += 1;
  ctx.events.setPhase('voting');
}