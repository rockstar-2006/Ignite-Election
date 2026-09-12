export interface AnonymousLeader {
  label: string;
  votes: number;
  percentage: number;
  hasVotes: boolean;
  leadMargin?: number;
}

export interface AnonymousPostSummary {
  postId: string;
  postName: string;
  semester: string;
  seats: number;
  genderRule: string;
  totalVotes: number;
  candidateCount: number;
  leaders: AnonymousLeader[];
  status: 'active_votes' | 'uncontested' | 'awaiting_ballots';
}

export interface TvResultsResponse {
  success: boolean;
  totalBallotsCast: number;
  totalUniqueElectors: number;
  totalCouncilPosts: number;
  totalContestedPosts: number;
  lastUpdatedTime: string;
  lastUpdatedDate: string;
  posts: AnonymousPostSummary[];
}
