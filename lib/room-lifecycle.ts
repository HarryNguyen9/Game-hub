export type RoomStatus = "waiting" | "playing" | "ended" | "closed";
export type RoomRole = "host" | "player";
export type ParticipationStatus = "lobby" | "active_game" | "waiting_next_round";

export type LifecycleMember = {
  userId: string;
  role: RoomRole;
  ready: boolean;
  participationStatus: ParticipationStatus;
};

export function createHostMember(userId: string): LifecycleMember {
  return {
    userId,
    role: "host",
    ready: true,
    participationStatus: "lobby"
  };
}

export function memberForJoin(userId: string, roomStatus: RoomStatus): LifecycleMember {
  return {
    userId,
    role: "player",
    ready: false,
    participationStatus: roomStatus === "playing" ? "waiting_next_round" : "lobby"
  };
}

export function canToggleReady(member: LifecycleMember, roomStatus: RoomStatus) {
  return roomStatus === "waiting" && member.role === "player" && member.participationStatus === "lobby";
}

export function allPlayersReady(members: LifecycleMember[]) {
  return members
    .filter((member) => member.role === "player" && member.participationStatus === "lobby")
    .every((member) => member.ready);
}

export function startGameMembers(members: LifecycleMember[]) {
  return members.map((member) =>
    member.participationStatus === "lobby"
      ? { ...member, ready: member.role === "host", participationStatus: "active_game" as const }
      : member
  );
}

export function backToLobbyMembers(members: LifecycleMember[]) {
  return members.map((member) => ({
    ...member,
    ready: member.role === "host",
    participationStatus: "lobby" as const
  }));
}
