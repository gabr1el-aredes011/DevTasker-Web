import type { DtBadgeTone } from '../../../shared/ui';
import type { ProjectMembershipRole } from '../models/project.models';

const ROLE_LABELS: Record<ProjectMembershipRole, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
};

const ROLE_TONES: Record<ProjectMembershipRole, DtBadgeTone> = {
  OWNER: 'brand',
  ADMIN: 'info',
  MEMBER: 'success',
  VIEWER: 'neutral',
};

export function projectRoleLabel(role: ProjectMembershipRole): string {
  return ROLE_LABELS[role];
}

export function projectRoleTone(role: ProjectMembershipRole): DtBadgeTone {
  return ROLE_TONES[role];
}
