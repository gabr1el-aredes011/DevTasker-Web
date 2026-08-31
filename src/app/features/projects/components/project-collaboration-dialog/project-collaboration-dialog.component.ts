import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error.model';
import { DtButtonDirective, DtDialogFrameComponent, DtFieldComponent } from '../../../../shared/ui';
import {
  AssignableProjectRole,
  ProjectInvitationSummary,
  ProjectMemberSummary,
  ProjectMembershipRole,
} from '../../models/project.models';
import { projectRoleLabel } from '../../presentation/project-role.presentation';
import { ProjectService } from '../../services/project.service';

export type ProjectCollaborationDialogData =
  | {
      readonly mode: 'invite';
      readonly projectId: number;
      readonly actorRole: ProjectMembershipRole;
    }
  | {
      readonly mode: 'role';
      readonly projectId: number;
      readonly actorRole: ProjectMembershipRole;
      readonly member: ProjectMemberSummary;
    }
  | {
      readonly mode: 'remove';
      readonly projectId: number;
      readonly actorRole: ProjectMembershipRole;
      readonly member: ProjectMemberSummary;
    }
  | {
      readonly mode: 'revoke';
      readonly projectId: number;
      readonly actorRole: ProjectMembershipRole;
      readonly invitation: ProjectInvitationSummary;
    };

export type ProjectCollaborationDialogResult =
  | { readonly action: 'invited'; readonly invitation: ProjectInvitationSummary }
  | { readonly action: 'updated'; readonly member: ProjectMemberSummary }
  | { readonly action: 'removed'; readonly membershipId: number }
  | { readonly action: 'revoked'; readonly invitationId: number };

@Component({
  selector: 'app-project-collaboration-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DtButtonDirective, DtDialogFrameComponent, DtFieldComponent],
  templateUrl: './project-collaboration-dialog.component.html',
  styleUrl: './project-collaboration-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCollaborationDialogComponent {
  private readonly projectService = inject(ProjectService);
  private readonly dialogRef = inject(DialogRef<ProjectCollaborationDialogResult>);

  readonly data = inject<ProjectCollaborationDialogData>(DIALOG_DATA);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly projectRoleLabel = projectRoleLabel;
  readonly roles = computed<readonly AssignableProjectRole[]>(() =>
    this.data.actorRole === 'OWNER' ? ['ADMIN', 'MEMBER', 'VIEWER'] : ['MEMBER', 'VIEWER'],
  );
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
    role: new FormControl<AssignableProjectRole>(this.initialRole(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly title = computed(() => {
    switch (this.data.mode) {
      case 'invite':
        return 'Convidar pessoa';
      case 'role':
        return 'Alterar função';
      case 'remove':
        return 'Remover membro';
      case 'revoke':
        return 'Revogar convite';
    }
  });

  readonly description = computed(() => {
    switch (this.data.mode) {
      case 'invite':
        return 'A pessoa receberá um link seguro, válido por 72 horas, no e-mail da conta DevTasker.';
      case 'role':
        return `Defina o novo nível de acesso de ${this.data.member.name}.`;
      case 'remove':
        return `${this.data.member.name} perderá o acesso ao projeto e aos seus quadros.`;
      case 'revoke':
        return `O link enviado para ${this.data.invitation.invitedEmail} deixará de funcionar.`;
    }
  });

  readonly destructive = computed(() => this.data.mode === 'remove' || this.data.mode === 'revoke');

  close(): void {
    if (!this.submitting()) {
      this.dialogRef.close();
    }
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.data.mode === 'remove') {
      this.runRemove();
      return;
    }

    if (this.data.mode === 'revoke') {
      this.runRevoke();
      return;
    }

    this.form.markAllAsTouched();
    if (
      this.form.controls.role.invalid ||
      (this.data.mode === 'invite' && this.form.controls.email.invalid)
    ) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    if (this.data.mode === 'invite') {
      this.projectService
        .inviteMember(this.data.projectId, {
          email: this.form.controls.email.value.trim().toLowerCase(),
          role: this.form.controls.role.value,
        })
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (invitation) => this.dialogRef.close({ action: 'invited', invitation }),
          error: (error: unknown) => this.submitError.set(this.extractErrorMessage(error)),
        });
      return;
    }

    this.projectService
      .changeMemberRole(this.data.projectId, this.data.member.id, this.form.controls.role.value)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (member) => this.dialogRef.close({ action: 'updated', member }),
        error: (error: unknown) => this.submitError.set(this.extractErrorMessage(error)),
      });
  }

  emailError(): string | null {
    const control = this.form.controls.email;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Informe o e-mail da pessoa.';
    if (control.hasError('email')) return 'Informe um endereço de e-mail válido.';
    if (control.hasError('maxlength')) return 'Use no máximo 255 caracteres.';
    return null;
  }

  private runRemove(): void {
    if (this.data.mode !== 'remove') return;
    this.runDestructive(
      this.projectService.removeMember(this.data.projectId, this.data.member.id),
      { action: 'removed', membershipId: this.data.member.id },
    );
  }

  private runRevoke(): void {
    if (this.data.mode !== 'revoke') return;
    this.runDestructive(
      this.projectService.revokeInvitation(this.data.projectId, this.data.invitation.id),
      { action: 'revoked', invitationId: this.data.invitation.id },
    );
  }

  private runDestructive(
    operation: ReturnType<ProjectService['removeMember']>,
    result: ProjectCollaborationDialogResult,
  ): void {
    this.submitting.set(true);
    this.submitError.set(null);
    operation.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => this.dialogRef.close(result),
      error: (error: unknown) => this.submitError.set(this.extractErrorMessage(error)),
    });
  }

  private initialRole(): AssignableProjectRole {
    return this.data.mode === 'role' && this.data.member.role !== 'OWNER'
      ? this.data.member.role
      : 'MEMBER';
  }

  private extractErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Não foi possível concluir a operação.';
    if (error.status === 0) return 'Não foi possível conectar ao servidor.';
    const response = error.error as Partial<ApiError> | string | null;
    if (response && typeof response === 'object' && response.message?.trim())
      return response.message;
    if (typeof response === 'string' && response.trim()) return response;
    return 'Não foi possível concluir a operação.';
  }
}
