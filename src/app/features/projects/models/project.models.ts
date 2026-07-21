export interface ProjectSummary {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly membershipRole: string;
  readonly createdAt: string;
}

export interface BoardSummary {
  readonly id: number;
  readonly projectId: number;
  readonly name: string;
}