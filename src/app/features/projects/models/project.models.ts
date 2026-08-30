export type ProjectMembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface ProjectSummary {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly membershipRole: ProjectMembershipRole;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectDetails extends ProjectSummary {
  readonly ownerId: number;
  readonly ownerName: string;
}

export interface CreateProjectRequest {
  readonly name: string;
  readonly description: string | null;
}

export interface UpdateProjectRequest {
  readonly name: string;
  readonly description: string | null;
}

export interface BoardSummary {
  readonly id: number;
  readonly projectId: number;
  readonly name: string;
  readonly defaultBoard: boolean;
}

export interface SaveBoardRequest {
  readonly name: string;
}
