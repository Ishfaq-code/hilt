import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { capacityLabel, permissionLabels } from '../../types/clubRoles'
import type {
  ClubPermission,
  ClubRole,
  RoleChange,
} from '../../types/clubRoles'
import type { Member } from '../../types/management'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import {
  buttonClass,
  inputClass,
  panelClass,
  secondaryClass,
} from '../ui/styles'
import { RoleFields } from './RoleFields'

type Props = {
  roles: ClubRole[]
  members: Member[]
  permissions: ClubPermission[]
  history?: RoleChange[]
  save: (role: ClubRole) => Promise<void>
  remove: (role: ClubRole) => Promise<void>
  undo: (id: string) => Promise<void>
}

function RoleEditor({
  initial,
  members,
  granted,
  onSave,
  onClose,
}: {
  initial: ClubRole
  members: Member[]
  granted: ClubPermission[]
  onSave: (role: ClubRole) => Promise<void>
  onClose: () => void
}) {
  const [role, setRole] = useState(initial)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const matching = members.filter(({ userId }) =>
    [userId.firstName, userId.lastName, userId.email]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  function select(id: string, assigned: boolean) {
    setRole((current) => ({
      ...current,
      memberIds: assigned
        ? [...current.memberIds, id]
        : current.memberIds.filter((member) => member !== id),
    }))
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(role)
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Couldn’t save the role.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog title={initial._id ? 'Edit role' : 'New role'} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <RoleFields value={role} onChange={setRole} granted={granted} />
        <fieldset className="space-y-2 border-t border-line pt-2">
          <legend className="pr-2 text-sm font-semibold">Members</legend>
          <input
            type="search"
            aria-label="Find members to assign"
            placeholder="Find members to assign"
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p className="text-xs text-muted">{role.memberIds.length} assigned</p>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {matching.map((member) => {
              const assigned = role.memberIds.includes(member._id)
              return (
                <label
                  key={member._id}
                  className="flex items-start gap-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={assigned}
                    disabled={
                      !assigned &&
                      role.maxMembers !== null &&
                      role.memberIds.length >= role.maxMembers
                    }
                    onChange={(event) =>
                      select(member._id, event.target.checked)
                    }
                  />
                  <span>
                    {member.userId.firstName} {member.userId.lastName}{' '}
                    <span className="text-xs text-muted">
                      {member.userId.email}
                    </span>
                  </span>
                </label>
              )
            })}
            {!matching.length && (
              <p className="text-sm text-muted">No members found.</p>
            )}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryClass} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={buttonClass} disabled={saving}>
            Save
          </button>
        </div>
      </form>
    </Dialog>
  )
}

const newRole: ClubRole = {
  _id: '',
  name: '',
  permissions: [],
  maxMembers: null,
  memberIds: [],
}

export function ClubRoles({
  roles,
  members,
  permissions,
  history,
  save,
  remove,
  undo,
}: Props) {
  const [editing, setEditing] = useState<ClubRole | null>(null)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Roles</h1>
        <button
          type="button"
          className={buttonClass}
          aria-haspopup="dialog"
          onClick={() => setEditing(newRole)}
        >
          New role
        </button>
      </div>
      <ul className={panelClass + ' divide-y divide-line'}>
        {roles.map((role) => {
          const editable = role.permissions.every((permission) =>
            permissions.includes(permission),
          )
          return (
            <li
              key={role._id}
              className="flex flex-wrap items-start justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <h2 className="font-semibold">{role.name}</h2>
                <p className="mt-1 text-xs text-muted">
                  {role.memberIds.length} assigned ·{' '}
                  {capacityLabel(role.maxMembers)}
                </p>
                {role.permissions.length > 0 && (
                  <p className="mt-1 text-sm text-muted">
                    {role.permissions
                      .map((permission) => permissionLabels[permission])
                      .join(', ')}
                  </p>
                )}
              </div>
              {editable && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={secondaryClass + ' size-10 p-0!'}
                    aria-label={'Edit ' + role.name}
                    title="Edit"
                    aria-haspopup="dialog"
                    onClick={() => setEditing(role)}
                  >
                    <Icon name="edit" size={17} />
                  </button>
                  <button
                    type="button"
                    className={secondaryClass + ' text-red-700'}
                    aria-label={'Delete ' + role.name}
                    onClick={() => void remove(role)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          )
        })}
        {!roles.length && (
          <li className="p-4 text-sm text-muted">No roles yet.</li>
        )}
      </ul>
      {history && history.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Role history</h2>
          <ul className={panelClass + ' divide-y divide-line'}>
            {history.map((change, index) => (
              <li
                key={change._id ?? change.at}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <div>
                  <p className="capitalize">
                    {change.action} {change.after?.name ?? change.before?.name}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(change.at).toLocaleString()}
                  </p>
                </div>
                {index === 0 &&
                  change._id &&
                  ['role created', 'role updated', 'role deleted'].includes(
                    change.action,
                  ) && (
                    <button
                      type="button"
                      className={secondaryClass}
                      onClick={() => void undo(change._id!)}
                    >
                      Undo
                    </button>
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && (
        <RoleEditor
          initial={editing}
          members={members}
          granted={permissions}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
