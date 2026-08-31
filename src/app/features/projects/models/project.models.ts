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

export interface ProjectMemberSummary {
  readonly id: number;
  readonly userId: number;
  readonly name: string;
  readonly email: string;
  readonly profileImageUrl: string | null;
  readonly role: ProjectMembershipRole;
  readonly joinedAt: string;
  readonly currentUser: boolean;
}

export type AssignableProjectRole = Exclude<ProjectMembershipRole, 'OWNER'>;

export interface ProjectInvitationSummary {
  readonly id: number;
  readonly invitedEmail: string;
  readonly role: AssignableProjectRole;
  readonly invitedByName: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface InviteProjectMemberRequest {
  readonly email: string;
  readonly role: AssignableProjectRole;
}

export interface ProjectInvitationAcceptance {
  readonly projectId: number;
  readonly projectName: string;
  readonly membership: ProjectMemberSummary;
}

export interface SaveBoardRequest {
  readonly name: string;
}
