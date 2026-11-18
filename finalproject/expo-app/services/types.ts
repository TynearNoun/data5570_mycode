export type PublicUser = {
  id: number;
  username: string;
  display_name: string;
};

export type SessionUser = PublicUser & {
  email: string;
  bio: string;
};

export type Member = PublicUser & {
  role: "owner" | "member";
};

export type Group = {
  id: number;
  name: string;
  description: string;
  invite_code: string;
  created_at: string;
  member_count: number;
  role: "owner" | "member" | "";
  members: Member[];
};

export type ReactionKind = "fire" | "cheer" | "laugh";

export type ReactionSummary = {
  fire: number;
  cheer: number;
  laugh: number;
  mine: { id: number; kind: ReactionKind }[];
};

export type Submission = {
  id: number;
  challenge: number;
  user: PublicUser;
  body: string;
  photo_url: string;
  video_url: string;
  created_at: string;
  reactions: ReactionSummary;
};

export type ProofKind = "text" | "photo" | "video" | "any";

export type Challenge = {
  id: number;
  group: number;
  title: string;
  prompt: string;
  kind: "daily" | "custom";
  proof: ProofKind;
  challenge_date: string | null;
  created_by: PublicUser | null;
  created_at: string;
  submission_count: number;
  my_submission: Submission | null;
};

export type ChatMessage = {
  id: number;
  group: number;
  user: PublicUser;
  body: string;
  created_at: string;
};

export type Standing = {
  rank: number;
  user: PublicUser;
  points: number;
  current_streak: number;
  best_streak: number;
  submissions: number;
};

export type Leaderboard = {
  group: { id: number; name: string };
  standings: Standing[];
};

export type AuthResponse = {
  token: string;
  user: SessionUser;
};

export type PhotoPick = {
  uri: string;
  name: string;
  type: string;
};
