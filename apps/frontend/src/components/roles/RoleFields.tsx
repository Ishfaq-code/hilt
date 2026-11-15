import { clubPermissions, permissionLabels } from '../../types/clubRoles'
import type { ClubPermission, RoleSettings } from '../../types/clubRoles'
import { inputClass } from '../ui/styles'

export function RoleFields<T extends RoleSettings>({
  value,
  onChange,
  granted = clubPermissions,
}: {
  value: T
  onChange: (value: T) => void
  granted?: ClubPermission[]
}) {
  function setPermission(permission: ClubPermission, enabled: boolean) {
    const permissions = enabled
      ? [...value.permissions, permission]
      : value.permissions.filter((item) => item !== permission)
    onChange({ ...value, permissions })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <label className="block text-sm font-medium">
          Role name
          <input
            required
            maxLength={80}
            className={inputClass + ' mt-1'}
            value={value.name}
            onChange={(event) =>
              onChange({ ...value, name: event.target.value })
            }
          />
        </label>
        <label className="block text-sm font-medium">
          Member limit
          <input
            type="number"
            min="1"
            step="1"
            max={Number.MAX_SAFE_INTEGER}
            placeholder="Unlimited"
            className={inputClass + ' mt-1'}
            value={value.maxMembers ?? ''}
            onChange={(event) =>
              onChange({
                ...value,
                maxMembers:
                  event.target.value === '' ? null : event.target.valueAsNumber,
              })
            }
          />
        </label>
      </div>
      <fieldset className="border-t border-line pt-2">
        <legend className="pr-2 text-sm font-semibold">Permissions</legend>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {clubPermissions.map((permission) => (
            <label key={permission} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.permissions.includes(permission)}
                disabled={!granted.includes(permission)}
                onChange={(event) =>
                  setPermission(permission, event.target.checked)
                }
              />
              {permissionLabels[permission]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
